/*
 * Seed data for the NubeMarts merchant back-office.
 * This is mock storefront content (products, orders, customers, metrics) used
 * to make the dashboard feel like a real Tiendanube-style operation.
 *
 * NOTE: payout invoices are NOT seeded here — those come from the backend
 * (see src/api.js -> payoutInvoices) which is where the interesting data lives.
 */

// Cover photos for the public store directory (Unsplash). Keyed by merchant
// UUID so they also apply to the list returned by the backend /stores endpoint.
const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

export const STORE_IMAGES = {
  "a1b2c3d4-0000-0000-0000-000000000001": unsplash("1562259949-e8e7689d7828"), // pintura
  "f9e8d7c6-1111-1111-1111-111111111111": unsplash("1495474472287-4d71bcdd2085"), // café
  "b2c3d4e5-2222-2222-2222-222222222222": unsplash("1441986300917-64674bd600d8"), // indumentaria
  "c3d4e5f6-3333-3333-3333-333333333333": unsplash("1498049794561-7780e7231661"), // electrónica
  "d4e5f6a7-4444-4444-4444-444444444444": unsplash("1416879595882-3373a0480b5b"), // vivero
  "e5f6a7b8-5555-5555-5555-555555555555": unsplash("1507842217343-583bb7270b66"), // librería
};

// Storefront catalog shown in the public "Ver tienda" view for stores other
// than Pinturas del Sur (which uses PRODUCTS below).
export const STORE_CATALOG = {
  "f9e8d7c6-1111-1111-1111-111111111111": [
    { name: "Café de especialidad 250g — Colombia", price: 8900 },
    { name: "Café molido 500g — Blend de la casa", price: 12400 },
    { name: "Prensa francesa 600ml", price: 23900 },
    { name: "Taza cerámica esmaltada", price: 6500 },
  ],
  "b2c3d4e5-2222-2222-2222-222222222222": [
    { name: "Poncho salteño tradicional", price: 64900 },
    { name: "Sweater de lana de llama", price: 48900 },
    { name: "Remera algodón orgánico", price: 15900 },
    { name: "Bufanda tejida a mano", price: 18500 },
  ],
  "c3d4e5f6-3333-3333-3333-333333333333": [
    { name: "Auriculares inalámbricos", price: 54900 },
    { name: "Parlante Bluetooth portátil", price: 39900 },
    { name: "Smartwatch deportivo", price: 89900 },
    { name: "Cargador rápido USB-C 30W", price: 14900 },
  ],
  "d4e5f6a7-4444-4444-4444-444444444444": [
    { name: "Monstera deliciosa — maceta 20cm", price: 21900 },
    { name: "Suculentas x6 surtidas", price: 9900 },
    { name: "Sustrato premium 25L", price: 7800 },
    { name: "Maceta de barro 30cm", price: 11200 },
  ],
  "e5f6a7b8-5555-5555-5555-555555555555": [
    { name: "Cuaderno A5 tapa dura", price: 6900 },
    { name: "Set de lápices de colores x24", price: 12900 },
    { name: "Agenda 2027 semanal", price: 15400 },
    { name: "Resaltadores pastel x6", price: 5900 },
  ],
};

export const PUBLIC_STORES = [
  {
    uuid: "a1b2c3d4-0000-0000-0000-000000000001",
    name: "Pinturas del Sur",
    category: "Hogar y Construcción",
    city: "Bahía Blanca, AR",
    products: 128,
    rating: 4.8,
    since: "2018",
    plan: "Evolución",
  },
  {
    uuid: "f9e8d7c6-1111-1111-1111-111111111111",
    name: "Café Central",
    category: "Alimentos y Bebidas",
    city: "Córdoba, AR",
    products: 42,
    rating: 4.6,
    since: "2020",
    plan: "Emprender",
  },
  {
    uuid: "b2c3d4e5-2222-2222-2222-222222222222",
    name: "Indumentaria Norte",
    category: "Indumentaria",
    city: "Salta, AR",
    products: 310,
    rating: 4.4,
    since: "2019",
    plan: "Avanzado",
  },
  {
    uuid: "c3d4e5f6-3333-3333-3333-333333333333",
    name: "TecnoHogar",
    category: "Electrónica",
    city: "Rosario, AR",
    products: 205,
    rating: 4.7,
    since: "2017",
    plan: "Avanzado",
  },
  {
    uuid: "d4e5f6a7-4444-4444-4444-444444444444",
    name: "Verde Vivero",
    category: "Jardín",
    city: "La Plata, AR",
    products: 89,
    rating: 4.9,
    since: "2021",
    plan: "Emprender",
  },
  {
    uuid: "e5f6a7b8-5555-5555-5555-555555555555",
    name: "Librería Papel",
    category: "Librería",
    city: "Mendoza, AR",
    products: 156,
    rating: 4.5,
    since: "2016",
    plan: "Evolución",
  },
];

export const PRODUCTS = [
  { sku: "PIN-LTX-4L-BCO", name: "Látex Interior Mate 4L — Blanco", category: "Látex", price: 18990, stock: 240, status: "activo" },
  { sku: "PIN-LTX-20L-BCO", name: "Látex Interior Mate 20L — Blanco", category: "Látex", price: 74990, stock: 63, status: "activo" },
  { sku: "PIN-ESM-1L-NEG", name: "Esmalte Sintético 1L — Negro Brillante", category: "Esmaltes", price: 9450, stock: 118, status: "activo" },
  { sku: "PIN-ESM-1L-GRS", name: "Esmalte Sintético 1L — Gris Grafito", category: "Esmaltes", price: 9450, stock: 12, status: "bajo_stock" },
  { sku: "PIN-IMP-10L-MEM", name: "Membrana Impermeabilizante 10L", category: "Impermeabilizantes", price: 42990, stock: 37, status: "activo" },
  { sku: "PIN-ROD-23-ANT", name: "Rodillo Antigota 23cm + Bandeja", category: "Accesorios", price: 6200, stock: 0, status: "agotado" },
  { sku: "PIN-PIN-2-PROF", name: "Pincel Profesional 2\" Cerda Blanca", category: "Accesorios", price: 3100, stock: 512, status: "activo" },
  { sku: "PIN-LTX-4L-CIE", name: "Látex Exterior Satinado 4L — Cielo", category: "Látex", price: 21990, stock: 74, status: "activo" },
  { sku: "PIN-DIL-1L-AGU", name: "Diluyente Aguarrás 1L", category: "Solventes", price: 4300, stock: 205, status: "activo" },
  { sku: "PIN-FON-4L-FIJ", name: "Fondo Fijador al Agua 4L", category: "Preparación", price: 15990, stock: 96, status: "activo" },
  { sku: "PIN-CIN-48-ENM", name: "Cinta de Enmascarar 48mm x 40m", category: "Accesorios", price: 2450, stock: 340, status: "activo" },
  { sku: "PIN-LTX-20L-HUE", name: "Látex Interior Mate 20L — Hueso", category: "Látex", price: 76990, stock: 8, status: "bajo_stock" },
];

export const ORDERS = [
  { id: "#1042", customer: "Marina Rossi", date: "2026-09-24T14:20:00", items: 3, total: 92430, channel: "Tienda online", status: "pagado", fulfillment: "enviado" },
  { id: "#1041", customer: "Corralón El Ancla", date: "2026-09-24T11:02:00", items: 12, total: 489900, channel: "Mayorista", status: "pagado", fulfillment: "preparando" },
  { id: "#1040", customer: "Julián Paredes", date: "2026-09-23T18:45:00", items: 1, total: 18990, channel: "Instagram", status: "pendiente", fulfillment: "sin_preparar" },
  { id: "#1039", customer: "Estudio Kübler", date: "2026-09-23T09:30:00", items: 6, total: 154200, channel: "Tienda online", status: "pagado", fulfillment: "entregado" },
  { id: "#1038", customer: "Sofía Marín", date: "2026-09-22T16:10:00", items: 2, total: 27440, channel: "Tienda online", status: "reembolsado", fulfillment: "cancelado" },
  { id: "#1037", customer: "Obras Delta SRL", date: "2026-09-22T10:05:00", items: 20, total: 812300, channel: "Mayorista", status: "pagado", fulfillment: "enviado" },
  { id: "#1036", customer: "Camila Ortiz", date: "2026-09-21T13:55:00", items: 4, total: 61200, channel: "Tienda online", status: "pagado", fulfillment: "entregado" },
  { id: "#1035", customer: "Diego Fuentes", date: "2026-09-21T08:40:00", items: 1, total: 9450, channel: "WhatsApp", status: "pendiente", fulfillment: "sin_preparar" },
];

export const CUSTOMERS = [
  { name: "Marina Rossi", email: "marina.rossi@gmail.com", city: "Bahía Blanca", orders: 14, spent: 612300, segment: "VIP" },
  { name: "Corralón El Ancla", email: "compras@elancla.com.ar", city: "Punta Alta", orders: 38, spent: 4820900, segment: "Mayorista" },
  { name: "Estudio Kübler", email: "hola@kubler.studio", city: "Bahía Blanca", orders: 9, spent: 398400, segment: "Recurrente" },
  { name: "Julián Paredes", email: "jparedes@outlook.com", city: "Coronel Suárez", orders: 2, spent: 37980, segment: "Nuevo" },
  { name: "Obras Delta SRL", email: "admin@obrasdelta.com", city: "Bahía Blanca", orders: 51, spent: 9120400, segment: "Mayorista" },
  { name: "Camila Ortiz", email: "cami.ortiz@gmail.com", city: "Monte Hermoso", orders: 6, spent: 142800, segment: "Recurrente" },
];

// KPI cards on the dashboard home.
export const METRICS = [
  { label: "Ventas del mes", value: "$3.482.900", delta: "+12,4%", trend: "up", hint: "vs. mes anterior" },
  { label: "Pedidos", value: "342", delta: "+8,1%", trend: "up", hint: "63 pendientes" },
  { label: "Visitas", value: "18.209", delta: "-3,2%", trend: "down", hint: "últimos 30 días" },
  { label: "Conversión", value: "1,88%", delta: "+0,3pt", trend: "up", hint: "media del rubro 1,5%" },
];

// 12-week sales sparkline (relative values, 0-100).
export const SALES_SERIES = [38, 42, 40, 55, 51, 62, 58, 70, 66, 74, 81, 88];

export const TOP_PRODUCTS = [
  { name: "Látex Interior 20L — Blanco", units: 412, share: 100 },
  { name: "Esmalte Sintético 1L — Negro", units: 318, share: 77 },
  { name: "Membrana Impermeabilizante 10L", units: 264, share: 64 },
  { name: "Fondo Fijador al Agua 4L", units: 190, share: 46 },
  { name: "Rodillo Antigota 23cm", units: 151, share: 37 },
];

export const CHANNELS = [
  { label: "Tienda online", share: 58 },
  { label: "Mayorista", share: 26 },
  { label: "Instagram", share: 9 },
  { label: "WhatsApp", share: 7 },
];


export const COUPONS = [
  { code: "OTONO15", type: "Porcentaje", value: "15%", uses: 214, limit: 500, status: "activo", expires: "2026-10-31" },
  { code: "ENVIOGRATIS", type: "Envío", value: "Gratis", uses: 1032, limit: 0, status: "activo", expires: "2026-12-31" },
  { code: "MAYORISTA10", type: "Porcentaje", value: "10%", uses: 47, limit: 100, status: "activo", expires: "2026-11-15" },
  { code: "BIENVENIDA", type: "Monto fijo", value: "$2.000", uses: 389, limit: 0, status: "pausado", expires: "2027-01-31" },
  { code: "INVIERNO25", type: "Porcentaje", value: "25%", uses: 500, limit: 500, status: "agotado", expires: "2026-08-31" },
];

export const REVIEWS = [
  { author: "Marina R.", rating: 5, product: "Látex Interior 20L", text: "Excelente cubrimiento, rindió más de lo esperado.", date: "2026-09-20T10:00:00" },
  { author: "Obras Delta", rating: 5, product: "Membrana 10L", text: "Compra mayorista impecable, entrega en 48hs.", date: "2026-09-18T15:30:00" },
  { author: "Julián P.", rating: 4, product: "Esmalte Negro 1L", text: "Buen producto, tardó un poco el envío.", date: "2026-09-15T09:10:00" },
  { author: "Camila O.", rating: 5, product: "Rodillo Antigota", text: "Muy buena terminación, sin marcas.", date: "2026-09-12T18:45:00" },
];

export const STORE_SETTINGS = {
  domain: "pinturasdelsur.mitiendanube.com",
  customDomain: "www.pinturasdelsur.com.ar",
  theme: "Editorial B/N",
  currency: "ARS",
  languages: ["Español"],
  payment: ["Mercado Pago", "Transferencia", "Efectivo"],
  shipping: ["Correo Argentino", "Andreani", "Retiro en local"],
  social: { instagram: "@pinturasdelsur", facebook: "PinturasDelSurBB", whatsapp: "+54 291 456-7890" },
};

export const TRAFFIC_SOURCES = [
  { label: "Búsqueda orgánica", share: 44 },
  { label: "Directo", share: 28 },
  { label: "Redes sociales", share: 18 },
  { label: "Referidos", share: 10 },
];
