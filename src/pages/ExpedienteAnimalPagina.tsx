import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Network,
  Tag,
  UserRound,
} from "lucide-react";
import { api } from "../lib/api";
import { notify, requestConfirmation } from "../lib/feedback";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import { endpointAntecedentesReproductivos, MENSAJE_ANTECEDENTE_REPRODUCTIVO } from "../lib/antecedentesReproductivos";
import type { Animal, AnimalRecord, CatalogItem, HistoricalBirthRecord, InventoryMovement, PagedResult } from "../types";
import { Badge, Button, Card, Input, Select } from "../components/ui";
import { PageHeader } from "../components/Page";

const tabs = [
  "Resumen",
  "Identificación",
  "Propiedad",
  "Procedencia",
  "Genealogía",
  "Salud",
  "Pesajes",
  "Ubicación",
  "Grupos productivos",
  "Línea de tiempo",
  "Auditoría",
] as const;
type Tab = (typeof tabs)[number];
interface HistorialGrupo { id:string;grupoProductivoId:string;codigo:string;grupo:string;tipo:string;fechaInicio:string;fechaFin:string|null;motivoIngreso:string|null;motivoSalida:string|null;movimientoIngresoId:string|null;movimientoSalidaId:string|null }
interface CicloEngorda { historialGrupoId:string;grupoCodigo:string;grupoNombre:string;fechaIngresoGrupo:string;fechaSalidaGrupo:string|null;diasEnGrupo:number;pesoInicialLibras:number|null;fechaPesoInicial:string|null;pesoActualLibras:number|null;fechaUltimoPeso:string|null;gananciaLibras:number|null;diasEntrePesajes:number|null;gmdLibrasDia:number|null;costoAcumuladoAnimal:number;costoEtapaEngorda:number;costoEntrePesajes:number;costoPorLibraGanada:number|null;porcentajeMeta:number|null;estadoGmd:string }

const date = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("es-GT") : "No registrado";
const age = (birth?: string | null) => {
  if (!birth) return "No calculable";
  const born = new Date(birth);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (now.getDate() < born.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years} año${years === 1 ? "" : "s"} y ${months} mes${months === 1 ? "" : "es"}`;
};
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
    <p className="text-xs text-slate-500 dark:text-slate-300">{label}</p>
    <div className="mt-1 text-sm font-semibold">
      {children || "No registrado"}
    </div>
  </div>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
    {children}
  </p>
);

export function AnimalDetailPage() {
  const { moneda, cultura } = useMonedaTenant();
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Resumen");
  const [action, setAction] = useState<"parto" | "baja" | null>(null);
  const [message, setMessage] = useState("");
  const [numeroCrias, setNumeroCrias] = useState(1);
  const [antecedenteAbierto, setAntecedenteAbierto] = useState(false);
  const [desteteAbierto, setDesteteAbierto] = useState(false);
  const [busquedaPadre, setBusquedaPadre] = useState("");
  const client = useQueryClient();
  const animalQuery = useQuery({
    queryKey: ["animal", id],
    queryFn: () => api<Animal>(`/animales/${id}`),
    enabled: !!id,
  });
  const recordQuery = useQuery({
    queryKey: ["animal-record", id],
    queryFn: () => api<AnimalRecord>(`/animales/${id}/expediente`),
    enabled: !!id,
  });
  const movementsQuery = useQuery({
    queryKey: ["animal-inventory-movements", id],
    queryFn: () =>
      api<InventoryMovement[]>(`/inventario/animales/${id}/movimientos`),
    enabled: !!id,
  });
  const tiposPartoQuery = useQuery({
    queryKey: ["catalog", "tipos-parto"],
    queryFn: () => api<CatalogItem[]>("/catalogos/tipos-parto"),
  });
  const antecedentesQuery = useQuery({
    queryKey: ["animal-historical-births", id],
    queryFn: () => api<HistoricalBirthRecord[]>(endpointAntecedentesReproductivos(id)),
    enabled: !!id,
  });
  const padresQuery = useQuery({
    queryKey: ["animals", "possible-fathers", busquedaPadre],
    queryFn: () => api<PagedResult<Animal>>(`/animales/padres-posibles?page=1&pageSize=50&search=${encodeURIComponent(busquedaPadre)}`),
  });
  const gruposQuery = useQuery({queryKey:["animal-groups",id],queryFn:()=>api<HistorialGrupo[]>(`/grupos-productivos/animales/${id}/historial`),enabled:!!id});
  const engordaQuery = useQuery({queryKey:["animal-engorda",id],queryFn:()=>api<CicloEngorda[]>(`/grupos-productivos/animales/${id}/engorda`),enabled:!!id});
  const animal = animalQuery.data;
  const record = recordQuery.data;
  const timeline = useMemo(
    () =>
      record
        ? [
            ...record.ubicaciones.map((x) => ({
              date: x.fechaInicio,
              text: `Ingreso a ${x.potrero ?? x.finca}`,
            })),
            ...record.salud.map((x) => ({
              date: x.fecha,
              text: `Salud: ${x.tipo}`,
            })),
            ...record.pesajes.map((x) => ({
              date: x.fecha,
              text: `Pesaje: ${x.peso} ${x.unidad}`,
            })),
            ...record.partos.map((x) => ({
              date: x.fecha,
              text: `Parto: ${x.criasVivas} vivas, ${x.criasMuertas} muertas${x.sexoCria ? ` · ${x.sexoCria}` : ""}`,
            })),
            ...record.destetes.map((x) => ({
              date: x.fecha,
              text: `Destete ${x.estado}${x.pesoLibras ? ` · ${x.pesoLibras} lb` : ""}`,
            })),
            ...record.bajas.map((x) => ({
              date: x.fecha,
              text: `Baja: ${x.tipo}${x.causa ? ` · ${x.causa}` : ""}`,
            })),
            ...(movementsQuery.data ?? []).map((x) => ({
              date: x.fecha,
              text: `${x.direccion} de inventario: ${x.tipo}`,
            })),
            ...(gruposQuery.data??[]).flatMap(x=>[{date:x.fechaInicio,text:`Ingreso al grupo ${x.grupo}`},...(x.fechaFin?[{date:x.fechaFin,text:`Salida del grupo ${x.grupo}${x.motivoSalida?` · ${x.motivoSalida}`:""}`}]:[])]),
          ].sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [record, movementsQuery.data,gruposQuery.data],
  );

  if (animalQuery.isLoading) return <Card>Cargando expediente…</Card>;
  if (!animal) return <Card>No se encontró el animal.</Card>;

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      if (action === "parto") {
        const crias = Array.from({ length: numeroCrias }, (_, index) => ({
          sexo: data.get(`sexoCria-${index}`),
          arete: data.get(`areteCria-${index}`) || null,
          destinoPlaneado: data.get(`destinoCria-${index}`),
          nacioViva: data.get(`vivaCria-${index}`) === "on",
          pesoNacimientoLibras: data.get(`pesoCria-${index}`)
            ? Number(data.get(`pesoCria-${index}`))
            : null,
        }));
        const vivas = crias.filter((x) => x.nacioViva).length;
        await api(`/animales/${id}/expediente/partos`, {
          method: "POST",
          body: JSON.stringify({
            fecha: data.get("fecha"),
            tipoPartoId: data.get("tipoPartoId") || null,
            padreAnimalId: data.get("padreAnimalId") || null,
            asistido: data.get("asistido") === "on",
            numeroCrias,
            criasVivas: vivas,
            criasMuertas: numeroCrias - vivas,
            criaAnimalId: null,
            sexoCria: null,
            complicaciones: data.get("complicaciones") || null,
            costo: Number(data.get("costo") || 0),
            observaciones: data.get("observaciones") || null,
            crias,
          }),
        });
      }
      if (action === "baja")
        await api(`/animales/${id}/expediente/bajas`, {
          method: "POST",
          body: JSON.stringify({
            fecha: data.get("fecha"),
            tipo: data.get("tipo"),
            causa: data.get("causa") || null,
            diagnostico: data.get("diagnostico") || null,
            peso: data.get("peso") ? Number(data.get("peso")) : null,
            valorEconomicoEstimado: data.get("valorEconomico")
              ? Number(data.get("valorEconomico"))
              : null,
            gastosRelacionados: Number(data.get("gastosRelacionados") || 0),
            metodoDisposicion: data.get("metodoDisposicion") || null,
            observaciones: data.get("observaciones") || null,
          }),
        });
      setMessage(
        action === "baja"
          ? "Borrador de baja guardado. Confírmalo desde Auditoría para retirar el animal."
          : "Registro guardado correctamente.",
      );
      setAction(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["animal", id] }),
        client.invalidateQueries({ queryKey: ["animal-record", id] }),
      ]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    }
  };

  const confirmarParto = async (partoId: string) => {
    if (
      !(await requestConfirmation({
        title: "Confirmar parto",
        message:
          "Las crías vivas recibirán código permanente e ingresarán al inventario.",
        confirmLabel: "Confirmar parto",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(`/animales/${id}/expediente/partos/${partoId}/confirmar`, {
        method: "POST",
      });
      notify({
        tone: "success",
        title: "Parto confirmado",
        message: "Las crías vivas ingresaron al inventario.",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["animal-record", id] }),
        client.invalidateQueries({ queryKey: ["animals"] }),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se confirmó el parto",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };

  const guardarAntecedente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const crias = Array.from({ length: numeroCrias }, (_, index) => ({
        sexo: data.get(`sexoHistorico-${index}`),
        nacioViva: data.get(`vivaHistorica-${index}`) === "on",
        observaciones: data.get(`observacionHistorica-${index}`) || null,
      }));
      await api(endpointAntecedentesReproductivos(id), {
        method: "POST",
        body: JSON.stringify({
          fecha: data.get("fechaHistorica"), tipoPartoId: data.get("tipoPartoHistoricoId") || null,
          numeroCrias, criasVivas: crias.filter(x => x.nacioViva).length,
          criasMuertas: crias.filter(x => !x.nacioViva).length,
          fuente: data.get("fuente") || null, observaciones: data.get("observacionesHistoricas") || null, crias,
        }),
      });
      setAntecedenteAbierto(false);
      notify({ tone: "success", title: "Antecedente registrado", message: "Se documentó el antecedente sin modificar el inventario." });
      await Promise.all([antecedentesQuery.refetch(), client.invalidateQueries({ queryKey: ["animal", id] })]);
    } catch (error) {
      notify({ tone: "error", title: "No se registró el antecedente", message: error instanceof Error ? error.message : "Ocurrió un error inesperado." });
    }
  };
  const guardarDestete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api(`/animales/${id}/destetes`, {
        method: "POST",
        body: JSON.stringify({
          fecha: data.get("fecha"),
          pesoLibras: data.get("peso") ? Number(data.get("peso")) : null,
          metodo: data.get("metodo") || null,
          potreroDestinoId: null,
          observaciones: data.get("observaciones") || null,
        }),
      });
      setDesteteAbierto(false);
      notify({
        tone: "success",
        title: "Borrador creado",
        message: "El destete aún no modifica la ficha ni el inventario.",
      });
      await client.invalidateQueries({ queryKey: ["animal-record", id] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se guardó el destete",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };
  const confirmarDestete = async (desteteId: string) => {
    if (
      !(await requestConfirmation({
        title: "Confirmar destete",
        message:
          "Se actualizará la etapa del animal, pero continuará dentro del inventario.",
        confirmLabel: "Confirmar destete",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(`/animales/${id}/destetes/${desteteId}/confirmar`, {
        method: "POST",
      });
      notify({
        tone: "success",
        title: "Destete confirmado",
        message:
          "El evento quedó registrado sin alterar la cantidad del inventario.",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["animal", id] }),
        client.invalidateQueries({ queryKey: ["animal-record", id] }),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se confirmó el destete",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };
  const confirmarBaja = async (bajaId: string) => {
    if (
      !(await requestConfirmation({
        title: "Confirmar baja",
        message:
          "El animal saldrá del inventario activo. Esta operación representa una pérdida no comercial.",
        confirmLabel: "Confirmar baja",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(`/animales/${id}/expediente/bajas/${bajaId}/confirmar`, {
        method: "POST",
      });
      notify({
        tone: "success",
        title: "Baja confirmada",
        message:
          "El animal salió del inventario y conserva todo su expediente.",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["animal", id] }),
        client.invalidateQueries({ queryKey: ["animal-record", id] }),
        client.invalidateQueries({ queryKey: ["animals"] }),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se confirmó la baja",
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
        eyebrow="Expediente individual"
        title={`Animal ${animal.codigoAnimal}`}
        description="El código no cambia con transferencias, movimientos, ventas o bajas."
        actions={
          <div className="flex gap-3">
            <Link
              to="/animales"
              className="inline-flex items-center gap-2 text-sm font-semibold text-pine-700 dark:text-emerald-300"
            >
              <ArrowLeft size={17} /> Inventario
            </Link>
            <Link to={`/animales/nuevo?editar=${animal.id}`}>
              <Button>Editar</Button>
            </Link>
          </div>
        }
      />
      <Card className="mb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-pine-50 font-display text-xl font-extrabold text-pine-700">
              {animal.codigoAnimal.slice(-2)}
            </span>
            <div>
              <Badge
                tone={animal.estadoVida === "Activo" ? "success" : "neutral"}
              >
                {animal.estadoVida}
              </Badge>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                {animal.sexo} · {animal.categoria} · {animal.estadoReproductivo}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Código permanente
            </p>
            <p className="font-display text-3xl font-extrabold tracking-widest">
              {animal.codigoAnimal}
            </p>
          </div>
        </div>
      </Card>
      <div className="mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-xl bg-white p-1 shadow-sm dark:bg-slate-900">
          {tabs.map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === name ? "bg-pine-700 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{tab}</h2>
          <div className="flex flex-wrap gap-2">
            {animal.sexo === "Hembra" && (animal.categoria === "Novilla" || animal.categoria === "Vaca") && (
              <Button variant="secondary" onClick={() => setAction("parto")}>
                Registrar parto
              </Button>
            )}
            {tab === "Genealogía" && animal.sexo === "Hembra" && (animal.categoria === "Novilla" || animal.categoria === "Vaca") && (
              <Button variant="secondary" onClick={() => setAntecedenteAbierto(true)}>Registrar antecedente reproductivo</Button>
            )}
            {animal.estadoVida === "Activo" &&
              (animal.categoria === "Ternera" || animal.categoria === "Ternero") && (
              <Button
                variant="secondary"
                onClick={() => setDesteteAbierto(true)}
              >
                Registrar destete
              </Button>
            )}
            {animal.estadoVida === "Activo" && (
              <Button variant="danger" onClick={() => setAction("baja")}>
                Registrar baja o muerte
              </Button>
            )}
          </div>
        </div>
        {message && (
          <p className="mb-4 rounded-xl bg-pine-50 p-3 text-sm text-pine-800 dark:bg-emerald-950 dark:text-emerald-200">
            {message}
          </p>
        )}
        {desteteAbierto && (
          <form
            onSubmit={(event) => void guardarDestete(event)}
            className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-700"
          >
            <Input
              name="fecha"
              label="Fecha de destete *"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Input
              name="peso"
              label="Peso al destete (lb)"
              type="number"
              min="0"
              step="0.01"
            />
            <Input
              name="metodo"
              label="Método"
              placeholder="Natural, separado, gradual…"
            />
            <Input name="observaciones" label="Observaciones" />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Guardar borrador</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDesteteAbierto(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {action && (
          <form
            onSubmit={(event) => void submitAction(event)}
            className="mb-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-700"
          >
            <Input
              name="fecha"
              label="Fecha"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
            {action === "parto" ? (
              <>
                <Select name="tipoPartoId" label="Tipo de parto">
                  <option value="">No especificado</option>
                  {tiposPartoQuery.data?.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                </Select>
                <Input label="Buscar padre" value={busquedaPadre} onChange={(event) => setBusquedaPadre(event.target.value)} placeholder="Código, arete o referencia" />
                <Select name="padreAnimalId" label="Padre de la cría">
                  <option value="">No conocido</option>
                  {padresQuery.data?.items.filter((posiblePadre) => posiblePadre.sexo === "Macho").map((posiblePadre) =>
                    <option key={posiblePadre.id} value={posiblePadre.id}>{posiblePadre.codigoAnimal}{posiblePadre.arete ? ` · Arete ${posiblePadre.arete}` : ""}</option>)}
                </Select>
                <Input
                  label="Número de crías *"
                  type="number"
                  min="1"
                  max="4"
                  value={numeroCrias}
                  onChange={(e) =>
                    setNumeroCrias(
                      Math.max(1, Math.min(4, Number(e.target.value))),
                    )
                  }
                />
                <Input
                  name="costo"
                  label="Costo"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                />
                <Input name="complicaciones" label="Complicaciones" />
                <label className="flex items-center gap-2 text-sm">
                  <input name="asistido" type="checkbox" /> Parto asistido
                </label>
                <div className="grid gap-3 md:col-span-2">
                  {Array.from({ length: numeroCrias }, (_, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-5 dark:bg-slate-800"
                    >
                      <Select
                        name={`sexoCria-${index}`}
                        label={`Cría ${index + 1} · sexo *`}
                        required
                      >
                        <option>Hembra</option>
                        <option>Macho</option>
                        <option>Desconocido</option>
                      </Select>
                      <Input name={`areteCria-${index}`} label="Arete" />
                      <Input
                        name={`pesoCria-${index}`}
                        label="Peso (lb)"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <Select name={`destinoCria-${index}`} label="Destino">
                        <option>Retener</option>
                        <option>Venta</option>
                      </Select>
                      <label className="flex items-center gap-2 pt-7 text-sm">
                        <input
                          name={`vivaCria-${index}`}
                          type="checkbox"
                          defaultChecked
                        />{" "}
                        Nació viva
                      </label>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Select name="tipo" label="Tipo de baja" required>
                  <option>Muerte</option>
                  <option>Perdida</option>
                  <option>Robo</option>
                  <option>Sacrificio</option>
                  <option>Descarte</option>
                  <option>Otro</option>
                </Select>
                <Input name="causa" label="Causa" required />
                <Input name="diagnostico" label="Diagnóstico" />
                <Input
                  name="peso"
                  label="Peso al momento"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <Input
                  name="metodoDisposicion"
                  label="Disposición"
                  placeholder="Entierro, incineración…"
                />
              </>
            )}
            <Input
              name="observaciones"
              label="Observaciones"
              className="md:col-span-2"
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Guardar borrador</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAction(null)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {antecedenteAbierto && (
          <form onSubmit={(event) => void guardarAntecedente(event)} className="mb-6 grid gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 md:grid-cols-2 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="md:col-span-2"><h3 className="font-semibold">Antecedente reproductivo previo</h3><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{MENSAJE_ANTECEDENTE_REPRODUCTIVO}</p></div>
            <Input name="fechaHistorica" label="Fecha *" type="date" required max={animal.fechaIncorporacion?.slice(0, 10)} />
            <Select name="tipoPartoHistoricoId" label="Tipo de parto"><option value="">No especificado</option>{tiposPartoQuery.data?.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}</Select>
            <Input label="Número de crías *" type="number" min="1" max="4" value={numeroCrias} onChange={event => setNumeroCrias(Math.max(1, Math.min(4, Number(event.target.value))))} />
            <Input name="fuente" label="Fuente" placeholder="Información proporcionada por propietario anterior" />
            <div className="grid gap-3 md:col-span-2">{Array.from({ length: numeroCrias }, (_, index) => <div key={index} className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-3 dark:bg-slate-900"><Select name={`sexoHistorico-${index}`} label={`Cría ${index + 1} · sexo`}><option>Hembra</option><option>Macho</option><option>Desconocido</option></Select><label className="flex items-center gap-2 pt-7 text-sm"><input name={`vivaHistorica-${index}`} type="checkbox" defaultChecked /> Nació viva</label><Input name={`observacionHistorica-${index}`} label="Observaciones" /></div>)}</div>
            <Input name="observacionesHistoricas" label="Observaciones generales" className="md:col-span-2" />
            <div className="flex gap-2 md:col-span-2"><Button type="submit">Registrar antecedente</Button><Button type="button" variant="ghost" onClick={() => setAntecedenteAbierto(false)}>Cancelar</Button></div>
          </form>
        )}
        {tab === "Resumen" && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Arete">{animal.arete ?? "Sin arete"}</Field>
            <Field label="Propietario actual">{animal.propietario}</Field>
            <Field label="Nacimiento">{date(animal.fechaNacimiento)}</Field>
            <Field label="Edad actual">{age(animal.fechaNacimiento)}</Field>
            <Field label="Raza y color">
              {[animal.raza, animal.color].filter(Boolean).join(" · ") ||
                "No registrados"}
            </Field>
            <Field label="Ubicación">
              {animal.potreroId
                ? "Potrero asignado"
                : animal.fincaId
                  ? "Finca, sin potrero"
                  : "Sin ubicación"}
            </Field>
            <Field label="Grupo productivo actual">{gruposQuery.data?.find(x=>!x.fechaFin)?.grupo??"Sin grupo"}</Field>
            <Field label="Tipo de grupo">{gruposQuery.data?.find(x=>!x.fechaFin)?.tipo??"No aplica"}</Field>
            <Field label="Fecha de ingreso al grupo">{date(gruposQuery.data?.find(x=>!x.fechaFin)?.fechaInicio)}</Field>
          </div>
        )}
        {tab === "Identificación" && (
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Código">{animal.codigoAnimal}</Field>
            <Field label="Arete">{animal.arete ?? "Sin arete"}</Field>
            <Field label="Sexo">{animal.sexo}</Field>
            <Field label="Categoría">{animal.categoria}</Field>
            <Field label="Raza">{animal.raza ?? "No registrada"}</Field>
            <Field label="Color">{animal.color ?? "No registrado"}</Field>
            <Field label="Condición sanitaria">
              {animal.condicionSanitaria ?? "No registrada"}
            </Field>
            <Field label="Observaciones">
              {animal.observaciones ?? "Sin observaciones"}
            </Field>
          </div>
        )}
        {tab === "Propiedad" && (
          <div className="grid gap-2">
            {record?.propiedades.map((x) => (
              <Field
                key={x.id}
                label={`${date(x.fechaInicio)}${x.fechaFin ? ` a ${date(x.fechaFin)}` : " · vigente"}`}
              >
                {x.entidad}
                {x.tipoAdquisicion ? ` · ${x.tipoAdquisicion}` : ""}
              </Field>
            ))}
            {record?.propiedades.length === 0 && (
              <Empty>Sin historial de propiedad.</Empty>
            )}
          </div>
        )}
        {tab === "Procedencia" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Número de referencia anterior">
              {animal.numeroReferenciaOrigen ?? "No registrado"}
            </Field>
            <Field label="Entidad de procedencia">
              {animal.entidadOrigen ?? "No registrada"}
            </Field>
            <Field label="Texto original">
              {animal.textoReferenciaOrigen ?? "No registrado"}
            </Field>
            <Field label="Observación de origen">
              {animal.observacionOrigen ?? "No registrada"}
            </Field>
            <Field label="Fecha de incorporación">
              {date(animal.fechaIncorporacion)}
            </Field>
            <Field label="Motivo de incorporación">
              {animal.motivoIncorporacion ?? "No registrado"}
            </Field>
          </div>
        )}
        {tab === "Genealogía" && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Madre">
                {animal.madreAnimalId
                  ? `Animal ${animal.madreAnimalId}`
                  : "No registrada"}
              </Field>
              <Field label="Padre">
                {animal.padreAnimalId
                  ? `Animal ${animal.padreAnimalId}`
                  : "No registrado"}
              </Field>
            </div>
            <h3 className="font-semibold">Partos registrados en BovItzá</h3>
            {record?.partos.map((x) => (
              <div key={x.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Field label={`${date(x.fecha)} · ${x.estado}`}>
                    {x.numeroCrias} cría(s): {x.criasVivas} viva(s),{" "}
                    {x.criasMuertas} muerta(s)
                  </Field>
                </div>
                {x.estado === "Borrador" && (
                  <Button onClick={() => void confirmarParto(x.id)}>
                    Confirmar
                  </Button>
                )}
              </div>
            ))}
            {record?.partos.length === 0 && (
              <Empty>Esta hembra no tiene partos operativos registrados.</Empty>
            )}
            <h3 className="font-semibold">Antecedentes reproductivos previos</h3>
            {antecedentesQuery.data?.map(antecedente => <Field key={antecedente.id} label={date(antecedente.fecha)}>{antecedente.numeroCrias} cría(s): {antecedente.criasVivas} viva(s), {antecedente.criasMuertas} muerta(s) · Sexo(s): {antecedente.crias.map(cria => cria.sexo).join(", ") || "Desconocido"}{antecedente.fuente ? ` · Fuente: ${antecedente.fuente}` : ""}{antecedente.observaciones ? ` · ${antecedente.observaciones}` : ""}</Field>)}
            {antecedentesQuery.data?.length === 0 && <Empty>Sin antecedentes reproductivos previos.</Empty>}
            <h3 className="font-semibold">Destete</h3>
            {record?.destetes.map((x) => (
              <div key={x.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Field label={`${date(x.fecha)} · ${x.estado}`}>
                    {x.pesoLibras ? `${x.pesoLibras} lb · ` : ""}
                    {x.categoriaAnterior ?? animal.categoria} →{" "}
                    {x.categoriaPosterior ?? animal.categoria}
                    {x.candidatoVenta ? " · candidato para venta" : ""}
                  </Field>
                </div>
                {x.estado === "Borrador" && (
                  <Button onClick={() => void confirmarDestete(x.id)}>
                    Confirmar
                  </Button>
                )}
              </div>
            ))}
            {record?.destetes.length === 0 && (
              <Empty>Sin destete registrado.</Empty>
            )}
          </div>
        )}
        {tab === "Salud" && (
          <div className="grid gap-2">
            {record?.salud.map((x) => (
              <Field key={x.id} label={`${date(x.fecha)} · ${x.tipo}`}>
                {x.principioActivo || "Producto no especificado"}
                {x.dosis ? ` · ${x.dosis} ${x.unidad ?? ""}` : ""}
                {x.via ? ` · vía ${x.via}` : ""}
                {x.costoTotal ? ` · costo ${formatearMoneda(x.costoTotal, moneda, cultura)}` : ""}
                {x.costoAsignadoAnimal ? ` · asignado ${formatearMoneda(x.costoAsignadoAnimal, moneda, cultura)}` : ""}
                {x.vinculoCosto !== "SinCosto" ? ` · ${x.vinculoCosto}` : ""}
                {x.observaciones ? ` · ${x.observaciones}` : ""}
              </Field>
            ))}
            {record?.salud.length === 0 && (
              <Empty>Sin tratamientos o registros de salud.</Empty>
            )}
          </div>
        )}
        {tab === "Pesajes" && (
          <div className="grid gap-2">
            {record?.pesajes.map((x) => (
              <Field key={x.id} label={date(x.fecha)}>
                {x.peso} {x.unidad}
                {x.observaciones ? ` · ${x.observaciones}` : ""}
              </Field>
            ))}
            {record?.pesajes.length === 0 && (
              <Empty>Sin pesajes registrados.</Empty>
            )}
          </div>
        )}
        {tab === "Ubicación" && (
          <div className="grid gap-2">
            {record?.ubicaciones.map((x) => (
              <Field
                key={x.id}
                label={`${date(x.fechaInicio)}${x.fechaFin ? ` a ${date(x.fechaFin)}` : " · ubicación actual"}`}
              >
                {x.finca}
                {x.potrero ? ` · ${x.potrero}` : ""}
                {x.observaciones ? ` · ${x.observaciones}` : ""}
              </Field>
            ))}
            {record?.ubicaciones.length === 0 && (
              <Empty>Sin historial de ubicación.</Empty>
            )}
          </div>
        )}
        {tab === "Grupos productivos"&&<div className="grid gap-5">
          <div className="grid gap-2">{gruposQuery.data?.map(x=><Field key={x.id} label={`${date(x.fechaInicio)}${x.fechaFin?` a ${date(x.fechaFin)}`:" · grupo actual"}`}>{x.codigo} · {x.grupo} · {x.tipo}{x.motivoIngreso?` · ingreso: ${x.motivoIngreso}`:""}{x.motivoSalida?` · salida: ${x.motivoSalida}`:""}</Field>)}{gruposQuery.data?.length===0&&<Empty>Sin historial de grupos productivos.</Empty>}</div>
          {engordaQuery.data && engordaQuery.data.length > 0 && <div><h3 className="mb-3 font-semibold">Rendimiento de engorda</h3><div className="grid gap-3">{engordaQuery.data.map(x=><div key={x.historialGrupoId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex flex-wrap justify-between gap-2"><strong>{x.grupoCodigo} · {x.grupoNombre}</strong><span className="text-sm text-slate-500">{date(x.fechaIngresoGrupo)} a {x.fechaSalidaGrupo?date(x.fechaSalidaGrupo):"actual"} · {x.diasEnGrupo} días</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Field label="Peso inicial">{x.pesoInicialLibras == null?"—":`${x.pesoInicialLibras.toFixed(2)} lb`}</Field><Field label="Peso final / actual">{x.pesoActualLibras == null?"—":`${x.pesoActualLibras.toFixed(2)} lb`}</Field><Field label="Ganancia y GMD">{x.gananciaLibras == null?"—":`${x.gananciaLibras.toFixed(2)} lb · ${x.gmdLibrasDia?.toFixed(3) ?? "—"} lb/día`}</Field><Field label="Costo etapa">{formatearMoneda(x.costoEtapaEngorda,moneda,cultura)}</Field><Field label="Costo entre pesajes">{formatearMoneda(x.costoEntrePesajes,moneda,cultura)}</Field><Field label="Costo por libra ganada">{x.costoPorLibraGanada==null?"—":formatearMoneda(x.costoPorLibraGanada,moneda,cultura)}</Field><Field label="Costo acumulado">{formatearMoneda(x.costoAcumuladoAnimal,moneda,cultura)}</Field><Field label="Estado de meta GMD">{x.estadoGmd}</Field></div></div>)}</div></div>}
        </div>}
        {tab === "Línea de tiempo" && (
          <div className="grid gap-2">
            {timeline.map((x, index) => (
              <Field key={`${x.date}-${index}`} label={date(x.date)}>
                {x.text}
              </Field>
            ))}
            {timeline.length === 0 && <Empty>Sin eventos registrados.</Empty>}
          </div>
        )}
        {tab === "Auditoría" && (
          <div className="grid gap-2">
            {record?.estados.map((x) => (
              <Field key={x.id} label={date(x.fecha)}>
                {x.tipoEstado}: {x.estadoAnterior} → {x.estadoNuevo}
                {x.motivo ? ` · ${x.motivo}` : ""}
              </Field>
            ))}
            {record?.bajas.map((x) => (
              <div key={x.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Field label={`${x.codigo} · ${date(x.fecha)} · ${x.estado}`}>
                    Baja {x.tipo}
                    {x.causa ? ` · ${x.causa}` : ""}
                    {x.valorEconomicoEstimado
                      ? ` · pérdida estimada ${formatearMoneda(x.valorEconomicoEstimado, moneda, cultura)}`
                      : ""}
                  </Field>
                </div>
                {x.estado === "Borrador" && (
                  <Button
                    variant="danger"
                    onClick={() => void confirmarBaja(x.id)}
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            ))}
            {record?.estados.length === 0 && record?.bajas.length === 0 && (
              <Empty>Sin cambios auditables registrados.</Empty>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
