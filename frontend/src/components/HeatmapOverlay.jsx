import { useRef, useEffect, useState, useCallback } from 'react'
import useImage from './useImage'

export default function HeatmapOverlay({
  heatmapUrl,
  floorPlanUrl,
  graph,
  centrality,
  activeMetric,
  trajectories,
  showTrajectory,
  playbackSpeed = 3,
  imageNativeW,
  imageNativeH,
  scaleMpp = 0.05,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600, scale: 1 })
  const [heatImg] = useImage(heatmapUrl)
  const [frameIdx, setFrameIdx] = useState(0)
  const AGENT_RADIUS_M = 0.2
  const dotRadius = Math.max(3.5, (AGENT_RADIUS_M / scaleMpp) * 1.75)

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const compute = () => {
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const sc = Math.min(width / imageNativeW, height / imageNativeH)
      setDims({ w: Math.floor(imageNativeW * sc), h: Math.floor(imageNativeH * sc), scale: sc })
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    const obs = new ResizeObserver(compute)
    obs.observe(containerRef.current)
    const raf = requestAnimationFrame(compute)
    return () => { obs.disconnect(); cancelAnimationFrame(raf) }
  }, [imageNativeW, imageNativeH])

  // Recompute when heatmap image loads
  useEffect(() => {
    if (!heatImg || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    if (width > 0 && height > 0) {
      const sc = Math.min(width / imageNativeW, height / imageNativeH)
      setDims({ w: Math.floor(imageNativeW * sc), h: Math.floor(imageNativeH * sc), scale: sc })
    }
  }, [heatImg, imageNativeW, imageNativeH])

  // Zoom with wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 10))
  }, [])

  // Pan with mouse
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Trajectory animation
  useEffect(() => {
    if (!showTrajectory || !trajectories || trajectories.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setFrameIdx(0)
      return
    }
    let idx = 0
    const animate = () => {
      idx = (idx + playbackSpeed) % trajectories.length
      setFrameIdx(idx)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [showTrajectory, trajectories, playbackSpeed])

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dims.w, dims.h)

    if (showTrajectory && trajectories && trajectories.length > 0) {
      const window_size = 60
      const start = Math.max(0, frameIdx - window_size)
      for (let i = start; i <= frameIdx && i < trajectories.length; i++) {
        const [x, y] = trajectories[i]
        const alpha = (i - start) / window_size
        ctx.beginPath()
        ctx.arc(x * dims.scale, y * dims.scale, dotRadius * dims.scale, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha * 0.8})`
        ctx.fill()
      }
    }
  }, [dims, frameIdx, showTrajectory, trajectories, dotRadius])

  const sc = dims.scale
  const totalScale = sc * zoom

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center justify-center bg-surface dark:bg-[#0d0d0f] overflow-hidden transition-colors duration-300 cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.2, 10))}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors shadow-lg border-white/40 dark:border-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.2))}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors shadow-lg border-white/40 dark:border-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary dark:text-white hover:bg-white dark:hover:bg-white/10 transition-colors shadow-lg border-white/40 dark:border-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.75"/><path d="M3 21v-6h6"/></svg>
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-6 left-24 z-20 px-3 py-1.5 glass rounded-lg text-[10px] font-bold text-secondary dark:text-gray-400 uppercase tracking-widest border-white/40 dark:border-white/10">
        {Math.round(zoom * 100)}%
      </div>

      <div
        className="relative"
        style={{
          width: dims.w,
          height: dims.h,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        {/* Heatmap image */}
        {heatImg && (
          <img
            src={heatmapUrl}
            alt="Heatmap"
            style={{ width: dims.w, height: dims.h, display: 'block', position: 'absolute', top: 0, left: 0 }}
            draggable={false}
          />
        )}

        {/* SVG graph overlay */}
        {graph && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            width={dims.w}
            height={dims.h}
          >
            {graph.edges.map((e, i) => {
              const src = graph.nodes.find(n => n.id === e.source)
              const tgt = graph.nodes.find(n => n.id === e.target)
              if (!src || !tgt) return null
              return (
                <line
                  key={i}
                  x1={src.centroid[0] * sc} y1={src.centroid[1] * sc}
                  x2={tgt.centroid[0] * sc} y2={tgt.centroid[1] * sc}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={2.25}
                />
              )
            })}

            {graph.nodes.map(n => {
              const c = centrality[n.id]
              if (!c) return null
              const val = c[activeMetric] ?? 0
              const radius = 12 + val * 30
              const colors = {
                betweenness: `rgba(108,99,255,${0.5 + val * 0.5})`,
                foot_traffic: `rgba(245,158,11,${0.5 + val * 0.5})`,
              }
              const fill = colors[activeMetric] ?? colors.betweenness
              return (
                <g key={n.id}>
                  <circle
                    cx={n.centroid[0] * sc} cy={n.centroid[1] * sc}
                    r={radius}
                    fill={fill}
                    stroke="white"
                    strokeWidth={1.5}
                    strokeOpacity={0.4}
                  />
                  <text
                    x={n.centroid[0] * sc}
                    y={n.centroid[1] * sc - radius - 4}
                    textAnchor="middle"
                    fontSize={12}
                    fill="white"
                    opacity={0.8}
                    fontWeight="500"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.centroid[0] * sc}
                    y={n.centroid[1] * sc + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill="white"
                    opacity={0.7}
                    fontFamily="monospace"
                  >
                    {val.toFixed(2)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}

        {/* Trajectory canvas */}
        <canvas
          ref={canvasRef}
          width={dims.w}
          height={dims.h}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  )
}
