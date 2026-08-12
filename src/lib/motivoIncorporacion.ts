export function formatearMotivoIncorporacion(motivo: string | null | undefined): string {
  const conocidos: Record<string, string> = {
    CargaInicial: "Carga inicial",
    Compra: "Compra",
    Nacimiento: "Nacimiento",
    TransferenciaRecibida: "Transferencia recibida",
    "Transferencia externa recibida": "Transferencia recibida",
  };
  return motivo ? conocidos[motivo] ?? motivo.replace(/([a-z])([A-Z])/g, "$1 $2") : "No registrado";
}
