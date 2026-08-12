import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AppSelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
}

export function AppSelect({ name, value, onChange, options, placeholder = "Seleccionar…", disabled = false, required = false, ariaLabel }: AppSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [posicion, setPosicion] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 });
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const seleccionada = options.find((opcion) => opcion.value === value);

  const posicionar = () => {
    const rect = botonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const espacioAbajo = window.innerHeight - rect.bottom - 12;
    const abrirArriba = espacioAbajo < 180 && rect.top > espacioAbajo;
    const maxHeight = Math.max(120, Math.min(240, abrirArriba ? rect.top - 12 : espacioAbajo));
    setPosicion({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: abrirArriba ? rect.top - maxHeight - 6 : rect.bottom + 6, width: Math.min(rect.width, window.innerWidth - 16), maxHeight });
  };

  useEffect(() => {
    if (!abierto) return;
    posicionar();
    const cerrarFuera = (event: PointerEvent) => {
      const objetivo = event.target as Node;
      if (!botonRef.current?.contains(objetivo) && !listaRef.current?.contains(objetivo)) setAbierto(false);
    };
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    document.addEventListener("pointerdown", cerrarFuera);
    return () => {
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
      document.removeEventListener("pointerdown", cerrarFuera);
    };
  }, [abierto]);

  const abrir = () => {
    if (disabled) return;
    const actual = options.findIndex((opcion) => opcion.value === value && !opcion.disabled);
    setIndiceActivo(actual >= 0 ? actual : Math.max(0, options.findIndex((opcion) => !opcion.disabled)));
    setAbierto(true);
  };

  const mover = (direccion: 1 | -1) => {
    let siguiente = indiceActivo;
    do siguiente = (siguiente + direccion + options.length) % options.length;
    while (options[siguiente]?.disabled && siguiente !== indiceActivo);
    setIndiceActivo(siguiente);
  };

  const teclado = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") { setAbierto(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!abierto) abrir(); else mover(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!abierto) abrir();
      else if (!options[indiceActivo]?.disabled) { onChange(options[indiceActivo]!.value); setAbierto(false); }
    }
  };

  return <>
    {name && <input type="hidden" name={name} value={value} />}
    <button ref={botonRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={abierto} aria-controls={`${id}-lista`} onClick={() => abierto ? setAbierto(false) : abrir()} onKeyDown={teclado} className="flex min-h-10 w-full min-w-32 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition hover:border-pine-500 focus:border-pine-500 focus:ring-2 focus:ring-pine-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-pine-500">
      <span className={seleccionada ? "truncate" : "truncate text-slate-500"}>{seleccionada?.label ?? placeholder}{required && !value ? " *" : ""}</span>
      <ChevronDown size={16} className={`shrink-0 transition ${abierto ? "rotate-180" : ""}`} />
    </button>
    {abierto && createPortal(<div ref={listaRef} id={`${id}-lista`} role="listbox" aria-label={ariaLabel} style={{ position: "fixed", left: posicion.left, top: posicion.top, width: posicion.width, maxHeight: posicion.maxHeight }} className="z-[1000] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl scrollbar-thin dark:border-slate-700 dark:bg-slate-900">
      {options.map((opcion, index) => <button key={opcion.value} type="button" role="option" aria-selected={opcion.value === value} disabled={opcion.disabled} onPointerMove={() => setIndiceActivo(index)} onClick={() => { onChange(opcion.value); setAbierto(false); botonRef.current?.focus(); }} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none disabled:opacity-40 ${index === indiceActivo ? "bg-pine-100 text-pine-950 dark:bg-pine-800 dark:text-white" : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"}`}>
        <span>{opcion.label}</span>{opcion.value === value && <Check size={16} />}
      </button>)}
    </div>, document.body)}
  </>;
}
