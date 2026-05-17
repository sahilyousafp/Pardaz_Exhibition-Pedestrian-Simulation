export default function MainLayout({ children, sidebar, header }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {header && <>{header}</>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="hidden lg:block w-64 border-r border-border bg-panel overflow-y-auto">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
