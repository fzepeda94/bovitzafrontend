import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { notify, requestConfirmation } from "../lib/feedback";
import type { CatalogItem, Entity, PagedResult } from "../types";
import { Button, Card, IconButton, Input, Pagination, Select } from "../components/ui";
import { PageHeader } from "../components/Page";
import { formatearMoneda, useMonedaTenant } from "../lib/moneda";
import { OPCIONES_CATEGORIA_ZOOTECNICA, OPCIONES_SEXO_ANIMAL } from "../lib/opcionesAnimales";
import { ordenarEntidadesPorCodigo } from "../lib/comprasGanado";

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
interface DetalleCompra extends Compra { propietarioAdquirenteNombre: string; vendedorNombre: string | null; documento: string | null; gastosTransporte: number; gastosVeterinariosIniciales: number; otrosGastos: number; costoTotalCalculado: number; observaciones: string | null; animales: { detalleId: string; animalId: string | null; codigoAnimal: string | null; sexo: string; categoria: string; arete: string | null; fechaNacimiento: string | null; razaNombre: string | null; colorNombre: string | null; precioIndividualInformado: number | null; costoOriginalAsignado: number | null; costoAdministrativoAsignado: number | null; costoTotalAsignado: number | null }[] }

export function ComprasGanadoPagina() {
  const { moneda, cultura } = useMonedaTenant();
  const [cantidad, setCantidad] = useState(1);
  const [formularioCompraAbierto, setFormularioCompraAbierto] = useState(false);
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const animales = Array.from({ length: cantidad }, (_, index) => ({
      sexo: data.get(`sexo-${index}`),
      categoria: data.get(`categoria-${index}`),
      arete: String(data.get(`arete-${index}`) || "") || null,
      fechaNacimiento: String(data.get(`nacimiento-${index}`) || "") || null,
      razaId: String(data.get(`raza-${index}`) || "") || null,
      colorId: String(data.get(`color-${index}`) || "") || null,
      precioIndividual: data.get(`precio-${index}`)
        ? Number(data.get(`precio-${index}`))
        : null,
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
      await api("/compras-ganado", {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify({
        tone: "success",
        title: "Borrador creado",
        message:
          "La compra todavía no afecta el inventario. Revísala y confírmala cuando esté completa.",
      });
      form.reset();
      setCantidad(1);
      setFormularioCompraAbierto(false);
      await client.invalidateQueries({ queryKey: ["purchases"] });
    } catch (error) {
      notify({
        tone: "error",
        title: "No se guardó la compra",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
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
        actions={<Button type="button" onClick={() => { setCompraDetalleId(null); setFormularioCompraAbierto(true); }}><Plus size={17}/>Nueva compra</Button>}
      />
      {formularioCompraAbierto && <Card>
        <div className="mb-4 flex items-start justify-between gap-3"><h2 className="font-display text-lg font-bold">Nueva compra de ganado</h2><IconButton label="Cerrar nueva compra" onClick={() => { setFormularioCompraAbierto(false); setCantidad(1); }}><X size={18}/></IconButton></div>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              name="fecha"
              label="Fecha de compra"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Select name="comprador" label="Entidad adquirente" required>
              <option value="">Seleccionar…</option>
              {entidadesOrdenadas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Select name="vendedor" label="Entidad vendedora">
              <option value="">No especificada</option>
              {entidadesOrdenadas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo} · {x.nombreCompletoORazonSocial}
                </option>
              ))}
            </Select>
            <Input name="nombre" label="Nombre de la compra" required />
            <Input name="documento" label="Factura o documento" />
            <Input
              label="Cantidad de bovinos"
              type="number"
              min="1"
              max="100"
              required
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Math.min(100, Number(e.target.value))))}
            />
            <Input
              name="precio"
              label={`Precio total del ganado${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
              required
            />
            <Input
              name="transporte"
              label={`Transporte${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
            />
            <Input
              name="veterinarios"
              label={`Gastos veterinarios${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
            />
            <Input
              name="otros"
              label={`Otros gastos${moneda ? ` (${moneda})` : ""}`}
              type="number"
              min="0"
              step="0.01"
            />
            <Input
              name="observaciones"
              label="Observaciones"
              className="md:col-span-2"
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
                      <Select name={`sexo-${index}`} required defaultValue="" aria-label={`Sexo del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">Seleccionar…</option>{OPCIONES_SEXO_ANIMAL.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <Select name={`categoria-${index}`} required defaultValue="" aria-label={`Categoría del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">Seleccionar…</option>{OPCIONES_CATEGORIA_ZOOTECNICA.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <input
                        name={`arete-${index}`}
                        className="w-28 rounded-lg border bg-transparent p-2"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        name={`nacimiento-${index}`}
                        type="date"
                        className="rounded-lg border bg-transparent p-2"
                      />
                    </td>
                    <td className="p-2">
                      <Select name={`raza-${index}`} defaultValue="" aria-label={`Raza del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">No especificada</option>{breeds.data?.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <Select name={`color-${index}`} defaultValue="" aria-label={`Color del bovino ${index + 1}`} className="min-h-10 rounded-lg py-0"><option value="">No especificado</option>{colors.data?.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Select>
                    </td>
                    <td className="p-2">
                      <input
                        name={`precio-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 rounded-lg border bg-transparent p-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button type="submit">Guardar borrador</Button>
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
                  <button
                    type="button"
                    onClick={() => void confirmar(item)}
                    title="Confirmar compra"
                    className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 size={20} />
                  </button>
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
