import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Container({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4', className)}>{children}</div>
}

