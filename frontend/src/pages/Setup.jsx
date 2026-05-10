import { useState, useCallback, useEffect, useMemo } from 'react'
import axios from 'axios'
import Toolbar, { RightPanel } from '../components/Toolbar'
import AnnotationCanvas from '../components/AnnotationCanvas'

function parseError(err) {
  const detail = err.response?.data?.detail
  if (!detail) return err.message || 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(e => {
      const loc = Array.isArray(e.loc) ? e.loc.join(' → ') : ''
      return loc ? `${loc}: ${e.msg}` : e.msg
    }).join(' | ')
  }
  return JSON.stringify(detail)
}

const EMPTY_ANNOTATION = {
  spaces: [],
  stands: [],
  entries: [],
  exits: [],
  pois: [],
  paths: [],       // [{points: [[x,y],...]}] — manual agent routes
  scaleLine: null,
}

const TOOL_KEY = {
  scale: 'scaleLine',
  space: 'spaces',
  stand: 'stands',
  entry: 'entries',
  exit:  'exits',
  poi:   'pois',
  path:  'paths',
}

const EMPTY_REMOVED = {
  scaleLine: [], spaces: [], stands: [], entries: [], exits: [], pois: [], paths: [],
}

export default function Setup({ onResults, initialState }) {
  const initAnnotation = initialState?.annotation ?? EMPTY_ANNOTATION
  const [imageInfo, setImageInfo]     = useState(initialState?.imageInfo ?? null)
  const [annotation, setAnnotation]   = useState(initAnnotation)
  const [removed, setRemoved]         = useState(EMPTY_REMOVED)
  const [spaceShape, setSpaceShape]   = useState('polygon')
  const [selectedItem, setSelectedItem] = useState(null)  // {type, id} | null
  const [activeTool, setActiveTool]   = useState('scale')
  const [numPeople, setNumPeople]     = useState(initialState?.numPeople ?? 30)
  const [scaleMpp, setScaleMpp]       = useState(initialState?.scaleMpp ?? 0.03)
  const [scaleMppAuto, setScaleMppAuto] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [running, setRunning]         = useState(false)
  const [error, setError]             = useState(null)

  const isReady = imageInfo &&
    annotation.spaces.length >= 1 &&
    annotation.entries.length >= 1 &&
    annotation.exits.length >= 1 &&
    annotation.pois.length >= 1

  // Normal annotation update from user drawing — clears redo for any grown key
  const updateAnnotation = useCallback((next) => {
    setAnnotation(next)
    setRemoved(prev => {
      const updated = { ...prev }
      for (const key of Object.values(TOOL_KEY)) {
        const prevLen = Array.isArray(annotation[key])
          ? annotation[key].length
          : (annotation[key] != null ? 1 : 0)
        const nextLen = Array.isArray(next[key])
          ? next[key].length
          : (next[key] != null ? 1 : 0)
        if (nextLen > prevLen) updated[key] = []   // something added → clear redo
      }
      return updated
    })
  }, [annotation])

  const handleScaleChange = useCallback((val, auto = false) => {
    setScaleMpp(val)
    setScaleMppAuto(auto)
  }, [])

  const handleItemSelect = useCallback((type, id) => {
    setSelectedItem(type && id ? { type, id } : null)
  }, [])

  const handleItemDelete = useCallback((type, id) => {
    setAnnotation(prev => {
      if (type === 'scaleLine') return { ...prev, scaleLine: null }
      return { ...prev, [type]: prev[type].filter(item => item.id !== id) }
    })
    setSelectedItem(s => (s?.type === type && s?.id === id) ? null : s)
  }, [])

  const handleItemEdit = useCallback((type, id, updates) => {
    setAnnotation(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, ...updates } : item),
    }))
  }, [])

  const handleSetAsPoi = useCallback((space) => {
    const cx = space.polygon.reduce((s, p) => s + p[0], 0) / space.polygon.length
    const cy = space.polygon.reduce((s, p) => s + p[1], 0) / space.polygon.length
    setAnnotation(prev => {
      const next = {
        ...prev,
        pois: [...prev.pois, {
          id: `poi_${Date.now()}`,
          label: space.label,
          position: [cx, cy],
          dwell_time: 15,
        }],
      }
      return next
    })
  }, [])

  // Tool-specific undo: remove the last item added by the current tool
  const undo = useCallback(() => {
    const key = TOOL_KEY[activeTool]
    if (!key) return
    setAnnotation(prev => {
      if (key === 'scaleLine') {
        if (!prev.scaleLine) return prev
        setRemoved(r => ({ ...r, scaleLine: [...r.scaleLine, prev.scaleLine] }))
        return { ...prev, scaleLine: null }
      }
      if (!prev[key].length) return prev
      const last = prev[key][prev[key].length - 1]
      setRemoved(r => ({ ...r, [key]: [...r[key], last] }))
      return { ...prev, [key]: prev[key].slice(0, -1) }
    })
  }, [activeTool])

  // Tool-specific redo: re-add the last item removed by the current tool
  const redo = useCallback(() => {
    const key = TOOL_KEY[activeTool]
    if (!key) return
    setRemoved(prev => {
      const stack = prev[key]
      if (!stack.length) return prev
      const item = stack[stack.length - 1]
      setAnnotation(ann => {
        if (key === 'scaleLine') return { ...ann, scaleLine: item }
        return { ...ann, [key]: [...ann[key], item] }
      })
      return { ...prev, [key]: stack.slice(0, -1) }
    })
  }, [activeTool])

  const canUndo = useMemo(() => {
    const key = TOOL_KEY[activeTool]
    if (!key) return false
    if (key === 'scaleLine') return annotation.scaleLine != null
    return (annotation[key]?.length ?? 0) > 0
  }, [activeTool, annotation])

  const canRedo = useMemo(() => {
    const key = TOOL_KEY[activeTool]
    if (!key) return false
    return (removed[key]?.length ?? 0) > 0
  }, [activeTool, removed])

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const editing = tag === 'INPUT' || tag === 'TEXTAREA'
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editing && selectedItem) {
        e.preventDefault()
        handleItemDelete(selectedItem.type, selectedItem.id)
      }
      if (e.key === 'Escape') setSelectedItem(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectedItem, handleItemDelete])

  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0] ?? e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post('/api/upload', fd)
      setImageInfo({ filename: data.filename, url: data.image_url, width: data.width, height: data.height })
      setAnnotation(EMPTY_ANNOTATION)
      setRemoved(EMPTY_REMOVED)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setUploading(false)
    }
  }, [])

  const handleRun = async () => {
    if (!isReady) return
    setRunning(true)
    setError(null)
    try {
      const payload = {
        image_filename: imageInfo.filename,
        image_width: imageInfo.width,
        image_height: imageInfo.height,
        scale_mpp: scaleMpp,
        spaces: annotation.spaces,
        entries: annotation.entries,
        exits: annotation.exits,
        pois: annotation.pois,
        paths: annotation.paths ?? [],
        num_people: numPeople,
      }
      const { data } = await axios.post('/api/simulate', payload)
      onResults(data, { imageInfo, annotation, scaleMpp, numPeople })
    } catch (err) {
      setError(parseError(err))
    } finally {
      setRunning(false)
    }
  }

  const handleClear = () => {
    setAnnotation(EMPTY_ANNOTATION)
    setRemoved(EMPTY_REMOVED)
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-11 flex-shrink-0 flex items-center px-4 gap-3 border-b border-border bg-panel">
        <span className="text-sm font-semibold text-accent">Setup</span>
        <span className="text-slate-600 text-sm">→</span>
        <span className="text-sm text-slate-500">Annotate your floor plan, then run the simulation</span>

        <label className="ml-auto btn-ghost cursor-pointer flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v9M4 5l4-4 4 4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {uploading ? 'Uploading…' : 'Upload Floor Plan'}
          <input type="file" accept=".png,.jpg,.jpeg,.dwg,.dxf" className="hidden" onChange={handleFileDrop} />
        </label>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — draw tools */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          spaceShape={spaceShape}
          onSpaceShapeChange={setSpaceShape}
          annotation={annotation}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {!imageInfo ? (
            <div
              onDrop={handleFileDrop}
              onDragOver={e => e.preventDefault()}
              className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border m-6 rounded-2xl cursor-pointer hover:border-accent/50 transition-colors"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v13M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="text-center">
                <p className="text-slate-300 font-medium">Drop your floor plan here</p>
                <p className="text-slate-500 text-sm mt-1">PNG, JPG, DWG or DXF</p>
              </div>
              <label className="btn-primary cursor-pointer">
                Browse file
                <input type="file" accept=".png,.jpg,.jpeg,.dwg,.dxf" className="hidden" onChange={handleFileDrop} />
              </label>
            </div>
          ) : (
            <AnnotationCanvas
              imageUrl={imageInfo.url}
              imageNativeW={imageInfo.width}
              imageNativeH={imageInfo.height}
              activeTool={activeTool}
              spaceShape={spaceShape}
              annotation={annotation}
              onAnnotationChange={updateAnnotation}
              onScaleChange={handleScaleChange}
              onItemSelect={handleItemSelect}
              selectedItem={selectedItem}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          )}

          {error && (
            <div className="mx-4 mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </main>

        {/* Right — parameters + run */}
        <RightPanel
          numPeople={numPeople}
          onNumPeopleChange={setNumPeople}
          scaleMpp={Number(scaleMpp.toFixed(5))}
          scaleMppAuto={scaleMppAuto}
          onScaleMppChange={handleScaleChange}
          annotation={annotation}
          selectedItem={selectedItem}
          onItemSelect={handleItemSelect}
          onItemDelete={handleItemDelete}
          onItemEdit={handleItemEdit}
          onSetAsPoi={handleSetAsPoi}
          onClear={handleClear}
          onRun={handleRun}
          running={running}
          ready={isReady}
        />
      </div>
    </div>
  )
}
