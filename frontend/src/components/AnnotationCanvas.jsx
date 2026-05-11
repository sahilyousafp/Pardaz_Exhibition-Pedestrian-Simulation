import { useEffect, useState, useCallback, useRef } from 'react'
import { Stage, Layer, Image as KImage, Line, Rect, Circle, Text, Group } from 'react-konva'
import useImage from './useImage'

const COLORS = {
  space:  { stroke: '#6c63ff', fill: 'rgba(108,99,255,0.10)' },
  stand:  { stroke: '#f97316', fill: 'transparent' },
  ruler:  '#facc15',
  exit:   '#ef4444',
  entry:  '#22c55e',
  poi:    '#f59e0b',
  path:   '#38bdf8',
}

// Distinct colors for multiple paths
const PATH_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#facc15']

function pxDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function pointInPolygon([px, py], polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

// Generate N-point polygon approximating a circle
function circlePolygon(cx, cy, r, n = 32) {
  return Array.from({ length: n }, (_, i) => [
    cx + r * Math.cos(2 * Math.PI * i / n),
    cy + r * Math.sin(2 * Math.PI * i / n),
  ])
}

// Precise hit detection for shapes
function pointNearLine([px, py], [x1, y1, x2, y2], tolerance = 5) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return pxDist([px, py], [x1, y1]) <= tolerance
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)))
  const closestX = x1 + t * dx, closestY = y1 + t * dy
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2) <= tolerance
}

function pointNearCircle([px, py], [cx, cy, r], tolerance = 5) {
  const d = pxDist([px, py], [cx, cy])
  return Math.abs(d - r) <= tolerance
}

function projectPointOnSegment(point, segment) {
  const [px, py] = point
  const [x1, y1, x2, y2] = segment
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { point: [x1, y1], distance: pxDist(point, [x1, y1]) }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  const x = x1 + t * dx
  const y = y1 + t * dy
  return { point: [x, y], distance: pxDist(point, [x, y]) }
}

export default function AnnotationCanvas({
  imageUrl,
  imageNativeW,
  imageNativeH,
  activeTool,
  spaceShape = 'polygon',
  annotation,
  onAnnotationChange,
  onScaleChange,
  onItemSelect,
  selectedItem,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 })
  const [scale, setScale] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [bgImage] = useImage(imageUrl)

  // polygon / path drawing — click to add points, dblclick to close
  const [currentPoints, setCurrentPoints] = useState([])
  const [mousePos, setMousePos] = useState(null)
  const isDrawingPath = activeTool === 'path'

  // rectangle / circle space drawing — two-click
  const [shapeStart, setShapeStart] = useState(null)   // [x, y] image coords

  // rectangle drawing (stand) — two-click
  const [standStart, setStandStart] = useState(null)

  // ruler tool — two-click defines 1 m
  const [rulerStart, setRulerStart] = useState(null)

  // doorway line tools (entry / exit) — two-click line segment
  const [lineStart, setLineStart] = useState(null)
  const [lineWarning, setLineWarning] = useState(false)

  // POI modals
  const [poiModal, setPoiModal] = useState(null)       // new POI: {x, y}
  const [poiEditModal, setPoiEditModal] = useState(null) // edit existing: poi object
  const [hoveredPoiId, setHoveredPoiId] = useState(null) // POI hover feedback in POI tool mode

  const computeSize = useCallback(() => {
    if (!containerRef.current || !imageNativeW || !imageNativeH) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    if (width === 0 || height === 0) return          // not laid out yet
    const sc = Math.min(width / imageNativeW, height / imageNativeH)
    setStageSize({ w: Math.floor(imageNativeW * sc), h: Math.floor(imageNativeH * sc) })
    setScale(sc)
  }, [imageNativeW, imageNativeH])

  // Resize observer — recomputes whenever the container resizes
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(computeSize)
    obs.observe(containerRef.current)
    // Also try immediately in the next frame (container may not be laid out yet)
    const raf = requestAnimationFrame(computeSize)
    return () => { obs.disconnect(); cancelAnimationFrame(raf) }
  }, [computeSize])

  // Recompute once the image actually loads (bgImage goes null → HTMLImageElement)
  useEffect(() => { if (bgImage) computeSize() }, [bgImage, computeSize])

  // Clear in-progress state when switching tools
  useEffect(() => {
    setStandStart(null)
    setCurrentPoints([])
    setRulerStart(null)
    setLineStart(null)
    setLineWarning(false)
    setShapeStart(null)
    setPoiModal(null)
    setPoiEditModal(null)
  }, [activeTool, spaceShape])

  const toImg   = useCallback((sx, sy) => [(sx - stagePos.x) / (scale * zoomLevel), (sy - stagePos.y) / (scale * zoomLevel)], [scale, zoomLevel, stagePos])
  const toStage = useCallback((ix, iy) => [ix * scale * zoomLevel + stagePos.x, iy * scale * zoomLevel + stagePos.y], [scale, zoomLevel, stagePos])
  const flatStage = (pts) => pts.flatMap(([ix, iy]) => toStage(ix, iy))
  const snapTolerance = 12 / Math.max(0.0001, scale * zoomLevel)

  const cancelActiveTask = useCallback(() => {
    setCurrentPoints([])
    setMousePos(null)
    setShapeStart(null)
    setStandStart(null)
    setRulerStart(null)
    setLineStart(null)
    setLineWarning(false)
    setPoiModal(null)
    setPoiEditModal(null)
  }, [])

  const snapPathPoint = useCallback((point) => {
    if (!point || activeTool !== 'path') return point
    const paths = annotation.paths ?? []
    let best = { point, distance: snapTolerance }

    for (const path of paths) {
      const pts = path.points ?? []
      for (const pt of pts) {
        const distance = pxDist(point, pt)
        if (distance <= best.distance) {
          best = { point: pt, distance }
        }
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const candidate = projectPointOnSegment(point, [...pts[i], ...pts[i + 1]])
        if (candidate.distance <= best.distance) {
          best = { point: candidate.point, distance: candidate.distance }
        }
      }
    }

    return best.point
  }, [activeTool, annotation.paths, snapTolerance])

  // Escape cancels the current drawing task and clears modal state.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      cancelActiveTask()
      onItemSelect?.(null, null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cancelActiveTask, onItemSelect])

  // Zoom and pan handlers
  const handleWheel = (e) => {
    if (!e.evt.ctrlKey && !e.evt.metaKey) return
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    const oldZoom = zoomLevel
    const newZoom = Math.max(0.5, Math.min(5, oldZoom + (e.evt.deltaY < 0 ? 0.1 : -0.1)))
    
    // Calculate new position to keep zoom centered on cursor
    const cursorImgX = (pointer.x - stagePos.x) / (scale * oldZoom)
    const cursorImgY = (pointer.y - stagePos.y) / (scale * oldZoom)
    
    const newStageX = pointer.x - cursorImgX * scale * newZoom
    const newStageY = pointer.y - cursorImgY * scale * newZoom
    
    setZoomLevel(newZoom)
    setStagePos({ x: newStageX, y: newStageY })
  }

  // Selection helper that checks precise hit detection
  const trySelectItem = (imgX, imgY) => {
    if (activeTool !== 'select') return null
    
    // Check POIs (highest priority due to small click area)
    for (const p of annotation.pois) {
      const d = pxDist([imgX, imgY], p.position)
      if (d <= 18 / zoomLevel) { // POI circle is ~9-16px in radius
        return { type: 'pois', id: p.id }
      }
    }
    
    // Check entries/exits (line with 5px tolerance)
    for (const line of [...annotation.entries, ...annotation.exits]) {
      const type = annotation.entries.includes(line) ? 'entries' : 'exits'
      const id = line.id ?? (type === 'entries' ? `entry_${annotation.entries.indexOf(line)}` : `exit_${annotation.exits.indexOf(line)}`)
      if (pointNearLine([imgX, imgY], [...line.p1, ...line.p2], 8 / zoomLevel)) {
        return { type, id }
      }
    }
    
    // Check paths (line with 5px tolerance)
    for (let i = 0; i < (annotation.paths ?? []).length; i++) {
      const path = annotation.paths[i]
      for (let j = 0; j < path.points.length - 1; j++) {
        if (pointNearLine([imgX, imgY], [...path.points[j], ...path.points[j+1]], 6 / zoomLevel)) {
          return { type: 'paths', id: path.id ?? `path_${i}` }
        }
      }
    }
    
    // Check stands (rectangle)
    for (const st of annotation.stands) {
      if (imgX >= st.x && imgX <= st.x + st.w && imgY >= st.y && imgY <= st.y + st.h) {
        return { type: 'stands', id: st.id }
      }
    }
    
    // Check spaces (polygon)
    for (const s of annotation.spaces) {
      if (pointInPolygon([imgX, imgY], s.polygon)) {
        return { type: 'spaces', id: s.id }
      }
    }
    
    return null
  }

  // True while the user is mid-way through a multi-click drawing gesture.
  // When mid-draw, annotation onClick handlers step aside so tool clicks land on the stage.
  const isInProgress = (
    currentPoints.length > 0 ||   // polygon / path in progress
    shapeStart !== null ||          // rect / circle first corner set
    standStart !== null ||           // stand first corner set
    lineStart !== null ||            // entry / exit first point set
    rulerStart !== null              // ruler first point set
  )

  // Returns a click handler for annotation items — only active when NOT mid-draw.
  const itemClick = (type, id, extra) => isInProgress ? undefined : (e => {
    e.cancelBubble = true
    onItemSelect?.(type, id)
    extra?.()
  })

  // ---------- mouse handlers ----------

  const handleMouseMove = (e) => {
    const { x, y } = e.target.getStage().getPointerPosition()
    const [ix, iy] = toImg(x, y)
    setMousePos([ix, iy])
    
    // POI hover detection in POI tool mode
    if (activeTool === 'poi') {
      let hovered = null
      for (const poi of annotation.pois) {
        const d = pxDist([ix, iy], poi.position)
        if (d <= 18 / zoomLevel) {
          hovered = poi.id
          break
        }
      }
      setHoveredPoiId(hovered)
    } else {
      setHoveredPoiId(null)
    }
  }

  const handleClick = (e) => {
    if (e.evt.detail >= 2) return  // handled by dblClick

    const { x, y } = e.target.getStage().getPointerPosition()
    const [ix, iy] = toImg(x, y)

    if (activeTool === 'entry' || activeTool === 'exit') {
      if (!lineStart) {
        setLineStart([ix, iy])
      } else {
        const d = pxDist(lineStart, [ix, iy])
        if (d < 8) {
          // Degenerate — both clicks at same point: cancel and restart
          setLineStart(null)
          return
        }
        const line = { id: `${activeTool}_${Date.now()}`, p1: lineStart, p2: [ix, iy] }
        const other = activeTool === 'entry' ? annotation.exits : annotation.entries
        const overlaps = other.some(o => pxDist(o.p1, lineStart) < 20 && pxDist(o.p2, [ix, iy]) < 20)
        if (overlaps) setLineWarning(true)
        if (activeTool === 'entry') {
          onAnnotationChange({ ...annotation, entries: [...annotation.entries, line] })
        } else {
          onAnnotationChange({ ...annotation, exits: [...annotation.exits, line] })
        }
        setLineStart(null)
      }
      return
    }
    if (activeTool === 'path') {
      const snapped = snapPathPoint([ix, iy])
      setCurrentPoints(prev => {
        const last = prev[prev.length - 1]
        if (last && pxDist(last, snapped) < 0.01) return prev
        return [...prev, snapped]
      })
      return
    }
    if (activeTool === 'space') {
      if (spaceShape === 'polygon') {
        setCurrentPoints(prev => [...prev, [ix, iy]])
        return
      }
      // Rectangle and circle use two-click
      if (!shapeStart) {
        setShapeStart([ix, iy])
      } else {
        let polygon
        if (spaceShape === 'rectangle') {
          const [sx, sy] = shapeStart
          polygon = [[sx, sy], [ix, sy], [ix, iy], [sx, iy]]
        } else {
          // circle
          const r = pxDist(shapeStart, [ix, iy])
          if (r < 5) { setShapeStart(null); return }
          polygon = circlePolygon(shapeStart[0], shapeStart[1], r)
        }
        const newSpace = {
          id: `space_${Date.now()}`,
          label: `Space ${annotation.spaces.length + 1}`,
          polygon,
        }
        onAnnotationChange({ ...annotation, spaces: [...annotation.spaces, newSpace] })
        setShapeStart(null)
      }
      return
    }
    if (activeTool === 'stand') {
      if (!standStart) {
        // First click — set first corner
        setStandStart([ix, iy])
      } else {
        // Second click — finalise rectangle
        const [sx, sy] = standStart
        const rx = Math.min(sx, ix), ry = Math.min(sy, iy)
        const rw = Math.abs(ix - sx), rh = Math.abs(iy - sy)
        if (rw > 2 && rh > 2) {
          onAnnotationChange({
            ...annotation,
            stands: [...annotation.stands, {
              id: `stand_${Date.now()}`,
              label: `Stand ${annotation.stands.length + 1}`,
              x: rx, y: ry, w: rw, h: rh,
            }],
          })
        }
        setStandStart(null)
      }
      return
    }
    if (activeTool === 'poi') {
      // Check if click hits an existing POI — if so, open edit modal
      for (const poi of annotation.pois) {
        const d = pxDist([ix, iy], poi.position)
        if (d <= 18 / zoomLevel) {
          setPoiEditModal(poi)
          onItemSelect?.('pois', poi.id)
          return
        }
      }
      
      // No existing POI hit — open creation modal
      // Check if click lands inside a space — pre-fill from that space
      const hitSpace = annotation.spaces.find(s => pointInPolygon([ix, iy], s.polygon))
      if (hitSpace) {
        const [cx, cy] = centroid(hitSpace.polygon)
        setPoiModal({ x: cx, y: cy, defaultLabel: hitSpace.label })
      } else {
        setPoiModal({ x: ix, y: iy, defaultLabel: '' })
      }
      return
    }
    // Select tool or empty canvas click
    if (activeTool === 'select') {
      const hit = trySelectItem(ix, iy)
      if (hit) {
        onItemSelect?.(hit.type, hit.id)
        // Open POI edit modal if a POI was selected
        if (hit.type === 'pois') {
          const poi = annotation.pois.find(p => p.id === hit.id)
          if (poi) setPoiEditModal(poi)
        }
      } else {
        onItemSelect?.(null, null)
      }
      return
    }
    // Empty canvas click — deselect
    if (onItemSelect) onItemSelect(null, null)
    if (activeTool === 'scale') {
      if (!rulerStart) {
        setRulerStart([ix, iy])
      } else {
        const d = pxDist(rulerStart, [ix, iy])
        if (d > 5) {
          const mpp = 1.0 / d   // 1 metre over d pixels
          onAnnotationChange({ ...annotation, scaleLine: { p1: rulerStart, p2: [ix, iy] } })
          onScaleChange(Math.round(mpp * 100000) / 100000, true)
        }
        setRulerStart(null)
      }
      return
    }
  }

  const handleDblClick = () => {
    if (activeTool === 'space' && currentPoints.length >= 3) {
      const newSpace = {
        id: `space_${Date.now()}`,
        label: `Space ${annotation.spaces.length + 1}`,
        polygon: currentPoints,
      }
      onAnnotationChange({ ...annotation, spaces: [...annotation.spaces, newSpace] })
      setCurrentPoints([])
    }
    if (activeTool === 'path' && currentPoints.length >= 2) {
      onAnnotationChange({
        ...annotation,
        paths: [...(annotation.paths ?? []), { id: `path_${Date.now()}`, points: currentPoints }],
      })
      setCurrentPoints([])
    }
  }

  // ---------- preview line while drawing polygon ----------
  const previewMousePos = activeTool === 'path' ? snapPathPoint(mousePos) : mousePos
  const previewLine = previewMousePos && currentPoints.length > 0
    ? [...flatStage(currentPoints), ...toStage(previewMousePos[0], previewMousePos[1])]
    : null

  // ---------- render ----------
  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden flex items-center justify-center bg-surface">
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDblClick={handleDblClick}
        onWheel={handleWheel}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={zoomLevel}
        scaleY={zoomLevel}
        style={{
          cursor:
            activeTool === 'poi' && hoveredPoiId ? 'pointer'
            : activeTool === 'path' ? 'crosshair'
            : activeTool !== 'select' ? 'crosshair'
            : 'default',
        }}
      >
        <Layer>
          {/* Floor plan */}
          {bgImage && <KImage image={bgImage} width={stageSize.w} height={stageSize.h} />}

          {/* Spaces */}
          {annotation.spaces.map(s => {
            const [cx, cy] = centroid(s.polygon)
            const [stx, sty] = toStage(cx, cy)
            const sel = selectedItem?.type === 'spaces' && selectedItem?.id === s.id
            // Highlight space when POI tool hovers inside it
            const hovered = activeTool === 'poi' && mousePos && pointInPolygon(mousePos, s.polygon)
            return (
              <Group key={s.id}>
                <Line points={flatStage(s.polygon)} closed
                  stroke={sel ? '#fff' : hovered ? '#fbbf24' : COLORS.space.stroke}
                  strokeWidth={sel ? 2.5 : 2} fill={COLORS.space.fill} />
                {sel && <Line points={flatStage(s.polygon)} closed stroke="#fff" strokeWidth={3} opacity={0.3} dash={[6,3]} />}
                <Text x={stx - 50} y={sty - 8} width={100} text={s.label}
                  fontSize={11} fill={sel ? '#fff' : '#a5b4fc'} align="center" fontStyle="500" />
                {hovered && (
                  <Text x={stx - 40} y={sty + 6} width={80} text="Click → POI"
                    fontSize={8} fill="#fbbf24" align="center" />
                )}
              </Group>
            )
          })}

          {/* Stands */}
          {annotation.stands.map(st => {
            const [stx, sty] = toStage(st.x, st.y)
            const sw = st.w * scale * zoomLevel, sh = st.h * scale * zoomLevel
            const sel = selectedItem?.type === 'stands' && selectedItem?.id === st.id
            return (
              <Group key={st.id}>
                <Rect x={stx} y={sty} width={sw} height={sh}
                  stroke={sel ? '#fff' : COLORS.stand.stroke} strokeWidth={sel ? 2.5 : 2}
                  fill={COLORS.stand.fill} dash={[6, 3]} />
                <Text x={stx + 4} y={sty + 4} text={st.label}
                  fontSize={10} fill={sel ? '#fff' : '#fb923c'} fontStyle="500" />
              </Group>
            )
          })}

          {/* Stand live preview (between first click and second click) */}
          {standStart && mousePos && (() => {
            const [sx, sy] = standStart
            const [mx, my] = mousePos
            const rx = Math.min(sx, mx), ry = Math.min(sy, my)
            const rw = Math.abs(mx - sx), rh = Math.abs(my - sy)
            const [px, py] = toStage(rx, ry)
            return (
              <Rect
                x={px} y={py} width={rw * scale * zoomLevel} height={rh * scale * zoomLevel}
                stroke={COLORS.stand.stroke} strokeWidth={1.5}
                fill="transparent" dash={[5, 3]}
              />
            )
          })()}

          {/* First-corner anchor dot */}
          {standStart && (() => {
            const [px, py] = toStage(...standStart)
            return <Circle x={px} y={py} radius={4} fill={COLORS.stand.stroke} opacity={0.8} />
          })()}

          {/* POIs */}
          {annotation.pois.map(p => {
            const [sx, sy] = toStage(...p.position)
            const sel = selectedItem?.type === 'pois' && selectedItem?.id === p.id
            const hovered = hoveredPoiId === p.id && activeTool === 'poi'
            const role = String(p.role ?? 'poi').toLowerCase()
            const roleLabel = role === 'entry' ? 'Entry'
              : role === 'exit' ? 'Exit'
              : role === 'both' ? 'Entry + Exit'
              : 'POI'
            return (
              <Group key={p.id}>
                <Circle x={sx} y={sy} radius={sel ? 16 : hovered ? 15 : 14} fill="transparent" />
                <Circle x={sx} y={sy} radius={9} fill={COLORS.poi} opacity={hovered ? 1 : 0.9} />
                <Circle x={sx} y={sy} radius={sel ? 16 : hovered ? 15 : 14} stroke={sel ? '#fff' : COLORS.poi}
                  strokeWidth={sel ? 2 : hovered ? 2 : 1.5} opacity={sel ? 0.8 : hovered ? 0.6 : 0.3} />
                <Text x={sx + 13} y={sy - 16} text={p.label || roleLabel} fontSize={10} fill={COLORS.poi} fontStyle="bold" />
                <Text x={sx + 13} y={sy - 4} text={`${roleLabel} · ${p.dwell_time}s`} fontSize={9} fill="#fcd34d" />
              </Group>
            )
          })}

          {/* Agent paths */}
          {(annotation.paths ?? []).map((path, pathIdx) => {
            if (!path.points || path.points.length < 2) return null
            const id = path.id ?? `path_${pathIdx}`
            const pts = flatStage(path.points)
            const midIdx = Math.floor(path.points.length / 2)
            const [mx, my] = toStage(...path.points[midIdx])
            const pathColor = PATH_COLORS[pathIdx % PATH_COLORS.length]
            const sel = selectedItem?.type === 'paths' && selectedItem?.id === id
            return (
              <Group key={id}>
                <Line points={pts} stroke={sel ? '#fff' : pathColor} strokeWidth={sel ? 3.5 : 2.5} dash={[8, 4]} opacity={0.9} />
                {path.points.map(([ix, iy], i) => {
                  const [sx, sy] = toStage(ix, iy)
                  return <Circle key={i} x={sx} y={sy} radius={4} fill={sel ? '#fff' : pathColor} opacity={0.85} />
                })}
                <Rect x={mx - 26} y={my - 10} width={52} height={14} fill="#0c1521" cornerRadius={4} opacity={0.8} />
                <Text x={mx - 26} y={my - 8} width={52} text={`PATH ${pathIdx + 1}`}
                  fontSize={8} fill={sel ? '#fff' : pathColor} align="center" fontStyle="bold" />
              </Group>
            )
          })}

          {/* In-progress space polygon or path */}
          {currentPoints.length > 0 && (
            <Line
              points={flatStage(currentPoints)}
              stroke={isDrawingPath ? COLORS.path : COLORS.space.stroke}
              strokeWidth={isDrawingPath ? 2.5 : 2}
              dash={isDrawingPath ? [8, 4] : [6, 3]}
            />
          )}
          {activeTool === 'path' && previewMousePos && (
            <Circle
              x={toStage(...previewMousePos)[0]}
              y={toStage(...previewMousePos)[1]}
              radius={currentPoints.length > 0 ? 4.5 : 3.5}
              fill={COLORS.path}
              opacity={0.7}
            />
          )}
          {previewLine && (
            <Line points={previewLine}
              stroke={isDrawingPath ? `${COLORS.path}88` : 'rgba(255,255,255,0.25)'}
              strokeWidth={1.5} dash={[4, 4]} />
          )}
          {currentPoints.map(([ix, iy], i) => {
            const [sx, sy] = toStage(ix, iy)
            return <Circle key={i} x={sx} y={sy} radius={4}
              fill={isDrawingPath ? COLORS.path : 'white'} opacity={0.7} />
          })}

          {/* ── Space rectangle / circle preview ── */}
          {activeTool === 'space' && shapeStart && mousePos && (() => {
            const color = COLORS.space.stroke
            if (spaceShape === 'rectangle') {
              const [sx, sy] = shapeStart
              const [mx, my] = mousePos
              const [px, py] = toStage(Math.min(sx, mx), Math.min(sy, my))
              const pw = Math.abs(mx - sx) * scale
              const ph = Math.abs(my - sy) * scale
              return (
                <Group>
                  <Rect x={px} y={py} width={pw} height={ph}
                    stroke={color} strokeWidth={2} dash={[6,3]} fill={COLORS.space.fill} />
                  <Circle x={toStage(...shapeStart)[0]} y={toStage(...shapeStart)[1]}
                    radius={4} fill={color} opacity={0.8} />
                </Group>
              )
            } else if (spaceShape === 'circle') {
              const r = pxDist(shapeStart, mousePos)
              const [cx, cy] = toStage(...shapeStart)
              const [ex, ey] = toStage(...mousePos)
              return (
                <Group>
                  <Circle x={cx} y={cy} radius={r * scale}
                    stroke={color} strokeWidth={2} dash={[6,3]} fill={COLORS.space.fill} />
                  <Line points={[cx, cy, ex, ey]} stroke={color} strokeWidth={1} dash={[3,3]} opacity={0.5} />
                  <Circle x={cx} y={cy} radius={4} fill={color} />
                  <Rect x={cx + 4} y={cy - 12} width={50} height={14} fill="#1a1d27" cornerRadius={3} />
                  <Text x={cx + 4} y={cy - 10} width={50}
                    text={`r = ${Math.round(r)} px`} fontSize={9} fill={color} />
                </Group>
              )
            }
            return null
          })()}

          {/* ── Ruler: committed scale line ── */}
          {annotation.scaleLine && (() => {
            const [x1, y1] = toStage(...annotation.scaleLine.p1)
            const [x2, y2] = toStage(...annotation.scaleLine.p2)
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
            const d = Math.round(pxDist(annotation.scaleLine.p1, annotation.scaleLine.p2))
            return (
              <Group>
                <Line points={[x1, y1, x2, y2]} stroke={COLORS.ruler} strokeWidth={2} />
                {/* End ticks */}
                <Line points={[x1, y1 - 6, x1, y1 + 6]} stroke={COLORS.ruler} strokeWidth={2} strokeLinecap="round" />
                <Line points={[x2, y2 - 6, x2, y2 + 6]} stroke={COLORS.ruler} strokeWidth={2} strokeLinecap="round" />
                {/* Label */}
                <Rect x={mx - 22} y={my - 11} width={44} height={16} fill="#1a1d27" cornerRadius={4} />
                <Text x={mx - 22} y={my - 9} width={44} text="1 m" fontSize={10}
                  fill={COLORS.ruler} align="center" fontStyle="bold" />
                <Text x={mx - 30} y={my + 8} width={60} text={`${d} px`} fontSize={8}
                  fill="#a3a3a3" align="center" />
              </Group>
            )
          })()}

          {/* ── Ruler: live preview while drawing ── */}
          {rulerStart && mousePos && (() => {
            const [x1, y1] = toStage(...rulerStart)
            const [x2, y2] = toStage(...mousePos)
            const d = Math.round(pxDist(rulerStart, mousePos))
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
            return (
              <Group>
                <Line points={[x1, y1, x2, y2]} stroke={COLORS.ruler} strokeWidth={1.5} dash={[6, 3]} opacity={0.8} />
                <Circle x={x1} y={y1} radius={4} fill={COLORS.ruler} />
                <Rect x={mx - 26} y={my - 11} width={52} height={16} fill="#1a1d27" cornerRadius={4} />
                <Text x={mx - 26} y={my - 9} width={52} text={`${d} px = 1m`} fontSize={9}
                  fill={COLORS.ruler} align="center" />
              </Group>
            )
          })()}

          {/* Ruler first-point anchor when no mouse yet */}
          {rulerStart && !mousePos && (() => {
            const [sx, sy] = toStage(...rulerStart)
            return <Circle x={sx} y={sy} radius={5} fill={COLORS.ruler} />
          })()}
        </Layer>
      </Stage>

      {/* Empty state */}
      {!imageUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-3 opacity-40">
            <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
          </svg>
          <p className="text-sm">Upload a floor plan to start</p>
        </div>
      )}

      {/* New POI modal */}
      {poiModal && (
        <PoiModal
          poiIndex={annotation.pois.length + 1}
          defaultLabel={poiModal.defaultLabel}
          defaultRole={poiModal.defaultRole ?? 'poi'}
          onConfirm={(label, dwell, role) => {
            onAnnotationChange({
              ...annotation,
              pois: [...annotation.pois, {
                id: `poi_${Date.now()}`,
                label: label || `POI ${annotation.pois.length + 1}`,
                position: [poiModal.x, poiModal.y],
                dwell_time: dwell,
                role,
              }],
            })
            setPoiModal(null)
          }}
          onCancel={() => setPoiModal(null)}
        />
      )}

      {/* Edit existing POI modal */}
      {poiEditModal && (
        <PoiEditModal
          poi={poiEditModal}
          onSave={(label, dwell, role) => {
            onAnnotationChange({
              ...annotation,
              pois: annotation.pois.map(p =>
                p.id === poiEditModal.id ? { ...p, label, dwell_time: dwell, role } : p
              ),
            })
            setPoiEditModal(null)
          }}
          onDelete={() => {
            onAnnotationChange({
              ...annotation,
              pois: annotation.pois.filter(p => p.id !== poiEditModal.id),
            })
            setPoiEditModal(null)
          }}
          onCancel={() => setPoiEditModal(null)}
        />
      )}

      {/* ── Bottom-centre floating bar: hint + undo/redo + zoom ── */}
      {imageUrl && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-panel/90 border border-border rounded-2xl px-4 py-2 backdrop-blur-sm shadow-lg">
          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M6 7h10a4 4 0 014 4v6m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Divider */}
          <span className="w-px h-4 bg-border" />

          {/* Hint text */}
          <span className="text-xs text-slate-400 select-none">
            <HintText tool={activeTool} spaceShape={spaceShape} points={currentPoints.length} rulerStart={rulerStart} standStart={standStart} lineStart={lineStart} shapeStart={shapeStart} hoveredPoiId={hoveredPoiId} />
          </span>

          {/* Divider */}
          <span className="w-px h-4 bg-border" />

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              title="Zoom out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9.5 9.5l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="text-xs text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}
              title="Zoom in"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9.5 9.5l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 6h6M6 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => { setZoomLevel(1); setStagePos({ x: 0, y: 0 }) }}
              title="Reset zoom"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8a6 6 0 0110.83-4.1M14 8a6 6 0 01-10.83 4.1M11.5 4v3.5h-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Divider */}
          <span className="w-px h-4 bg-border" />

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M18 7H8a4 4 0 00-4 4v6m0 0l3-3m-3 3l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// Perpendicular tick marks at each end of a doorway line
function DoorTicks({ x1, y1, x2, y2, color }) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = -dy / len * 7, py = dx / len * 7   // perpendicular unit × 7px
  return (
    <>
      <Line points={[x1 + px, y1 + py, x1 - px, y1 - py]} stroke={color} strokeWidth={2.5} lineCap="round" />
      <Line points={[x2 + px, y2 + py, x2 - px, y2 - py]} stroke={color} strokeWidth={2.5} lineCap="round" />
    </>
  )
}

function HintText({ tool, spaceShape, points, rulerStart, standStart, lineStart, shapeStart, hoveredPoiId }) {
  const spaceMsg = () => {
    if (spaceShape === 'rectangle') return shapeStart ? 'Click to set the opposite corner' : 'Click to set the first corner'
    if (spaceShape === 'circle')    return shapeStart ? 'Click to set the radius' : 'Click to set the centre'
    return points === 0 ? 'Draw walkable areas where agents navigate freely' : `${points} pt${points > 1 ? 's' : ''} — double-click to close`
  }
  const msgs = {
    space: spaceMsg(),
    stand: standStart ? 'Click to set the opposite corner' : 'Click to set the first corner of the stand',
    scale: rulerStart ? 'Click to set the end of the 1 m reference line' : 'Click to set the start of the 1 m reference line',
    poi:   hoveredPoiId ? '✏️ Click to edit POI role and dwell time' : '📍 Click to place exhibition stand/activity point',
    path:  points === 0 ? 'Draw connected bidirectional paths — snap to existing segments' : `${points} pts — double-click to finish`,
  }
  return msgs[tool] ?? 'Select a tool'
}

function PoiModal({ poiIndex, defaultLabel = '', defaultRole = 'poi', onConfirm, onCancel }) {
  const [label, setLabel] = useState(defaultLabel)
  const [dwell, setDwell] = useState(15)
  const [role, setRole] = useState(defaultRole)
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
      <div className="card w-80 space-y-4">
        <h3 className="font-semibold text-white">Point of Interest</h3>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Label</label>
          <input
            autoFocus className="input text-base" value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={`e.g. POI ${poiIndex}`}
            onKeyDown={e => e.key === 'Enter' && onConfirm(label, dwell, role)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Type</label>
          <select className="input text-base" value={role} onChange={e => setRole(e.target.value)}>
            <option value="poi">POI</option>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Dwell time (seconds)</label>
          <input
            type="number" min={1} max={300} className="input text-base"
            value={dwell} onChange={e => setDwell(Number(e.target.value))}
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={() => onConfirm(label, dwell, role)} className="btn-primary">Add POI</button>
        </div>
      </div>
    </div>
  )
}

function PoiEditModal({ poi, onSave, onDelete, onCancel }) {
  const [label, setLabel] = useState(poi.label)
  const [dwell, setDwell] = useState(poi.dwell_time)
  const [role, setRole] = useState(poi.role ?? 'poi')
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
      <div className="card w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Edit POI</h3>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Label</label>
          <input
            autoFocus className="input text-base" value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSave(label, dwell, role)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Type</label>
          <select className="input text-base" value={role} onChange={e => setRole(e.target.value)}>
            <option value="poi">POI</option>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Dwell time (seconds)</label>
          <input
            type="number" min={1} max={300} className="input text-base"
            value={dwell} onChange={e => setDwell(Number(e.target.value))}
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={() => onSave(label, dwell, role)} className="btn-primary">Save</button>
        </div>
      </div>
    </div>
  )
}

function centroid(pts) {
  const n = pts.length
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
}
