export interface OpcionAnimal { value: string; label: string }

export const OPCIONES_SEXO_ANIMAL: OpcionAnimal[] = [
  { value: "Hembra", label: "Hembra" },
  { value: "Macho", label: "Macho" },
  { value: "Desconocido", label: "Desconocido" },
];

export const OPCIONES_CATEGORIA_ZOOTECNICA: OpcionAnimal[] = [
  { value: "Ternera", label: "Ternera" },
  { value: "Novilla", label: "Novilla" },
  { value: "Vaca", label: "Vaca" },
  { value: "Ternero", label: "Ternero" },
  { value: "Novillo", label: "Novillo" },
  { value: "Toro", label: "Toro" },
  { value: "Otra", label: "Otra" },
];
