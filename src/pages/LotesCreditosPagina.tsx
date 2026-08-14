import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Entity, PagedResult } from "../types";
import { Button, Card, Input, Select } from "../components/ui";
import { PageHeader } from "../components/Page";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import { notify, requestConfirmation } from "../lib/feedback";
import {
  calcularCostoFinanciero,
  calcularMaximoFinanciable,
  endpointsCredito,
  normalizarFechaFormulario,
} from "../lib/creditos";

interface Lot {
  id: string;
  nombre: string;
  fechaCompra: string;
  propietarioAdquirenteId: string;
  cantidadEsperada: number;
  cantidadRegistrada: number;
  precioCompraOriginal: number;
  costoAdministrativoAtribuido: number;
  costoTotalCalculado: number;
  montoFinanciado: number;
  montoSinFinanciamientoRegistrado: number;
  estado: string;
}
interface Credit {
  id: string;
  propietarioDeudorId: string;
  entidadFinanciera: string;
  numeroCredito: string | null;
  fechaDesembolso: string;
  fechaPrimeraCuota: string | null;
  principal: number;
  totalContractual: number;
  costoFinancieroContractual: number;
  montoAplicadoCompras: number;
  montoAplicadoOtrosDestinos: number;
  principalAsignado: number;
  principalSinAsignar: number;
  principalDisponible: number;
  plazoMeses: number;
  cantidadCuotas: number;
  frecuencia: string;
  tasa: number | null;
  estado: string;
  observaciones: string | null;
}
interface Financing {
  id: string;
  loteCompraId: string;
  compra: string;
  fechaCompra: string;
  costoCompra: number;
  montoFinanciado: number;
  observaciones: string | null;
}
interface DestinoCredito {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  ambito: string;
  observaciones: string | null;
}
interface CategoriaFinancieraOpcion {id:string;codigo:string;nombre:string;naturaleza:string}

export function LotsPage() {
  const navigate = useNavigate();
  const { moneda, cultura } = useMonedaTenant();
  const client = useQueryClient();
  const [formulario, setFormulario] = useState(false);
  const [editando, setEditando] = useState<Credit | null>(null);
  const [creditoAplicandoId, setCreditoAplicandoId] = useState<string | null>(
    null,
  );
  const [principal, setPrincipal] = useState(0);
  const [total, setTotal] = useState(0);
  const [compraSeleccionada, setCompraSeleccionada] = useState("");
  const [financiamientoEditando, setFinanciamientoEditando] =
    useState<Financing | null>(null);
  const [registrandoDestino, setRegistrandoDestino] = useState(false);
  const lots = useQuery({
    queryKey: ["lots"],
    queryFn: () => api<Lot[]>("/lotes"),
  });
  const credits = useQuery({
    queryKey: ["credits"],
    queryFn: () => api<Credit[]>("/creditos"),
  });
  const aplicando =
    credits.data?.find((c) => c.id === creditoAplicandoId) ?? null;
  const setAplicando = (credito: Credit | null) =>
    setCreditoAplicandoId(credito?.id ?? null);
  const entities = useQuery({
    queryKey: ["entities", "credits"],
    queryFn: () =>
      api<PagedResult<Entity>>(
        "/entidades?page=1&pageSize=200&search=&incluirInactivos=false",
      ),
  });
  const financiamientos = useQuery({
    queryKey: ["credit-financing", aplicando?.id],
    queryFn: () =>
      api<Financing[]>(endpointsCredito.financiamientos(aplicando!.id)),
    enabled: !!aplicando,
  });
  const destinos = useQuery({
    queryKey: ["credit-destinations", aplicando?.id],
    queryFn: () => api<DestinoCredito[]>(`/creditos/${aplicando!.id}/destinos`),
    enabled: !!aplicando,
  });
  const categoriasFinancieras=useQuery({queryKey:["financial-categories"],queryFn:()=>api<CategoriaFinancieraOpcion[]>("/finanzas/categorias")});
  const comprasDisponibles = useMemo(
    () =>
      (lots.data ?? []).filter(
        (l) =>
          aplicando &&
          l.propietarioAdquirenteId === aplicando.propietarioDeudorId &&
          (l.estado === "Completo" || l.estado === "Cerrado"),
      ),
    [lots.data, aplicando],
  );

  const guardarCredito = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const body = JSON.stringify({
        propietarioDeudorId: data.get("propietarioDeudorId"),
        entidadFinanciera: data.get("entidadFinanciera"),
        numeroCredito: data.get("numeroCredito") || null,
        fechaDesembolso: data.get("fechaDesembolso"),
        principal: Number(data.get("principal")),
        plazoMeses: Number(data.get("plazoMeses")),
        cantidadCuotas: Number(data.get("cantidadCuotas")),
        frecuencia: data.get("frecuencia"),
        tasa: data.get("tasa") ? Number(data.get("tasa")) : null,
        totalContractual: Number(data.get("totalContractual")),
        fechaPrimeraCuota: data.get("fechaPrimeraCuota") || null,
        observaciones: data.get("observaciones") || null,
      });
      await api(
        editando
          ? endpointsCredito.detalle(editando.id)
          : endpointsCredito.crear,
        { method: editando ? "PUT" : "POST", body },
      );
      notify({
        tone: "success",
        title: "Crédito guardado como borrador",
        message:
          "El crédito todavía no puede aplicarse a compras hasta ser confirmado.",
      });
      setFormulario(false);
      setEditando(null);
      await client.invalidateQueries({ queryKey: ["credits"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se guardó el crédito",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };

  const confirmar = async (credito: Credit) => {
    if (
      !(await requestConfirmation({
        title: "Confirmar crédito",
        message:
          "Al confirmar el crédito los datos contractuales quedarán bloqueados y podrá utilizarse para registrar financiamiento de compras.",
        confirmLabel: "Confirmar",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(endpointsCredito.confirmar(credito.id), { method: "POST" });
      await client.invalidateQueries({ queryKey: ["credits"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se confirmó el crédito",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };
  const anular = async (credito: Credit) => {
    if (
      !(await requestConfirmation({
        title: "Anular borrador",
        message: "El crédito borrador quedará cancelado.",
        confirmLabel: "Anular",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(endpointsCredito.anular(credito.id), { method: "POST" });
      await client.invalidateQueries({ queryKey: ["credits"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se anuló el crédito",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };
  const aplicar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!aplicando) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const options = {
        method: financiamientoEditando ? "PUT" : "POST",
        body: JSON.stringify({
          loteCompraId: data.get("loteCompraId"),
          montoFinanciado: Number(data.get("montoFinanciado")),
          observaciones: data.get("observaciones") || null,
        }),
      };
      await api(
        financiamientoEditando
          ? endpointsCredito.financiamiento(
              aplicando.id,
              financiamientoEditando.id,
            )
          : endpointsCredito.aplicar(aplicando.id),
        options,
      );
      notify({
        tone: "success",
        title: financiamientoEditando
          ? "Aplicación actualizada"
          : "Financiamiento aplicado",
        message:
          "La atribución no modifica la compra, los animales ni el inventario.",
      });
      form.reset();
      setFinanciamientoEditando(null);
      setCompraSeleccionada("");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["credits"] }),
        client.invalidateQueries({ queryKey: ["lots"] }),
        financiamientos.refetch(),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se aplicó el financiamiento",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };
  const guardarDestino = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!aplicando) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/creditos/${aplicando.id}/destinos`, {
        method: "POST",
        body: JSON.stringify({
          fecha: data.get("fecha"),
          descripcion: data.get("descripcion"),
          monto: Number(data.get("monto")),
          ambito: data.get("ambito"),
          categoriaFinancieraId: data.get("categoriaFinancieraId") || null,
          observaciones: data.get("observaciones") || null,
        }),
      });
      form.reset();
      setRegistrandoDestino(false);
      notify({
        tone: "success",
        title: "Destino registrado",
        message: "El principal quedó asignado sin alterar costos del ganado.",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["credits"] }),
        destinos.refetch(),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se registró el destino",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const quitar = async (id: string) => {
    if (
      !aplicando ||
      !(await requestConfirmation({
        title: "Quitar aplicación",
        message:
          "Esta acción únicamente elimina la atribución de financiamiento. No modifica la compra, los animales ni el inventario.",
        confirmLabel: "Quitar",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(endpointsCredito.financiamiento(aplicando.id, id), {
        method: "DELETE",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["credits"] }),
        client.invalidateQueries({ queryKey: ["lots"] }),
        financiamientos.refetch(),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se quitó el financiamiento",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Finanzas"
        title="Lotes y créditos"
        description="Las compras y sus fuentes de financiamiento se administran por separado."
        actions={
          <Button
            onClick={() => {
              setFormulario(true);
              setEditando(null);
              setPrincipal(0);
              setTotal(0);
            }}
          >
            Registrar crédito
          </Button>
        }
      />
      {formulario && (
        <Card className="mb-5">
          <form onSubmit={guardarCredito} className="grid gap-4 md:grid-cols-2">
            <Select
              name="propietarioDeudorId"
              label="Entidad deudora *"
              required
              defaultValue={editando?.propietarioDeudorId}
            >
              <option value="">Seleccionar…</option>
              {entities.data?.items.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Input
              name="entidadFinanciera"
              label="Entidad financiera *"
              required
              defaultValue={editando?.entidadFinanciera}
            />
            <Input
              name="numeroCredito"
              label="Número de crédito"
              defaultValue={editando?.numeroCredito ?? ""}
            />
            <Input
              name="fechaDesembolso"
              label="Fecha de desembolso *"
              type="date"
              required
              defaultValue={editando?.fechaDesembolso?.slice(0, 10)}
            />
            <Input
              name="principal"
              label="Principal *"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              defaultValue={editando?.principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
            <Input
              name="totalContractual"
              label="Total contractual *"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              defaultValue={editando?.totalContractual}
              onChange={(e) => setTotal(Number(e.target.value))}
            />
            <Input
              label="Costo financiero"
              value={formatearMoneda(
                calcularCostoFinanciero(principal, total),
                moneda,
                cultura,
              )}
              disabled
            />
            <Input
              name="plazoMeses"
              label="Plazo en meses *"
              type="number"
              min="1"
              required
              defaultValue={editando?.plazoMeses}
            />
            <Input
              name="cantidadCuotas"
              label="Cantidad de cuotas *"
              type="number"
              min="1"
              required
              defaultValue={editando?.cantidadCuotas}
            />
            <Input
              name="frecuencia"
              label="Frecuencia *"
              required
              defaultValue={editando?.frecuencia ?? "Mensual"}
            />
            <Input
              name="tasa"
              label="Tasa"
              type="number"
              min="0"
              step="0.0001"
              defaultValue={editando?.tasa ?? ""}
            />
            <Input
              name="fechaPrimeraCuota"
              label="Fecha primera cuota"
              type="date"
              defaultValue={normalizarFechaFormulario(
                editando?.fechaPrimeraCuota,
              )}
            />
            <Input
              name="observaciones"
              label="Observaciones"
              defaultValue={editando?.observaciones ?? ""}
              className="md:col-span-2"
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Guardar borrador</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormulario(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="grid min-w-0 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        {lots.data?.map((lot) => (
          <Card key={lot.id}>
            <h2 className="font-display text-lg font-bold">{lot.nombre}</h2>
            <Metric
              label="Costo total"
              value={formatearMoneda(lot.costoTotalCalculado, moneda, cultura)}
            />
            <Metric
              label="Financiamiento registrado"
              value={formatearMoneda(lot.montoFinanciado, moneda, cultura)}
            />
            <Metric
              label="Monto sin financiamiento registrado"
              value={formatearMoneda(
                lot.montoSinFinanciamientoRegistrado,
                moneda,
                cultura,
              )}
            />
          </Card>
        ))}
      </div>
      {credits.data?.map((c) => {
        const deudor =
          entities.data?.items.find((e) => e.id === c.propietarioDeudorId)
            ?.nombreCompletoORazonSocial ?? "Entidad deudora no disponible";
        return (
          <Card key={c.id} className="mt-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {c.numeroCredito || `Crédito ${c.id.slice(0, 8)}`}
                </h2>
                <p className="text-sm text-slate-500">
                  {deudor} · {c.entidadFinanciera} · {c.estado}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate(`/finanzas/creditos/${c.id}`)}>
                  Ver crédito / servicio de deuda
                </Button>
                {c.estado === "Borrador" && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditando(c);
                        setFormulario(true);
                        setPrincipal(c.principal);
                        setTotal(c.totalContractual);
                      }}
                    >
                      Editar
                    </Button>
                    <Button onClick={() => void confirmar(c)}>Confirmar</Button>
                    <Button variant="danger" onClick={() => void anular(c)}>
                      Anular
                    </Button>
                  </>
                )}
                {c.estado === "Vigente" && (
                  <Button onClick={() => setCreditoAplicandoId(c.id)}>
                    Aplicaciones del principal
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3 [&>*]:min-w-0">
              <Metric
                label="Fecha de desembolso"
                value={normalizarFechaFormulario(c.fechaDesembolso)}
              />
              <Metric
                label="Principal"
                value={formatearMoneda(c.principal, moneda, cultura)}
              />
              <Metric
                label="Aplicado a compras"
                value={formatearMoneda(c.montoAplicadoCompras, moneda, cultura)}
              />
              <Metric
                label="Otros destinos"
                value={formatearMoneda(
                  c.montoAplicadoOtrosDestinos,
                  moneda,
                  cultura,
                )}
              />
              <Metric
                label="Principal asignado"
                value={formatearMoneda(c.principalAsignado, moneda, cultura)}
              />
              <Metric
                label="Principal sin asignar"
                value={formatearMoneda(c.principalSinAsignar, moneda, cultura)}
              />
              <Metric
                label="Total contractual"
                value={formatearMoneda(c.totalContractual, moneda, cultura)}
              />
              <Metric
                label="Costo financiero"
                value={formatearMoneda(
                  c.costoFinancieroContractual,
                  moneda,
                  cultura,
                )}
              />
              <Metric
                label="Condiciones"
                value={`${c.plazoMeses} meses · ${c.cantidadCuotas} cuotas · ${c.frecuencia}${c.tasa == null ? "" : ` · ${c.tasa}%`}`}
              />
              {c.fechaPrimeraCuota && (
                <Metric
                  label="Fecha primera cuota"
                  value={normalizarFechaFormulario(c.fechaPrimeraCuota)}
                />
              )}
            </div>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              El detalle de cuotas se registrará cuando se disponga del plan
              real del crédito.
            </p>
          </Card>
        );
      })}
      {aplicando && (
        <Card className="mt-5">
          <h2 className="font-display text-lg font-bold">
            Financiamiento aplicado ·{" "}
            {aplicando.numeroCredito || aplicando.id.slice(0, 8)}
          </h2>
          <p className="mt-1 text-sm">
            Principal sin asignar:{" "}
            {formatearMoneda(aplicando.principalSinAsignar, moneda, cultura)}
          </p>
          <form
            key={financiamientoEditando?.id ?? "nuevo"}
            onSubmit={aplicar}
            className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0 [&>*]:w-full"
          >
            <Select
              name="loteCompraId"
              label="Compra *"
              required
              disabled={!!financiamientoEditando}
              value={financiamientoEditando?.loteCompraId ?? compraSeleccionada}
              onChange={(e) => setCompraSeleccionada(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {comprasDisponibles.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} · disponible{" "}
                  {formatearMoneda(
                    l.montoSinFinanciamientoRegistrado,
                    moneda,
                    cultura,
                  )}
                </option>
              ))}
            </Select>
            <Input
              name="montoFinanciado"
              label="Monto financiado *"
              type="number"
              min="0.0001"
              step="0.0001"
              defaultValue={financiamientoEditando?.montoFinanciado}
              max={calcularMaximoFinanciable(
                aplicando.principalDisponible +
                  (financiamientoEditando?.montoFinanciado ?? 0),
                (lots.data?.find(
                  (l) =>
                    l.id ===
                    (financiamientoEditando?.loteCompraId ??
                      compraSeleccionada),
                )?.montoSinFinanciamientoRegistrado ?? 0) +
                  (financiamientoEditando?.montoFinanciado ?? 0),
              )}
            />
            <Input
              name="observaciones"
              label="Observaciones"
              defaultValue={financiamientoEditando?.observaciones ?? ""}
            />
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit">
                {financiamientoEditando ? "Actualizar aplicación" : "Aplicar"}
              </Button>
              {financiamientoEditando && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFinanciamientoEditando(null)}
                >
                  Cancelar edición
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAplicando(null);
                  setCompraSeleccionada("");
                  setFinanciamientoEditando(null);
                  setRegistrandoDestino(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          </form>
          <div className="mt-4 grid gap-2">
            <h3 className="font-semibold">Compras de ganado</h3>
            {financiamientos.data?.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <span>
                  {f.compra} ·{" "}
                  {formatearMoneda(f.montoFinanciado, moneda, cultura)} de{" "}
                  {formatearMoneda(f.costoCompra, moneda, cultura)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFinanciamientoEditando(f);
                      setCompraSeleccionada(f.loteCompraId);
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => void quitar(f.id)}>
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Otros destinos</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRegistrandoDestino(true)}
              >
                Registrar destino
              </Button>
            </div>
            {registrandoDestino && (
              <form
                onSubmit={guardarDestino}
                className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 [&>*]:min-w-0 [&>*]:w-full"
              >
                <Input
                  name="fecha"
                  label="Fecha *"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
                <Input name="descripcion" label="Descripción *" required />
                <Input
                  name="monto"
                  label={`Monto * (${moneda})`}
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  required
                />
                <Select
                  name="ambito"
                  label="Ámbito *"
                  required
                  defaultValue="Ganadero"
                >
                  <option value="Ganadero">Ganadero</option>
                  <option value="ExternoNoGanadero">Externo no ganadero</option>
                </Select>
                <Select name="categoriaFinancieraId" label="Categoría financiera"><option value="">Sin categoría</option>{categoriasFinancieras.data?.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombre}</option>)}</Select>
                <Input name="observaciones" label="Observaciones" />
                <div className="flex gap-2">
                  <Button type="submit">Guardar destino</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRegistrandoDestino(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-4 grid gap-2">
              {destinos.data?.map((x) => (
                <div
                  key={x.id}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                >
                  <b>
                    {x.descripcion} ·{" "}
                    {formatearMoneda(x.monto, moneda, cultura)}
                  </b>
                  <p className="text-xs text-slate-500">
                    {x.fecha.slice(0, 10)} · {x.ambito}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
