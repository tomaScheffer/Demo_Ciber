# NubeMarts CTF — Guía de remediación

Cómo se **previene** cada vulnerabilidad del laboratorio. Para cada una:
qué está mal, el principio de seguridad, el arreglo concreto (con código) y una
verificación. Referencia cruzada con el ataque en `WALKTHROUGH.md`.

---

## 0. Fuga por OSINT (source maps y comentarios en el bundle)

**Qué está mal**
`vite.config.js` publica con `sourcemap: true` y `minify: false`, y
`src/api.js` contiene comentarios con URLs internas, rutas sensibles y un UUID.
Todo eso queda expuesto al cliente.

**Principio:** minimizar la superficie de información. El código del cliente es
público; nunca debe contener secretos ni "mapas" de la infraestructura.

**Arreglo**

```js
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,   // no publicar source maps en producción
    minify: "esbuild",  // ofuscar/minificar
  },
});
```

- Eliminar comentarios con datos internos (URLs, UUIDs, rutas privadas) del
  código del frontend.
- Configurar la API por variable de entorno de build; no documentar rutas
  internas en el cliente.
- Si necesitás source maps para monitoreo de errores, subilos a tu herramienta
  (p. ej. Sentry) de forma privada y **no** los sirvas públicamente.

**Verificación:** `curl http://.../assets/*.js.map` debe dar 404, y el bundle
no debe contener URLs internas ni UUIDs en texto claro.

---

## 1. Broken Authentication — Confusión de algoritmo JWT (RS256 → HS256)

**Qué está mal**
Al verificar el token no se fija el algoritmo, por lo que se acepta `HS256`.
Como la clave pública es descargable, un atacante la usa como secreto HMAC y
forja tokens válidos. Además, el laboratorio neutraliza la protección de PyJWT
que impide usar un PEM como secreto HMAC.

**Principio:** fijar el algoritmo esperado y usar **claves separadas por
algoritmo**. Nunca dejar que el atacante elija el algoritmo (`alg`).

**Arreglo**

```python
# Fijar SIEMPRE el algoritmo asimétrico y verificar con la clave PÚBLICA.
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            creds.credentials,
            PUBLIC_KEY,
            algorithms=["RS256"],          # <- lista blanca de UN algoritmo
            options={
                "require": ["exp", "sub", "role"],
                "verify_signature": True,
                "verify_exp": True,
            },
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload
```

Además:
- **No** anular la protección de PyJWT (quitar el `_UnsafeHMAC` del laboratorio).
  PyJWT ya rechaza usar una clave asimétrica/PEM como secreto HMAC.
- Rechazar explícitamente `alg: none`.
- Si de verdad usás HS*, el secreto debe ser un valor aleatorio y **nunca**
  publicarse. No mezcles el mismo material de clave entre RS* y HS*.
- Considerá rotación de claves y `kid` en el header para múltiples claves.

**Verificación:** un token `HS256` firmado con `public.pem` debe devolver
**401**; solo un token `RS256` firmado con la privada real debe pasar.

---

## 2. BOLA — Broken Object Level Authorization

**Qué está mal**
`GET /api/v1/merchants/{merchant_uuid}/payout-invoices` exige `role: admin`
pero no comprueba que el usuario sea dueño de ese `merchant_uuid`. Cualquier
admin lee las facturas de cualquier tienda.

**Principio:** autorización a nivel de objeto. Autenticar ≠ autorizar. Cada
acceso a un recurso debe validar que el sujeto tiene permiso **sobre ese
recurso concreto**.

**Arreglo**

```python
@app.get("/api/v1/merchants/{merchant_uuid}/payout-invoices")
def payout_invoices(merchant_uuid: str, user: dict = Depends(get_current_user)):
    # El dueño solo accede a SU tienda...
    if user["sub"] != merchant_uuid:
        # ...salvo un rol de plataforma explícito y auditado.
        if user.get("role") != "platform_admin":
            raise HTTPException(status_code=403, detail="forbidden")

    merchant = MOCK_DB.get(merchant_uuid)
    if not merchant:
        raise HTTPException(status_code=404, detail="not found")
    return {"merchant_uuid": merchant_uuid, "payout_invoices": merchant["payout_invoices"]}
```

Buenas prácticas:
- Comparar el identificador del recurso contra el **sujeto del token**, no
  contra un parámetro controlable por el cliente.
- No confundir "es admin de su tienda" con "es admin de la plataforma".
- Preferir identificadores no adivinables (UUID v4) **como defensa en
  profundidad**, nunca como único control.
- Centralizar la lógica de autorización (dependencias/decoradores) y auditar
  accesos a datos sensibles.

**Verificación:** con el token de la tienda A, pedir las facturas de la tienda
B debe devolver **403**.

---

## 3. SSRF — Server-Side Request Forgery hacia el IMDS

**Qué está mal**
`POST /api/v1/product/import` hace `requests.get(image_url)` con una URL
arbitraria y devuelve el cuerpo. Permite que el servidor consulte destinos
internos como `169.254.169.254` (metadata de la nube).

**Principio:** nunca confiar en URLs provistas por el usuario para peticiones
salientes. Validar destino, esquema y resolver el riesgo de redirecciones y
rebinding.

**Arreglo (defensa en capas)**

```python
import ipaddress, socket
from urllib.parse import urlparse
import requests

ALLOWED_SCHEMES = {"https"}

def _is_public_ip(host: str) -> bool:
    # Resolver y verificar TODAS las IPs (evita DNS rebinding).
    for _, _, _, _, sockaddr in socket.getaddrinfo(host, None):
        ip = ipaddress.ip_address(sockaddr[0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast):
            return False
    return True

@app.post("/api/v1/product/import")
def import_product(body: ImportRequest, user: dict = Depends(get_current_user)):
    u = urlparse(body.image_url)
    if u.scheme not in ALLOWED_SCHEMES or not u.hostname:
        raise HTTPException(400, "URL no permitida")
    if not _is_public_ip(u.hostname):
        raise HTTPException(400, "destino interno bloqueado")

    r = requests.get(
        body.image_url,
        timeout=5,
        allow_redirects=False,        # no seguir redirects a destinos internos
        stream=True,
    )
    # No devolver el cuerpo crudo: validar tipo y tamaño.
    ctype = r.headers.get("content-type", "")
    if not ctype.startswith("image/"):
        raise HTTPException(400, "el recurso no es una imagen")
    data = r.raw.read(2 * 1024 * 1024, decode_content=True)  # límite de tamaño
    return {"content_type": ctype, "bytes": len(data)}       # metadata, no eco
```

Controles adicionales:
- **Bloquear rangos internos**: `169.254.0.0/16` (link-local/IMDS),
  `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, IPv6 ULA/loopback.
- **No devolver el cuerpo** de la respuesta al cliente (evita la variante
  "in-band"); procesar la imagen del lado del servidor.
- Validar **content-type** y **tamaño máximo**; rechazar redirecciones.
- Usar un **egress proxy**/allowlist de dominios para peticiones salientes.
- A nivel nube: exigir **IMDSv2** (tokens con `PUT`), reducir el
  `hop-limit` a 1 y aplicar egress controls por red.

**Verificación:** un POST con `http://169.254.169.254/...` debe devolver
**400** (destino interno bloqueado) y jamás exponer credenciales.

---

## Endurecimiento de plataforma (transversal)

- **Segmentación de red:** mantener servicios sensibles (IMDS/metadata) en
  redes internas; aplicar egress filtering desde los servicios de aplicación.
- **Menor privilegio:** roles y credenciales de vida corta; separar admin de
  tienda vs. admin de plataforma.
- **Gestión de secretos:** claves privadas fuera del repo y del contenedor de
  build; nunca servir material de clave por rutas públicas salvo la pública
  cuando el diseño lo requiera (y con `alg` fijo).
- **Observabilidad:** loguear y alertar sobre accesos a datos de payout y
  peticiones salientes a rangos internos.
- **Dependencias:** mantener PyJWT y librerías actualizadas; no desactivar sus
  protecciones por defecto.

| # | Vulnerabilidad | Control principal |
|---|----------------|-------------------|
| 0 | Fuga OSINT | `sourcemap:false`, minificar, sin datos internos en el cliente |
| 1 | JWT alg confusion | `algorithms=["RS256"]`, claves separadas, no anular PyJWT |
| 2 | BOLA | verificar dueño del objeto contra el sujeto del token |
| 3 | SSRF → IMDS | allowlist de esquema/dominio, bloquear IPs internas, IMDSv2 |
