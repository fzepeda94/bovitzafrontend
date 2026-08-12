import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Eye, Pencil, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { notify, requestConfirmation } from "../lib/feedback";
import type { CatalogItem, Entity, PagedResult } from "../types";
import { Button, Card, IconButton, Input, Pagination, Select } from "../components/ui";
import { PageHeader } from "../components/Page";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import { OPCIONES_CATEGORIA_ZOOTECNICA, OPCIONES_SEXO_ANIMAL } from "../lib/opcionesAnimales";
import { normalizarFechaCompraFormulario, ordenarEntidadesPorCodigo } from "../lib/comprasGanado";

interface Compra {
  id: string;
  codigo: string;
  nombre: string;
  fechaCompra: string;
  cantidadEsperada: number;
  cantidadRegistrada: number;
  precioCompraOriginal: number;
  estado: string;
}
interface AnimalCompraDetalle { detalleId: string; animalId: string | null; codigoAnimal: string | null; sexo: string; categoria: string; arete: string | null; fechaNacimiento: string | null; razaId: string | null; razaNombre: string | null; colorId: string | null; colorNombre: string | null; precioIndividualInformado: number | null; costoOriginalAsignado: number | null; costoAdministrativoAsignado: number | null; costoTotalAsignado: number | null }
interface DetalleCompra extends Compra { propietarioAdquirenteId: string; propietarioAdquirenteNombre: string; vendedorId: string | null; vendedorNombre: string | null; documento: string | null; gastosTransporte: number; gastosVeterinariosIniciales: number; otrosGastos: number; costoTotalCalculado: number; observaciones: string | null; animales: AnimalCompraDetalle[] }
interface FilaAnimalCompra { sexo: string; categoria: string; arete: string; fechaNacimiento: string; razaId: string; colorId: string; precioIndividual: string }

const crearFilaAnimal = (): FilaAnimalCompra => ({ sexo: "", categoria: "", arete: "", fechaNacimiento: "", razaId: "", colorId: "", precioIndividual: "" });

export function ComprasGanadoPagina() {
  const { moneda, cultura } = useMonedaTenant();
  const [cantidad, setCantidad] = useState(1);
  const [formularioCompraAbierto, setFormularioCompraAbierto] = useState(false);
  const [compraEditandoId, setCompraEditandoId] = useState<string | null>(null);
  const [detalleEdicion, setDetalleEdicion] = useState<DetalleCompra | null>(null);
  const [filasAnimales, setFilasAnimales] = useState<FilaAnimalCompra[]>([crearFilaAnimal()]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [compraDetalleId, setCompraDetalleId] = useState<string | null>(null);
  const client = useQueryClient();
  const entities = useQuery({
    queryKey: ["entities"],
    queryFn: () => api<PagedResult<Entity>>("/entidades?pageSize=100"),
  });
  const breeds = useQuery({
    queryKey: ["catalog", "razas"],
    queryFn: () => api<CatalogItem[]>("/catalogos/razas"),
  });
  const colors = useQuery({
    queryKey: ["catalog", "colores"],
    queryFn: () => api<CatalogItem[]>("/catalogos/colores"),
  });
  const purchases = useQuery({
    queryKey: ["purchases"],
    queryFn: () => api<Compra[]>("/compras-ganado"),
  });
  const detalleCompra = useQuery({ queryKey: ["purchase-detail", compraDetalleId], queryFn: () => api<DetalleCompra>(`/compras-ganado/${compraDetalleId}`), enabled: Boolean(compraDetalleId) });
  const entidadesOrdenadas = useMemo(() => ordenarEntidadesPorCodigo(entities.data?.items ?? []), [entities.data?.items]);
  const comprasFiltradas = useMemo(() => { const termino = busqueda.trim().toLocaleLowerCase(); return (purchases.data ?? []).filter((x) => !termino || x.codigo.toLocaleLowerCase().includes(termino) || x.nombre.toLocaleLowerCase().includes(termino)); }, [purchases.data, busqueda]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(comprasFiltradas.length / pageSize));
  const comprasPagina = comprasFiltradas.slice((pagina - 1) * pageSize, pagina * pageSize);

  const cerrarFormulario = () => {
    setFormularioCompraAbierto(false);
    setCompraEditandoId(null);
    setDetalleEdicion(null);
    setCantidad(1);
    setFilasAnimales([crearFilaAnimal()]);
  };

  const abrirNuevaCompra = () => {
    setCompraDetalleId(null);
    setCompraEditandoId(null);
    setDetalleEdicion(null);
    setCantidad(1);
    setFilasAnimales([crearFilaAnimal()]);
    setFormularioCompraAbierto(true);
  };

  const cambiarCantidad = (valor: number) => {
    const nuevaCantidad = Math.max(1, Math.min(100, valor || 1));
    setCantidad(nuevaCantidad);
    setFilasAnimales((actuales) => Array.from({ length: nuevaCantidad }, (_, index) => actuales[index] ?? crearFilaAnimal()));
  };

  const actualizarFila = (index: number, cambio: Partial<FilaAnimalCompra>) => {
    setFilasAnimales((actuales) => actuales.map((fila, posicion) => posicion === index ? { ...fila, ...cambio } : fila));
  };

  const editarCompra = async (compra: Compra) => {
    if (compra.estado !== "Borrador") return;
    try {
      const detalle = await api<DetalleCompra>(`/compras-ganado/${compra.id}`);
      if (detalle.estado !== "Borrador") {
        notify({ tone: "error", title: "No se puede editar", message: "La compra ya no se encuentra en borrador." });
        await client.invalidateQueries({ queryKey: ["purchases"] });
        return;
      }
      const filas = detalle.animales.map((animal) => ({
        sexo: animal.sexo,
        categoria: animal.categoria,
        arete: animal.arete ?? "",
        fechaNacimiento: normalizarFechaCompraFormulario(animal.fechaNacimiento),
        razaId: animal.razaId ?? "",
        colorId: animal.colorId ?? "",
        precioIndividual: animal.precioIndividualInformado?.toString() ?? "",
      }));
      setCompraDetalleId(null);
      setCompraEditandoId(detalle.id);
      setDetalleEdicion(detalle);
      setCantidad(Math.max(1, filas.length));
      setFilasAnimales(filas.length ? filas : [crearFilaAnimal()]);
      setFormularioCompraAbierto(true);
    } catch (error) {
      notify({ tone: "error", title: "No se cargó la compra", message: error instanceof Error ? error.message : "Ocurrió un error inesperado." });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const animales = filasAnimales.slice(0, cantidad).map((fila) => ({
      sexo: fila.sexo,
      categoria: fila.categoria,
      arete: fila.arete || null,
      fechaNacimiento: fila.fechaNacimiento || null,
      razaId: fila.razaId || null,
      colorId: fila.colorId || null,
      precioIndividual: fila.precioIndividual ? Number(fila.precioIndividual) : null,
    }));
    const body = {
      fechaCompra: data.get("fecha"),
      propietarioAdquirenteId: data.get("comprador"),
      vendedorId: data.get("vendedor") || null,
      nombreLote: data.get("nombre"),
      precioCompra: Number(data.get("precio")),
      gastosTransporte: Number(data.get("transporte") || 0),
      gastosVeterinarios: Number(data.get("veterinarios") || 0),
      otrosGastos: Number(data.get("otros") || 0),
      documento: data.get("documento") || null,
      observaciones: data.get("observaciones") || null,
      animales,
    };
    try {
      await api(compraEditandoId ? `/compras-ganado/${compraEditandoId}` : "/compras-ganado", {
        method: compraEditandoId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      notify({
        tone: "success",
        title: compraEditandoId ? "Compra actualizada" : "Borrador creado",
        message: compraEditandoId
          ? "Los cambios se guardaron y la compra continúa en borrador."
          : "La compra todavía no afecta el inventario. Revísala y confírmala cuando esté completa.",
      });
      form.reset();
      const idActualizado = compraEditandoId;
      cerrarFormulario();
      await Promise.all([
        client.invalidateQueries({ queryKey: ["purchases"] }),
        ...(idActualizado ? [client.invalidateQueries({ queryKey: ["purchase-detail", idActualizado] })] : []),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: compraEditandoId ? "No se actualizó la compra" : "No se guardó la compra",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    }
  };

  const anular = async (compra: Compra) => {
    if (compra.estado !== "Borrador") return;
    if (!(await requestConfirmation({
      title: "Anular compra",
      message: `La compra ${compra.codigo} permanecerá registrada para trazabilidad, pero ya no podrá confirmarse ni editarse. Esta operación no afecta el inventario porque la compra todavía está en borrador.`,
      confirmLabel: "Anular compra",
      cancelLabel: "Volver",
    }))) return;
    try {
      await api(`/compras-ganado/${compra.id}/anular`, { method: "POST" });
      notify({ tone: "success", title: "Compra anulada", message: "La compra quedó cancelada sin afectar el inventario." });
      if (compraDetalleId === compra.id) setCompraDetalleId(null);
      if (compraEditandoId === compra.id) cerrarFormulario();
      await Promise.all([
        client.invalidateQueries({ queryKey: ["purchases"] }),
        client.invalidateQueries({ queryKey: ["purchase-detail", compra.id] }),
      ]);
    } catch (error) {
      notify({ tone: "error", title: "No se anuló la compra", message: error instanceof Error ? error.message : "Ocurrió un error inesperado." });
    }
  };

  const confirmar = async (compra: Compra) => {
    if (
      !(await requestConfirmation({
        title: "Confirmar compra",
        message: `Se crearán ${compra.cantidadEsperada} bovino(s) y sus entradas de inventario. Esta operación no se puede editar después.`,
        confirmLabel: "Confirmar compra",
        cancelLabel: "Volver",
      }))
    )
      return;
    try {
      await api(`/compras-ganado/${compra.id}/confirmar`, { method: "POST" });
      notify({
        tone: "success",
        title: "Compra confirmada",
        message: "Los bovinos ingresaron correctamente al inventario.",
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["purchases"] }),
        client.invalidateQueries({ queryKey: ["animals"] }),
      ]);
    } catch (error) {
      notify({
        tone: "error",
        title: "No se confirmó la compra",
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
        eyebrow="Entradas"
        title="Compras de ganado"
        description="Registra la compra como borrador. Los bovinos ingresan al inventario únicamente al confirmarla."
        actions={<Button type="button" onClick={abrirNuevaCompra}><Plus size={17}/>Nueva compra</Button>}
      />
      {formularioCompraAbierto && <Card>
        <div className="mb-4 flex items-start justify-between gap-3"><h2 className="font-display text-lg font-bold">{detalleEdicion ? `Editar · ${detalleEdicion.codigo} · ${detalleEdicion.nombre}` : "Nueva compra de ganado"}</h2><IconButton label={detalleEdicion ? "Cancelar edición" : "Cerrar nueva compra"} onClick={cerrarFormulario}><X size={18}/></IconButton></div>
        <form key={compraEditandoId ?? "nueva"} onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              name="fecha"
              label="Fecha de compra"
              type="date"
              required
              defaultValue={normalizarFechaCompraFormulario(detalleEdicion?.fechaCompra) || new Date().toISOString().slice(0, 10)}
            />
            <Select name="comprador" label="Entidad adquirente" required defaultValue={detalleEdicion?.propietarioAdquirenteId ?? ""}>
              <option value="">Seleccionar…</option>
              {entidadesOrdenadas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Select name="vendedor" label="Entidad vendedora" defaultValue={detalleEdicion?.vendedorId ?? ""}>
              <option value="">No especificada</option>
              {entidadesOrdenadas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Input name="nombre" label="Nombre de la compra" required defaultValue={detalleEdicion?.nombre ?? ""} />
            <Input name="documento" label="Factura o documento" defaultValue={detalleEdicion?.documento ?? ""} />
            <Input
              label="Cantidad de bovinos"
              type="number"
              min="1"
              max="100"
              required
              value={cantidad}
              onChange={(e) => cambiarCantidad(Number(e.target.value))}
            />
            <Input
              name="precio"
              label={`Precio total del ganado${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={detalleEdicion?.precioCompraOriginal}
            />
            <Input
              name="transporte"
              label={`Transporte${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
              defaultValue={detalleEdicion?.gastosTransporte}
            />
            <Input
              name="veterinarios"
              label={`Gastos veterinarios${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
              defaultValue={detalleEdicion?.gastosVeterinariosIniciales}
            />
            <Input
              name="otros"
              label={`Otros gastos${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
              defaultValue={detalleEdicion?.otrosGastos}
            />
            <Input
              name="observaciones"
              label="Observaciones"
              className="md:col-span-2"
              defaultValue={detalleEdicion?.observaciones ?? ""}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  {[
                    "#",
                    "Sexo *",
                    "Categoría *",
                    "Arete",
                    "Nacimiento",
                    "Raza",
                    "Color",
                    "Precio individual",
                  ].map((x) => (
                    <th key={x} className="p-2">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cantidad }, (_, index) => (
                  <tr
                    key={index}
                    className="border-t border-slate-200 dark:border-slate-700"
                  >
                    <td className="p-2 font-semibold">{index + 1}</td>
                    <td className="p-2">
                      <Select name={`sexo-${index}`} required value={filasAnimales[index]?.sexo ?? ""} onChange={(event) => actualizarFila(index, { sexo: event.target.value })} aria-label={`Sexo del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">Seleccionar…</option>{OPCIONES_SEXO_ANIMAL.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <Select name={`categoria-${index}`} required value={filasAnimales[index]?.categoria ?? ""} onChange={(event) => actualizarFila(index, { categoria: event.target.value })} aria-label={`Categoría del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">Seleccionar…</option>{OPCIONES_CATEGORIA_ZOOTECNICA.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <input
                        name={`arete-${index}`}
                        value={filasAnimales[index]?.arete ?? ""}
                        onChange={(event) => actualizarFila(index, { arete: event.target.value })}
                        className="w-28 rounded-lg border bg-transparent p-2"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        name={`nacimiento-${index}`}
                        type="date"
                        value={filasAnimales[index]?.fechaNacimiento ?? ""}
                        onChange={(event) => actualizarFila(index, { fechaNacimiento: event.target.value })}
                        className="rounded-lg border bg-transparent p-2"
                      />
                    </td>
                    <td className="p-2">
                      <Select name={`raza-${index}`} value={filasAnimales[index]?.razaId ?? ""} onChange={(event) => actualizarFila(index, { razaId: event.target.value })} aria-label={`Raza del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">No especificada</option>{breeds.data?.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <Select name={`color-${index}`} value={filasAnimales[index]?.colorId ?? ""} onChange={(event) => actualizarFila(index, { colorId: event.target.value })} aria-label={`Color del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">No especificado</option>{colors.data?.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <input
                        name={`precio-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={filasAnimales[index]?.precioIndividual ?? ""}
                        onChange={(event) => actualizarFila(index, { precioIndividual: event.target.value })}
                        className="w-32 rounded-lg border bg-transparent p-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button type="submit">{compraEditandoId ? "Guardar cambios" : "Guardar borrador"}</Button>
          </div>
        </form>
      </Card>}
      <Card className="mt-5">
        <h2 className="font-display text-lg font-bold">Compras registradas</h2>
        <Input label="Buscar compra" value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} className="mt-3 max-w-md" />
        <div className="mt-3 grid gap-2">
          {comprasPagina.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {item.codigo} · {item.nombre}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.fechaCompra).toLocaleDateString("es-GT")} ·{" "}
                  {item.cantidadEsperada} bovino(s) · {item.estado}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">
                  {formatearMoneda(item.precioCompraOriginal, moneda, cultura)}
                </p>
                <IconButton label={`Ver detalle de compra ${item.codigo}`} onClick={() => setCompraDetalleId(item.id)}><Eye size={19} /></IconButton>
                {item.estado === "Borrador" && (
                  <>
                    <IconButton tone="edit" label={`Editar compra ${item.codigo}`} onClick={() => void editarCompra(item)}><Pencil size={19} /></IconButton>
                    <IconButton tone="danger" label={`Anular compra ${item.codigo}`} onClick={() => void anular(item)}><Ban size={19} /></IconButton>
                    <IconButton tone="success" label={`Confirmar compra ${item.codigo}`} onClick={() => void confirmar(item)}><CheckCircle2 size={20} /></IconButton>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <Pagination page={Math.min(pagina, totalPages)} totalPages={totalPages} totalItems={comprasFiltradas.length} pageSize={pageSize} onPageChange={setPagina} label="Paginación de compras" />
      </Card>
      {detalleCompra.data && <Card className="mt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-pine-600">Detalle de compra</p><h2 className="font-display text-xl font-bold">{detalleCompra.data.codigo} · {detalleCompra.data.nombre}</h2></div><IconButton label="Cerrar detalle" onClick={() => setCompraDetalleId(null)}><X size={19}/></IconButton></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Dato label="Fecha" value={new Date(detalleCompra.data.fechaCompra).toLocaleDateString("es-GT")}/><Dato label="Adquirente" value={detalleCompra.data.propietarioAdquirenteNombre}/><Dato label="Vendedor" value={detalleCompra.data.vendedorNombre ?? "No especificado"}/><Dato label="Documento" value={detalleCompra.data.documento ?? "No registrado"}/><Dato label="Estado" value={detalleCompra.data.estado}/><Dato label="Precio ganado" value={formatearMoneda(detalleCompra.data.precioCompraOriginal, moneda, cultura)}/><Dato label="Transporte" value={formatearMoneda(detalleCompra.data.gastosTransporte, moneda, cultura)}/><Dato label="Veterinarios" value={formatearMoneda(detalleCompra.data.gastosVeterinariosIniciales, moneda, cultura)}/><Dato label="Otros gastos" value={formatearMoneda(detalleCompra.data.otrosGastos, moneda, cultura)}/><Dato label="Costo total" value={formatearMoneda(detalleCompra.data.costoTotalCalculado, moneda, cultura)}/></div>{detalleCompra.data.observaciones && <p className="mt-4 text-sm text-slate-500">{detalleCompra.data.observaciones}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead><tr className="text-left text-slate-500">{["Código animal","Arete","Sexo","Categoría","Nacimiento","Raza","Color","Precio informado","Costo animal","Costo administrativo","Costo total"].map((x)=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{detalleCompra.data.animales.map((animal)=><tr key={animal.detalleId} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2">{animal.codigoAnimal ?? "Pendiente"}</td><td className="p-2">{animal.arete ?? "—"}</td><td className="p-2">{animal.sexo}</td><td className="p-2">{animal.categoria}</td><td className="p-2">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString("es-GT") : "—"}</td><td className="p-2">{animal.razaNombre ?? "No especificada"}</td><td className="p-2">{animal.colorNombre ?? "No especificado"}</td><td className="p-2">{animal.precioIndividualInformado == null ? "—" : formatearMoneda(animal.precioIndividualInformado, moneda, cultura)}</td><td className="p-2">{animal.costoOriginalAsignado == null ? "—" : formatearMoneda(animal.costoOriginalAsignado, moneda, cultura)}</td><td className="p-2">{animal.costoAdministrativoAsignado == null ? "—" : formatearMoneda(animal.costoAdministrativoAsignado, moneda, cultura)}</td><td className="p-2">{animal.costoTotalAsignado == null ? "—" : formatearMoneda(animal.costoTotalAsignado, moneda, cultura)}</td></tr>)}</tbody></table></div></Card>}
    </>
  );
}
function Dato({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>; }
