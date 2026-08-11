import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from '../components/ui'

export function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible iniciar sesión.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f3f5ef] lg:grid-cols-[1.1fr_.9fr] dark:bg-slate-950">
      <section className="relative hidden min-h-screen overflow-hidden bg-pine-950 text-white lg:block">
        <img
          src="/images/bovitza-bull-hero.png"
          alt="Toro Brahman en pastizales verdes"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        <div className="relative z-10 flex items-center gap-3 p-8 xl:p-12">
          <img
            src="/icons/icon.svg"
            className="h-14 w-14 rounded-2xl shadow-lg"
            alt=""
          />

          <div>
            <p className="font-display text-2xl font-extrabold">
              BovItzá
            </p>

            <p className="text-sm text-white/80">
              Gestión ganadera
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 z-10 w-[44%] max-w-md xl:bottom-10 xl:left-10">
          <div className="rounded-3xl border border-white/15 bg-black/40 p-5 shadow-2xl backdrop-blur-sm xl:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/90 xl:text-xs">
              Control total de tu operación ganadera
            </p>

            <h2 className="mt-3 font-display text-2xl font-extrabold leading-[1.12] text-white xl:text-3xl">
              Tu ganado, tus fincas y tus números,
              <span className="mt-1 block text-emerald-300">
                en un solo lugar.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/80">
              Administra animales, fincas, potreros,
              salud, pesajes y finanzas con información
              clara y trazable.
            </p>
          </div>
        </div>
      </section>

      <section className="grid place-items-center p-5 sm:p-10">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-10 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src="/icons/icon.svg"
              className="h-14 w-14 rounded-2xl"
              alt=""
            />

            <div>
              <span className="font-display text-2xl font-extrabold">
                BovItzá
              </span>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gestión ganadera
              </p>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pine-600">
            Acceso seguro
          </p>

          <h1 className="mt-2 font-display text-3xl font-extrabold">
            Bienvenido de vuelta
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ingresa con tus credenciales para acceder al
            sistema.
          </p>

          <div className="mt-7 grid gap-5">
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Verificando…'
                : 'Iniciar sesión'}

              <ArrowRight size={18} />
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}