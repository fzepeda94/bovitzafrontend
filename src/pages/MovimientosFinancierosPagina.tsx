import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Plus, Power, X } from "lucide-react";
import { api } from "../lib/api";
import { notify, requestConfirmation } from "../lib/feedback";
import type { Entity, PagedResult } from "../types";
import {
  Button,
  Card,
  IconButton,
  Input,
  Pagination,
  Select,
} from "../components/ui";
import { PageHeader } from "../components/Page";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import type { CategoriaFinanciera } from "./CategoriasFinancierasPagina";

interface Movimiento {
  id: string;
  fecha: string;
  naturaleza: string;
  categoriaFinancieraId: string | null;
  categoria: string;
  descripcion: string;
  monto: number;
  cantidad: number;
  propietarioAtribuidoId: string | null;
  origenFondos: string;
  propietarioFuenteId: string | null;
  creditoFuenteId: string | null;
  metodoPago: string | null;
  documento: string | null;
  estado: string;
  observaciones: string | null;
  fincaBeneficiadaId:string|null; potreroId:string|null; loteId:string|null; animalId:string|null; procesoOrigen:string|null;
}
interface Opcion {id:string;codigo?:string;codigoAnimal?:string;nombre?:string;arete?:string|null;estado?:string}
interface CreditoOpcion {id:string;numeroCredito:string|null;entidadFinanciera:string;estado:string}
const naturalezas = [
  "IngresoOperativo",
  "GastoOperativo",
  "Inversion",
  "AporteCapital",
  "RetiroCapital",
  "FinanciamientoRecibido",
  "PagoPrincipalDeuda",
  "GastoFinanciero",
];
export function MovimientosFinancierosPagina() {
  const { moneda, cultura } = useMonedaTenant();
  const client = useQueryClient();
  const [formulario, setFormulario] = useState(false);
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const [detalle, setDetalle] = useState<Movimiento | null>(null);
  const [naturaleza, setNaturaleza] = useState("");
  const [origen, setOrigen] = useState("OperacionGanadera");
  const [search, setSearch] = useState("");
  const [pagina, setPagina] = useState(1);
  const [fechaInicio,setFechaInicio]=useState(""); const [fechaFin,setFechaFin]=useState(""); const [filtroNaturaleza,setFiltroNaturaleza]=useState(""); const [filtroCategoria,setFiltroCategoria]=useState(""); const [filtroPropietario,setFiltroPropietario]=useState("");
  const categorias = useQuery({
    queryKey: ["financial-categories"],
    queryFn: () => api<CategoriaFinanciera[]>("/finanzas/categorias"),
  });
  const entidades = useQuery({
    queryKey: ["entities", "finance"],
    queryFn: () => api<PagedResult<Entity>>("/entidades?page=1&pageSize=200"),
  });
  const fincas=useQuery({queryKey:["farms","finance"],queryFn:()=>api<PagedResult<Opcion>>("/fincas?page=1&pageSize=200")});
  const potreros=useQuery({queryKey:["pastures","finance"],queryFn:()=>api<PagedResult<Opcion>>("/potreros?page=1&pageSize=200")});
  const lotes=useQuery({queryKey:["lots"],queryFn:()=>api<Opcion[]>("/lotes")});
  const animales=useQuery({queryKey:["animals","finance"],queryFn:()=>api<PagedResult<Opcion>>("/animales?page=1&pageSize=200")});
  const creditos=useQuery({queryKey:["credits"],queryFn:()=>api<CreditoOpcion[]>("/creditos")});
  const movimientos = useQuery({
    queryKey: ["financial-movements", search, pagina,fechaInicio,fechaFin,filtroNaturaleza,filtroCategoria,filtroPropietario],
    queryFn: () =>
      api<PagedResult<Movimiento>>(
        `/finanzas/movimientos?page=${pagina}&pageSize=10&search=${encodeURIComponent(search)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&naturaleza=${filtroNaturaleza}&categoriaId=${filtroCategoria}&propietarioId=${filtroPropietario}`,
      ),
  });
  const categoriasFiltradas = useMemo(
    () =>
      categorias.data?.filter(
        (x) => !naturaleza || x.naturaleza === naturaleza,
      ) ?? [],
    [categorias.data, naturaleza],
  );
  const cerrar = () => {
    setFormulario(false);
    setEditando(null);
    setNaturaleza("");
    setOrigen("OperacionGanadera");
  };
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await api(
        editando
          ? `/finanzas/movimientos/${editando.id}`
          : "/finanzas/movimientos",
        {
          method: editando ? "PUT" : "POST",
          body: JSON.stringify({
            fecha: d.get("fecha"),
            naturaleza: d.get("naturaleza"),
            categoriaFinancieraId: d.get("categoria"),
            descripcion: d.get("descripcion"),
            monto: Number(d.get("monto")),
            cantidad: Number(d.get("cantidad") || 1),
            propietarioAtribuidoId: d.get("propietario") || null,
            origenFondos: d.get("origen"),
            propietarioFuenteId: d.get("propietarioFuente") || null,
            creditoFuenteId: d.get("creditoFuente") || null,
            fincaBeneficiadaId: d.get("finca") || null,
            potreroId: d.get("potrero") || null,
            loteId: d.get("lote") || null,
            animalId: d.get("animal") || null,
            metodoPago: d.get("metodoPago") || null,
            documento: d.get("documento") || null,
            estado: d.get("estado"),
            observaciones: d.get("observaciones") || null,
          }),
        },
      );
      notify({
        tone: "success",
        title: "Movimiento guardado",
        message: "El movimiento financiero quedó registrado.",
      });
      cerrar();
      await client.invalidateQueries({ queryKey: ["financial-movements"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se guardó el movimiento",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const desactivar = async (x: Movimiento) => {
    if (
      !(await requestConfirmation({
        title: "Desactivar movimiento",
        message:
          "El movimiento se ocultará de los reportes activos sin eliminarse físicamente.",
        confirmLabel: "Desactivar",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(`/finanzas/movimientos/${x.id}`, { method: "DELETE" });
      await client.invalidateQueries({ queryKey: ["financial-movements"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se desactivó",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  const editar = (x: Movimiento) => {
    setEditando(x);
    setNaturaleza(x.naturaleza);
    setOrigen(x.origenFondos);
    setFormulario(true);
  };
  const exportar = async () => {
    try {
      const filas: Movimiento[] = [];
      let paginaExportacion = 1;
      let total = 0;

      do {
        const resultado = await api<PagedResult<Movimiento>>(
          `/finanzas/movimientos?page=${paginaExportacion}&pageSize=100&search=${encodeURIComponent(search)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&naturaleza=${filtroNaturaleza}&categoriaId=${filtroCategoria}&propietarioId=${filtroPropietario}`,
        );
        filas.push(...resultado.items);
        total = resultado.total;
        paginaExportacion += 1;

        if (resultado.items.length === 0) break;
      } while (filas.length < total);

      const escaparCsv = (valor: string | number) =>
        `"${String(valor).replaceAll('"', '""')}"`;
      const csv = [
        [
          "Fecha",
          "Naturaleza",
          "Categoría",
          "Descripción",
          "Monto",
          "Origen",
          "Estado",
        ].map(escaparCsv).join(","),
        ...filas.map((x) =>
          [
            x.fecha.slice(0, 10),
            x.naturaleza,
            x.categoria,
            x.descripcion,
            x.monto,
            x.origenFondos,
            x.estado,
          ].map(escaparCsv).join(","),
        ),
      ].join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      );
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "movimientos-financieros.csv";
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se pudo exportar",
        message: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Finanzas"
        title="Movimientos financieros"
        description="Distingue resultado ganadero, flujo, inversión, capital y financiamiento."
        actions={
          <>
            <Button variant="secondary" onClick={() => void exportar()}>
              <Download size={17} />
              Exportar
            </Button>
            <Button
              onClick={() => {
                setEditando(null);
                setFormulario(true);
              }}
            >
              <Plus size={17} />
              Nuevo movimiento
            </Button>
          </>
        }
      />
      {formulario && (
        <Card className="mb-5">
          <div className="flex justify-between">
            <h2 className="font-display text-lg font-bold">
              {editando ? "Editar movimiento" : "Nuevo movimiento"}
            </h2>
            <IconButton label="Cerrar formulario" onClick={cerrar}>
              <X size={18} />
            </IconButton>
          </div>
          <form
            key={editando?.id ?? "nuevo"}
            onSubmit={guardar}
            className="mt-4 grid min-w-0 gap-4 md:grid-cols-3"
          >
            <Input
              name="fecha"
              label="Fecha *"
              type="date"
              required
              defaultValue={
                editando?.fecha.slice(0, 10) ??
                new Date().toISOString().slice(0, 10)
              }
            />
            <Select
              name="naturaleza"
              label="Naturaleza *"
              required
              value={naturaleza}
              onChange={(e) => setNaturaleza(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {naturalezas.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Select
              name="categoria"
              label="Categoría *"
              required
              defaultValue={editando?.categoriaFinancieraId ?? ""}
            >
              <option value="">Seleccionar…</option>
              {categoriasFiltradas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombre}
                </option>
              ))}
            </Select>
            <Input
              name="descripcion"
              label="Descripción *"
              required
              defaultValue={editando?.descripcion}
            />
            <Input
              name="monto"
              label={`Monto * (${moneda})`}
              type="number"
              min="0.0001"
              step="0.0001"
              required
              defaultValue={editando?.monto}
            />
            <Input
              name="cantidad"
              label="Cantidad *"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              defaultValue={editando?.cantidad ?? 1}
            />
            <Select
              name="propietario"
              label="Propietario atribuido"
              defaultValue={editando?.propietarioAtribuidoId ?? ""}
            >
              <option value="">Sin atribuir</option>
              {entidades.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Select
              name="origen"
              label="Origen de fondos *"
              required
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            >
              {[
                "OperacionGanadera",
                "AporteDirectoPropietario",
                "Credito",
                "Otro",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            {origen === "AporteDirectoPropietario" && (
              <Select
                name="propietarioFuente"
                label="Propietario fuente *"
                required
                defaultValue={editando?.propietarioFuenteId ?? ""}
              >
                <option value="">Seleccionar…</option>
                {entidades.data?.items.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombreCompletoORazonSocial}
                  </option>
                ))}
              </Select>
            )}
            {origen === "Credito" && (
              <Select
                name="creditoFuente"
                label="Crédito fuente *"
                required
                defaultValue={editando?.creditoFuenteId ?? ""}
              ><option value="">Seleccionar…</option>{creditos.data?.filter(x=>x.estado==='Vigente').map(x=><option key={x.id} value={x.id}>{x.numeroCredito??x.id.slice(0,8)} · {x.entidadFinanciera}</option>)}</Select>
            )}
            <Select name="finca" label="Finca" defaultValue={editando?.fincaBeneficiadaId??""}><option value="">Sin finca</option>{fincas.data?.items.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombre}</option>)}</Select>
            <Select name="potrero" label="Potrero" defaultValue={editando?.potreroId??""}><option value="">Sin potrero</option>{potreros.data?.items.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombre}</option>)}</Select>
            <Select name="lote" label="Lote" defaultValue={editando?.loteId??""}><option value="">Sin lote</option>{lotes.data?.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombre}</option>)}</Select>
            <Select name="animal" label="Animal" defaultValue={editando?.animalId??""}><option value="">Sin animal</option>{animales.data?.items.map(x=><option key={x.id} value={x.id}>{x.codigoAnimal}{x.arete?` · ${x.arete}`:''}</option>)}</Select>
            <Input
              name="metodoPago"
              label="Método de pago"
              defaultValue={editando?.metodoPago ?? ""}
            />
            <Input
              name="documento"
              label="Documento"
              defaultValue={editando?.documento ?? ""}
            />
            <Select
              name="estado"
              label="Estado *"
              defaultValue={editando?.estado ?? "Pagado"}
            >
              {["Pendiente", "Parcial", "Pagado", "Cancelado"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Input
              name="observaciones"
              label="Observaciones"
              defaultValue={editando?.observaciones ?? ""}
            />
            <Button type="submit">Guardar</Button>
          </form>
        </Card>
      )}
      <Card>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Input label="Fecha inicio" type="date" value={fechaInicio} onChange={e=>{setFechaInicio(e.target.value);setPagina(1)}}/><Input label="Fecha fin" type="date" value={fechaFin} onChange={e=>{setFechaFin(e.target.value);setPagina(1)}}/>
        <Select label="Naturaleza" value={filtroNaturaleza} onChange={e=>{setFiltroNaturaleza(e.target.value);setPagina(1)}}><option value="">Todas</option>{naturalezas.map(x=><option key={x}>{x}</option>)}</Select>
        <Select label="Categoría" value={filtroCategoria} onChange={e=>{setFiltroCategoria(e.target.value);setPagina(1)}}><option value="">Todas</option>{categorias.data?.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombre}</option>)}</Select>
        <Select label="Propietario" value={filtroPropietario} onChange={e=>{setFiltroPropietario(e.target.value);setPagina(1)}}><option value="">Todos</option>{entidades.data?.items.map(x=><option key={x.id} value={x.id}>{x.codigo} · {x.nombreCompletoORazonSocial}</option>)}</Select>
        <Input
          label="Buscar"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagina(1);
          }}
        /></div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                {[
                  "Fecha",
                  "Naturaleza",
                  "Categoría",
                  "Descripción",
                  "Propietario",
                  "Monto",
                  "Origen",
                  "Estado",
                  "Acciones",
                ].map((x) => (
                  <th className="p-2 text-left" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.data?.items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-2">{x.fecha.slice(0, 10)}</td>
                  <td>{x.naturaleza}</td>
                  <td>{x.categoria}</td>
                  <td>{x.descripcion}</td>
                  <td>
                    {entidades.data?.items.find(
                      (e) => e.id === x.propietarioAtribuidoId,
                    )?.nombreCompletoORazonSocial ?? "—"}
                  </td>
                  <td>{formatearMoneda(x.monto, moneda, cultura)}</td>
                  <td>{x.origenFondos}</td>
                  <td>{x.estado}</td>
                  <td>
                    <div className="flex gap-1">
                      <IconButton
                        label="Ver detalle"
                        onClick={() => setDetalle(x)}
                      >
                        <Eye size={17} />
                      </IconButton>
                      {!x.procesoOrigen&&<IconButton
                        tone="edit"
                        label="Editar"
                        onClick={() => editar(x)}
                      >
                        <Pencil size={17} />
                      </IconButton>}
                      {!x.procesoOrigen&&<IconButton
                        tone="danger"
                        label="Desactivar"
                        onClick={() => void desactivar(x)}
                      >
                        <Power size={17} />
                      </IconButton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pagina}
          totalPages={Math.max(
            1,
            Math.ceil((movimientos.data?.total ?? 0) / 10),
          )}
          totalItems={movimientos.data?.total ?? 0}
          pageSize={10}
          onPageChange={setPagina}
          label="Paginación financiera"
        />
      </Card>
      {detalle && (
        <Card className="mt-5">
          <div className="flex justify-between">
            <h2 className="font-display text-lg font-bold">
              Detalle financiero
            </h2>
            <IconButton label="Cerrar detalle" onClick={() => setDetalle(null)}>
              <X size={18} />
            </IconButton>
          </div>
          <p className="mt-3">
            {detalle.descripcion} ·{" "}
            {formatearMoneda(detalle.monto, moneda, cultura)}
          </p>
          <p className="text-sm text-slate-500">
            {detalle.naturaleza} · {detalle.categoria} · {detalle.origenFondos}
          </p>
        </Card>
      )}
    </>
  );
}
