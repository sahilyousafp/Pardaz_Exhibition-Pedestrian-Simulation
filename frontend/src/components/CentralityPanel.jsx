import { useMemo } from 'react'

export default function CentralityPanel({ centrality }) {
  const nodes = useMemo(() => Object.values(centrality), [centrality])
  const sorted = useMemo(() =>
    [...nodes].sort((a, b) => b.betweenness - a.betweenness),
    [nodes]
  )

  if (nodes.length === 0) return (
    <div className="text-secondary dark:text-gray-400 text-sm text-center py-12 font-medium">No spaces annotated</div>
  )

  const maxVal = Math.max(...nodes.map(n => n.betweenness), 0.001)

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        <p className="label ml-1">Centrality Metric</p>
        <div className="w-full px-4 py-3 rounded-2xl text-[13px] bg-accent/5 dark:bg-accent/10 border border-accent/10">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,113,227,0.4)]" />
            <span className="font-bold text-primary dark:text-white">Betweenness</span>
          </div>
          <p className="text-secondary dark:text-gray-400 leading-snug font-medium">How often this space lies on shortest paths between other spaces.</p>
        </div>
      </div>

      {/* Rankings */}
      <div className="space-y-4">
        <p className="label ml-1">Space Rankings</p>
        <div className="space-y-4 px-1">
          {sorted.map((n, i) => {
            const color = '#0071e3'
            const pct = n.betweenness / maxVal
            return (
              <div key={n.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-primary dark:text-white font-bold">
                    <span className="text-secondary dark:text-gray-500 opacity-40 font-mono w-4">{i + 1}</span>
                    {n.label}
                  </span>
                  <span className="font-bold text-accent tabular-nums">{n.betweenness.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct * 100}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary table */}
      <div className="space-y-4">
        <p className="label ml-1">Centrality Summary</p>
        <div className="bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-secondary dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                <th className="text-left py-3 font-bold uppercase tracking-widest text-[9px]">Space</th>
                <th className="text-right py-3 font-bold uppercase tracking-widest text-[9px] text-accent">Btw</th>
                <th className="text-right py-3 font-bold uppercase tracking-widest text-[9px] text-amber-500">Traffic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.05]">
              {sorted.map(n => (
                <tr key={n.label}>
                  <td className="py-3 text-primary dark:text-white font-bold truncate max-w-[100px]">{n.label}</td>
                  <td className="py-3 text-right font-bold text-primary/70 dark:text-white/70 tabular-nums">{n.betweenness.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold text-primary/70 dark:text-white/70 tabular-nums">{(n.foot_traffic ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
