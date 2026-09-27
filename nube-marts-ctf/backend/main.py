"""
NubeMarts API — INTENTIONALLY VULNERABLE.
For use in an isolated local CTF lab only. Do NOT deploy to any real network.

Contains, on purpose:
  V1 - JWT Algorithm Confusion (RS256 -> HS256 downgrade)
  V2 - Broken Object Level Authorization (BOLA)
  V3 - In-band SSRF
"""
import datetime
from pathlib import Path

import jwt
import requests
from jwt.algorithms import HMACAlgorithm
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# App / OpenAPI setup.  Swagger JSON is exposed at the (slightly unusual) path
# /api/v1/swagger.json — an easy find for anyone poking at the API surface.
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NubeMarts Merchant API",
    version="1.0.0",
    openapi_url="/api/v1/swagger.json",
    docs_url="/api/v1/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
PRIVATE_KEY = (BASE_DIR / "private.pem").read_text()
PUBLIC_KEY = (BASE_DIR / "public.pem").read_text()

security = HTTPBearer(auto_error=True)

# ---------------------------------------------------------------------------
# VULNERABILITY 1 (enabler) — restore the "classic" algorithm-confusion
# condition.  Modern PyJWT refuses to use a PEM/asymmetric key as an HMAC
# secret (HMACAlgorithm.prepare_key raises InvalidKeyError). We override that
# guard so the public key CAN be used as an HS256 secret — exactly the
# behaviour of older PyJWT and of Node's `jsonwebtoken`. This is what makes
# the RS256 -> HS256 downgrade forge-able.
# ---------------------------------------------------------------------------
class _UnsafeHMAC(HMACAlgorithm):
    def prepare_key(self, key):
        if isinstance(key, str):
            key = key.encode("utf-8")
        return key


jwt.unregister_algorithm("HS256")
jwt.register_algorithm("HS256", _UnsafeHMAC(HMACAlgorithm.SHA256))

# ---------------------------------------------------------------------------
# Mock database.  Two merchants; "Pinturas del Sur" holds the BOLA flag.
# ---------------------------------------------------------------------------
MOCK_DB = {
    "a1b2c3d4-0000-0000-0000-000000000001": {
        "name": "Pinturas del Sur",
        "email": "owner@pinturasdelsur.example",
        "password": "paint-it-blue",  # demo creds
        "role": "admin",
        "profile": {
            "category": "Hogar y Construcción",
            "city": "Bahía Blanca, AR",
            "products": 128,
            "rating": 4.8,
            "since": "2018",
            "plan": "Evolución",
        },
        "payout_invoices": [
            {"id": "INV-1001", "period": "2026-08", "amount": "12450.00 ARS", "status": "paid", "cbu": "0170099220000012345678"},
            {"id": "INV-1002", "period": "2026-09", "amount": "9870.50 ARS", "status": "pending", "cbu": "0170099220000012345678"},
            {"id": "INV-1003", "period": "2026-07", "amount": "15310.75 ARS", "status": "paid", "cbu": "0170099220000012345678"},
            {
                "id": "INV-SECRET",
                "period": "internal",
                "amount": "0.00",
                "status": "confidential",
                "note": "FLAG{BOLA_m3rch4nt_pwn3d}",
            },
        ],
    },
    "f9e8d7c6-1111-1111-1111-111111111111": {
        "name": "Café Central",
        "email": "hola@cafecentral.example",
        "password": "espresso123",  # demo creds
        "role": "merchant",
        "profile": {
            "category": "Alimentos y Bebidas",
            "city": "Córdoba, AR",
            "products": 42,
            "rating": 4.6,
            "since": "2020",
            "plan": "Emprender",
        },
        "payout_invoices": [
            {"id": "INV-2001", "period": "2026-09", "amount": "3200.00 ARS", "status": "paid", "cbu": "0110599520000098765432"},
        ],
    },
    "b2c3d4e5-2222-2222-2222-222222222222": {
        "name": "Indumentaria Norte",
        "email": "ventas@indunorte.example",
        "password": "norte2019",  # demo creds
        "role": "merchant",
        "profile": {
            "category": "Indumentaria",
            "city": "Salta, AR",
            "products": 310,
            "rating": 4.4,
            "since": "2019",
            "plan": "Avanzado",
        },
        "payout_invoices": [
            {"id": "INV-3001", "period": "2026-09", "amount": "58120.00 ARS", "status": "paid", "cbu": "0720000720000011223344"},
        ],
    },
    "c3d4e5f6-3333-3333-3333-333333333333": {
        "name": "TecnoHogar",
        "email": "soporte@tecnohogar.example",
        "password": "tecno#2017",  # demo creds
        "role": "merchant",
        "profile": {
            "category": "Electrónica",
            "city": "Rosario, AR",
            "products": 205,
            "rating": 4.7,
            "since": "2017",
            "plan": "Avanzado",
        },
        "payout_invoices": [
            {"id": "INV-4001", "period": "2026-09", "amount": "203400.00 ARS", "status": "pending", "cbu": "0140000330000055667788"},
        ],
    },
}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class ImportRequest(BaseModel):
    image_url: str


# ---------------------------------------------------------------------------
# Auth dependency
#
# VULNERABILITY 1 — JWT Algorithm Confusion.
# We intentionally DO NOT pin algorithms=["RS256"].  By passing the public key
# as the decode key and NOT restricting the accepted algorithms, an attacker
# can forge an HS256 token signed with the *public* PEM text (which is freely
# downloadable at /public.pem) and it will validate.
# ---------------------------------------------------------------------------
def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = creds.credentials
    try:
        # The public key is used as the verification key. Because algorithms is
        # left wide open, PyJWT will happily verify an HS256 token whose secret
        # is the public key string.
        payload = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=["RS256", "HS256"],
            options={"verify_signature": True},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    return payload


# ---------------------------------------------------------------------------
# Public / OSINT-friendly endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["public"])
def root():
    return {
        "service": "NubeMarts Merchant API",
        "docs": "/api/v1/docs",
        "openapi": "/api/v1/swagger.json",
        "public_key": "/public.pem",
    }


@app.get("/public.pem", response_class=PlainTextResponse, tags=["public"])
def public_pem():
    # Serving the RSA public key. Perfectly normal on its own — dangerous when
    # combined with the algorithm-confusion bug above.
    return PlainTextResponse(PUBLIC_KEY, media_type="application/x-pem-file")


@app.get("/api/v1/stores", tags=["public"])
def list_stores():
    # Public storefront directory. Exposes non-sensitive profile metadata only
    # (no credentials, no payout invoices).
    return [
        {"uuid": uuid, "name": m["name"], **m.get("profile", {})}
        for uuid, m in MOCK_DB.items()
    ]


# ---------------------------------------------------------------------------
# Login — issues a legitimate RS256 token.
# ---------------------------------------------------------------------------
@app.post("/api/v1/login", tags=["auth"])
def login(body: LoginRequest):
    for uuid, m in MOCK_DB.items():
        if m["email"] == body.email and m["password"] == body.password:
            now = datetime.datetime.now(datetime.timezone.utc)
            payload = {
                "sub": uuid,
                "name": m["name"],
                "role": m["role"],
                "iat": now,
                "exp": now + datetime.timedelta(hours=8),
            }
            token = jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")
            return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/v1/me", tags=["auth"])
def me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# VULNERABILITY 2 — BOLA.
# Requires role=admin but NEVER checks that user["sub"] == merchant_uuid.
# Any admin token can read ANY merchant's payout invoices.
# ---------------------------------------------------------------------------
@app.get("/api/v1/merchants/{merchant_uuid}/payout-invoices", tags=["merchant"])
def payout_invoices(merchant_uuid: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="admin role required")

    merchant = MOCK_DB.get(merchant_uuid)
    if not merchant:
        raise HTTPException(status_code=404, detail="merchant not found")

    # NOTE: no ownership check — token subject is ignored entirely.
    return {
        "merchant_uuid": merchant_uuid,
        "merchant_name": merchant["name"],
        "payout_invoices": merchant["payout_invoices"],
    }


# ---------------------------------------------------------------------------
# VULNERABILITY 3 — In-band SSRF.
# Fetches whatever URL the caller supplies and returns the raw body.
# No scheme/host/IP validation whatsoever.
# ---------------------------------------------------------------------------
@app.post("/api/v1/product/import", tags=["merchant"])
def import_product(body: ImportRequest, user: dict = Depends(get_current_user)):
    try:
        response = requests.get(body.image_url, timeout=5)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"fetch failed: {exc}")
    return {
        "source": body.image_url,
        "status_code": response.status_code,
        "content_type": response.headers.get("content-type", ""),
        "preview": response.text,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
