import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type SelectHTMLAttributes,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Card({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`
        rounded-2xl
        border
        border-slate-200/80
        bg-white
        p-5
        shadow-card
        dark:border-slate-700
        dark:bg-slate-900
        ${className}
      `}
    >
      {children}
    </section>
  )
}

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary:
      'bg-pine-700 text-white hover:bg-pine-600',

    secondary:
      'bg-pine-50 text-pine-700 hover:bg-pine-100',

    danger:
      'bg-red-600 text-white hover:bg-red-500',

    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }

  return (
    <button
      className={`
        inline-flex
        min-h-10
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        py-2
        text-sm
        font-semibold
        transition
        focus:outline-none
        focus:ring-2
        focus:ring-pine-500
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${styles[variant]}
        ${className}
      `}
      {...props}
    />
  )
}

export function IconButton({
  className = '',
  tone = 'neutral',
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'neutral' | 'edit' | 'danger' | 'success'
  label: string
}) {
  const styles = {
    neutral: `
      bg-transparent
      text-slate-500
      hover:bg-pine-50
      hover:text-pine-700
      dark:text-slate-300
      dark:hover:bg-slate-800
      dark:hover:text-emerald-300
    `,

    edit: `
      bg-sky-100
      text-sky-700
      shadow-sm
      hover:bg-sky-200
      hover:text-sky-900
      dark:bg-sky-900/60
      dark:text-sky-200
      dark:hover:bg-sky-800
      dark:hover:text-white
    `,

    danger: `
      bg-red-600
      text-white
      shadow-sm
      hover:bg-red-500
      dark:bg-red-600
      dark:hover:bg-red-500
    `,

    success: `
      bg-emerald-600
      text-white
      shadow-sm
      hover:bg-emerald-500
      dark:bg-emerald-600
      dark:hover:bg-emerald-500
    `,
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`
        inline-grid
        h-10
        w-10
        shrink-0
        place-items-center
        rounded-xl
        transition
        focus:outline-none
        focus:ring-2
        focus:ring-pine-500
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${styles[tone]}
        ${className}
      `}
      {...props}
    />
  )
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label,
}: {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  label: string
}) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      className="
        mt-5
        flex
        flex-col
        gap-3
        border-t
        border-slate-200
        pt-4
        sm:flex-row
        sm:items-center
        sm:justify-between
        dark:border-slate-700
      "
      aria-label={label}
    >
      <p className="text-sm text-slate-500">
        Mostrando {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, totalItems)} de {totalItems}
      </p>

      <div className="flex items-center gap-1.5">
        <IconButton
          label="Página anterior"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </IconButton>

        <div
          className="flex items-center gap-1"
          aria-label={`Página ${page} de ${totalPages}`}
        >
          {Array.from(
            { length: totalPages },
            (_, index) => index + 1,
          ).map((number) => (
            <button
              key={number}
              type="button"
              aria-label={`Ir a la página ${number}`}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onPageChange(number)}
              className={`
                grid
                h-10
                min-w-10
                place-items-center
                rounded-xl
                px-2
                text-sm
                font-semibold
                transition
                ${
                  number === page
                    ? 'bg-pine-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-pine-50 hover:text-pine-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }
              `}
            >
              {number}
            </button>
          ))}
        </div>

        <IconButton
          label="Página siguiente"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </nav>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    error?: string
  }
>(function Input(
  {
    label,
    error,
    className = '',
    ...props
  },
  ref,
) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label && (
        <span>
          {label}

          {props.required && (
            <span
              className="ml-1 text-red-600"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </span>
      )}

      <input
        ref={ref}
        className={`
          min-h-11 w-full min-w-0
          rounded-xl
          border
          bg-white
          px-3
          text-slate-900
          outline-none
          transition
          focus:border-pine-500
          focus:ring-2
          focus:ring-pine-100
          dark:border-slate-700
          dark:bg-slate-950
          dark:text-white
          ${
            error
              ? 'border-red-500'
              : 'border-slate-300'
          }
          ${className}
        `}
        {...props}
      />

      {error && (
        <span className="text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
    error?: string
  }
>(function Select(
  {
    label,
    error,
    className = '',
    children,
    ...props
  },
  ref,
) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label && (
        <span>
          {label}

          {props.required && (
            <span
              className="ml-1 text-red-600"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </span>
      )}

      <select
        ref={ref}
        className={`
          min-h-11 w-full min-w-0
          rounded-xl
          border
          bg-white
          px-3
          text-slate-900
          outline-none
          focus:border-pine-500
          focus:ring-2
          focus:ring-pine-100
          dark:border-slate-700
          dark:bg-slate-950
          dark:text-white
          ${
            error
              ? 'border-red-500'
              : 'border-slate-300'
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </select>

      {error && (
        <span className="text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  )
})

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}>) {
  const colors = {
    neutral:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',

    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',

    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',

    danger:
      'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  }

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-xs
        font-semibold
        ${colors[tone]}
      `}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <div>
        <p className="font-display text-lg font-bold">
          {title}
        </p>

        <p className="mt-1 max-w-md text-sm text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  )
}
