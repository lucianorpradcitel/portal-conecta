import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  erro?: string
  ajuda?: string
}

export function Campo({ id, label, erro, ajuda, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
        {...props}
      />
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-600">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={`${id}-ajuda`} className="mt-1 text-sm text-slate-500">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}
