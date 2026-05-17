export default function Header({ title, subtitle, actions }) {
  return (
    <div className="border-b border-border bg-panel py-6 px-6">
      <div className="container-tight">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="text-secondary mt-2">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
