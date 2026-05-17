export default function Alert({ type = 'info', title, message, onClose }) {
  const styles = {
    error: 'bg-red-950/30 border-red-700 text-red-200',
    warning: 'bg-yellow-950/30 border-yellow-700 text-yellow-200',
    success: 'bg-emerald-950/30 border-emerald-700 text-emerald-200',
    info: 'bg-blue-950/30 border-blue-700 text-blue-200',
  }

  const icons = {
    error: '⚠️',
    warning: '⚡',
    success: '✓',
    info: 'ℹ️',
  }

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          {message && <p className="text-sm">{message}</p>}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
