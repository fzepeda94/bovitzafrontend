import {
  useEffect,
  useState,
} from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Beef,
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Cloud,
  CloudOff,
  Database,
  Dna,
  Globe2,
  HeartPulse,
  KeyRound,
  Layers3,
  LogOut,
  Map,
  MapPin,
  Menu,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Ruler,
  Settings,
  ShieldCheck,
  ShieldPlus,
  Sun,
  Tags,
  Target,
  Tractor,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { runSync } from '../lib/sync'
import type { TenantSettings } from '../types'
import { Button } from './ui'

type NavigationItem = {
  to: string
  label: string
  icon: LucideIcon
}

type MenuGroup =
  | 'animals'
  | 'masters'
  | 'transfers'
  | 'finance'
  | 'security'

type MasterSubmenu =
  | 'companies'
  | 'agricultural'

const topNavigation: NavigationItem[] = [
  {
    to: '/operacion/grupos-productivos',
    label: 'GRUPOS PRODUCTIVOS',
    icon: Target,
  },
  {
    to: '/mapa-potreros',
    label: 'MAPA DE POTREROS',
    icon: Layers3,
  },
  {
    to: '/salud',
    label: 'SALUD Y PESAJES',
    icon: ShieldPlus,
  },
  {
    to: '/reportes/inventario',
    label: 'ANÁLISIS Y REPORTES',
    icon: Database,
  },
]

const transferNavigation: NavigationItem[] = [
  { to: '/transferencias/cambio-propietario', label: 'Cambio de propietario', icon: RefreshCw },
  { to: '/transferencias/recibidas', label: 'Recibidas', icon: RefreshCw },
  { to: '/transferencias/enviadas', label: 'Enviadas', icon: RefreshCw },
]

const animalNavigation: NavigationItem[] = [
  {
    to: '/animales',
    label: 'Inventario bovino',
    icon: Beef,
  },
  {
    to: '/animales/nuevo',
    label: 'Carga inicial',
    icon: Plus,
  },
]

const empresasNavigation: NavigationItem[] = [
  {
    to: '/datos-maestros/catalogos/tipos-entidad',
    label: 'Tipos de entidad',
    icon: Tags,
  },
  {
    to: '/datos-maestros/catalogos/paises',
    label: 'Países',
    icon: Globe2,
  },
  {
    to: '/datos-maestros/catalogos/departamentos',
    label: 'Departamentos',
    icon: Map,
  },
  {
    to: '/datos-maestros/catalogos/municipios',
    label: 'Municipios',
    icon: MapPin,
  },
  {
    to: '/datos-maestros/entidades',
    label: 'Entidades',
    icon: Building2,
  },
]

const agricolaNavigation: NavigationItem[] = [
  {
    to: '/datos-maestros/catalogos/unidades-medida',
    label: 'Unidades de medida',
    icon: Ruler,
  },
  {
    to: '/datos-maestros/fincas',
    label: 'Fincas',
    icon: Warehouse,
  },
  {
    to: '/datos-maestros/catalogos/destinos-productivos',
    label: 'Destinos produc. potreros',
    icon: Target,
  },
  {
    to: '/datos-maestros/potreros',
    label: 'Potreros',
    icon: Layers3,
  },
  {
    to: '/datos-maestros/catalogos/razas',
    label: 'Razas',
    icon: Dna,
  },
  {
    to: '/datos-maestros/catalogos/colores',
    label: 'Colores',
    icon: Palette,
  },
  {
    to: '/datos-maestros/catalogos/tipos-parto',
    label: 'Tipos de parto',
    icon: HeartPulse,
  },
]

const financeNavigation: NavigationItem[] = [
  {
    to: '/finanzas/movimientos',
    label: 'Movimientos financieros',
    icon: CircleDollarSign,
  },
  {
    to: '/finanzas/categorias',
    label: 'Categorías financieras',
    icon: CircleDollarSign,
  },
  {
    to: '/finanzas/compras-ganado',
    label: 'Compras de ganado',
    icon: CircleDollarSign,
  },
  {
    to: '/finanzas/ventas-ganado',
    label: 'Ventas de ganado',
    icon: CircleDollarSign,
  },
  {
    to: '/lotes',
    label: 'Lotes y créditos',
    icon: CircleDollarSign,
  },
]

const securityNavigation: NavigationItem[] = [
  {
    to: '/seguridad/usuarios',
    label: 'Usuarios',
    icon: Users,
  },
  {
    to: '/seguridad/roles',
    label: 'Roles',
    icon: ShieldCheck,
  },
  {
    to: '/seguridad/permisos',
    label: 'Permisos',
    icon: KeyRound,
  },
  {
    to: '/seguridad/roles-permisos',
    label: 'Roles y permisos',
    icon: ShieldCheck,
  },
  {
    to: '/seguridad/usuarios',
    label: 'Usuarios y roles',
    icon: Users,
  },
]

const administrationNavigation: NavigationItem[] = [
  {
    to: '/sincronizacion',
    label: 'Sincronización',
    icon: RefreshCw,
  },
  {
    to: '/configuracion',
    label: 'Configuración',
    icon: Settings,
  },
]

function routeMatchesNavigation(
  pathname: string,
  navigation: NavigationItem[],
) {
  return navigation.some(item => {
    return (
      pathname === item.to ||
      pathname.startsWith(
        `${item.to}/`,
      )
    )
  })
}

function initialGroupState(
  group: MenuGroup,
  pathname: string,
): boolean {
  const saved = localStorage.getItem(
    `bovitza.menu.${group}`,
  )

  if (saved !== null) {
    return saved === 'open'
  }

  if (group === 'animals') {
    return pathname.startsWith(
      '/animales',
    )
  }

  if (group === 'masters') {
    return pathname.startsWith(
      '/datos-maestros',
    )
  }

  if (group === 'finance') {
    return (
      pathname.startsWith(
        '/finanzas',
      ) ||
      pathname.startsWith('/lotes')
    )
  }

  if (group === 'transfers') {
    return pathname.startsWith('/transferencias')
  }

  return (
    pathname.startsWith(
      '/seguridad',
    ) ||
    pathname.startsWith('/usuarios')
  )
}

function initialMasterSubmenuState(
  submenu: MasterSubmenu,
  pathname: string,
): boolean {
  const saved = localStorage.getItem(
    `bovitza.menu.masters.${submenu}`,
  )

  if (saved !== null) {
    return saved === 'open'
  }

  if (submenu === 'companies') {
    return routeMatchesNavigation(
      pathname,
      empresasNavigation,
    )
  }

  return routeMatchesNavigation(
    pathname,
    agricolaNavigation,
  )
}

export function AppLayout() {
  const {
    session,
    logout,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] =
    useState(false)

  const [online, setOnline] =
    useState(navigator.onLine)

  const [dark, setDark] =
    useState(() => {
      return (
        localStorage.getItem(
          'bovitza.theme',
        ) === 'dark'
      )
    })

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(() => {
    return (
      localStorage.getItem(
        'bovitza.sidebar',
      ) === 'collapsed'
    )
  })

  const [
    animalsOpen,
    setAnimalsOpen,
  ] = useState(() =>
    initialGroupState(
      'animals',
      location.pathname,
    ),
  )

  const [
    mastersOpen,
    setMastersOpen,
  ] = useState(() =>
    initialGroupState(
      'masters',
      location.pathname,
    ),
  )

  const [
    empresasOpen,
    setEmpresasOpen,
  ] = useState(() =>
    initialMasterSubmenuState(
      'companies',
      location.pathname,
    ),
  )

  const [
    agricolaOpen,
    setAgricolaOpen,
  ] = useState(() =>
    initialMasterSubmenuState(
      'agricultural',
      location.pathname,
    ),
  )

  const [
    financeOpen,
    setFinanceOpen,
  ] = useState(() =>
    initialGroupState(
      'finance',
      location.pathname,
    ),
  )

  const [
    securityOpen,
    setSecurityOpen,
  ] = useState(() =>
    initialGroupState(
      'security',
      location.pathname,
    ),
  )

  const [
    transfersOpen,
    setTransfersOpen,
  ] = useState(() =>
    initialGroupState('transfers', location.pathname),
  )

  const tenant = useQuery({
    queryKey: [
      'tenant-settings',
    ],

    queryFn: () =>
      api<TenantSettings>(
        '/configuracion/tenant',
      ),
  })

  const empresasActive =
    routeMatchesNavigation(
      location.pathname,
      empresasNavigation,
    )

  const agricolaActive =
    routeMatchesNavigation(
      location.pathname,
      agricolaNavigation,
    )

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      void runSync()
    }

    const onOffline = () => {
      setOnline(false)
    }

    window.addEventListener(
      'online',
      onOnline,
    )

    window.addEventListener(
      'offline',
      onOffline,
    )

    return () => {
      window.removeEventListener(
        'online',
        onOnline,
      )

      window.removeEventListener(
        'offline',
        onOffline,
      )
    }
  }, [])

  useEffect(() => {
    document.documentElement
      .classList.toggle(
        'dark',
        dark,
      )

    localStorage.setItem(
      'bovitza.theme',
      dark ? 'dark' : 'light',
    )
  }, [dark])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.sidebar',
      sidebarCollapsed
        ? 'collapsed'
        : 'expanded',
    )
  }, [sidebarCollapsed])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.animals',
      animalsOpen
        ? 'open'
        : 'closed',
    )
  }, [animalsOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.masters',
      mastersOpen
        ? 'open'
        : 'closed',
    )
  }, [mastersOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.masters.companies',
      empresasOpen
        ? 'open'
        : 'closed',
    )
  }, [empresasOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.masters.agricultural',
      agricolaOpen
        ? 'open'
        : 'closed',
    )
  }, [agricolaOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.finance',
      financeOpen
        ? 'open'
        : 'closed',
    )
  }, [financeOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.security',
      securityOpen
        ? 'open'
        : 'closed',
    )
  }, [securityOpen])

  useEffect(() => {
    localStorage.setItem(
      'bovitza.menu.transfers',
      transfersOpen ? 'open' : 'closed',
    )
  }, [transfersOpen])

  useEffect(() => {
    if (location.pathname.startsWith('/transferencias')) {
      setTransfersOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    if (
      !location.pathname.startsWith(
        '/datos-maestros',
      )
    ) {
      return
    }

    setMastersOpen(true)

    if (
      routeMatchesNavigation(
        location.pathname,
        empresasNavigation,
      )
    ) {
      setEmpresasOpen(true)
    }

    if (
      routeMatchesNavigation(
        location.pathname,
        agricolaNavigation,
      )
    ) {
      setAgricolaOpen(true)
    }
  }, [location.pathname])

  const close = () => {
    setOpen(false)
  }

  const linkClass = ({
    isActive,
  }: {
    isActive: boolean
  }) => {
    return [
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',

      sidebarCollapsed
        ? 'lg:justify-center lg:px-2'
        : '',

      isActive
        ? 'bg-white text-pine-900 shadow'
        : 'text-white/75 hover:bg-white/10 hover:text-white',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const masterLinkClass = ({
    isActive,
  }: {
    isActive: boolean
  }) => {
    return [
      'flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition',

      isActive
        ? 'bg-white text-pine-900 shadow'
        : 'text-white/70 hover:bg-white/10 hover:text-white',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const groupButton = (
    label: string,
    Icon: LucideIcon,
    expanded: boolean,
    toggle: () => void,
  ) => (
    <button
      type="button"
      onClick={toggle}
      title={
        sidebarCollapsed
          ? label
          : undefined
      }
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/90 transition hover:bg-white/10 ${
        sidebarCollapsed
          ? 'lg:justify-center lg:px-2'
          : ''
      }`}
      aria-expanded={expanded}
    >
      <Icon
        size={19}
        className="shrink-0"
      />

      <span
        className={`min-w-0 flex-1 tracking-wide ${
          sidebarCollapsed
            ? 'lg:hidden'
            : ''
        }`}
      >
        {label}
      </span>

      <ChevronDown
        size={17}
        className={`shrink-0 transition ${
          expanded
            ? 'rotate-180'
            : ''
        } ${
          sidebarCollapsed
            ? 'lg:hidden'
            : ''
        }`}
      />
    </button>
  )

  const masterSubmenuButton = (
    label: string,
    Icon: LucideIcon,
    expanded: boolean,
    active: boolean,
    toggle: () => void,
  ) => (
    <button
      type="button"
      title={label}
      onClick={toggle}
      className={`flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold leading-5 transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/75 hover:bg-white/10 hover:text-white'
      }`}
      aria-expanded={expanded}
    >
      <Icon
        size={17}
        className="shrink-0"
      />

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>

      <ChevronDown
        size={15}
        className={`shrink-0 transition ${
          expanded
            ? 'rotate-180'
            : ''
        }`}
      />
    </button>
  )

  return (
    <div className="app-shell min-w-0 bg-[#f3f5ef] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <aside
        className={`app-sidebar pwa-safe-y fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-pine-900 text-white ${
          sidebarCollapsed
            ? 'is-collapsed'
            : ''
        } ${
          open
            ? 'is-open'
            : ''
        }`}
      >
        <div
          className={`flex h-20 flex-none items-center justify-between border-b border-white/10 px-5 ${
            sidebarCollapsed
              ? 'lg:justify-center lg:px-3'
              : ''
          }`}
        >
          <NavLink
            to="/"
            onClick={close}
            className="flex min-w-0 items-center gap-3"
          >
            <img
              src="/icons/icon.svg"
              alt=""
              className="h-11 w-11 flex-none rounded-xl"
            />

            <div
              className={
                sidebarCollapsed
                  ? 'lg:hidden'
                  : ''
              }
            >
              <p className="font-display text-xl font-extrabold tracking-tight">
                BovItzá
              </p>

              <p className="text-[11px] text-white/60">
                Gestión ganadera
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            className="grid h-11 w-11 flex-none place-items-center rounded-xl hover:bg-white/10 lg:hidden"
            onClick={close}
            aria-label="Cerrar menú"
          >
            <ChevronLeft />
          </button>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto p-3"
          aria-label="Navegación principal"
        >
          <div className="pt-1">
            {groupButton(
              'DATOS MAESTROS',
              Database,
              mastersOpen,
              () =>
                setMastersOpen(
                  current =>
                    !current,
                ),
            )}

            {mastersOpen && (
              <div
                className={`ml-3 mt-1 space-y-1 border-l border-white/15 pl-2 ${
                  sidebarCollapsed
                    ? 'lg:hidden'
                    : ''
                }`}
              >
                {masterSubmenuButton(
                  'Empresas / proveedores',
                  Building2,
                  empresasOpen,
                  empresasActive,
                  () =>
                    setEmpresasOpen(
                      current =>
                        !current,
                    ),
                )}

                {empresasOpen && (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
                    {empresasNavigation.map(
                      ({
                        to,
                        label,
                        icon: Icon,
                      }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={close}
                          className={
                            masterLinkClass
                          }
                        >
                          <Icon
                            size={17}
                            className="shrink-0"
                          />

                          <span className="min-w-0 truncate">
                            {label}
                          </span>
                        </NavLink>
                      ),
                    )}
                  </div>
                )}

                {masterSubmenuButton(
                  'Agrícola',
                  Tractor,
                  agricolaOpen,
                  agricolaActive,
                  () =>
                    setAgricolaOpen(
                      current =>
                        !current,
                    ),
                )}

                {agricolaOpen && (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-2">
                    {agricolaNavigation.map(
                      ({
                        to,
                        label,
                        icon: Icon,
                      }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={close}
                          className={
                            masterLinkClass
                          }
                        >
                          <Icon
                            size={17}
                            className="shrink-0"
                          />

                          <span className="min-w-0 truncate">
                            {label}
                          </span>
                        </NavLink>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            {groupButton(
              'ANIMALES BOVINOS',
              Beef,
              animalsOpen,
              () =>
                setAnimalsOpen(
                  current =>
                    !current,
                ),
            )}

            {animalsOpen && (
              <div
                className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-2 ${
                  sidebarCollapsed
                    ? 'lg:hidden'
                    : ''
                }`}
              >
                {animalNavigation.map(
                  ({
                    to,
                    label,
                    icon: Icon,
                  }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={close}
                      end={
                        to ===
                        '/animales'
                      }
                      className={linkClass}
                    >
                      <Icon
                        size={17}
                        className="shrink-0"
                      />

                      <span>
                        {label}
                      </span>
                    </NavLink>
                  ),
                )}
              </div>
            )}
          </div>

          {topNavigation.map(
            ({
              to,
              label,
              icon: Icon,
            }) => (
              <NavLink
                key={to}
                to={to}
                onClick={close}
                title={
                  sidebarCollapsed
                    ? label
                    : undefined
                }
                className={linkClass}
              >
                <Icon
                  size={19}
                  className="shrink-0"
                />

                <span
                  className={
                    sidebarCollapsed
                      ? 'lg:hidden'
                      : ''
                  }
                >
                  {label}
                </span>
              </NavLink>
            ),
          )}

          <div className="pt-2">
            {groupButton(
              'TRANSFERENCIAS',
              RefreshCw,
              transfersOpen,
              () => setTransfersOpen(current => !current),
            )}

            {transfersOpen && (
              <div className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                {transferNavigation.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={close} className={linkClass}>
                    <Icon size={17} className="shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            {groupButton(
              'FINANZAS',
              CircleDollarSign,
              financeOpen,
              () =>
                setFinanceOpen(
                  current =>
                    !current,
                ),
            )}

            {financeOpen && (
              <div
                className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-2 ${
                  sidebarCollapsed
                    ? 'lg:hidden'
                    : ''
                }`}
              >
                {financeNavigation.map(
                  ({
                    to,
                    label,
                    icon: Icon,
                  }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={close}
                      className={linkClass}
                    >
                      <Icon
                        size={17}
                        className="shrink-0"
                      />

                      <span>
                        {label}
                      </span>
                    </NavLink>
                  ),
                )}
              </div>
            )}
          </div>

          {session?.roles.includes(
            'Administrador',
          ) && (
            <div className="pt-2">
              {groupButton(
                'SEGURIDAD',
                ShieldCheck,
                securityOpen,
                () =>
                  setSecurityOpen(
                    current =>
                      !current,
                  ),
              )}

              {securityOpen && (
                <div
                  className={`ml-5 mt-1 space-y-1 border-l border-white/15 pl-2 ${
                    sidebarCollapsed
                      ? 'lg:hidden'
                      : ''
                  }`}
                >
                  {securityNavigation.map(
                    (
                      {
                        to,
                        label,
                        icon: Icon,
                      },
                      index,
                    ) => (
                      <NavLink
                        key={`${to}-${index}`}
                        to={to}
                        onClick={close}
                        className={linkClass}
                      >
                        <Icon
                          size={17}
                          className="shrink-0"
                        />

                        <span>
                          {label}
                        </span>
                      </NavLink>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {session?.roles.includes(
            'Administrador',
          ) &&
            administrationNavigation.map(
              ({
                to,
                label,
                icon: Icon,
              }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={close}
                  title={
                    sidebarCollapsed
                      ? label
                      : undefined
                  }
                  className={linkClass}
                >
                  <Icon
                    size={19}
                    className="shrink-0"
                  />

                  <span
                    className={
                      sidebarCollapsed
                        ? 'lg:hidden'
                        : ''
                    }
                  >
                    {label}
                  </span>
                </NavLink>
              ),
            )}
        </nav>

        <div
          className={`border-t border-white/10 p-4 ${
            sidebarCollapsed
              ? 'lg:px-3'
              : ''
          }`}
        >
          <div
            className={
              sidebarCollapsed
                ? 'lg:hidden'
                : ''
            }
          >
            <p className="truncate text-sm font-semibold">
              {session?.displayName}
            </p>

            <p className="truncate text-xs text-white/55">
              {tenant.data?.nombre ??
                'Ganadería sin configurar'}
            </p>
          </div>

          <button
            type="button"
            title={
              sidebarCollapsed
                ? 'Cerrar sesión'
                : undefined
            }
            className={`mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-sm text-white/70 hover:text-white ${
              sidebarCollapsed
                ? 'lg:justify-center'
                : ''
            }`}
            onClick={() =>
              void logout().then(() =>
                navigate('/login'),
              )
            }
          >
            <LogOut size={17} />

            <span
              className={
                sidebarCollapsed
                  ? 'lg:hidden'
                  : ''
              }
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
          onClick={close}
        />
      )}

      <div
        className={`app-content min-w-0 ${
          sidebarCollapsed
            ? 'sidebar-is-collapsed'
            : ''
        }`}
      >
        <header className="pwa-safe-top sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-[#f3f5ef]/90 px-3 backdrop-blur sm:px-4 md:px-7 dark:border-slate-800 dark:bg-slate-950/90">
          <button
            type="button"
            className="grid h-11 w-11 flex-none place-items-center rounded-xl hover:bg-white lg:hidden dark:hover:bg-slate-800"
            onClick={() =>
              setOpen(true)
            }
            aria-label="Abrir menú"
          >
            <Menu />
          </button>

          <button
            type="button"
            className="hidden h-11 w-11 flex-none place-items-center rounded-xl text-slate-600 hover:bg-white lg:grid dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() =>
              setSidebarCollapsed(
                current =>
                  !current,
              )
            }
            aria-label={
              sidebarCollapsed
                ? 'Expandir menú lateral'
                : 'Contraer menú lateral'
            }
            title={
              sidebarCollapsed
                ? 'Expandir menú'
                : 'Contraer menú'
            }
          >
            <Menu size={22} />
          </button>

          <div className="ml-3 hidden min-w-0 lg:block">
            <p className="truncate text-xs font-semibold uppercase tracking-[.14em] text-pine-600">
              Tu ganado, tus fincas y
              tus números
            </p>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${
                online
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {online ? (
                <Cloud size={14} />
              ) : (
                <CloudOff
                  size={14}
                />
              )}

              {online
                ? 'En línea'
                : 'Sin conexión'}
            </span>

            <Button
              type="button"
              variant="ghost"
              className="!h-11 !w-11 !min-h-11 !px-0"
              onClick={() =>
                setDark(
                  current =>
                    !current,
                )
              }
              aria-label={
                dark
                  ? 'Usar tema claro'
                  : 'Usar tema oscuro'
              }
            >
              {dark ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </Button>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1500px] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
