import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  erro?: string
}

export function Select({ id, label, erro, children, ...props }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-600">
          {erro}
        </p>
      )}
    </div>
  )
}
