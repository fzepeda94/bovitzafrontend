import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { FeedbackProvider } from './contexts/FeedbackContext'
import { AppLayout } from './components/AppLayout'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import './index.css'

const InicioSesionPagina=lazy(()=>import('./pages/InicioSesionPagina').then(x=>({default:x.LoginPage})))
const InicioPagina=lazy(()=>import('./pages/InicioPagina').then(x=>({default:x.DashboardPage})))
const InventarioBovinoPagina=lazy(()=>import('./pages/InventarioBovinoPagina').then(x=>({default:x.AnimalsPage})))
const RegistroAnimalPagina=lazy(()=>import('./pages/RegistroAnimalPagina').then(x=>({default:x.AnimalWizardPage})))
const ExpedienteAnimalPagina=lazy(()=>import('./pages/ExpedienteAnimalPagina').then(x=>({default:x.AnimalDetailPage})))
const MapaPotrerosPagina=lazy(()=>import('./pages/MapaPotrerosPagina').then(x=>({default:x.MapaPotrerosPagina})))
const LotesCreditosPagina=lazy(()=>import('./pages/LotesCreditosPagina').then(x=>({default:x.LotsPage})))
const ComprasGanadoPagina=lazy(()=>import('./pages/ComprasGanadoPagina').then(x=>({default:x.ComprasGanadoPagina})))
const VentasGanadoPagina=lazy(()=>import('./pages/VentasGanadoPagina').then(x=>({default:x.VentasGanadoPagina})))
const EntidadesPagina=lazy(()=>import('./pages/EntidadesPagina').then(x=>({default:x.EntidadesPagina})))
const FincasPagina=lazy(()=>import('./pages/FincasPagina').then(x=>({default:x.FincasPagina})))
const PotrerosPagina=lazy(()=>import('./pages/PotrerosPagina').then(x=>({default:x.PasturesPage})))
const CatalogosMaestrosPagina=lazy(()=>import('./pages/CatalogosMaestrosPagina').then(x=>({default:x.CatalogosMaestrosPagina})))
const SaludPesajesPagina=lazy(()=>import('./pages/SaludPesajesPagina').then(x=>({default:x.SaludPesajesPagina})))
const SincronizacionPagina=lazy(()=>import('./pages/SincronizacionPagina').then(x=>({default:x.SyncPage})))
const ConfiguracionPagina=lazy(()=>import('./pages/ConfiguracionPagina').then(x=>({default:x.SettingsPage})))
const UsuariosPagina=lazy(()=>import('./pages/UsuariosPagina').then(x=>({default:x.UsuariosPagina})))
const SeguridadPagina=lazy(()=>import('./pages/SeguridadPagina').then(x=>({default:x.SeguridadPagina})))
const ReporteInventarioPagina=lazy(()=>import('./pages/ReporteInventarioPagina').then(x=>({default:x.ReporteInventarioPagina})))
const TransferenciasPagina=lazy(()=>import('./pages/TransferenciasPagina').then(x=>({default:x.TransferenciasPagina})))
const TransferenciasRecibidasPagina=lazy(()=>import('./pages/TransferenciasRecibidasPagina').then(x=>({default:x.TransferenciasRecibidasPagina})))
const TransferenciasEnviadasPagina=lazy(()=>import('./pages/TransferenciasEnviadasPagina').then(x=>({default:x.TransferenciasEnviadasPagina})))
const PaginaNoEncontrada=lazy(()=>import('./pages/PaginaNoEncontrada').then(x=>({default:x.NotFoundPage})))
const cargar=(elemento:React.ReactNode)=><Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-slate-500">Cargando módulo…</div>}>{elemento}</Suspense>

const router=createBrowserRouter([{element:<GuestRoute/>,children:[{path:'/login',element:cargar(<InicioSesionPagina/>)}]},{element:<ProtectedRoute/>,children:[{element:<AppLayout/>,children:[
  {index:true,element:cargar(<InicioPagina/>)},
  {path:'animales',element:cargar(<InventarioBovinoPagina/>)},{path:'animales/nuevo',element:cargar(<RegistroAnimalPagina/>)},{path:'animales/:id',element:cargar(<ExpedienteAnimalPagina/>)},
  {path:'mapa-potreros',element:cargar(<MapaPotrerosPagina/>)},
  {path:'finanzas/compras-ganado',element:cargar(<ComprasGanadoPagina/>)},{path:'finanzas/ventas-ganado',element:cargar(<VentasGanadoPagina/>)},{path:'lotes',element:cargar(<LotesCreditosPagina/>)},
  {path:'datos-maestros/entidades',element:cargar(<EntidadesPagina/>)},{path:'datos-maestros/fincas',element:cargar(<FincasPagina/>)},{path:'datos-maestros/potreros',element:cargar(<PotrerosPagina/>)},{path:'datos-maestros/catalogos/:tipo',element:cargar(<CatalogosMaestrosPagina/>)},{path:'datos-maestros/catalogos',element:cargar(<CatalogosMaestrosPagina/>)},
  {path:'salud',element:cargar(<SaludPesajesPagina/>)},
  {path:'reportes/inventario',element:cargar(<ReporteInventarioPagina/>)},
  {path:'transferencias/cambio-propietario',element:cargar(<TransferenciasPagina/>)},
  {path:'transferencias/recibidas',element:cargar(<TransferenciasRecibidasPagina/>)},
  {path:'transferencias/enviadas',element:cargar(<TransferenciasEnviadasPagina/>)},
  {path:'seguridad/usuarios',element:cargar(<UsuariosPagina/>)},{path:'seguridad/:seccion',element:cargar(<SeguridadPagina/>)},{path:'usuarios',element:cargar(<UsuariosPagina/>)},
  {path:'sincronizacion',element:cargar(<SincronizacionPagina/>)},{path:'configuracion',element:cargar(<ConfiguracionPagina/>)},{path:'*',element:cargar(<PaginaNoEncontrada/>)}
]}]}])
const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1,refetchOnWindowFocus:false}}})
createRoot(document.getElementById('root')!).render(<StrictMode><FeedbackProvider><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router}/></AuthProvider></QueryClientProvider></FeedbackProvider></StrictMode>)
