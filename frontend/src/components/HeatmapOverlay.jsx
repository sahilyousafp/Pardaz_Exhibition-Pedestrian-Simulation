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

  // Resize observer — same fix as AnnotationCanvas (RAF deferred initial compute)
  useEffect(() => {
    if (!containerRef.current) return
    const compute = () => {
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const sc = Math.min(width / imageNativeW, height / imageNativeH)
      setDims({ w: Math.floor(imageNativeW * sc), h: Math.floor(imageNativeH * sc), scale: sc })
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

  // Trajectory animation — speed controlled by playbackSpeed prop
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

    // Trajectory dots
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

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center justify-center bg-surface dark:bg-[#0d0d0f] overflow-hidden transition-colors duration-300">
      <div className="relative" style={{ width: dims.w, height: dims.h }}>
        {/* Heatmap image (already composited with floor plan) */}
        {heatImg && (
          <img
            src={heatmapUrl}
            alt="Heatmap"
            style={{ width: dims.w, height: dims.h, display: 'block', position: 'absolute', top: 0, left: 0 }}
          />
        )}

        {/* SVG graph overlay */}
        {graph && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            width={dims.w}
            height={dims.h}
          >
            {/* Edges */}
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

            {/* Nodes */}
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
