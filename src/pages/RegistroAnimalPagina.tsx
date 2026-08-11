import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Save,
} from 'lucide-react'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import { api } from '../lib/api'
import { offlineDb } from '../lib/offline'
import type {
  Animal,
  CatalogItem,
  Entity,
  Farm,
  PagedResult,
  Pasture,
} from '../types'
import {
  Button,
  Card,
  Input,
  Select,
} from '../components/ui'
import { PageHeader } from '../components/Page'

const schema = z
  .object({
    propietarioActualId: z
      .string()
      .min(
        1,
        'Selecciona el propietario actual.',
      ),

    arete: z.string(),
    numeroReferenciaOrigen: z.string(),
    entidadOrigenId: z.string(),
    textoReferenciaOrigen: z.string(),
    observacionOrigen: z.string(),
    loteCompraId: z.string(),
    fechaIncorporacion: z.string(),
    motivoIncorporacion: z.string(),

    sexo: z.enum([
      'Hembra',
      'Macho',
      'Desconocido',
    ]),

    categoria: z.enum([
      'Ternera',
      'Novilla',
      'Vaca',
      'Ternero',
      'Novillo',
      'Toro',
      'Otra',
    ]),

    razaId: z.string(),
    colorId: z.string(),
    fechaNacimiento: z.string(),

    precisionFechaNacimiento: z.enum([
      'Exacta',
      'Aproximada',
      'SoloMesYAnio',
      'SoloAnio',
      'Desconocida',
    ]),

    anioNacimientoEstimado: z.string(),
    mesNacimientoEstimado: z.string(),
    edadEstimadaMesesAlIngreso: z.string(),
    fuenteFechaNacimiento: z.string(),
    observacionFechaNacimiento: z.string(),

    madreAnimalId: z.string(),
    padreAnimalId: z.string(),

    fincaId: z.string(),
    potreroId: z.string(),
    fechaIngresoUbicacion: z.string(),

    estadoReproductivo: z.string(),
    condicionSanitaria: z.string(),
    observaciones: z.string(),
  })
  .superRefine((data, context) => {
    if (
      data.precisionFechaNacimiento ===
        'Exacta' &&
      !data.fechaNacimiento
    ) {
      context.addIssue({
        code: 'custom',
        path: ['fechaNacimiento'],
        message:
          'Ingresa la fecha exacta.',
      })
    }

    if (
      data.precisionFechaNacimiento ===
        'Desconocida' &&
      data.fechaNacimiento
    ) {
      context.addIssue({
        code: 'custom',
        path: ['fechaNacimiento'],
        message:
          'No registres una fecha cuando la precisión es desconocida.',
      })
    }
  })

type Values = z.infer<typeof schema>

const steps = [
  'Identificación',
  'Características',
  'Nacimiento',
  'Genealogía',
  'Ubicación',
  'Estado',
  'Revisión',
] as const

const defaults: Values = {
  propietarioActualId: '',
  arete: '',
  numeroReferenciaOrigen: '',
  entidadOrigenId: '',
  textoReferenciaOrigen: '',
  observacionOrigen: '',
  loteCompraId: '',

  fechaIncorporacion:
    new Date()
      .toISOString()
      .slice(0, 10),

  motivoIncorporacion: '',

  sexo: 'Hembra',
  categoria: 'Vaca',

  razaId: '',
  colorId: '',

  fechaNacimiento: '',
  precisionFechaNacimiento:
    'Desconocida',

  anioNacimientoEstimado: '',
  mesNacimientoEstimado: '',
  edadEstimadaMesesAlIngreso: '',
  fuenteFechaNacimiento: '',
  observacionFechaNacimiento: '',

  madreAnimalId: '',
  padreAnimalId: '',

  fincaId: '',
  potreroId: '',

  fechaIngresoUbicacion:
    new Date()
      .toISOString()
      .slice(0, 10),

  estadoReproductivo:
    'Desconocido',

  condicionSanitaria: '',
  observaciones: '',
}

export function AnimalWizardPage() {
  const [searchParams] =
    useSearchParams()

  const editId =
    searchParams.get('editar')

  const [step, setStep] =
    useState(0)

  const [draftId] = useState(
    () => crypto.randomUUID(),
  )

  const [saved, setSaved] =
    useState<Animal | null>(
      null,
    )

  const [status, setStatus] =
    useState('')

  const entities = useQuery({
    queryKey: [
      'entities',
      'animal-wizard',
    ],

    queryFn: () =>
      api<PagedResult<Entity>>(
        '/entidades?page=1&pageSize=200&search=&incluirInactivos=false',
      ),
  })

  const farms = useQuery({
    queryKey: [
      'farms',
      'animal-wizard',
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '1000',
          search: '',
          incluirInactivos:
            'false',
        })

      return api<
        PagedResult<Farm>
      >(
        `/fincas?${params.toString()}`,
      )
    },
  })

  const animals = useQuery({
    queryKey: [
      'animals-reference',
    ],

    queryFn: () =>
      api<PagedResult<Animal>>(
        '/animales?page=1&pageSize=1000',
      ),
  })

  const breeds = useQuery({
    queryKey: [
      'catalog',
      'razas',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/razas',
      ),
  })

  const colors = useQuery({
    queryKey: [
      'catalog',
      'colores',
    ],

    queryFn: () =>
      api<CatalogItem[]>(
        '/catalogos/colores',
      ),
  })

  const form = useForm<Values>({
    resolver:
      zodResolver(schema),

    defaultValues: defaults,

    mode: 'onBlur',
  })

  const existing = useQuery({
    queryKey: [
      'animal-edit',
      editId,
    ],

    queryFn: () =>
      api<Animal>(
        `/animales/${editId}`,
      ),

    enabled: Boolean(editId),
  })

  useEffect(() => {
    if (!existing.data) {
      return
    }

    form.reset({
      ...defaults,

      propietarioActualId:
        existing.data
          .propietarioActualId,

      arete:
        existing.data.arete ??
        '',

      numeroReferenciaOrigen:
        existing.data
          .numeroReferenciaOrigen ??
        '',

      entidadOrigenId:
        existing.data
          .entidadOrigenId ??
        '',

      textoReferenciaOrigen:
        existing.data
          .textoReferenciaOrigen ??
        '',

      observacionOrigen:
        existing.data
          .observacionOrigen ??
        '',

      loteCompraId:
        existing.data
          .loteCompraId ??
        '',

      fechaIncorporacion:
        existing.data
          .fechaIncorporacion
          ?.slice(0, 10) ??
        '',

      motivoIncorporacion:
        existing.data
          .motivoIncorporacion ??
        '',

      sexo:
        existing.data.sexo,

      categoria:
        existing.data.categoria,

      razaId:
        existing.data.razaId ??
        '',

      colorId:
        existing.data.colorId ??
        '',

      fechaNacimiento:
        existing.data
          .fechaNacimiento
          ?.slice(0, 10) ??
        '',

      precisionFechaNacimiento:
        existing.data
          .precisionFechaNacimiento,

      anioNacimientoEstimado:
        existing.data
          .anioNacimientoEstimado
          ?.toString() ??
        '',

      mesNacimientoEstimado:
        existing.data
          .mesNacimientoEstimado
          ?.toString() ??
        '',

      edadEstimadaMesesAlIngreso:
        existing.data
          .edadEstimadaMesesAlIngreso
          ?.toString() ??
        '',

      fuenteFechaNacimiento:
        existing.data
          .fuenteFechaNacimiento ??
        '',

      observacionFechaNacimiento:
        existing.data
          .observacionFechaNacimiento ??
        '',

      madreAnimalId:
        existing.data
          .madreAnimalId ??
        '',

      padreAnimalId:
        existing.data
          .padreAnimalId ??
        '',

      fincaId:
        existing.data.fincaId ??
        '',

      potreroId:
        existing.data
          .potreroId ??
        '',

      fechaIngresoUbicacion:
        existing.data
          .fechaIngresoUbicacion
          ?.slice(0, 10) ??
        '',

      estadoReproductivo:
        existing.data
          .estadoReproductivo,

      condicionSanitaria:
        existing.data
          .condicionSanitaria ??
        '',

      observaciones:
        existing.data
          .observaciones ??
        '',
    })
  }, [
    existing.data,
    form,
  ])

  const farmId =
    form.watch('fincaId')

  const pastures = useQuery({
    queryKey: [
      'pastures',
      'animal-wizard',
      farmId,
    ],

    queryFn: () => {
      const params =
        new URLSearchParams({
          page: '1',
          pageSize: '1000',
          search: '',
          incluirInactivos:
            'false',
          fincaId: farmId,
        })

      return api<
        PagedResult<Pasture>
      >(
        `/potreros?${params.toString()}`,
      )
    },

    enabled: Boolean(farmId),
  })

  const farmItems =
    farms.data?.items ?? []

  const pastureItems =
    pastures.data?.items ?? []

  const entityItems =
    entities.data?.items ?? []

  const animalItems =
    animals.data?.items ?? []

  const values =
    form.watch()

  /*
   * Con exactOptionalPropertyTypes=true
   * no debe enviarse error={undefined}.
   */
  const propietarioActualError =
    form.formState.errors
      .propietarioActualId
      ?.message

  const fechaNacimientoError =
    form.formState.errors
      .fechaNacimiento
      ?.message

  const request = useMemo(
    () => ({
      propietarioActualId:
        values.propietarioActualId,

      arete:
        values.arete ||
        null,

      numeroReferenciaOrigen:
        values
          .numeroReferenciaOrigen ||
        null,

      entidadOrigenId:
        values.entidadOrigenId ||
        null,

      textoReferenciaOrigen:
        values
          .textoReferenciaOrigen ||
        null,

      observacionOrigen:
        values.observacionOrigen ||
        null,

      loteCompraId: null,

      fechaIncorporacion:
        values
          .fechaIncorporacion ||
        null,

      motivoIncorporacion: 'CargaInicial',

      sexo:
        values.sexo,

      categoria:
        values.categoria,

      razaId:
        values.razaId ||
        null,

      colorId:
        values.colorId ||
        null,

      fechaNacimiento:
        values.fechaNacimiento ||
        null,

      precisionFechaNacimiento:
        values
          .precisionFechaNacimiento,

      anioNacimientoEstimado:
        values
          .anioNacimientoEstimado
          ? Number(
              values
                .anioNacimientoEstimado,
            )
          : null,

      mesNacimientoEstimado:
        values
          .mesNacimientoEstimado
          ? Number(
              values
                .mesNacimientoEstimado,
            )
          : null,

      edadEstimadaMesesAlIngreso:
        values
          .edadEstimadaMesesAlIngreso
          ? Number(
              values
                .edadEstimadaMesesAlIngreso,
            )
          : null,

      fuenteFechaNacimiento:
        values
          .fuenteFechaNacimiento ||
        null,

      observacionFechaNacimiento:
        values
          .observacionFechaNacimiento ||
        null,

      madreAnimalId:
        values.madreAnimalId ||
        null,

      padreAnimalId:
        values.padreAnimalId ||
        null,

      fincaId:
        values.fincaId ||
        null,

      potreroId:
        values.potreroId ||
        null,

      fechaIngresoUbicacion:
        values
          .fechaIngresoUbicacion ||
        null,

      estadoReproductivo:
        values
          .estadoReproductivo,

      condicionSanitaria:
        values
          .condicionSanitaria ||
        null,

      observaciones:
        values.observaciones ||
        null,
    }),
    [values],
  )

  const next = async () => {
    const fieldsByStep: (
      keyof Values
    )[][] = [
      [
        'propietarioActualId',
      ],

      [
        'sexo',
        'categoria',
      ],

      [
        'precisionFechaNacimiento',
        'fechaNacimiento',
      ],

      [],

      [
        'fincaId',
        'potreroId',
      ],

      [],

      [],
    ]

    const fieldsToValidate =
      fieldsByStep[step] ??
      []

    const isValid =
      await form.trigger(
        fieldsToValidate,
      )

    if (!isValid) {
      return
    }

    setStep(current =>
      Math.min(
        6,
        current + 1,
      ),
    )
  }

  const previous = () => {
    setStep(current =>
      Math.max(
        0,
        current - 1,
      ),
    )
  }

  const saveDraft =
    async () => {
      await offlineDb.drafts.put({
        id: draftId,
        payload: values,
        updatedAt:
          new Date()
            .toISOString(),
      })

      if (navigator.onLine) {
        await api<void>(
          `/animales/borradores/${draftId}`,
          {
            method: 'PUT',

            body:
              JSON.stringify({
                jsonPayload:
                  JSON.stringify(
                    values,
                  ),
              }),
          },
        ).catch(
          () => undefined,
        )
      }

      setStatus(
        'Borrador guardado. No consumió un código definitivo.',
      )
    }

  const confirm =
    form.handleSubmit(
      async () => {
        if (!navigator.onLine) {
          await saveDraft()

          setStatus(
            'Sin conexión: se guardó un borrador local. Confírmalo cuando recuperes señal.',
          )

          return
        }

        setStatus(
          'Guardando…',
        )

        try {
          const created =
            await api<Animal>(
              editId
                ? `/animales/${editId}`
                : '/animales',
              {
                method: editId
                  ? 'PUT'
                  : 'POST',

                body:
                  JSON.stringify(
                    request,
                  ),
              },
            )

          setSaved(created)

          await offlineDb.drafts
            .delete(draftId)
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : 'No se pudo guardar.',
          )
        }
      },
    )

  if (saved) {
    return (
      <>
        <PageHeader
          eyebrow={
            editId
              ? 'Cambios guardados'
              : 'Registro confirmado'
          }
          title={`Animal ${saved.codigoAnimal}`}
          description={
            editId
              ? 'Los cambios fueron guardados correctamente.'
              : 'El código es permanente y no se reutilizará.'
          }
        />

        <Card className="max-w-2xl">
          <div className="grid place-items-center py-8 text-center">
            <span className="rounded-full bg-emerald-100 p-4 text-emerald-700">
              <Check size={32} />
            </span>

            <p className="mt-5 font-display text-4xl font-extrabold tracking-wider">
              {saved.codigoAnimal}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Propietario vigente:{' '}
              {saved.propietario}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to={`/animales/${saved.id}`}
              >
                <Button>
                  Abrir ficha
                </Button>
              </Link>

              {!editId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    form.reset(
                      defaults,
                    )

                    setSaved(null)
                    setStep(0)
                    setStatus('')
                  }}
                >
                  Registrar otro
                </Button>
              )}
            </div>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={
          editId
            ? 'Edición autorizada'
            : 'Implantación controlada'
        }
        title={
          editId
            ? 'Editar animal'
            : 'Carga inicial de animal'
        }
        description={editId ? 'Edita únicamente los datos descriptivos; el origen y el inventario se conservan.' : 'Uso exclusivo para incorporar ganado que ya existía antes de utilizar BovItzá. Las compras y nacimientos se registran desde sus procesos.'}
        actions={
          !editId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void saveDraft()
              }
            >
              <Save size={17} />
              Guardar borrador
            </Button>
          ) : undefined
        }
      />

      <ol
        className="mb-5 grid grid-cols-7 gap-1"
        aria-label="Progreso del registro"
      >
        {steps.map(
          (name, index) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  if (
                    index <= step
                  ) {
                    setStep(index)
                  }
                }}
                className={`
                  h-1.5
                  w-full
                  rounded-full
                  ${
                    index <= step
                      ? 'bg-pine-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }
                `}
                aria-label={`${index + 1}. ${name}`}
                aria-current={
                  index === step
                    ? 'step'
                    : undefined
                }
              />

              <span
                className={`
                  mt-2
                  hidden
                  text-xs
                  lg:block
                  ${
                    index === step
                      ? 'font-bold text-pine-700 dark:text-emerald-300'
                      : 'text-slate-400'
                  }
                `}
              >
                {name}
              </span>
            </li>
          ),
        )}
      </ol>

      <form onSubmit={confirm}>
        <Card className="max-w-4xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-pine-600">
              Paso {step + 1} de 7
            </p>

            <h2 className="mt-1 font-display text-xl font-bold">
              {steps[step]}
            </h2>
          </div>

          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Código del sistema"
                value={
                  existing.data
                    ?.codigoAnimal ??
                  'Se asigna al confirmar'
                }
                disabled
              />

              <Select
                label="Propietario actual"
                {...form.register(
                  'propietarioActualId',
                )}
                {...(
                  propietarioActualError
                    ? {
                        error:
                          propietarioActualError,
                      }
                    : {}
                )}
                required
                disabled={Boolean(editId)}
              >
                <option value="">
                  Seleccionar…
                </option>

                {entityItems.map(
                  entity => (
                    <option
                      key={entity.id}
                      value={entity.id}
                    >
                      {
                        entity
                          .nombreCompletoORazonSocial
                      }
                    </option>
                  ),
                )}
              </Select>

              <Input
                label="Arete (opcional)"
                {...form.register(
                  'arete',
                )}
              />

              <Input
                label="Número de referencia anterior"
                {...form.register(
                  'numeroReferenciaOrigen',
                )}
              />

              <Input
                label="Texto original de procedencia"
                {...form.register(
                  'textoReferenciaOrigen',
                )}
              />

              <Select
                label="Entidad de procedencia"
                {...form.register(
                  'entidadOrigenId',
                )}
              >
                <option value="">
                  No especificada
                </option>

                {entityItems.map(
                  entity => (
                    <option
                      key={entity.id}
                      value={entity.id}
                    >
                      {
                        entity
                          .nombreCompletoORazonSocial
                      }
                    </option>
                  ),
                )}
              </Select>

              <Input
                label="Fecha de incorporación"
                type="date"
                {...form.register(
                  'fechaIncorporacion',
                )}
              />

              <Input label="Origen de incorporación" value="Carga inicial" disabled className="md:col-span-2" />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Sexo"
                {...form.register(
                  'sexo',
                )}
                required
              >
                <option value="Hembra">
                  Hembra
                </option>

                <option value="Macho">
                  Macho
                </option>

                <option value="Desconocido">
                  Desconocido
                </option>
              </Select>

              <Select
                label="Categoría"
                {...form.register(
                  'categoria',
                )}
                required
              >
                <option value="Ternera">
                  Ternera
                </option>

                <option value="Novilla">
                  Novilla
                </option>

                <option value="Vaca">
                  Vaca
                </option>

                <option value="Ternero">
                  Ternero
                </option>

                <option value="Novillo">
                  Novillo
                </option>

                <option value="Toro">
                  Toro
                </option>

                <option value="Otra">
                  Otra
                </option>
              </Select>

              <Select
                label="Raza (opcional)"
                {...form.register(
                  'razaId',
                )}
              >
                <option value="">
                  No especificada
                </option>

                {breeds.data?.map(
                  breed => (
                    <option
                      key={breed.id}
                      value={breed.id}
                    >
                      {breed.nombre}
                    </option>
                  ),
                )}
              </Select>

              <Select
                label="Color (opcional)"
                {...form.register(
                  'colorId',
                )}
              >
                <option value="">
                  No especificado
                </option>

                {colors.data?.map(
                  color => (
                    <option
                      key={color.id}
                      value={color.id}
                    >
                      {color.nombre}
                    </option>
                  ),
                )}
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Precisión de nacimiento"
                {...form.register(
                  'precisionFechaNacimiento',
                )}
              >
                <option value="Desconocida">
                  Desconocida
                </option>

                <option value="Exacta">
                  Exacta
                </option>

                <option value="Aproximada">
                  Aproximada
                </option>

                <option value="SoloMesYAnio">
                  Solo mes y año
                </option>

                <option value="SoloAnio">
                  Solo año
                </option>
              </Select>

              <Input
                label="Fecha de nacimiento"
                type="date"
                {...form.register(
                  'fechaNacimiento',
                )}
                {...(
                  fechaNacimientoError
                    ? {
                        error:
                          fechaNacimientoError,
                      }
                    : {}
                )}
              />

              {values.fechaNacimiento && (
                <div className="rounded-xl bg-pine-50 p-3 text-sm text-pine-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <span className="font-semibold">
                    Edad actual:
                  </span>{' '}

                  {calculateAge(
                    values.fechaNacimiento,
                  )}
                </div>
              )}

              <Input
                label="Año estimado"
                type="number"
                min="1900"
                max={
                  new Date()
                    .getFullYear()
                }
                {...form.register(
                  'anioNacimientoEstimado',
                )}
              />

              <Input
                label="Mes estimado"
                type="number"
                min="1"
                max="12"
                {...form.register(
                  'mesNacimientoEstimado',
                )}
              />

              <Input
                label="Edad estimada al ingreso (meses)"
                type="number"
                min="0"
                {...form.register(
                  'edadEstimadaMesesAlIngreso',
                )}
              />

              <Input
                label="Fuente de la información"
                {...form.register(
                  'fuenteFechaNacimiento',
                )}
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Madre"
                {...form.register(
                  'madreAnimalId',
                )}
              >
                <option value="">
                  No registrada
                </option>

                {animalItems
                  .filter(
                    animal =>
                      animal.sexo ===
                      'Hembra' &&
                      animal.id !==
                        editId,
                  )
                  .map(
                    animal => (
                      <option
                        key={animal.id}
                        value={animal.id}
                      >
                        {
                          animal.codigoAnimal
                        }
                        {' · '}
                        {
                          animal.propietario
                        }
                      </option>
                    ),
                  )}
              </Select>

              <Select
                label="Padre"
                {...form.register(
                  'padreAnimalId',
                )}
              >
                <option value="">
                  No registrado
                </option>

                {animalItems
                  .filter(
                    animal =>
                      animal.sexo ===
                      'Macho' &&
                      animal.id !==
                        editId,
                  )
                  .map(
                    animal => (
                      <option
                        key={animal.id}
                        value={animal.id}
                      >
                        {
                          animal.codigoAnimal
                        }
                        {' · '}
                        {
                          animal.propietario
                        }
                      </option>
                    ),
                  )}
              </Select>

              <p className="rounded-xl bg-pine-50 p-4 text-sm text-pine-800 md:col-span-2 dark:bg-emerald-950 dark:text-emerald-200">
                La madre o el padre
                pueden pertenecer a
                otro propietario. La
                genealogía nunca
                transfiere propiedad.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Finca"
                {...form.register(
                  'fincaId',
                )}
                onChange={event => {
                  form.setValue(
                    'fincaId',
                    event.target.value,
                    {
                      shouldDirty:
                        true,

                      shouldValidate:
                        true,
                    },
                  )

                  form.setValue(
                    'potreroId',
                    '',
                    {
                      shouldDirty:
                        true,

                      shouldValidate:
                        true,
                    },
                  )
                }}
              >
                <option value="">
                  Sin ubicación
                </option>

                {farmItems.map(
                  farm => (
                    <option
                      key={farm.id}
                      value={farm.id}
                    >
                      {farm.codigo}
                      {' · '}
                      {farm.nombre}
                    </option>
                  ),
                )}
              </Select>

              <Select
                label="Potrero"
                {...form.register(
                  'potreroId',
                )}
                disabled={
                  !farmId ||
                  pastures.isLoading
                }
              >
                <option value="">
                  {pastures.isLoading
                    ? 'Cargando potreros…'
                    : 'Sin potrero'}
                </option>

                {pastureItems.map(
                  pasture => (
                    <option
                      key={pasture.id}
                      value={pasture.id}
                    >
                      {
                        pasture.codigo
                      }
                      {' · '}
                      {
                        pasture.nombre
                      }
                    </option>
                  ),
                )}
              </Select>

              <Input
                label="Fecha de ingreso"
                type="date"
                {...form.register(
                  'fechaIngresoUbicacion',
                )}
              />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Estado de vida"
                value="Activo"
                disabled
              />

              <Select
                label="Estado reproductivo"
                {...form.register(
                  'estadoReproductivo',
                )}
              >
                <option value="Desconocido">
                  Desconocido
                </option>

                <option value="NoAplica">
                  No aplica
                </option>

                <option value="Vacia">
                  Vacía
                </option>

                <option value="EnServicio">
                  En servicio
                </option>

                <option value="PendienteDiagnostico">
                  Pendiente de diagnóstico
                </option>

                <option value="Prenada">
                  Preñada
                </option>

                <option value="ProximaAParto">
                  Próxima a parto
                </option>

                <option value="RecienParida">
                  Recién parida
                </option>

                <option value="Lactante">
                  Lactante
                </option>

                <option value="Seca">
                  Seca
                </option>
              </Select>

              <Input
                label="Condición sanitaria inicial"
                {...form.register(
                  'condicionSanitaria',
                )}
              />

              <Input
                label="Observaciones"
                {...form.register(
                  'observaciones',
                )}
              />
            </div>
          )}

          {step === 6 && (
            <Review
              values={values}
              entities={
                entityItems
              }
              farms={
                farmItems
              }
              pastures={
                pastureItems
              }
            />
          )}

          {status && (
            <p
              role="status"
              className={`
                mt-5
                flex
                items-center
                gap-2
                rounded-xl
                p-3
                text-sm
                ${
                  status.includes(
                    'Sin conexión',
                  )
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-pine-50 text-pine-800 dark:bg-emerald-950 dark:text-emerald-200'
                }
              `}
            >
              {!navigator.onLine && (
                <CloudOff
                  size={17}
                />
              )}

              {status}
            </p>
          )}

          <div className="mt-7 flex justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={previous}
            >
              <ChevronLeft
                size={17}
              />

              Anterior
            </Button>

            {step < 6 ? (
              <Button
                key={`siguiente-${step}`}
                type="button"
                onClick={event => {
                  event.preventDefault()
                  event.stopPropagation()

                  void next()
                }}
              >
                Siguiente

                <ChevronRight
                  size={17}
                />
              </Button>
            ) : (
              <Button
                key="confirmar-animal"
                type="submit"
              >
                <Check
                  size={17}
                />

                {editId
                  ? 'Guardar cambios'
                  : 'Confirmar registro'}
              </Button>
            )}
          </div>
        </Card>
      </form>
    </>
  )
}

function calculateAge(
  value: string,
): string {
  const birth =
    new Date(value)

  const today =
    new Date()

  let years =
    today.getFullYear() -
    birth.getFullYear()

  let months =
    today.getMonth() -
    birth.getMonth()

  if (
    today.getDate() <
    birth.getDate()
  ) {
    months--
  }

  if (months < 0) {
    years--
    months += 12
  }

  return `${years} año${
    years === 1
      ? ''
      : 's'
  } y ${months} mes${
    months === 1
      ? ''
      : 'es'
  }`
}

function Review({
  values,
  entities,
  farms,
  pastures,
}: {
  values: Values
  entities: Entity[]
  farms: Farm[]
  pastures: Pasture[]
}) {
  const propietario =
    entities.find(
      entity =>
        entity.id ===
        values.propietarioActualId,
    )
      ?.nombreCompletoORazonSocial ??
    'Pendiente'

  const finca =
    farms.find(
      item =>
        item.id ===
        values.fincaId,
    )

  const potrero =
    pastures.find(
      item =>
        item.id ===
        values.potreroId,
    )

  const ubicacion =
    potrero
      ? `${potrero.codigo} · ${potrero.nombre}`
      : finca
        ? `${finca.codigo} · ${finca.nombre}, sin potrero`
        : 'Sin ubicación'

  const rows: [
    string,
    string,
  ][] = [
    [
      'Propietario',
      propietario,
    ],

    [
      'Arete',
      values.arete ||
        'Sin arete',
    ],

    [
      'Procedencia original',
      values
        .textoReferenciaOrigen ||
        'No registrada',
    ],

    [
      'Sexo y categoría',
      `${values.sexo} · ${values.categoria}`,
    ],

    [
      'Nacimiento',
      values.fechaNacimiento ||
        values
          .precisionFechaNacimiento,
    ],

    [
      'Ubicación',
      ubicacion,
    ],
  ]

  return (
    <div className="grid gap-2">
      {rows.map(
        ([label, value]) => (
          <div
            key={label}
            className="grid gap-1 rounded-xl bg-slate-50 p-3 sm:grid-cols-[180px_1fr] dark:bg-slate-800"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {label}
            </span>

            <span className="text-sm font-semibold">
              {value}
            </span>
          </div>
        ),
      )}

      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        Revisa cuidadosamente
        la información antes de
        guardar. En un registro
        nuevo se asignará el
        siguiente código
        definitivo; al editar se
        conservará el código
        actual.
      </p>
    </div>
  )
}
