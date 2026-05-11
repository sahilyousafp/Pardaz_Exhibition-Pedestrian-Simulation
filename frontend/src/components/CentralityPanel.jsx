import { useMemo } from 'react'

export default function CentralityPanel({ centrality }) {
  const nodes = useMemo(() => Object.values(centrality), [centrality])
  const sorted = useMemo(() =>
    [...nodes].sort((a, b) => b.betweenness - a.betweenness),
    [nodes]
  )

  if (nodes.length === 0) return (
    <div className="text-slate-500 text-sm text-center py-8">No spaces annotated</div>
  )

  const maxVal = Math.max(...nodes.map(n => n.betweenness), 0.001)

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="label">Centrality Metric</p>
        <div className="w-full px-3 py-2 rounded-lg text-xs bg-panel border border-accent text-white">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6c63ff' }} />
            <span className="font-medium">Betweenness</span>
          </div>
          <p className="text-slate-500 leading-tight pl-4">How often this space lies on shortest paths between other spaces.</p>
        </div>
      </div>

      {/* Rankings */}
      <div>
        <p className="label mb-2">Space Rankings</p>
        <div className="space-y-2">
          {sorted.map((n, i) => {
            const color = '#6c63ff'
            const pct = n.betweenness / maxVal
            return (
              <div key={n.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-600 font-mono w-4">{i + 1}</span>
                    {n.label}
                  </span>
                  <span className="font-mono text-slate-400">{n.betweenness.toFixed(3)}</span>
                </div>
                <div className="h-1 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct * 100}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary table */}
      <div>
        <p className="label mb-2">Centrality Summary</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-border">
                <th className="text-left pb-1.5 font-medium">Space</th>
                <th className="text-right pb-1.5 font-medium text-[#6c63ff]">Btw</th>
                <th className="text-right pb-1.5 font-medium text-[#f59e0b]">Traffic</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(n => (
                <tr key={n.label} className="border-b border-border/50">
                  <td className="py-1.5 text-slate-300 truncate max-w-[80px]">{n.label}</td>
                  <td className="py-1.5 text-right font-mono text-slate-400">{n.betweenness.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono text-slate-400">{(n.foot_traffic ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
