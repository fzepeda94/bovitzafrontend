import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react'
import { registerConfirmationHandler, subscribeToNotices, type ConfirmationRequest, type FeedbackNotice } from '../lib/feedback'

interface Toast extends FeedbackNotice {
  id: number
}

interface PendingConfirmation extends ConfirmationRequest {
  resolve: (accepted: boolean) => void
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const cancelButton = useRef<HTMLButtonElement>(null)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  useEffect(() => subscribeToNotices(notice => {
    const id = nextId.current++
    setToasts(current => [...current.slice(-3), { ...notice, id }])
    timers.current.set(id, setTimeout(() => dismiss(id), notice.tone === 'error' ? 6500 : 4500))
  }), [dismiss])

  useEffect(() => registerConfirmationHandler(request => new Promise<boolean>(resolve => {
    setConfirmation(current => {
      current?.resolve(false)
      return { ...request, resolve }
    })
  })), [])

  useEffect(() => {
    if (!confirmation) return
    cancelButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        confirmation.resolve(false)
        setConfirmation(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmation])

  useEffect(() => () => {
    timers.current.forEach(timer => clearTimeout(timer))
  }, [])

  const answer = (accepted: boolean) => {
    confirmation?.resolve(accepted)
    setConfirmation(null)
  }

  return <>
    {children}
    <section aria-label="Notificaciones" aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-5 sm:top-[calc(1.25rem+env(safe-area-inset-top))] sm:w-[380px]">
      {toasts.map(toast => <article key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur ${toast.tone === 'success' ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-50' : 'border-red-200 bg-red-50/95 text-red-950 dark:border-red-800 dark:bg-red-950/95 dark:text-red-50'}`}>
        <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full ${toast.tone === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>{toast.tone === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}</span>
        <div className="min-w-0 flex-1"><p className="font-display text-sm font-bold">{toast.title}</p><p className="mt-0.5 break-words text-sm opacity-80">{toast.message}</p></div>
        <button type="button" onClick={() => dismiss(toast.id)} className="grid h-9 w-9 flex-none place-items-center rounded-xl opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label="Cerrar notificación"><X size={18} /></button>
      </article>)}
    </section>
    {confirmation && <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) answer(false) }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"><AlertTriangle size={25} /></span>
        <h2 id="confirmation-title" className="mt-5 font-display text-xl font-extrabold text-slate-950 dark:text-white">{confirmation.title}</h2>
        <p id="confirmation-message" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{confirmation.message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelButton} type="button" onClick={() => answer(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine-500 dark:text-slate-200 dark:hover:bg-slate-800">{confirmation.cancelLabel}</button>
          <button type="button" onClick={() => answer(true)} className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-slate-900">{confirmation.confirmLabel}</button>
        </div>
      </section>
    </div>}
  </>
}
