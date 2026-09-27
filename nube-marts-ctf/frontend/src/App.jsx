import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Wallet,
  DownloadCloud,
  Search,
  LogOut,
  TrendingUp,
  TrendingDown,
  Store,
  Cloud,
  ArrowUpRight,
  ArrowLeft,
  ExternalLink,
  MapPin,
  Tag,
  Settings,
  Globe,
  Star,
  Instagram,
  MessageCircle,
} from "lucide-react";

// The backend base URL is intentionally NOT rendered in the UI. It still lives
// in src/api.js (and therefore in the shipped sourcemaps) for the OSINT stage.
import { api } from "@/api";
import {
  PUBLIC_STORES,
  STORE_IMAGES,
  STORE_CATALOG,
  PRODUCTS,
  ORDERS,
  CUSTOMERS,
  METRICS,
  SALES_SERIES,
  TOP_PRODUCTS,
  CHANNELS,
  COUPONS,
  REVIEWS,
  STORE_SETTINGS,
  TRAFFIC_SOURCES,
} from "@/data/seed";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

function Sparkline({ data, className }) {
  const w = 240;
  const h = 56;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BarRow({ label, value, suffix }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 w-full border border-border">
        <div className="h-full bg-foreground" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const solid = ["pagado", "paid", "entregado", "activo"].includes(status);
  const muted = ["pendiente", "pending", "preparando", "sin_preparar", "bajo_stock"].includes(status);
  const variant = solid ? "solid" : muted ? "muted" : "outline";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}

/* -------------------------------------------------------------------------- */
/* Public catalog + login (logged-out view)                                   */
/* -------------------------------------------------------------------------- */

function StoreCover({ store, className }) {
  const src = STORE_IMAGES[store.uuid];
  if (!src) return <div className={cn("bw-grid bg-muted", className)} />;
  return (
    <img
      src={src}
      alt={`Foto de portada de ${store.name}`}
      loading="lazy"
      className={cn("w-full object-cover", className)}
    />
  );
}

function StoreCard({ store, onView }) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="overflow-hidden border-b border-border">
        <StoreCover
          store={store}
          className="h-36 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight">{store.name}</h3>
            <p className="text-xs text-muted-foreground">{store.category}</p>
          </div>
          <span className="whitespace-nowrap text-sm font-medium">★ {store.rating}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{store.city}</span>
          <span>{store.products} productos</span>
        </div>
        <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => onView(store)}>
          <Store className="h-4 w-4" />
          Ver tienda
        </Button>
      </CardContent>
    </Card>
  );
}

function LoginCard({ onLogin }) {
  const [email, setEmail] = useState("owner@pinturasdelsur.example");
  const [password, setPassword] = useState("paint-it-blue");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await api.login(email, password);
      onLogin(access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ingresar al panel</CardTitle>
        <CardDescription>Administrá tu tienda NubeMarts</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-foreground">⚠ {error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo: owner@pinturasdelsur.example / paint-it-blue
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function LandingView({ stores, onLogin, onViewStore }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <section className="mb-10 border border-border bg-card">
        <div className="p-8 md:p-12">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Vendé online. Gestioná todo desde un solo panel.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            NubeMarts es la plataforma de comercio para emprendedores y marcas de
            LATAM. Catálogo, pedidos, clientes y pagos, sin complicaciones.
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Tiendas destacadas</h2>
              <p className="text-sm text-muted-foreground">
                {stores.length} tiendas activas en la red
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stores.map((s) => (
              <StoreCard key={s.uuid} store={s} onView={onViewStore} />
            ))}
          </div>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <LoginCard onLogin={onLogin} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Public storefront ("Ver tienda")                                           */
/* -------------------------------------------------------------------------- */

function StorefrontView({ store, onBack }) {
  const isPinturas = store.uuid === "a1b2c3d4-0000-0000-0000-000000000001";
  const catalog = isPinturas
    ? PRODUCTS.filter((p) => p.status !== "agotado").slice(0, 8)
    : STORE_CATALOG[store.uuid] || [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Button variant="ghost" size="sm" className="mb-4 -ml-3" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      <Card className="overflow-hidden">
        <StoreCover store={store} className="h-56 md:h-72" />
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{store.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{store.category}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {store.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {store.city}
                </span>
              )}
              {store.rating && (
                <span className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4" /> {store.rating}
                </span>
              )}
              {store.products && <span>{store.products} productos</span>}
              {store.since && <span>Desde {store.since}</span>}
            </div>
          </div>
          <Button>
            <MessageCircle className="h-4 w-4" />
            Contactar
          </Button>
        </div>
      </Card>

      <div className="mb-4 mt-10 flex items-end justify-between">
        <h2 className="text-xl font-bold tracking-tight">Productos</h2>
        <span className="text-sm text-muted-foreground">Envío gratis desde $50.000</span>
      </div>

      {catalog.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((p) => (
            <Card key={p.sku || p.name} className="flex flex-col">
              <div className="flex h-40 items-center justify-center border-b border-border bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <p className="flex-1 text-sm font-medium leading-snug">{p.name}</p>
                <p className="text-lg font-bold">{formatCurrency(p.price)}</p>
                <Button variant="outline" size="sm" className="w-full">
                  <ShoppingCart className="h-4 w-4" />
                  Agregar al carrito
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Esta tienda todavía no publicó productos.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard sections                                                         */
/* -------------------------------------------------------------------------- */

function HomeSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{m.value}</p>
            <p className="mt-1 flex items-center gap-1 text-xs">
              {m.trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">{m.delta}</span>
              <span className="text-muted-foreground">· {m.hint}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Ventas</CardTitle>
              <CardDescription>Últimas 12 semanas</CardDescription>
            </div>
            <Badge variant="outline">+18% trimestre</Badge>
          </CardHeader>
          <CardContent>
            <Sparkline data={SALES_SERIES} className="h-16 text-foreground" />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Jul</span>
              <span>Ago</span>
              <span>Sep</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canales de venta</CardTitle>
            <CardDescription>Distribución del mes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHANNELS.map((c) => (
              <BarRow key={c.label} label={c.label} value={c.share} suffix="%" />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
          <CardDescription>Actividad de las últimas 72 horas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORDERS.slice(0, 5).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(o.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{o.channel}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(o.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsSection() {
  const [q, setQ] = useState("");
  const rows = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Productos</CardTitle>
          <CardDescription>{PRODUCTS.length} productos en catálogo</CardDescription>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.sku}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                <TableCell className="text-right">{p.stock}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OrdersSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos</CardTitle>
        <CardDescription>Historial completo de ventas</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Envío</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ORDERS.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">{o.id}</TableCell>
                <TableCell className="font-medium">{o.customer}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(o.date)}</TableCell>
                <TableCell className="text-right">{o.items}</TableCell>
                <TableCell className="text-muted-foreground">{o.channel}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.fulfillment} />
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustomersSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>{CUSTOMERS.length} clientes registrados</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Total gastado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CUSTOMERS.map((c) => (
              <TableRow key={c.email}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-muted-foreground">{c.city}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.segment}</Badge>
                </TableCell>
                <TableCell className="text-right">{c.orders}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(c.spent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatsSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
          <CardDescription>Unidades en los últimos 90 días</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TOP_PRODUCTS.map((p) => (
            <BarRow key={p.name} label={p.name} value={p.share} suffix={` · ${p.units}u`} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Indicadores del período</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-px bg-border">
          {[
            ["Ticket promedio", "$10.183"],
            ["Recompra", "34%"],
            ["Carritos abandonados", "268"],
            ["Devoluciones", "1,2%"],
            ["Nuevos clientes", "112"],
            ["Reseñas 5★", "89%"],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="mt-1 text-xl font-bold">{v}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// VULN-DRIVING SECTION — payout invoices (BOLA target).
function PayoutsSection({ token, currentUuid }) {
  const [uuid, setUuid] = useState(currentUuid || "a1b2c3d4-0000-0000-0000-000000000001");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setError("");
    setData(null);
    setLoading(true);
    try {
      setData(await api.payoutInvoices(uuid, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos y liquidaciones</CardTitle>
        <CardDescription>Consultá las facturas de payout de tu tienda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="merchant">Merchant UUID</Label>
            <Input
              id="merchant"
              className="font-mono text-xs"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={load} disabled={loading}>
              <Wallet className="h-4 w-4" />
              {loading ? "Cargando…" : "Ver facturas de payout"}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm font-medium">⚠ {error}</p>}

        {data && (
          <div className="border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
              <span className="text-sm font-semibold">{data.merchant_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{data.merchant_uuid}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payout_invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.id}</TableCell>
                    <TableCell>{inv.period}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{inv.note || inv.cbu || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{inv.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// VULN-DRIVING SECTION — product import (SSRF target).
function ImportSection({ token }) {
  const [url, setUrl] = useState("https://picsum.photos/seed/paint/400");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setError("");
    setPreview(null);
    setLoading(true);
    try {
      setPreview(await api.importProduct(url, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar producto desde URL de imagen</CardTitle>
        <CardDescription>
          Pegá la URL de la imagen del producto y la traemos por vos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
          <Button onClick={run} disabled={loading}>
            <DownloadCloud className="h-4 w-4" />
            {loading ? "Importando…" : "Importar"}
          </Button>
        </div>
        {error && <p className="text-sm font-medium">⚠ {error}</p>}
        {preview && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">HTTP {preview.status_code}</Badge>
              <Badge variant="muted">{preview.content_type || "sin content-type"}</Badge>
            </div>
            <pre className="max-h-72 overflow-auto border border-border bg-muted p-3 text-xs">
              {preview.preview}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiscountsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Descuentos y cupones</CardTitle>
        <CardDescription>Campañas de promoción activas</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Usos</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COUPONS.map((c) => (
              <TableRow key={c.code}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="text-muted-foreground">{c.type}</TableCell>
                <TableCell>{c.value}</TableCell>
                <TableCell className="text-right">
                  {c.uses}
                  {c.limit ? ` / ${c.limit}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(c.expires)}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StorefrontSection() {
  const s = STORE_SETTINGS;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mi tienda</CardTitle>
            <CardDescription>Dominio, diseño y medios de pago</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-px bg-border sm:grid-cols-2">
            {[
              ["Dominio NubeMarts", s.domain],
              ["Dominio propio", s.customDomain],
              ["Tema", s.theme],
              ["Moneda", s.currency],
              ["Medios de pago", s.payment.join(" · ")],
              ["Envíos", s.shipping.join(" · ")],
            ].map(([k, v]) => (
              <div key={k} className="bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="mt-1 text-sm font-medium">{v}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Reseñas recientes</CardTitle>
              <CardDescription>Calificación media 4,8 / 5</CardDescription>
            </div>
            <Badge variant="solid">
              <Star className="h-3.5 w-3.5" /> 4,8
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {REVIEWS.map((r, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.author}</span>
                  <span className="text-xs">{"★".repeat(r.rating)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.product}</p>
                <p className="mt-1 text-sm">{r.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Como la ven tus clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-border">
              <div className="flex items-center justify-between border-b border-border bg-foreground px-3 py-2 text-background">
                <span className="text-xs font-bold uppercase tracking-widest">Pinturas del Sur</span>
                <Globe className="h-3.5 w-3.5" />
              </div>
              <div className="relative h-28">
                <StoreCover store={PUBLIC_STORES[0]} className="h-28" />
                <span className="absolute inset-0 m-auto h-fit w-fit bg-card px-2 text-sm font-semibold">
                  Envío gratis +$50.000
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                {PRODUCTS.slice(0, 4).map((p) => (
                  <div key={p.sku} className="bg-card p-2">
                    <div className="mb-1 h-12 bw-grid" />
                    <p className="truncate text-[10px]">{p.name}</p>
                    <p className="text-[10px] font-semibold">{formatCurrency(p.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Instagram className="h-4 w-4" /> {s.social.instagram}
            </p>
            <p className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> {s.social.whatsapp}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Datos de la tienda</CardTitle>
          <CardDescription>Información fiscal y de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rz">Razón social</Label>
            <Input id="rz" defaultValue="Pinturas del Sur S.R.L." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT</Label>
            <Input id="cuit" defaultValue="30-71234567-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mail">Email de contacto</Label>
            <Input id="mail" defaultValue="owner@pinturasdelsur.example" />
          </div>
          <Button>Guardar cambios</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fuentes de tráfico</CardTitle>
          <CardDescription>De dónde llegan tus visitas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TRAFFIC_SOURCES.map((t) => (
            <BarRow key={t.label} label={t.label} value={t.share} suffix="%" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard shell (sidebar + topbar)                                         */
/* -------------------------------------------------------------------------- */
const NAV = [
  { id: "home", label: "Inicio", icon: LayoutDashboard },
  { id: "products", label: "Productos", icon: Package },
  { id: "orders", label: "Pedidos", icon: ShoppingCart },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "discounts", label: "Descuentos", icon: Tag },
  { id: "stats", label: "Estadísticas", icon: BarChart3 },
  { id: "store", label: "Mi tienda", icon: Store },
  { id: "payouts", label: "Pagos", icon: Wallet },
  { id: "import", label: "Importar", icon: DownloadCloud },
  { id: "settings", label: "Configuración", icon: Settings },
];

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

function Dashboard({ token, onLogout }) {
  const [section, setSection] = useState("home");
  const user = useMemo(() => decodeJwt(token), [token]);

  const titleMap = {
    home: "Inicio",
    products: "Productos",
    orders: "Pedidos",
    customers: "Clientes",
    discounts: "Descuentos",
    stats: "Estadísticas",
    store: "Mi tienda",
    payouts: "Pagos",
    import: "Importar producto",
    settings: "Configuración",
  };

  return (
    <div className="grid min-h-[calc(100vh-57px)] grid-cols-1 md:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-border bg-card md:block">
        <nav className="sticky top-[57px] flex flex-col p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <Separator className="my-3" />
          <div className="px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tienda</p>
            <p className="mt-1 truncate text-sm font-semibold">{user.name || "Mi tienda"}</p>
            <Badge variant="outline" className="mt-2">
              {user.role || "merchant"}
            </Badge>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="min-w-0 p-6">
        {/* Mobile nav */}
        <div className="mb-4 md:hidden">
          <Tabs value={section} onValueChange={setSection}>
            <TabsList className="flex w-full flex-wrap">
              {NAV.map((n) => (
                <TabsTrigger key={n.id} value={n.id}>
                  {n.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{titleMap[section]}</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} · sesión iniciada como {user.role}
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpRight className="h-4 w-4" />
                Sesión
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Token de sesión</DialogTitle>
                <DialogDescription>
                  JWT actual (para depuración). Se verifica contra la clave pública del backend.
                </DialogDescription>
              </DialogHeader>
              <pre className="max-h-40 overflow-auto border border-border bg-muted p-3 text-[10px] break-all whitespace-pre-wrap">
                {token}
              </pre>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {section === "home" && <HomeSection />}
        {section === "products" && <ProductsSection />}
        {section === "orders" && <OrdersSection />}
        {section === "customers" && <CustomersSection />}
        {section === "discounts" && <DiscountsSection />}
        {section === "stats" && <StatsSection />}
        {section === "store" && <StorefrontSection />}
        {section === "payouts" && <PayoutsSection token={token} currentUuid={user.sub} />}
        {section === "import" && <ImportSection token={token} />}
        {section === "settings" && <SettingsSection />}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("nm_token") || "");
  const [stores, setStores] = useState(PUBLIC_STORES);
  const [viewStore, setViewStore] = useState(null);

  useEffect(() => {
    api
      .stores()
      .then((s) => Array.isArray(s) && s.length && setStores(s))
      .catch(() => setStores(PUBLIC_STORES));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [viewStore]);

  function handleLogin(t) {
    localStorage.setItem("nm_token", t);
    setToken(t);
  }
  function handleLogout() {
    localStorage.removeItem("nm_token");
    setToken("");
    setViewStore(null);
  }

  // "Ver tienda" from the admin header opens the logged-in merchant's storefront.
  function openOwnStore() {
    const sub = decodeJwt(token).sub;
    const own =
      stores.find((s) => s.uuid === sub) ||
      PUBLIC_STORES.find((s) => s.uuid === sub) ||
      PUBLIC_STORES[0];
    setViewStore(own);
  }

  let content;
  if (viewStore) {
    content = <StorefrontView store={viewStore} onBack={() => setViewStore(null)} />;
  } else if (token) {
    content = <Dashboard token={token} onLogout={handleLogout} />;
  } else {
    content = <LandingView stores={stores} onLogin={handleLogin} onViewStore={setViewStore} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-14 items-center justify-between px-6">
          <button
            className="flex items-center gap-2"
            onClick={() => setViewStore(null)}
            aria-label="Ir al inicio"
          >
            <div className="flex h-8 w-8 items-center justify-center bg-foreground text-background">
              <Cloud className="h-4 w-4" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">NubeMarts</span>
          </button>
          <div className="flex items-center gap-2">
            {token && !viewStore && (
              <Button variant="outline" size="sm" onClick={openOwnStore}>
                <ExternalLink className="h-4 w-4" />
                Ver tienda
              </Button>
            )}
            {token && (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            )}
          </div>
        </div>
      </header>

      {content}
    </div>
  );
}
