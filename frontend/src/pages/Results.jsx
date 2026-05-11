import { useState, useCallback } from 'react'
import HeatmapOverlay from '../components/HeatmapOverlay'
import CentralityPanel from '../components/CentralityPanel'
import gifshot from 'gifshot'

export default function Results({ results, setupState, onBack }) {
  const [showTrajectory, setShowTrajectory] = useState(false)
  const [showGraph, setShowGraph] = useState(true)
  const [exportingGif, setExportingGif] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(3)   // frames advanced per rAF

  const { imageInfo } = setupState
  const stats = results.stats ?? {}

  const exportGif = useCallback(async () => {
    if (!results.trajectory_points?.length) return
    setExportingGif(true)
    try {
      const W = Math.min(imageInfo.width,  800)
      const H = Math.min(imageInfo.height, 600)
      const sc = Math.min(W / imageInfo.width, H / imageInfo.height)
      const { scale_mpp = 0.05 } = setupState
      const AGENT_RADIUS_M = 0.2
      const dotRadius = Math.max(3.5, (AGENT_RADIUS_M / scale_mpp) * 1.75)

      // Load heatmap as background
      const bg = await loadImage(results.heatmap_url)

      // Group trajectories into ~40 evenly spaced frames
      const traj = results.trajectory_points
      const FRAMES = 40
      const step = Math.max(1, Math.floor(traj.length / FRAMES))
      const frames = []

      for (let fi = 0; fi < traj.length; fi += step) {
        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(bg, 0, 0, W, H)

        // Draw trail (last 20 points before this frame)
        const start = Math.max(0, fi - step * 20)
        for (let i = start; i <= fi && i < traj.length; i++) {
          const [x, y] = traj[i]
          const alpha = 0.15 + 0.85 * ((i - start) / (fi - start + 1))
          ctx.beginPath()
          ctx.arc(x * sc, y * sc, dotRadius * sc, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 220, 80, ${alpha})`
          ctx.fill()
        }
        frames.push(canvas.toDataURL('image/png'))
        if (frames.length >= FRAMES) break
      }

      gifshot.createGIF({
        images: frames,
        gifWidth: W,
        gifHeight: H,
        interval: 0.07,
        numWorkers: 2,
      }, result => {
        setExportingGif(false)
        if (!result.error) {
          const a = document.createElement('a')
          a.href = result.image
          a.download = 'simulation.gif'
          a.click()
        }
      })
    } catch (e) {
      setExportingGif(false)
      console.error('GIF export failed', e)
    }
  }, [results, imageInfo, setupState])

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-11 flex-shrink-0 flex items-center px-4 gap-3 border-b border-border bg-panel">
        <button onClick={onBack} className="btn-ghost flex items-center gap-1.5 text-xs">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Back
        </button>
        <span className="text-slate-600">|</span>
        <span className="text-sm font-semibold text-accent">Results</span>

        {/* Stats chips */}
        <div className="flex items-center gap-2 ml-3">
          <Chip label="Agents" value={stats.total_agents} />
          <Chip label="Steps" value={stats.total_steps?.toLocaleString()} />
          <Chip label="Samples" value={stats.position_samples?.toLocaleString()} />
        </div>

        {/* View toggles */}
        <div className="ml-auto flex items-center gap-2">
          <Toggle
            label="Graph overlay"
            value={showGraph}
            onChange={setShowGraph}
            color="#6c63ff"
          />
          <Toggle
            label="Trajectories"
            value={showTrajectory}
            onChange={setShowTrajectory}
            color="#f59e0b"
          />

          {/* Speed slider — only when trajectory is on */}
          {showTrajectory && (
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-2.5 py-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-slate-500 flex-shrink-0">
                <path d="M8 2v12M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span className="text-xs text-slate-500 whitespace-nowrap">Speed</span>
              <input
                type="range" min={1} max={20} step={1} value={playbackSpeed}
                onChange={e => setPlaybackSpeed(Number(e.target.value))}
                className="w-20 accent-amber-400"
              />
              <span className="text-xs font-mono text-amber-400 w-5">{playbackSpeed}x</span>
            </div>
          )}

          <a href={results.heatmap_url} download="heatmap.png"
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v9M4 11l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Heatmap PNG
          </a>
          <button
            onClick={exportGif}
            disabled={exportingGif || !results.trajectory_points?.length}
            className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-40"
          >
            {exportingGif ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                </svg>
                Building GIF…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Export GIF
              </>
            )}
          </button>
        </div>
      </header>

      {/* Warnings banner */}
      {results.warnings?.length > 0 && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-amber-400">
            <path d="M8 2L1 13h14L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div className="space-y-0.5">
            {results.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300">{w}</p>
            ))}
            <p className="text-xs text-amber-500 mt-1">
              Tip: Mark a Space as <strong>Entry</strong>, <strong>Exit</strong> or <strong>Both</strong> from the POI dialog.
            </p>
          </div>
          <button onClick={onBack} className="ml-auto text-xs text-amber-400 underline whitespace-nowrap">Fix annotations</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main visualization */}
        <HeatmapOverlay
          heatmapUrl={results.heatmap_url}
          floorPlanUrl={imageInfo.url}
          graph={showGraph ? results.graph : null}
          centrality={results.centrality}
          activeMetric="betweenness"
          trajectories={results.trajectory_points}
          showTrajectory={showTrajectory}
          playbackSpeed={playbackSpeed}
          imageNativeW={imageInfo.width}
          imageNativeH={imageInfo.height}
          scaleMpp={setupState.scale_mpp}
        />

        {/* Right sidebar */}
        <aside className="w-64 flex-shrink-0 flex flex-col gap-4 py-4 px-3 bg-panel border-l border-border overflow-y-auto">
          {/* Heatmap legend */}
          <div>
            <p className="label mb-2">Heatmap Density</p>
            <div className="h-2.5 rounded-full" style={{
              background: 'linear-gradient(to right, transparent, #440154, #3b5288, #21918c, #5ec962, #fde725, #dc3220)'
            }} />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low</span><span>High</span>
            </div>
          </div>

          {/* Centrality panel */}
          <CentralityPanel
            centrality={results.centrality}
          />
        </aside>
      </div>
    </div>
  )
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-mono font-medium">{value ?? '—'}</span>
    </div>
  )
}

function Toggle({ label, value, onChange, color }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
        value ? 'border-accent bg-accent/10 text-white' : 'border-border text-slate-500 hover:border-slate-600'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: value ? color : '#374151' }}
      />
      {label}
    </button>
  )
}
