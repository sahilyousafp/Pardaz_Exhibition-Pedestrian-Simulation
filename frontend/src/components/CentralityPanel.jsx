import { useMemo } from 'react'

const METRICS = [
  { key: 'betweenness', label: 'Betweenness', color: '#6c63ff', desc: 'How often this space lies on shortest paths between other spaces.' },
  { key: 'eigenvector', label: 'Eigenvector', color: '#22d3ee', desc: 'Influence score — high if connected to other high-scoring spaces.' },
  { key: 'degree', label: 'Degree', color: '#f59e0b', desc: 'Number of directly connected adjacent spaces (normalised).' },
]

export default function CentralityPanel({ centrality, activeMetric, onMetricChange }) {
  const nodes = useMemo(() => Object.values(centrality), [centrality])
  const sorted = useMemo(() =>
    [...nodes].sort((a, b) => b[activeMetric] - a[activeMetric]),
    [nodes, activeMetric]
  )

  if (nodes.length === 0) return (
    <div className="text-slate-500 text-sm text-center py-8">No spaces annotated</div>
  )

  const maxVal = Math.max(...nodes.map(n => n[activeMetric]), 0.001)

  return (
    <div className="flex flex-col gap-4">
      {/* Metric selector */}
      <div className="space-y-1">
        <p className="label">Centrality Metric</p>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => onMetricChange(m.key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
              activeMetric === m.key
                ? 'bg-panel border border-accent text-white'
                : 'text-slate-400 hover:bg-panel'
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
              <span className="font-medium">{m.label}</span>
            </div>
            <p className="text-slate-500 leading-tight pl-4">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div>
        <p className="label mb-2">Space Rankings</p>
        <div className="space-y-2">
          {sorted.map((n, i) => {
            const color = METRICS.find(m => m.key === activeMetric)?.color ?? '#6c63ff'
            const pct = n[activeMetric] / maxVal
            return (
              <div key={n.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-600 font-mono w-4">{i + 1}</span>
                    {n.label}
                  </span>
                  <span className="font-mono text-slate-400">{n[activeMetric].toFixed(3)}</span>
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

      {/* All metrics table */}
      <div>
        <p className="label mb-2">All Metrics</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-border">
                <th className="text-left pb-1.5 font-medium">Space</th>
                <th className="text-right pb-1.5 font-medium text-[#6c63ff]">Btw</th>
                <th className="text-right pb-1.5 font-medium text-[#22d3ee]">Eig</th>
                <th className="text-right pb-1.5 font-medium text-[#f59e0b]">Deg</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(n => (
                <tr key={n.label} className="border-b border-border/50">
                  <td className="py-1.5 text-slate-300 truncate max-w-[80px]">{n.label}</td>
                  <td className="py-1.5 text-right font-mono text-slate-400">{n.betweenness.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono text-slate-400">{n.eigenvector.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono text-slate-400">{n.degree.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
