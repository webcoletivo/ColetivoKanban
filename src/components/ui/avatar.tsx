'use client'

import * as React from 'react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const colors = [
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-green-500 to-green-600',
  'bg-gradient-to-br from-orange-500 to-orange-600',
  'bg-gradient-to-br from-pink-500 to-pink-600',
  'bg-gradient-to-br from-indigo-500 to-indigo-600',
  'bg-gradient-to-br from-teal-500 to-teal-600',
  'bg-gradient-to-br from-red-500 to-red-600',
]

function getColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false)
  
  const showImage = src && !imageError
  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full font-medium text-white overflow-hidden ring-2 ring-white dark:ring-gray-900',
        sizeClasses[size],
        !showImage && bgColor,
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name: string }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium ring-2 ring-white dark:ring-gray-900 dark:bg-gray-700 dark:text-gray-300',
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
