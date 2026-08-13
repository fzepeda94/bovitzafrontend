import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { notify, requestConfirmation } from "../lib/feedback";
import { Button, Card, Input, Pagination, Select } from "../components/ui";
import { PageHeader } from "../components/Page";
import type { PagedResult } from "../types";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";

interface Grupo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaCierre: string | null;
  estado: string;
  descripcionObjetivo: string | null;
  observaciones: string | null;
  cantidadAnimalesActual: number;
  composicion: { sexo: string; categoria: string; cantidad: number }[];
}
interface Candidato {
  id: string;
  codigoAnimal: string;
  arete: string | null;
  sexo: string;
  categoria: string;
  propietario: string;
  grupoActualId: string | null;
  grupoActual: string | null;
}
interface Miembro {
  animalId: string;
  codigoAnimal: string;
  arete: string | null;
  sexo: string;
  categoria: string;
  propietario: string;
}
interface Movimiento {
  id: string;
  fecha: string;
  tipo: string;
  cantidadAnimales: number;
  motivo: string | null;
}
interface DetalleGrupo extends Grupo {
  movimientos: Movimiento[];
}
interface MetricaEngorda {
  historialGrupoId: string; animalId: string; codigoAnimal: string; arete: string | null;
  fechaIngresoGrupo: string; fechaSalidaGrupo: string | null; diasEnGrupo: number;
  pesoInicialLibras: number | null; fechaPesoInicial: string | null;
  pesoActualLibras: number | null; fechaPesoActual: string | null;
  gananciaLibras: number | null; diasEntrePesajes: number | null; gmdLibrasDia: number | null;
  costoAcumuladoAnimal: number; costoEtapaEngorda: number; costoEntrePesajes: number;
  costoPorLibraGanada: number | null; porcentajeMeta: number | null; estadoGmd: string;
}
interface PaginaEngorda {
  grupoId: string; codigo: string; nombre: string; fechaCorte: string;
  pesoObjetivoLibras: number | null; gananciaDiariaObjetivoLibras: number | null;
  resumen: { cantidadAnimales: number; pesoActualPromedio: number | null; gananciaTotalLibras: number; gmdPromedio: number | null; costoEtapaTotal: number; costoPromedioPorLibraGanada: number | null };
  items: MetricaEngorda[]; total: number; page: number; pageSize: number;
}
const tipos = [
  ["Cria", "Cría"],
  ["RecriaDesarrollo", "Recría / desarrollo"],
  ["Engorda", "Engorda"],
  ["Reemplazo", "Reemplazo"],
  ["Otro", "Otro"],
];
const nombreTipo = (tipo: string) => tipos.find((x) => x[0] === tipo)?.[1] ?? tipo;

export function GruposProductivosPagina() {
  const { moneda, cultura } = useMonedaTenant();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [formVisible, setFormVisible] = useState(false);
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [accion, setAccion] = useState<"Asignacion" | "Traslado" | "Retiro" | null>(null);
  const [destinoId, setDestinoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [buscarAnimal, setBuscarAnimal] = useState("");
  const [paginaAnimal, setPaginaAnimal] = useState(1);
  const [seleccionados, setSeleccionados] = useState<Record<string, Candidato>>({});
  const [buscarDestino, setBuscarDestino] = useState("");
  const [paginaDestino, setPaginaDestino] = useState(1);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<Grupo | null>(null);
  const [fechaCorteEngorda, setFechaCorteEngorda] = useState(new Date().toISOString().slice(0, 10));
  const [buscarEngorda, setBuscarEngorda] = useState("");
  const [soloActualesEngorda, setSoloActualesEngorda] = useState(false);
  const [paginaEngorda, setPaginaEngorda] = useState(1);
  const grupos = useQuery({
    queryKey: ["grupos-productivos", search, tipo, estado, page],
    queryFn: () => api<PagedResult<Grupo>>("/grupos-productivos?search=" + encodeURIComponent(search) + "&tipo=" + tipo + "&estado=" + estado + "&page=" + page + "&pageSize=10"),
  });
  const activos = useQuery({
    queryKey: ["grupos-productivos-activos", buscarDestino, paginaDestino],
    queryFn: () => api<PagedResult<Grupo>>("/grupos-productivos?estado=Activo&page=" + paginaDestino + "&pageSize=20&search=" + encodeURIComponent(buscarDestino)),
  });
  const detalle = useQuery({
    queryKey: ["grupo-productivo", detalleId],
    enabled: !!detalleId,
    queryFn: () => api<DetalleGrupo>("/grupos-productivos/" + detalleId),
  });
  const rutaEngorda = (pagina: number, tamano: number) => `/grupos-productivos/${detalleId}/engorda?fechaCorte=${fechaCorteEngorda}&search=${encodeURIComponent(buscarEngorda)}&soloActuales=${soloActualesEngorda}&page=${pagina}&pageSize=${tamano}`;
  const engorda = useQuery({
    queryKey: ["grupo-engorda", detalleId, fechaCorteEngorda, buscarEngorda, soloActualesEngorda, paginaEngorda],
    enabled: !!detalleId && detalle.data?.tipo === "Engorda",
    queryFn: () => api<PaginaEngorda>(rutaEngorda(paginaEngorda, 10)),
  });
  const miembros = useQuery({
    queryKey: ["grupo-miembros", detalleId, paginaAnimal, buscarAnimal],
    enabled: !!detalleId && accion !== "Asignacion",
    queryFn: () => api<PagedResult<Miembro>>("/grupos-productivos/" + detalleId + "/animales?soloActuales=true&page=" + paginaAnimal + "&pageSize=10&search=" + encodeURIComponent(buscarAnimal)),
  });
  const candidatos = useQuery({
    queryKey: ["grupo-candidatos", paginaAnimal, buscarAnimal],
    enabled: accion === "Asignacion",
    queryFn: () => api<PagedResult<Candidato>>("/grupos-productivos/candidatos?page=" + paginaAnimal + "&pageSize=10&search=" + encodeURIComponent(buscarAnimal)),
  });
  const cerrarFormulario = () => {
    setFormVisible(false);
    setEditando(null);
  };
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await api(editando ? "/grupos-productivos/" + editando.id : "/grupos-productivos", {
        method: editando ? "PUT" : "POST",
        body: JSON.stringify({
          nombre: d.get("nombre"),
          tipo: d.get("tipo"),
          fechaInicio: d.get("fechaInicio"),
          descripcionObjetivo: d.get("descripcionObjetivo") || null,
          observaciones: d.get("observaciones") || null,
        }),
      });
      notify({
        tone: "success",
        title: editando ? "Grupo actualizado" : "Grupo creado",
        message: "La información fue guardada correctamente.",
      });
      cerrarFormulario();
      await client.invalidateQueries({ queryKey: ["grupos-productivos"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se guardó el grupo",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const cerrar = async (g: Grupo) => {
    if (
      !(await requestConfirmation({
        title: "Cerrar grupo productivo",
        message: g.nombre + " dejará de recibir animales. El historial se conservará.",
        confirmLabel: "Cerrar grupo",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api("/grupos-productivos/" + g.id + "/cerrar", { method: "POST" });
      notify({
        tone: "success",
        title: "Grupo cerrado",
        message: "El grupo fue cerrado correctamente.",
      });
      await client.invalidateQueries({ queryKey: ["grupos-productivos"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se cerró el grupo",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const abrirAccion = (valor: "Asignacion" | "Traslado" | "Retiro") => {
    setAccion(valor);
    setDestinoId(valor === "Asignacion" ? (detalleId ?? "") : "");
    setDestinoSeleccionado(valor === "Asignacion" ? (detalle.data ?? null) : null);
    setBuscarDestino("");
    setPaginaDestino(1);
    setSeleccionados({});
    setBuscarAnimal("");
    setPaginaAnimal(1);
    setMotivo("");
    setObservaciones("");
  };
  const candidatosPagina: Candidato[] =
    accion === "Asignacion"
      ? (candidatos.data?.items ?? []).filter((x) => !x.grupoActualId)
      : (miembros.data?.items ?? []).map((x) => ({
          id: x.animalId,
          codigoAnimal: x.codigoAnimal,
          arete: x.arete,
          sexo: x.sexo,
          categoria: x.categoria,
          propietario: x.propietario,
          grupoActualId: detalleId,
          grupoActual: detalle.data?.nombre ?? null,
        }));
  const ejecutar = async () => {
    const ids = Object.keys(seleccionados);
    if (!ids.length) {
      notify({
        tone: "error",
        title: "Seleccione animales",
        message: "Debe seleccionar al menos un animal.",
      });
      return;
    }
    const resumen = Object.values(seleccionados)
      .slice(0, 5)
      .map((x) => x.codigoAnimal + ": " + (x.grupoActual ?? "Sin grupo") + " → " + (accion === "Retiro" ? "Sin grupo" : (destinoSeleccionado?.nombre ?? "grupo destino")))
      .join("\n");
    if (
      !(await requestConfirmation({
        title: "Confirmar movimiento grupal",
        message: resumen + (ids.length > 5 ? "\n… y " + (ids.length - 5) + " animales más" : ""),
        confirmLabel: "Confirmar",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api("/grupos-productivos/movimientos", {
        method: "POST",
        body: JSON.stringify({
          fecha,
          tipo: accion,
          grupoOrigenId: accion === "Asignacion" ? null : detalleId,
          grupoDestinoId: accion === "Retiro" ? null : destinoId,
          animalIds: ids,
          motivo: motivo || null,
          observaciones: observaciones || null,
        }),
      });
      notify({
        tone: "success",
        title: "Movimiento registrado",
        message: "Se procesaron " + ids.length + " animales.",
      });
      setAccion(null);
      setSeleccionados({});
      await Promise.all([client.invalidateQueries({ queryKey: ["grupos-productivos"] }), client.invalidateQueries({ queryKey: ["grupo-productivo"] }), client.invalidateQueries({ queryKey: ["grupo-miembros"] }), client.invalidateQueries({ queryKey: ["grupo-candidatos"] }), ...ids.map((id) => client.invalidateQueries({ queryKey: ["animal-groups", id] }))]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se registró el movimiento",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const guardarMetas = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detalleId) return;
    const datos = new FormData(event.currentTarget);
    try {
      await api(`/grupos-productivos/${detalleId}/metas-engorda`, { method: "PUT", body: JSON.stringify({ pesoObjetivoLibras: datos.get("pesoObjetivoLibras") ? Number(datos.get("pesoObjetivoLibras")) : null, gananciaDiariaObjetivoLibras: datos.get("gananciaDiariaObjetivoLibras") ? Number(datos.get("gananciaDiariaObjetivoLibras")) : null }) });
      await engorda.refetch();
      notify({ tone: "success", title: "Metas actualizadas", message: "Las metas de engorda fueron guardadas." });
    } catch (error) { notify({ tone: "error", title: "No se guardaron las metas", message: error instanceof Error ? error.message : "Error inesperado." }); }
  };
  const exportarEngorda = async () => {
    const filas: MetricaEngorda[] = []; let pagina = 1; let total = 0;
    do { const resultado = await api<PaginaEngorda>(rutaEngorda(pagina, 100)); filas.push(...resultado.items); total = resultado.total; pagina++; } while (filas.length < total);
    const escapar = (valor: unknown) => `"${String(valor ?? "").replaceAll('"', '""')}"`;
    const columnas = ["Animal", "Arete", "Ingreso", "Salida", "Días grupo", "Peso inicial lb", "Peso actual lb", "Ganancia lb", "GMD lb/día", "Costo etapa", "Costo por lb", "Estado meta GMD"];
    const contenido = [columnas, ...filas.map((x) => [x.codigoAnimal, x.arete, x.fechaIngresoGrupo.slice(0, 10), x.fechaSalidaGrupo?.slice(0, 10), x.diasEnGrupo, x.pesoInicialLibras, x.pesoActualLibras, x.gananciaLibras, x.gmdLibrasDia, x.costoEtapaEngorda, x.costoPorLibraGanada, x.estadoGmd])].map((fila) => fila.map(escapar).join(",")).join("\r\n");
    const enlace = document.createElement("a"); enlace.href = URL.createObjectURL(new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8" })); enlace.download = `engorda-${detalle.data?.codigo ?? "grupo"}-${fechaCorteEngorda}.csv`; enlace.click(); URL.revokeObjectURL(enlace.href);
  };
  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Grupos productivos"
        description="Agrupa animales para su manejo sin alterar procedencia, propiedad, inventario ni ubicación."
        actions={
          <Button
            onClick={() => {
              setEditando(null);
              setFormVisible(true);
            }}
          >
            Nuevo grupo
          </Button>
        }
      />
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Buscar"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {tipos.map((x) => (
              <option key={x[0]} value={x[0]}>
                {x[1]}
              </option>
            ))}
          </Select>
          <Select
            label="Estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Cerrado">Cerrado</option>
          </Select>
        </div>
      </Card>
      {formVisible && (
        <Card className="mb-5">
          <h2 className="font-display text-xl font-bold">{editando ? "Editar grupo" : "Nuevo grupo"}</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={(e) => void guardar(e)}>
            <Input label="Nombre *" name="nombre" required defaultValue={editando?.nombre} />
            <Select label="Tipo *" name="tipo" defaultValue={editando?.tipo ?? "Cria"}>
              {tipos.map((x) => (
                <option key={x[0]} value={x[0]}>
                  {x[1]}
                </option>
              ))}
            </Select>
            <Input label="Fecha de inicio *" name="fechaInicio" type="date" required defaultValue={(editando?.fechaInicio ?? new Date().toISOString()).slice(0, 10)} />
            <Input label="Descripción / objetivo" name="descripcionObjetivo" defaultValue={editando?.descripcionObjetivo ?? ""} />
            <div className="md:col-span-2">
              <Input label="Observaciones" name="observaciones" defaultValue={editando?.observaciones ?? ""} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="ghost" onClick={cerrarFormulario}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Fecha inicio</th>
                <th>Animales actuales</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos.data?.items.map((g) => (
                <tr key={g.id} className="border-b">
                  <td className="p-3 font-semibold">{g.codigo}</td>
                  <td>{g.nombre}</td>
                  <td>{nombreTipo(g.tipo)}</td>
                  <td>{g.fechaInicio.slice(0, 10)}</td>
                  <td>{g.cantidadAnimalesActual}</td>
                  <td>{g.estado}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDetalleId(g.id);
                          setAccion(null);
                        }}
                      >
                        Ver detalle
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditando(g);
                          setFormVisible(true);
                        }}
                      >
                        Editar
                      </Button>
                      {g.estado === "Activo" && (
                        <Button variant="danger" onClick={() => void cerrar(g)}>
                          Cerrar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.max(1, Math.ceil((grupos.data?.total ?? 0) / 10))} totalItems={grupos.data?.total ?? 0} pageSize={10} onPageChange={setPage} label="Grupos productivos" />
      </Card>
      {detalle.data && (
        <Card className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-emerald-600">
                {detalle.data.codigo} · {nombreTipo(detalle.data.tipo)}
              </p>
              <h2 className="font-display text-2xl font-bold">{detalle.data.nombre}</h2>
              <p className="text-sm text-slate-500">
                {detalle.data.cantidadAnimalesActual} animales actuales · {detalle.data.estado}
              </p>
            </div>
            {detalle.data.estado === "Activo" && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => abrirAccion("Asignacion")}>Asignar animales</Button>
                <Button variant="secondary" onClick={() => abrirAccion("Traslado")}>
                  Trasladar animales
                </Button>
                <Button variant="ghost" onClick={() => abrirAccion("Retiro")}>
                  Retirar animales
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {detalle.data.composicion.map((x, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                {x.sexo} · {x.categoria}: {x.cantidad}
              </span>
            ))}
          </div>
          {detalle.data.tipo === "Engorda" && (
            <div className="mt-5 grid gap-5">
              <form key={`${engorda.data?.pesoObjetivoLibras ?? ""}-${engorda.data?.gananciaDiariaObjetivoLibras ?? ""}`} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-3" onSubmit={(event) => void guardarMetas(event)}>
                <Input name="pesoObjetivoLibras" label="Peso objetivo (lb)" type="number" min="0.01" step="0.01" defaultValue={engorda.data?.pesoObjetivoLibras ?? ""} />
                <Input name="gananciaDiariaObjetivoLibras" label="GMD objetivo (lb/día)" type="number" min="0.01" step="0.01" defaultValue={engorda.data?.gananciaDiariaObjetivoLibras ?? ""} />
                <div className="flex items-end"><Button type="submit">Guardar metas</Button></div>
              </form>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Card><p className="text-xs text-slate-500">Animales</p><strong>{engorda.data?.resumen.cantidadAnimales ?? 0}</strong></Card>
                <Card><p className="text-xs text-slate-500">Peso actual promedio</p><strong>{engorda.data?.resumen.pesoActualPromedio?.toFixed(2) ?? "—"} lb</strong></Card>
                <Card><p className="text-xs text-slate-500">Ganancia</p><strong>{engorda.data?.resumen.gananciaTotalLibras.toFixed(2) ?? "0.00"} lb</strong></Card>
                <Card><p className="text-xs text-slate-500">GMD promedio</p><strong>{engorda.data?.resumen.gmdPromedio?.toFixed(3) ?? "—"} lb/día</strong></Card>
                <Card><p className="text-xs text-slate-500">Costo etapa</p><strong>{formatearMoneda(engorda.data?.resumen.costoEtapaTotal ?? 0, moneda, cultura)}</strong></Card>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input label="Fecha de corte" type="date" value={fechaCorteEngorda} onChange={(e) => { setFechaCorteEngorda(e.target.value); setPaginaEngorda(1); }} />
                <Input label="Buscar animal" value={buscarEngorda} onChange={(e) => { setBuscarEngorda(e.target.value); setPaginaEngorda(1); }} />
                <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={soloActualesEngorda} onChange={(e) => { setSoloActualesEngorda(e.target.checked); setPaginaEngorda(1); }} /> Sólo miembros actuales</label>
                <div className="flex items-end"><Button variant="secondary" onClick={() => void exportarEngorda()}>Exportar CSV</Button></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Animal</th><th>Período</th><th>Peso inicial</th><th>Peso actual</th><th>Ganancia</th><th>GMD</th><th>Costo etapa</th><th>Costo/lb</th><th>Meta</th></tr></thead>
                  <tbody>{engorda.data?.items.map((x) => <tr key={x.historialGrupoId} className="border-b"><td className="p-2 font-semibold">{x.codigoAnimal}<small className="block font-normal text-slate-500">Arete {x.arete ?? "—"}</small></td><td>{x.fechaIngresoGrupo.slice(0,10)} · {x.fechaSalidaGrupo?.slice(0,10) ?? "Actual"}</td><td>{x.pesoInicialLibras?.toFixed(2) ?? "—"}</td><td>{x.pesoActualLibras?.toFixed(2) ?? "—"}</td><td>{x.gananciaLibras?.toFixed(2) ?? "—"}</td><td>{x.gmdLibrasDia?.toFixed(3) ?? "—"}</td><td>{formatearMoneda(x.costoEtapaEngorda, moneda, cultura)}</td><td>{x.costoPorLibraGanada == null ? "—" : formatearMoneda(x.costoPorLibraGanada, moneda, cultura)}</td><td>{x.estadoGmd}</td></tr>)}</tbody>
                </table>
                {!engorda.isLoading && engorda.data?.items.length === 0 && <p className="p-5 text-center text-sm text-slate-500">No hay ciclos de engorda para los filtros seleccionados.</p>}
              </div>
              <Pagination page={paginaEngorda} totalPages={Math.max(1, Math.ceil((engorda.data?.total ?? 0) / 10))} totalItems={engorda.data?.total ?? 0} pageSize={10} onPageChange={setPaginaEngorda} label="Rendimiento de engorda" />
            </div>
          )}
          {accion && (
            <div className="mt-5 rounded-2xl border p-4">
              <h3 className="font-bold">{accion === "Asignacion" ? "Asignar animales" : accion === "Traslado" ? "Trasladar animales" : "Retirar animales"}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label="Fecha *" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                {accion === "Traslado" && (
                  <div>
                    <Input
                      label="Buscar grupo destino"
                      value={buscarDestino}
                      onChange={(e) => {
                        setBuscarDestino(e.target.value);
                        setPaginaDestino(1);
                      }}
                    />
                    <Select
                      label="Grupo destino *"
                      value={destinoId}
                      onChange={(e) => {
                        setDestinoId(e.target.value);
                        const grupo = activos.data?.items.find((x) => x.id === e.target.value);
                        if (grupo) setDestinoSeleccionado(grupo);
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {destinoSeleccionado && !activos.data?.items.some((x) => x.id === destinoSeleccionado.id) && (
                        <option value={destinoSeleccionado.id}>
                          {destinoSeleccionado.codigo} · {destinoSeleccionado.nombre}
                        </option>
                      )}
                      {activos.data?.items
                        .filter((x) => x.id !== detalleId)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.codigo} · {x.nombre}
                          </option>
                        ))}
                    </Select>
                    <Pagination page={paginaDestino} totalPages={Math.max(1, Math.ceil((activos.data?.total ?? 0) / 20))} totalItems={activos.data?.total ?? 0} pageSize={20} onPageChange={setPaginaDestino} label="Grupos activos" />
                  </div>
                )}
                <Input label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <Input label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                <Input
                  label="Buscar animales"
                  value={buscarAnimal}
                  onChange={(e) => {
                    setBuscarAnimal(e.target.value);
                    setPaginaAnimal(1);
                  }}
                />
              </div>
              <div className="mt-3 grid gap-2">
                {candidatosPagina.map((x) => (
                  <label key={x.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={!!seleccionados[x.id]}
                      onChange={(e) =>
                        setSeleccionados((actual) => {
                          const siguiente = { ...actual };
                          if (e.target.checked) siguiente[x.id] = x;
                          else delete siguiente[x.id];
                          return siguiente;
                        })
                      }
                    />
                    <span>
                      <strong>{x.codigoAnimal}</strong> · arete {x.arete ?? "—"} · {x.sexo} · {x.categoria} · {x.propietario}
                      <small className="block text-slate-500">Grupo actual: {x.grupoActual ?? "Sin grupo"}</small>
                    </span>
                  </label>
                ))}
              </div>
              <Pagination page={paginaAnimal} totalPages={Math.max(1, Math.ceil(((accion === "Asignacion" ? candidatos.data?.total : miembros.data?.total) ?? 0) / 10))} totalItems={(accion === "Asignacion" ? candidatos.data?.total : miembros.data?.total) ?? 0} pageSize={10} onPageChange={setPaginaAnimal} label="Animales" />
              <p className="mt-2 text-sm">Seleccionados: {Object.keys(seleccionados).length}</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void ejecutar()} disabled={accion === "Traslado" && !destinoId}>
                  Confirmar movimiento
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAccion(null);
                    setSeleccionados({});
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="mt-5">
            <h3 className="font-bold">Historial de movimientos</h3>
            <div className="mt-2 grid gap-2">
              {detalle.data.movimientos.map((x) => (
                <div key={x.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  {x.fecha.slice(0, 10)} · {x.tipo} · {x.cantidadAnimales} animales{x.motivo ? " · " + x.motivo : ""}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
