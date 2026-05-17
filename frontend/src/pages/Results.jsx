import { useState, useCallback } from 'react'
import HeatmapOverlay from '../components/HeatmapOverlay'
import CentralityPanel from '../components/CentralityPanel'
import ThemeToggle from '../components/ui/ThemeToggle'
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
      // Correctly maintain aspect ratio for GIF export
      const MAX_W = 1200
      const MAX_H = 1200
      const exportScale = Math.min(MAX_W / imageInfo.width, MAX_H / imageInfo.height, 1)
      const W = Math.floor(imageInfo.width * exportScale)
      const H = Math.floor(imageInfo.height * exportScale)
      
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
        // Ensure image fills the canvas exactly since we matched the aspect ratio
        ctx.drawImage(bg, 0, 0, W, H)

        // Draw trail (last 20 points before this frame)
        const start = Math.max(0, fi - step * 20)
        for (let i = start; i <= fi && i < traj.length; i++) {
          const [x, y] = traj[i]
          const alpha = 0.15 + 0.85 * ((i - start) / (fi - start + 1))
          ctx.beginPath()
          ctx.arc(x * exportScale, y * exportScale, dotRadius * exportScale, 0, Math.PI * 2)
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
    <div className="h-screen flex flex-col bg-surface dark:bg-[#0d0d0f] relative overflow-hidden font-sans transition-colors duration-300">
      {/* Floating Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[calc(100%-120px)] max-w-6xl z-30 pointer-events-none">
        <header className="h-14 glass rounded-full px-6 flex items-center gap-4 pointer-events-auto border-white/40 dark:border-white/10 shadow-2xl">
          <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-secondary hover:text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wide">Back</span>
          </button>

          <div className="h-5 w-px bg-black/5 dark:bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,113,227,0.3)]" />
            <span className="text-sm font-bold tracking-tight text-primary dark:text-white">Simulation Results</span>
          </div>

          {/* Stats chips */}
          <div className="hidden lg:flex items-center gap-2 ml-4">
            <Chip label="Agents" value={stats.total_agents} />
            <Chip label="Steps" value={stats.total_steps?.toLocaleString()} />
            <Chip label="Samples" value={stats.position_samples?.toLocaleString()} />
          </div>

          {/* View toggles */}
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full">
              <Toggle
                label="Graph"
                value={showGraph}
                onChange={setShowGraph}
                color="#0071e3"
              />
              <Toggle
                label="Trails"
                value={showTrajectory}
                onChange={setShowTrajectory}
                color="#f59e0b"
              />
            </div>

            {/* Speed slider — only when trajectory is on */}
            {showTrajectory && (
              <div className="flex items-center gap-4 bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-full px-4 py-1.5 animate-fadeIn shadow-sm">
                <span className="text-[10px] font-bold text-secondary dark:text-gray-400 uppercase tracking-widest">Speed</span>
                <input
                  type="range" min={1} max={20} step={1} value={playbackSpeed}
                  onChange={e => setPlaybackSpeed(Number(e.target.value))}
                  className="w-20 accent-accent h-1.5 bg-black/5 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-[11px] font-bold text-accent w-6 tabular-nums">{playbackSpeed}x</span>
              </div>
            )}

            <div className="flex gap-2">
              <a href={results.heatmap_url} download="heatmap.png"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/20 text-primary dark:text-white transition-all shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs font-bold uppercase tracking-wide">PNG</span>
              </a>
              <button
                onClick={exportGif}
                disabled={exportingGif || !results.trajectory_points?.length}
                className="btn btn-primary px-6 py-2 shadow-lg shadow-accent/20"
              >
                {exportingGif ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs uppercase tracking-wide">Building...</span>
                  </div>
                ) : (
                  <span className="text-xs uppercase tracking-wide">Export GIF</span>
                )}
              </button>
            </div>
          </div>
        </header>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Main visualization */}
        <div className="flex-1 relative bg-white dark:bg-[#1a1a1f] transition-colors duration-300">
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
        </div>

        {/* Right sidebar — Floating */}
        <div className="absolute top-24 right-6 bottom-6 w-72 z-20 flex flex-col pointer-events-none">
          <aside className="flex flex-col gap-8 py-8 px-6 glass rounded-[32px] overflow-y-auto pointer-events-auto shadow-2xl border-white/40 dark:border-white/10">
            {/* Heatmap legend */}
            <div className="space-y-4">
              <p className="label ml-1">Density Field</p>
              <div className="px-1">
                <div className="h-4 rounded-full shadow-inner border border-black/5 dark:border-white/10" style={{
                  background: 'linear-gradient(to right, transparent, #440154, #3b5288, #21918c, #5ec962, #fde725, #dc3220)'
                }} />
                <div className="flex justify-between text-[10px] font-bold text-secondary dark:text-gray-400 mt-3 uppercase tracking-widest">
                  <span>Min</span><span>Max</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-black/5 dark:bg-white/10 mx-1" />

            {/* Centrality panel */}
            <CentralityPanel
              centrality={results.centrality}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-full px-4 py-1.5 border border-black/5 dark:border-white/10">
      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-gray-400">{label}</span>
      <span className="text-[13px] font-bold text-primary dark:text-white tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

function Toggle({ label, value, onChange, color }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${
        value
          ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm'
          : 'text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-white'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full transition-all duration-300 ${value ? 'scale-110' : 'scale-75 opacity-30 bg-secondary dark:bg-gray-500'}`}
        style={{ background: value ? color : undefined }}
      />
      {label}
    </button>
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
