import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Beef,
  CircleDollarSign,
  MapPinOff,
  Tags,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/ui";
import { PageHeader } from "../components/Page";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";

interface DashboardData {
  animalesActivos: number;
  hembras: number;
  machos: number;
  sinArete: number;
  nacimientoDesconocido: number;
  sinUbicacion: number;
  ingresos: number;
  gastos: number;
  flujoNeto: number;
  valorAdministrativoHato: number;
  porPropietario: { nombre: string; cantidad: number }[];
  lotes: {
    nombre: string;
    cantidadEsperada: number;
    cantidadRegistrada: number;
    costoAdministrativoAtribuido: number;
  }[];
  creditos: { cantidad: number; principalTotal: number; totalContractual: number; costoFinancieroTotal: number };
}

export function DashboardPage() {
  const { moneda, cultura } = useMonedaTenant();
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError)
    return (
      <Card>
        <p className="font-semibold text-red-700">
          No se pudo cargar el panel.
        </p>
        <p className="mt-1 text-sm text-slate-500">{query.error.message}</p>
      </Card>
    );
  const data = query.data;
  if (!data) return null;
  const indicators = [
    {
      label: "Animales activos",
      value: data.animalesActivos,
      icon: Beef,
      tone: "bg-pine-50 text-pine-700",
    },
    {
      label: "Valor administrativo",
      value: formatearMoneda(data.valorAdministrativoHato, moneda, cultura),
      icon: CircleDollarSign,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Flujo neto",
      value: formatearMoneda(data.flujoNeto, moneda, cultura),
      icon: TrendingUp,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Sin ubicación",
      value: data.sinUbicacion,
      icon: MapPinOff,
      tone: "bg-red-50 text-red-700",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Resumen operativo"
        title="Buenos días"
        description="Una lectura clara del hato y sus números, actualizada con los registros del tenant activo."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {value}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="mb-5">
            <h2 className="font-display text-lg font-bold">
              Animales por propietario
            </h2>
            <p className="text-sm text-slate-500">
              Propiedad vigente, sin mezclar procedencia ni ubicación.
            </p>
          </div>
          <div className="h-72">
            {data.porPropietario.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.porPropietario} margin={{ left: -20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#dbe2dd"
                  />
                  <XAxis dataKey="nombre" axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: "#edf5f1" }} />
                  <Bar
                    dataKey="cantidad"
                    fill="#26735c"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">
                Registra el primer animal para ver la distribución.
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">
            Calidad del inventario
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              [Tags, "Sin arete", data.sinArete, "El arete es opcional"],
              [
                Activity,
                "Nacimiento desconocido",
                data.nacimientoDesconocido,
                "No se inventan fechas",
              ],
              [
                UserRound,
                "Hembras / machos",
                `${data.hembras} / ${data.machos}`,
                "Estado actual",
              ],
            ].map(([Icon, label, value, detail]) => {
              const ItemIcon = Icon as typeof Tags;
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                >
                  <span className="rounded-lg bg-white p-2 text-pine-600 shadow-sm dark:bg-slate-900">
                    <ItemIcon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{String(label)}</p>
                    <p className="text-xs text-slate-500">{String(detail)}</p>
                  </div>
                  <strong className="font-display text-lg">
                    {String(value)}
                  </strong>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">
              Progreso de lotes
            </h2>
            <p className="text-sm text-slate-500">
              Seguimiento de animales registrados frente a los esperados por compra.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-pine-600">
            {data.lotes.reduce((sum, x) => sum + x.cantidadRegistrada, 0)} de{" "}
            {data.lotes.reduce((sum, x) => sum + x.cantidadEsperada, 0)}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.lotes.map((lot) => {
            const percent = lot.cantidadEsperada
              ? (lot.cantidadRegistrada / lot.cantidadEsperada) * 100
              : 0;
            return (
              <div
                key={lot.nombre}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="flex justify-between text-sm">
                  <strong>{lot.nombre}</strong>
                  <span>
                    {lot.cantidadRegistrada}/{lot.cantidadEsperada}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-clay-400"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Base administrativa:{" "}
                  {formatearMoneda(lot.costoAdministrativoAtribuido, moneda, cultura)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 h-20 animate-pulse rounded-2xl bg-white/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((x) => (
          <div key={x} className="h-32 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
    </>
  );
}
