import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import { notify, requestConfirmation } from "../lib/feedback";
import { Button, Card, Input, Select } from "../components/ui";
import { PageHeader } from "../components/Page";
import type { Entity, PagedResult } from "../types";

type Resumen = {
  id: string;
  propietarioDeudorId: string;
  entidadFinanciera: string;
  numeroCredito: string | null;
  estado: string;
  principal: number;
  principalPagado: number;
  saldoPrincipal: number;
  totalContractual: number;
  costoFinancieroContractual: number;
  costoFinancieroPagado: number;
  servicioDeudaPagado: number;
  pagadoOperacionGanadera: number;
  pagadoAportesPropietario: number;
  pagadoOtrasFuentes: number;
  cuotasProgramadas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
};
type Cuota = {
  id: string;
  numeroCuota: number;
  fechaProgramada: string;
  capital: number | null;
  interes: number | null;
  seguro: number;
  comision: number;
  mora: number;
  otrosCargos: number;
  totalProgramado: number;
  totalPagado: number;
  saldoCuota: number;
  estadoCalculado: string;
  fechaPago: string | null;
  saldo: number | null;
};
type Pago = {
  id: string;
  cuotaCreditoId: string | null;
  fechaPago: string;
  documento: string | null;
  metodoPago: string | null;
  capitalPagado: number;
  interesPagado: number;
  seguroPagado: number;
  comisionPagada: number;
  moraPagada: number;
  otrosCargosPagados: number;
  totalPagado: number;
  estadoProceso: string;
};
type Fuente = {
  origenFondos: string;
  propietarioFuenteId: string | null;
  capital: number;
  interes: number;
  seguro: number;
  comision: number;
  mora: number;
  otrosCargos: number;
  total: number;
};
type Pagos = { items: Pago[]; page: number; pageSize: number; total: number };
type Origen = "OperacionGanadera" | "AporteDirectoPropietario" | "Otro";
type FuenteForm = {
  origenFondos: Origen;
  propietarioFuenteId: string;
  capital: number;
  interes: number;
  seguro: number;
  comision: number;
  mora: number;
  otrosCargos: number;
};
const cero = (): FuenteForm => ({
  origenFondos: "OperacionGanadera",
  propietarioFuenteId: "",
  capital: 0,
  interes: 0,
  seguro: 0,
  comision: 0,
  mora: 0,
  otrosCargos: 0,
});
const num = (f: FormData, k: string) => Number(f.get(k) || 0);
const totalFuente = (f: FuenteForm) =>
  f.capital + f.interes + f.seguro + f.comision + f.mora + f.otrosCargos;

export function CreditoDetallePagina() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { moneda, cultura } = useMonedaTenant();
  const dinero = (n: number) => formatearMoneda(n, moneda, cultura);
  const [tab, setTab] = useState<"cuotas" | "pagos">("cuotas");
  const [mostrarCuota, setMostrarCuota] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [fuentes, setFuentes] = useState<FuenteForm[]>([cero()]);
  const [detalle, setDetalle] = useState<string | null>(null);
  const resumen = useQuery({
    queryKey: ["deuda", id],
    queryFn: () => api<Resumen>(`/creditos/${id}/servicio-deuda`),
    enabled: !!id,
  });
  const cuotas = useQuery({
    queryKey: ["deuda-cuotas", id],
    queryFn: () => api<Cuota[]>(`/creditos/${id}/cuotas-programadas`),
    enabled: !!id,
  });
  const pagos = useQuery({
    queryKey: ["deuda-pagos", id],
    queryFn: () => api<Pagos>(`/creditos/${id}/pagos?page=1&pageSize=100`),
    enabled: !!id,
  });
  const entidades = useQuery({
    queryKey: ["entidades-deuda"],
    queryFn: () => api<PagedResult<Entity>>("/entidades?page=1&pageSize=200"),
  });
  const pagoDetalle = useQuery({
    queryKey: ["deuda-pago", id, detalle],
    queryFn: () =>
      api<{
        pago: Pago;
        fuentes: Fuente[];
        movimientos: {
          id: string;
          naturaleza: string;
          monto: number;
          estado: string;
        }[];
      }>(`/creditos/${id}/pagos/${detalle}`),
    enabled: !!detalle,
  });
  const refrescar = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["deuda", id] }),
      qc.invalidateQueries({ queryKey: ["deuda-cuotas", id] }),
      qc.invalidateQueries({ queryKey: ["deuda-pagos", id] }),
    ]);
  const confirmar = useMutation({
    mutationFn: (pagoId: string) =>
      api(`/creditos/${id}/pagos/${pagoId}/confirmar`, { method: "POST" }),
    onSuccess: () => void refrescar(),
  });
  const guardarCuota = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/creditos/${id}/cuotas`, {
        method: "POST",
        body: JSON.stringify({
          numeroCuota: num(f, "numeroCuota"),
          fechaProgramada: f.get("fechaProgramada"),
          capital: f.get("capital") ? num(f, "capital") : null,
          interes: f.get("interes") ? num(f, "interes") : null,
          seguro: num(f, "seguro"),
          comision: num(f, "comision"),
          mora: num(f, "mora"),
          otrosCargos: num(f, "otrosCargos"),
          totalProgramado: num(f, "totalProgramado"),
          saldo: f.get("saldo") ? num(f, "saldo") : null,
        }),
      });
      setMostrarCuota(false);
      await refrescar();
    } catch (error) {
      notify({
        tone: "error",
        title: "No se registró la cuota",
        message: error instanceof Error ? error.message : "Error inesperado.",
      });
    }
  };
  const guardarPago = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      cuotaCreditoId: f.get("cuotaCreditoId") || null,
      fechaPago: f.get("fechaPago"),
      documento: f.get("documento") || null,
      metodoPago: f.get("metodoPago") || null,
      observaciones: f.get("observaciones") || null,
      capitalPagado: num(f, "capital"),
      interesPagado: num(f, "interes"),
      seguroPagado: num(f, "seguro"),
      comisionPagada: num(f, "comision"),
      moraPagada: num(f, "mora"),
      otrosCargosPagados: num(f, "otrosCargos"),
      fuentes: fuentes.map((x) => ({
        ...x,
        propietarioFuenteId: x.propietarioFuenteId || null,
      })),
    };
    try {
      await api(`/creditos/${id}/pagos`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMostrarPago(false);
      setFuentes([cero()]);
      await refrescar();
    } catch (error) {
      notify({
        tone: "error",
        title: "No se registró el pago",
        message: error instanceof Error ? error.message : "Error inesperado.",
      });
    }
  };
  const actualizarFuente = (i: number, k: keyof FuenteForm, v: string) =>
    setFuentes((xs) =>
      xs.map((x, n) =>
        n === i
          ? ({
              ...x,
              [k]:
                k === "origenFondos" || k === "propietarioFuenteId"
                  ? v
                  : Number(v),
            } as FuenteForm)
          : x,
      ),
    );
  const r = resumen.data;
  const componentes = useMemo(
    () =>
      fuentes.reduce(
        (a, x) => ({
          capital: a.capital + x.capital,
          interes: a.interes + x.interes,
          seguro: a.seguro + x.seguro,
          comision: a.comision + x.comision,
          mora: a.mora + x.mora,
          otrosCargos: a.otrosCargos + x.otrosCargos,
        }),
        {
          capital: 0,
          interes: 0,
          seguro: 0,
          comision: 0,
          mora: 0,
          otrosCargos: 0,
        },
      ),
    [fuentes],
  );
  return (
    <>
      <PageHeader
        eyebrow="Finanzas"
        title={r?.numeroCredito || "Servicio de deuda"}
        description="Cuotas informadas por el banco y pagos reales, sin amortizaciones inferidas."
      />
      <Link className="btn-secondary inline-block mb-4" to="/lotes">
        Volver a créditos
      </Link>
      {r && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Principal", r.principal],
              ["Total contractual", r.totalContractual],
              ["Costo financiero contractual", r.costoFinancieroContractual],
              ["Principal pagado", r.principalPagado],
              ["Saldo principal registrado", r.saldoPrincipal],
              ["Costo financiero pagado", r.costoFinancieroPagado],
              ["Servicio de deuda pagado", r.servicioDeudaPagado],
              ["Pagado por ganadería", r.pagadoOperacionGanadera],
              ["Pagado por propietario", r.pagadoAportesPropietario],
              ["Otras fuentes", r.pagadoOtrasFuentes],
            ].map(([l, v]) => (
              <Card key={l}>
                <p className="text-sm text-slate-500">{l}</p>
                <p className="text-xl font-bold">{dinero(v as number)}</p>
              </Card>
            ))}
          </div>
          <Card>
            <p>
              <b>{r.entidadFinanciera}</b> · Estado: {r.estado} · Cuotas:{" "}
              {r.cuotasPagadas} pagadas, {r.cuotasPendientes} pendientes,{" "}
              {r.cuotasVencidas} vencidas.
            </p>
          </Card>
        </>
      )}
      <div className="my-5 flex gap-2">
        <Button
          variant={tab === "cuotas" ? "primary" : "secondary"}
          onClick={() => setTab("cuotas")}
        >
          Plan de cuotas
        </Button>
        <Button
          variant={tab === "pagos" ? "primary" : "secondary"}
          onClick={() => setTab("pagos")}
        >
          Pagos reales
        </Button>
      </div>
      {tab === "cuotas" && (
        <>
          <Card>
            <div className="flex justify-between">
              <p>
                Registre los valores según el plan de pagos proporcionado por la
                entidad financiera.
              </p>
              <Button onClick={() => setMostrarCuota((x) => !x)}>
                Registrar cuota
              </Button>
            </div>
            {mostrarCuota && (
              <form
                className="mt-4 grid gap-3 md:grid-cols-4"
                onSubmit={guardarCuota}
              >
                <Campo n="numeroCuota" l="#" tipo="number" requerido />
                <Campo n="fechaProgramada" l="Fecha" tipo="date" requerido />
                <Campo n="capital" l="Capital" tipo="number" />
                <Campo n="interes" l="Interés" tipo="number" />
                <Campo n="seguro" l="Seguro" tipo="number" />
                <Campo n="comision" l="Comisión" tipo="number" />
                <Campo n="mora" l="Mora" tipo="number" />
                <Campo n="otrosCargos" l="Otros" tipo="number" />
                <Campo
                  n="totalProgramado"
                  l="Total programado"
                  tipo="number"
                  requerido
                />
                <Campo n="saldo" l="Saldo informado" tipo="number" />
                <Button type="submit">Guardar cuota</Button>
              </form>
            )}
          </Card>
          <Card>
            <Tabla
              columnas={[
                "#",
                "Fecha",
                "Capital",
                "Interés",
                "Seguro",
                "Comisión",
                "Mora",
                "Otros",
                "Total programado",
                "Total pagado",
                "Saldo cuota",
                "Estado",
              ]}
              filas={(cuotas.data ?? []).map((x) => [
                x.numeroCuota,
                x.fechaProgramada.slice(0, 10),
                x.capital == null ? "—" : dinero(x.capital),
                x.interes == null ? "—" : dinero(x.interes),
                dinero(x.seguro),
                dinero(x.comision),
                dinero(x.mora),
                dinero(x.otrosCargos),
                dinero(x.totalProgramado),
                dinero(x.totalPagado),
                dinero(x.saldoCuota),
                x.estadoCalculado,
              ])}
            />
          </Card>
        </>
      )}
      {tab === "pagos" && (
        <>
          <Card>
            <div className="flex justify-end">
              <Button onClick={() => setMostrarPago((x) => !x)}>
                Registrar pago
              </Button>
            </div>
            {mostrarPago && (
              <form className="mt-4" onSubmit={guardarPago}>
                <div className="grid gap-3 md:grid-cols-4">
                  <Campo n="fechaPago" l="Fecha" tipo="date" requerido />
                  <label>
                    Cuota opcional
                    <Select name="cuotaCreditoId">
                      <option value="">Sin cuota</option>
                      {cuotas.data?.map((x) => (
                        <option key={x.id} value={x.id}>
                          #{x.numeroCuota} · {x.fechaProgramada.slice(0, 10)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {[
                    "capital",
                    "interes",
                    "seguro",
                    "comision",
                    "mora",
                    "otrosCargos",
                  ].map((k) => (
                    <Campo
                      key={k}
                      n={k}
                      l={
                        k === "otrosCargos"
                          ? "Otros cargos"
                            : k.charAt(0).toUpperCase() + k.slice(1)
                      }
                      tipo="number"
                    />
                  ))}
                  <Campo n="documento" l="Documento" />
                  <Campo n="metodoPago" l="Método" />
                  <Campo n="observaciones" l="Observaciones" />
                </div>
                <h3 className="mt-5 font-bold">Fuentes del pago</h3>
                {fuentes.map((x, i) => (
                  <Card key={i}>
                    <div className="grid gap-2 md:grid-cols-4">
                      <label>
                        Origen
                        <Select
                          value={x.origenFondos}
                          onChange={(e) =>
                            actualizarFuente(i, "origenFondos", e.target.value)
                          }
                        >
                          <option value="OperacionGanadera">
                            Operación ganadera
                          </option>
                          <option value="AporteDirectoPropietario">
                            Aporte directo propietario
                          </option>
                          <option value="Otro">Otro</option>
                        </Select>
                      </label>
                      {x.origenFondos === "AporteDirectoPropietario" && (
                        <label>
                          Propietario
                          <Select
                            value={x.propietarioFuenteId}
                            onChange={(e) =>
                              actualizarFuente(
                                i,
                                "propietarioFuenteId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Seleccionar…</option>
                            {entidades.data?.items.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.codigo} · {e.nombreCompletoORazonSocial}
                              </option>
                            ))}
                          </Select>
                        </label>
                      )}
                      {(
                        [
                          "capital",
                          "interes",
                          "seguro",
                          "comision",
                          "mora",
                          "otrosCargos",
                        ] as const
                      ).map((k) => (
                        <label key={k}>
                          {k}
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={x[k]}
                            onChange={(e) =>
                              actualizarFuente(i, k, e.target.value)
                            }
                          />
                        </label>
                      ))}
                      <b>Total: {dinero(totalFuente(x))}</b>
                      {fuentes.length > 1 && (
                        <Button
                          variant="danger"
                          type="button"
                          onClick={() =>
                            setFuentes((fs) => fs.filter((_, n) => n !== i))
                          }
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setFuentes((xs) => [...xs, cero()])}
                  >
                    Agregar fuente
                  </Button>
                  <Button type="submit">Guardar borrador</Button>
                </div>
                <p className="mt-2 text-sm">
                  Conciliación de fuentes: capital {dinero(componentes.capital)}
                  , interés {dinero(componentes.interes)}, total{" "}
                  {dinero(
                    Object.values(componentes).reduce((a, b) => a + b, 0),
                  )}
                  .
                </p>
              </form>
            )}
          </Card>
          <Card>
            <Tabla
              columnas={[
                "Fecha",
                "Capital",
                "Costo financiero",
                "Total",
                "Estado",
                "Acciones",
              ]}
              filas={(pagos.data?.items ?? []).map((x) => [
                x.fechaPago.slice(0, 10),
                dinero(x.capitalPagado),
                dinero(x.totalPagado - x.capitalPagado),
                dinero(x.totalPagado),
                x.estadoProceso,
                <span className="flex gap-2" key={x.id}>
                  <Button variant="secondary" onClick={() => setDetalle(x.id)}>
                    Ver detalle
                  </Button>
                  {x.estadoProceso === "Borrador" && (
                    <Button onClick={() => void confirmar.mutateAsync(x.id)}>
                      Confirmar
                    </Button>
                  )}
                </span>,
              ])}
            />
          </Card>
          {pagoDetalle.data && (
            <Card>
              <h2 className="font-bold">Detalle del pago</h2>
              <p>
                Total {dinero(pagoDetalle.data.pago.totalPagado)} · Capital{" "}
                {dinero(pagoDetalle.data.pago.capitalPagado)} · Costo financiero{" "}
                {dinero(
                  pagoDetalle.data.pago.totalPagado -
                    pagoDetalle.data.pago.capitalPagado,
                )}
              </p>
              <Tabla
                columnas={[
                  "Fuente",
                  "Capital",
                  "Interés",
                  "Seguro",
                  "Comisión",
                  "Mora",
                  "Otros",
                  "Total",
                ]}
                filas={pagoDetalle.data.fuentes.map((x) => [
                  x.origenFondos,
                  dinero(x.capital),
                  dinero(x.interes),
                  dinero(x.seguro),
                  dinero(x.comision),
                  dinero(x.mora),
                  dinero(x.otrosCargos),
                  dinero(x.total),
                ])}
              />
              <Button variant="secondary" onClick={() => setDetalle(null)}>
                Cerrar detalle
              </Button>
              {pagoDetalle.data.pago.estadoProceso === "Confirmado" && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (
                      await requestConfirmation({
                        title: "Revertir pago",
                        message:
                          "Los movimientos financieros quedarán cancelados.",
                        confirmLabel: "Revertir",
                        cancelLabel: "Volver",
                      })
                    ) {
                      await api(`/creditos/${id}/pagos/${detalle}/revertir`, {
                        method: "POST",
                        body: JSON.stringify({
                          motivo: "Reversión autorizada por el usuario",
                        }),
                      });
                      setDetalle(null);
                      await refrescar();
                    }
                  }}
                >
                  Revertir
                </Button>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
function Campo({
  n,
  l,
  tipo = "text",
  requerido = false,
}: {
  n: string;
  l: string;
  tipo?: string;
  requerido?: boolean;
}) {
  return (
    <label>
      {l}
      {requerido ? " *" : ""}
      <Input
        name={n}
        type={tipo}
        step={tipo === "number" ? "0.0001" : undefined}
        min={tipo === "number" ? "0" : undefined}
        required={requerido}
      />
    </label>
  );
}
function Tabla({
  columnas,
  filas,
}: {
  columnas: string[];
  filas: (string | number | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columnas.map((x) => (
              <th className="p-3" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr className="border-t" key={i}>
              {f.map((x, j) => (
                <td className="p-3" key={j}>
                  {x}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
