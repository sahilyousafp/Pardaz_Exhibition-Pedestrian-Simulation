export default function Spinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-3 w-3 border-2',
    md: 'h-5 w-5 border-2',
    lg: 'h-8 w-8 border-3',
  }

  return <div className={`spinner ${sizeClasses[size]}`} />
}
