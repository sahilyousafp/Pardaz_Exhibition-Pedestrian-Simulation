const TOOLS = [
  {
    id: 'scale',
    label: 'Scale',
    color: '#facc15',
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
    id: 'entry',
    label: 'Entry',
    color: '#22c55e',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v8M7 9l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    hint: 'Click two points to draw an entry doorway line. Multiple entries allowed.',
    description: 'Mark where agents spawn into the space. Distribute agents along the entry line length.',
  },
  {
    id: 'exit',
    label: 'Exit',
    color: '#ef4444',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 14V6M7 11l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    hint: 'Click two points to draw an exit doorway line. Multiple exits allowed.',
    description: 'Mark where agents leave the space. Required for simulation completion.',
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
    description: 'Mark exhibition stands/activity points where agents pause (e.g., 15 sec per booth). Agents auto-route to POIs. Dwell time creates heatmap intensity.',
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
    hint: 'Click to draw the agent route. Double-click to finish. Overrides automatic routing.',
    description: 'Define guided visitor routes (tours, one-way flows). Optional—forces agents to follow waypoint sequence instead of free navigation through spaces.',
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
    <aside className="w-56 flex-shrink-0 flex flex-col gap-4 py-4 px-3 bg-panel border-r border-border overflow-y-auto">
      {/* Brand */}
      <div className="px-1 mb-1">
        <h1 className="text-base font-semibold text-white tracking-tight">Pardaz</h1>
        <p className="text-xs text-slate-500">Social Simulation</p>
      </div>

      {/* Tools */}
      <div>
        <p className="label px-1 mb-2">Draw Tools</p>
        <div className="flex flex-col gap-1">
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.hint}
              onClick={() => onToolChange(t.id)}
              className={`tool-btn flex-row justify-start gap-2 ${activeTool === t.id ? 'active' : ''}`}
            >
              <span style={{ color: activeTool === t.id ? t.color : undefined }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Space shape sub-selector — only shown when Space is active */}
      {activeTool === 'space' && (
        <div className="bg-surface rounded-xl p-2 border border-border">
          <p className="label mb-2 px-1">Space Shape</p>
          <div className="flex gap-1">
            {SPACE_SHAPES.map(s => (
              <button
                key={s.id}
                title={s.hint}
                onClick={() => onSpaceShapeChange(s.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                  spaceShape === s.id
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'border-transparent text-slate-500 hover:text-white hover:bg-panel'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 px-1 leading-tight">
            {SPACE_SHAPES.find(s => s.id === spaceShape)?.hint}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="card text-xs text-slate-400 space-y-1.5">
        <p className="label mb-1">Legend</p>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#6c63ff]/40 border border-[#6c63ff] flex-shrink-0" /> Spaces</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#f97316]/30 border border-[#f97316] border-dashed flex-shrink-0" /> Stands</div>
        <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-[#22c55e] flex-shrink-0 rounded" /> Entry line</div>
        <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-[#ef4444] flex-shrink-0 rounded" /> Exit line</div>
        <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-[#38bdf8] flex-shrink-0 rounded" style={{borderTop:'2px dashed #38bdf8',height:0}} /> Agent path</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b] flex-shrink-0" /> POI</div>
      </div>

    </aside>
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
    <aside className="w-56 flex-shrink-0 flex flex-col gap-4 py-4 px-3 bg-panel border-l border-border overflow-y-auto">
      <p className="label px-1">Parameters</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">People count</label>
          <input type="number" min={1} max={500} value={numPeople}
            onChange={e => onNumPeopleChange(Number(e.target.value))} className="input" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Scale (m/px)</label>
            {scaleMppAuto && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                from ruler
              </span>
            )}
          </div>
          <input type="number" min={0.001} max={1} step={0.0001} value={scaleMpp}
            onChange={e => onScaleMppChange(Number(e.target.value), false)} className="input" />
        </div>
      </div>

      {/* Annotation status */}
      <div className="card text-xs space-y-1.5">
        <p className="label mb-1">Annotation</p>
        <StatusRow label="Spaces"  count={annotation.spaces.length}          required={1} />
        <StatusRow label="Stands"  count={annotation.stands?.length ?? 0}    required={0} />
        <StatusRow label="Entries" count={annotation.entries.length}          required={1} />
        <StatusRow label="Exits"   count={annotation.exits.length}            required={1} />
        <StatusRow label="POIs"    count={annotation.pois.length}             required={1} />
        <StatusRow label="Paths"   count={annotation.paths?.length ?? 0}       required={0} />
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

      {/* Design Guide */}
      <div className="card text-xs space-y-2.5 bg-blue-500/5 border border-blue-500/20">
        <details className="cursor-pointer group">
          <summary className="label mb-1.5 cursor-pointer flex items-center gap-2 hover:text-blue-400 transition-colors">
            <span>📋 Design Guide</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-open:rotate-180 transition-transform">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="space-y-2 text-slate-400 pt-1.5 border-t border-blue-500/20">
            <div>
              <p className="font-medium text-blue-300 mb-0.5">1️⃣ Draw Zones</p>
              <p className="text-[10px] leading-relaxed">Mark walkable areas (corridors, galleries). Agents navigate freely within zones with collision avoidance.</p>
            </div>
            <div>
              <p className="font-medium text-yellow-300 mb-0.5">2️⃣ Place POIs (optional)</p>
              <p className="text-[10px] leading-relaxed">Mark exhibition stands. Set dwell time (how long agents stay). POIs create heatmap intensity.</p>
            </div>
            <div>
              <p className="font-medium text-cyan-300 mb-0.5">3️⃣ Add Paths (optional)</p>
              <p className="text-[10px] leading-relaxed">For guided visitor routes (tours). Forces agents to follow waypoints instead of free navigation.</p>
            </div>
            <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-700">💡 Most simulations use Zones + POIs. Paths are for directed flows.</p>
          </div>
        </details>
      </div>

      <div className="mt-auto space-y-2">
        <button onClick={onClear} className="btn-ghost w-full text-center">Clear all</button>
        <button onClick={onRun} disabled={!ready || running} className="btn-primary w-full">
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
              </svg>
              Simulating…
            </span>
          ) : 'Run Simulation'}
        </button>
      </div>
    </aside>
  )
}

function StatusRow({ label, count, required }) {
  const ok = count >= required
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={ok ? 'text-green-400' : 'text-slate-600'}>{count} {ok ? '✓' : '—'}</span>
    </div>
  )
}

// ─── Annotation list ────────────────────────────────────────────────────────

import { useState as useLocalState } from 'react'

const SECTION_META = {
  spaces:  { label: 'Spaces',  color: '#6c63ff', canEdit: true,  canSetPoi: true  },
  stands:  { label: 'Stands',  color: '#f97316', canEdit: true,  canSetPoi: false },
  entries: { label: 'Entries', color: '#22c55e', canEdit: false, canSetPoi: false },
  exits:   { label: 'Exits',   color: '#ef4444', canEdit: false, canSetPoi: false },
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
    <div className="space-y-2">
      <p className="label">Annotation Items</p>
      {sections.map(({ key, meta, arr }) => (
        <div key={key}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{meta.label}</span>
          </div>
          <div className="space-y-1">
            {arr.map((item, idx) => {
              const id = item.id ?? `${key}_${idx}`
              const sel = selectedItem?.type === key && selectedItem?.id === id
              const editing = editingId === id
              const label = item.label ?? item.points
                ? (item.label || `${meta.label} ${idx + 1}`)
                : `${meta.label} ${idx + 1}`
              const sub = key === 'pois' ? `${item.dwell_time}s dwell`
                : key === 'paths' ? `${item.points?.length} pts`
                : key === 'entries' || key === 'exits' ? 'doorway line'
                : ''

              return (
                <div key={id}
                  onClick={() => onSelect(key, id)}
                  className={`rounded-lg px-2 py-1.5 cursor-pointer transition-all text-xs ${
                    sel ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'
                  }`}
                >
                  {editing ? (
                    <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                      <input autoFocus className="input text-xs py-1 px-2" value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && commitEdit(key, id)} />
                      {key === 'pois' && (
                        <input type="number" className="input text-xs py-1 px-2" value={editDwell}
                          onChange={e => setEditDwell(Number(e.target.value))} placeholder="Dwell (s)" />
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => commitEdit(key, id)}
                          className="flex-1 text-[10px] py-1 rounded bg-accent/20 text-accent hover:bg-accent/30">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 text-[10px] py-1 rounded bg-surface text-slate-400 hover:text-white">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 truncate font-medium leading-tight">{label}</p>
                        {sub && <p className="text-slate-600 text-[9px]">{sub}</p>}
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {meta.canSetPoi && (
                          <button onClick={() => onSetAsPoi(item)}
                            title="Set as POI"
                            className="px-1.5 py-0.5 rounded text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30 font-medium">
                            POI
                          </button>
                        )}
                        {meta.canEdit && (
                          <button onClick={() => startEdit(item, key)}
                            className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/10">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M8 2l2 2-6 6H2V8l6-6z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                            </svg>
                          </button>
                        )}
                        <button onClick={() => onDelete(key, id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 3h8M5 3V2h2v1M4 3l.5 7h3L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
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
      <p className="text-[10px] text-slate-600 text-center">Click item or canvas to select · Del to delete</p>
    </div>
  )
}
