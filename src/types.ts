export type Sex = 'Hembra' | 'Macho' | 'Desconocido'
export type BirthPrecision = 'Exacta' | 'Aproximada' | 'SoloMesYAnio' | 'SoloAnio' | 'Desconocida'
export type AnimalCategory = 'Ternera' | 'Novilla' | 'Vaca' | 'Ternero' | 'Novillo' | 'Toro' | 'Otra'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  tenantId: string
  displayName: string
  roles: string[]
  permisos: string[]
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Animal {
  id: string; codigoAnimal: string; arete: string | null; propietarioActualId: string; propietario: string
  sexo: Sex; categoria: AnimalCategory; estadoVida: string; estadoReproductivo: string
  fechaNacimiento: string | null; precisionFechaNacimiento: BirthPrecision
  numeroReferenciaOrigen: string | null; entidadOrigenId: string | null; entidadOrigen: string | null
  textoReferenciaOrigen: string | null; observacionOrigen: string | null; loteCompraId: string | null
  fechaIncorporacion: string | null; motivoIncorporacion: string | null
  razaId: string | null; raza: string | null; colorId: string | null; color: string | null
  anioNacimientoEstimado: number | null; mesNacimientoEstimado: number | null; edadEstimadaMesesAlIngreso: number | null
  fuenteFechaNacimiento: string | null; observacionFechaNacimiento: string | null
  madreAnimalId: string | null; padreAnimalId: string | null; condicionSanitaria: string | null; observaciones: string | null
  esAnimalReferencia: boolean; formaParteDelInventario: boolean; fincaId: string | null; potreroId: string | null
  fechaIngresoUbicacion: string | null; rowVersion: string
}

export interface CatalogItem { id: string; tipo: string; codigo: string; nombre: string; descripcion: string | null; catalogoPadreId: string | null; activo: boolean }
export interface PropertyHistory { id: string; fechaInicio: string; fechaFin: string | null; tipoAdquisicion: string | null; precioTransferencia: number | null; observaciones: string | null; entidad: string }
export interface LocationHistory { id: string; fechaInicio: string; fechaFin: string | null; observaciones: string | null; finca: string; potrero: string | null }
export interface HealthRecord { id: string; fecha: string; tipo: string; principioActivo: string | null; dosis: number | null; unidad: string | null; via: string | null; costoUnitario: number | null; costoTotal: number | null; movimientoFinancieroId: string | null; distribucionCostoId: string | null; vinculoCosto: 'SinCosto' | 'GastoGenerado' | 'GastoExistente' | 'HistoricoSinVinculo'; costoAsignadoAnimal: number; origenFondos: string | null; propietarioFuenteId: string | null; creditoFuenteId: string | null; metodoPago: string | null; documento: string | null; proximaAplicacion: string | null; observaciones: string | null }
export interface WeightRecord { id: string; fecha: string; peso: number; unidad: string; pesoLibras: number; observaciones: string | null }
export interface BirthRecord { id: string; fecha: string; estado: 'Borrador' | 'Confirmado' | 'Anulado'; numeroCrias: number; criasVivas: number; criasMuertas: number; criaAnimalId: string | null; sexoCria: Sex | null; tipoPartoId: string | null; tipoParto: string | null; padreAnimalId: string | null; observaciones: string | null }
export interface HistoricalBirthChild { id: string; sexo: Sex; nacioViva: boolean; observaciones: string | null }
export interface HistoricalBirthRecord { id: string; fecha: string; tipoPartoId: string | null; numeroCrias: number; criasVivas: number; criasMuertas: number; fuente: string | null; observaciones: string | null; crias: HistoricalBirthChild[] }
export interface WeaningRecord { id: string; fecha: string; estado: 'Borrador' | 'Confirmado' | 'Anulado'; edadDias: number | null; pesoLibras: number | null; metodo: string | null; categoriaAnterior: AnimalCategory | null; categoriaPosterior: AnimalCategory | null; candidatoVenta: boolean; observaciones: string | null }
export interface LossRecord { id: string; codigo: string; estado: 'Borrador' | 'Confirmado' | 'Anulado'; fecha: string; tipo: string; causa: string | null; diagnostico: string | null; valorEconomicoEstimado: number | null; gastosRelacionados: number; observaciones: string | null }
export interface StateHistory { id: string; fecha: string; tipoEstado: string; estadoAnterior: string; estadoNuevo: string; motivo: string | null; observaciones: string | null }
export interface InventoryMovement { id: string; animalId: string; fecha: string; direccion: 'Entrada' | 'Salida'; tipo: string; procesoOrigen: string; procesoOrigenId: string | null; propietarioId: string; fincaId: string | null; potreroId: string | null; observaciones: string | null }
export interface AnimalRecord { propiedades: PropertyHistory[]; ubicaciones: LocationHistory[]; salud: HealthRecord[]; pesajes: WeightRecord[]; partos: BirthRecord[]; destetes: WeaningRecord[]; bajas: LossRecord[]; estados: StateHistory[] }
export interface Entity {
  id: string
  codigo: string
  nombres: string | null
  apellidos: string | null
  nombreCompletoORazonSocial: string
  nombreComercial: string | null
  tipo: string
  tipoEntidadId: string | null
  nit: string | null
  dpi: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  paisId: string | null
  departamentoId: string | null
  municipioId: string | null
  municipio: string | null
  departamento: string | null
  observaciones: string | null
  activo: boolean
}

export interface ManagedUser {
  id: string
  nombre: string
  correo: string
  activo: boolean
  roles: string[]
  entidadIds: string[]
}

export interface Farm {
  id: string
  codigo: string
  nombre: string
  propietarioFincaId: string | null
  paisId: string | null
  departamentoId: string | null
  municipioId: string | null
  municipio: string | null
  departamento: string | null
  direccionReferencia: string | null
  areaTotal: number | null
  unidadAreaId: string | null
  unidadArea: string | null
  latitud: number | null
  longitud: number | null
  observaciones: string | null
}
export interface Pasture {
  id: string
  fincaId: string
  codigo: string
  nombre: string
  area: number | null
  unidadArea: string | null
  capacidadRecomendada: number | null
  tipoPasto: string | null
  tieneAgua: boolean
  tipoFuenteAgua: string | null
  estado: string
  destinoProductivo?: string | null
  observaciones: string | null
}
export interface Lot { id: string; codigo: string; nombre: string; cantidadEsperada: number; cantidadRegistrada: number; precioCompraOriginal: number; costoAdministrativoAtribuido: number; estado: string }

export interface TenantSettings {
  id: string
  nombre: string
  moneda: string
  cultura: string
  unidadPesoPredeterminada: string
  zonaHoraria: string
}

export interface AnimalFormData {
  propietarioActualId: string
  arete?: string
  numeroReferenciaOrigen?: string
  entidadOrigenId?: string
  textoReferenciaOrigen?: string
  observacionOrigen?: string
  loteCompraId?: string
  fechaIncorporacion?: string
  motivoIncorporacion?: string
  sexo: Sex
  categoria: AnimalCategory
  razaId?: string
  colorId?: string
  fechaNacimiento?: string
  precisionFechaNacimiento: BirthPrecision
  anioNacimientoEstimado?: number
  mesNacimientoEstimado?: number
  edadEstimadaMesesAlIngreso?: number
  fuenteFechaNacimiento?: string
  observacionFechaNacimiento?: string
  madreAnimalId?: string
  padreAnimalId?: string
  fincaId?: string
  potreroId?: string
  fechaIngresoUbicacion?: string
  observaciones?: string
}
