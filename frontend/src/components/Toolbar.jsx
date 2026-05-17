import { useState as useLocalState } from 'react'

const TOOLS = [
  {
    id: 'scale',
    label: 'Scale',
    color: '#0071e3',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 7v6M17 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 8.5v3M12 8.5v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
    hint: 'Click two points to define 1 m — sets the scale automatically.',
    description: 'Calibrate the image scale so all measurements are accurate.',
  },
  {
    id: 'stand',
    label: 'Stand',
    color: '#f97316',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="6" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
        <path d="M3 10h14" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    ),
    hint: 'Click & drag to draw an exhibition stand rectangle.',
    description: 'Mark exhibition booth footprints (optional visual annotation).',
  },
  {
    id: 'space',
    label: 'Space',
    color: '#6c63ff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M3 7h14M7 3v14" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    ),
    hint: 'Click to draw a space polygon. Double-click to close.',
    description: 'Define walkable areas (corridors, galleries, restrooms). Agents navigate freely within spaces with collision avoidance.',
  },
  {
    id: 'poi',
    label: 'POI',
    color: '#f59e0b',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 12v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="8" r="1.5" fill="currentColor" />
      </svg>
    ),
    hint: 'Click to place a Point of Interest.',
    description: 'Mark exhibition stands/activity points where agents pause (e.g., 15 sec per booth). You can also convert a space into a POI, Entry, Exit, or Both.',
  },
  {
    id: 'path',
    label: 'Path',
    color: '#38bdf8',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 16 C6 16 6 4 10 4 C14 4 14 16 17 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="3" cy="16" r="2" fill="currentColor" opacity="0.7"/>
        <circle cx="10" cy="4" r="2" fill="currentColor" opacity="0.7"/>
        <circle cx="17" cy="16" r="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
    hint: 'Click to place connected path points. Snaps to existing paths. Double-click to finish.',
    description: 'Define guided visitor routes as a bidirectional path network. Paths snap to other paths so the route graph stays connected.',
  },
]

const SPACE_SHAPES = [
  {
    id: 'polygon',
    label: 'Polygon',
    hint: 'Click vertices, double-click to close',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 6V11L8 14L2 11V6L8 2Z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    hint: 'Click two opposite corners',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    hint: 'Click centre, then drag to set radius',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      </svg>
    ),
  },
]

export default function Toolbar({ activeTool, onToolChange, spaceShape, onSpaceShapeChange, annotation }) {
  return (
    <div className="absolute top-6 left-6 bottom-6 w-60 z-20 flex flex-col gap-4 pointer-events-none">
      <aside className="flex flex-col gap-6 py-6 px-5 glass rounded-[32px] overflow-y-auto pointer-events-auto shadow-2xl border-white/40">
        {/* Brand */}
        <div className="px-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            PardazCore<span className="text-accent">.</span>
          </h1>
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-[0.05em] mt-0.5">Social Engine</p>
        </div>

        {/* Tools */}
        <div className="space-y-3">
          <p className="label ml-1">Tools</p>
          <div className="grid grid-cols-1 gap-2">
            {TOOLS.map(t => (
              <button
                key={t.id}
                title={t.hint}
                onClick={() => onToolChange(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                  activeTool === t.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/25 scale-[1.02]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary dark:hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{t.icon}</span>
                <span className="font-semibold text-sm tracking-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Space shape sub-selector — only shown when Space is active */}
        {activeTool === 'space' && (
          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-2 animate-fadeIn">
            <p className="label mb-2 px-1 text-[10px]">Geometry</p>
            <div className="flex gap-1">
              {SPACE_SHAPES.map(s => (
                <button
                  key={s.id}
                  title={s.hint}
                  onClick={() => onSpaceShapeChange(s.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    spaceShape === s.id
                      ? 'bg-white dark:bg-white/10 text-accent shadow-sm'
                      : 'text-secondary hover:text-primary dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 text-[11px] text-secondary space-y-3">
          <p className="label text-[9px] mb-1 opacity-60">Visual Guide</p>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#6c63ff]/20 border border-[#6c63ff]/40 flex-shrink-0" />
            <span className="font-medium">Navigable Zones</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-sm border border-[#f97316] border-dashed flex-shrink-0" />
            <span className="font-medium">Booth Marks</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-0.5 bg-[#38bdf8] flex-shrink-0 rounded" style={{borderTop:'1.5px dashed #38bdf8',height:0}} />
            <span className="font-medium">Visitor Routes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b] flex-shrink-0" />
            <span className="font-medium">Interest Points</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

export function RightPanel({
  numPeople, onNumPeopleChange,
  scaleMpp, scaleMppAuto, onScaleMppChange,
  annotation,
  selectedItem, onItemSelect, onItemDelete, onItemEdit, onSetAsPoi,
  onClear, onRun, running, ready,
}) {
  return (
    <div className="absolute top-6 right-6 bottom-6 w-64 z-20 flex flex-col gap-4 pointer-events-none">
      <aside className="flex flex-col gap-6 py-6 px-5 glass rounded-[32px] overflow-y-auto pointer-events-auto shadow-2xl border-white/40">
        <p className="label ml-1">Configuration</p>

        <div className="space-y-5 px-1">
          <div>
            <label className="label text-[10px]">People density</label>
            <div className="relative">
              <input type="number" min={1} max={500} value={numPeople}
                onChange={e => onNumPeopleChange(Number(e.target.value))}
                className="input" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-secondary pointer-events-none">AGENTS</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label text-[10px]">Scale (m/px)</label>
              {scaleMppAuto && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-white scale-90">
                  AUTO
                </span>
              )}
            </div>
            <div className="relative">
              <input type="number" min={0.001} max={1} step={0.0001} value={scaleMpp}
                onChange={e => onScaleMppChange(Number(scaleMpp.toFixed(5)), false)}
                className="input" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-secondary pointer-events-none">M/PX</div>
            </div>
          </div>
        </div>

        {/* Annotation status */}
        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 text-[11px] space-y-2.5">
          <p className="label text-[9px] mb-1 opacity-60">System Check</p>
          <StatusRow label="Walkable Zones"  count={annotation.spaces.length}          required={1} />
          <StatusRow label="Booth Marks"  count={annotation.stands?.length ?? 0}    required={0} />
          <StatusRow
            label="Entry Points"
            count={annotation.entries.length + (annotation.pois ?? []).filter(p => {
              const role = String(p.role ?? 'poi').toLowerCase()
              return role === 'entry' || role === 'both'
            }).length}
            required={1}
          />
          <StatusRow
            label="Exit Points"
            count={annotation.exits.length + (annotation.pois ?? []).filter(p => {
              const role = String(p.role ?? 'poi').toLowerCase()
              return role === 'exit' || role === 'both'
            }).length}
            required={1}
          />
          <StatusRow label="Target POIs"    count={annotation.pois.length}             required={1} />
        </div>

        {/* Annotation list */}
        <AnnotationList
          annotation={annotation}
          selectedItem={selectedItem}
          onSelect={onItemSelect}
          onDelete={onItemDelete}
          onEdit={onItemEdit}
          onSetAsPoi={onSetAsPoi}
        />

        <div className="mt-auto pt-4 space-y-3">
          <button
            onClick={onClear}
            className="w-full text-center text-[11px] font-bold text-secondary hover:text-red-500 dark:hover:text-red-400 transition-colors py-2 uppercase tracking-wider"
          >
            Clear Design
          </button>
          <button
            onClick={onRun}
            disabled={!ready || running}
            className="btn btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-accent/20 disabled:shadow-none"
          >
            {running ? (
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing</span>
              </div>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                Simulate
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        </div>
      </aside>
    </div>
  )
}

function StatusRow({ label, count, required }) {
  const ok = count >= required
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-secondary">{label}</span>
      <span className={`font-bold tabular-nums ${ok ? 'text-accent' : 'text-secondary/40'}`}>
        {count}
      </span>
    </div>
  )
}

const SECTION_META = {
  spaces:  { label: 'Spaces',  color: '#6c63ff', canEdit: true,  canSetPoi: true  },
  stands:  { label: 'Stands',  color: '#f97316', canEdit: true,  canSetPoi: false },
  pois:    { label: 'POIs',    color: '#f59e0b', canEdit: true,  canSetPoi: false },
  paths:   { label: 'Paths',   color: '#38bdf8', canEdit: false, canSetPoi: false },
}

function AnnotationList({ annotation, selectedItem, onSelect, onDelete, onEdit, onSetAsPoi }) {
  const [editingId, setEditingId] = useLocalState(null)
  const [editLabel, setEditLabel] = useLocalState('')
  const [editDwell, setEditDwell] = useLocalState(15)

  const startEdit = (item, type) => {
    setEditingId(item.id)
    setEditLabel(item.label ?? '')
    setEditDwell(item.dwell_time ?? 15)
  }

  const commitEdit = (type, id) => {
    const updates = { label: editLabel }
    if (type === 'pois') updates.dwell_time = editDwell
    onEdit(type, id, updates)
    setEditingId(null)
  }

  const sections = Object.entries(SECTION_META).map(([key, meta]) => {
    const items = annotation[key]
    if (!items || (Array.isArray(items) && items.length === 0)) return null
    const arr = Array.isArray(items) ? items : [items]
    return { key, meta, arr }
  }).filter(Boolean)

  if (sections.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="label ml-1">Elements</p>
      <div className="space-y-4">
        {sections.map(({ key, meta, arr }) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{meta.label}</span>
            </div>
            <div className="space-y-1">
              {arr.map((item, idx) => {
                const id = item.id ?? `${key}_${idx}`
                const sel = selectedItem?.type === key && selectedItem?.id === id
                const editing = editingId === id
                const role = String(item.role ?? 'poi').toLowerCase()
                const roleLabel = role === 'entry' ? 'Entry'
                  : role === 'exit' ? 'Exit'
                  : role === 'both' ? 'Entry/Exit'
                  : 'POI'
                const label = item.label ?? (item.points
                  ? (item.label || `${meta.label} ${idx + 1}`)
                  : `${meta.label} ${idx + 1}`)
                const sub = key === 'pois' ? `${roleLabel} · ${item.dwell_time}s`
                  : key === 'paths' ? `${item.points?.length} pts`
                  : ''

                return (
                  <div key={id}
                    onClick={() => onSelect(key, id)}
                    className={`group rounded-xl px-3 py-2 cursor-pointer transition-all duration-300 border ${
                      sel ? 'bg-white dark:bg-white/10 shadow-sm border-black/5 dark:border-white/10 scale-[1.02]' : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    {editing ? (
                      <div className="space-y-2" onClick={e => e.stopPropagation()}>
                        <input autoFocus className="input text-xs py-1.5 px-3" value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && commitEdit(key, id)} />
                        {key === 'pois' && (
                          <input type="number" className="input text-xs py-1.5 px-3" value={editDwell}
                            onChange={e => setEditDwell(Number(e.target.value))} placeholder="Dwell (s)" />
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => commitEdit(key, id)}
                            className="btn btn-primary flex-1 text-[10px] py-1.5">Save</button>
                          <button onClick={() => setEditingId(null)}
                            className="btn btn-secondary flex-1 text-[10px] py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-primary truncate font-semibold text-[13px]">{label}</p>
                          {sub && <p className="text-secondary text-[10px] font-medium">{sub}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {meta.canSetPoi && (
                            <button onClick={() => onSetAsPoi(item)}
                              title="Set as POI"
                              className="px-2 py-0.5 rounded-full text-[9px] bg-accent/10 text-accent font-bold">
                              POI
                            </button>
                          )}
                          {meta.canEdit && (
                            <button onClick={() => startEdit(item, key)}
                              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-black/5">
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M10 2l4 4-8 8H2v-4l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                          <button onClick={() => onDelete(key, id)}
                            className="p-1.5 rounded-lg text-secondary hover:text-red-500 hover:bg-red-500/10">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M3 3h10M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1M4 3l.5 11h7.5l.5-11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
