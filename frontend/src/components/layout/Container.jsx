export default function Container({ children, size = 'tight', className = '' }) {
  const sizeClasses = {
    tight: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-full',
  }

  return (
    <div className={`${sizeClasses[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}
