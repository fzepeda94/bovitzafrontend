import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
export function NotFoundPage(){return <Card className="mx-auto mt-16 max-w-lg text-center"><p className="font-display text-6xl font-extrabold text-pine-600">404</p><h1 className="mt-4 font-display text-2xl font-bold">Página no encontrada</h1><p className="mt-2 text-sm text-slate-500">La dirección no corresponde a un módulo disponible.</p><Link to="/"><Button className="mt-6">Volver al inicio</Button></Link></Card>}

