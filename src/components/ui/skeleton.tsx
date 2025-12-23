import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

export function ColumnSkeleton() {
  return (
    <div className="w-72 flex-shrink-0 rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      <ColumnSkeleton />
      <ColumnSkeleton />
      <ColumnSkeleton />
    </div>
  )
}

export function BoardCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="h-6 w-3/4 mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}
