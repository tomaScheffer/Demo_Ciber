/*
 * NubeMarts frontend API client.
 *
 * ---------------------------------------------------------------------------
 * INTERNAL DEV NOTES (do not ship to prod... but we totally did, see sourcemap)
 * ---------------------------------------------------------------------------
 * Backend base URL:            http://localhost:8000
 * OpenAPI / Swagger schema:    http://localhost:8000/api/v1/swagger.json
 * Interactive docs:            http://localhost:8000/api/v1/docs
 * RSA public key (JWT verify): http://localhost:8000/public.pem
 *
 * TODO(security): the payout-invoices endpoint takes a merchant UUID in the
 * path — double check we actually scope it to the logged-in merchant before
 * launch. Pinturas del Sur UUID: a1b2c3d4-0000-0000-0000-000000000001
 * ---------------------------------------------------------------------------
 */

// Backend API URL. Overridable via env, defaults to the local backend.
export const BACKEND_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// Well-known backend paths (kept here so the whole team uses the same ones).
export const API_ENDPOINTS = {
  swagger: "/api/v1/swagger.json",
  publicKey: "/public.pem",
  login: "/api/v1/login",
  stores: "/api/v1/stores",
  payoutInvoices: (uuid) => `/api/v1/merchants/${uuid}/payout-invoices`,
  importProduct: "/api/v1/product/import",
};

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : data.detail || res.statusText);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request(API_ENDPOINTS.login, { method: "POST", body: { email, password } }),
  stores: () => request(API_ENDPOINTS.stores),
  payoutInvoices: (uuid, token) =>
    request(API_ENDPOINTS.payoutInvoices(uuid), { token }),
  importProduct: (image_url, token) =>
    request(API_ENDPOINTS.importProduct, {
      method: "POST",
      token,
      body: { image_url },
    }),
};
