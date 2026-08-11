import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-pine-600">{eyebrow}</p>}<h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</header>
}

