import type { ReactNode } from 'react'

/** Ícones de traço 24x24. O tamanho vem do elemento pai (h-4 w-4 etc.). */
function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconeCaixa() {
  return (
    <Icone>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </Icone>
  )
}

export function IconeEtiqueta() {
  return (
    <Icone>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </Icone>
  )
}

export function IconePessoas() {
  return (
    <Icone>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icone>
  )
}

export function IconeLupa() {
  return (
    <Icone>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Icone>
  )
}

export function IconeX() {
  return (
    <Icone>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icone>
  )
}

export function IconeCheck() {
  return (
    <Icone>
      <polyline points="20 6 9 17 4 12" />
    </Icone>
  )
}

export function IconeAtualizar() {
  return (
    <Icone>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Icone>
  )
}

export function IconeSair() {
  return (
    <Icone>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Icone>
  )
}

export function IconeLink() {
  return (
    <Icone>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icone>
  )
}

export function IconeCamadas() {
  return (
    <Icone>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Icone>
  )
}

export function IconeAtividade() {
  return (
    <Icone>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Icone>
  )
}

export function IconeMais() {
  return (
    <Icone>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icone>
  )
}

export function IconeEscudo() {
  return (
    <Icone>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icone>
  )
}

export function IconeAlerta() {
  return (
    <Icone>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icone>
  )
}

export function IconeAviso() {
  return (
    <Icone>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icone>
  )
}

export function IconeCheckCirculo() {
  return (
    <Icone>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icone>
  )
}

export function IconeVoltar() {
  return (
    <Icone>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </Icone>
  )
}

export function IconeCopiar() {
  return (
    <Icone>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icone>
  )
}

export function IconeRaio() {
  return (
    <Icone>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Icone>
  )
}

export function IconeChave() {
  return (
    <Icone>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </Icone>
  )
}

export function IconeSetaDireita() {
  return (
    <Icone>
      <polyline points="9 18 15 12 9 6" />
    </Icone>
  )
}

export function IconeSol() {
  return (
    <Icone>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icone>
  )
}

export function IconeLua() {
  return (
    <Icone>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icone>
  )
}

export function IconeSetaEsquerda() {
  return (
    <Icone>
      <polyline points="15 18 9 12 15 6" />
    </Icone>
  )
}
