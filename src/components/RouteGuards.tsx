import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { session } = useAuth()
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestRoute() {
  const { session } = useAuth()
  return session ? <Navigate to="/" replace /> : <Outlet />
}

