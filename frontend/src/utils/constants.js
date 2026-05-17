export const EMPTY_ANNOTATION = {
  spaces: [],
  stands: [],
  entries: [],
  exits: [],
  pois: [],
  paths: [],
  scaleLine: null,
}

export const TOOL_KEY = {
  scale: 'scaleLine',
  space: 'spaces',
  stand: 'stands',
  entry: 'entries',
  exit: 'exits',
  poi: 'pois',
  path: 'paths',
}

export const EMPTY_REMOVED = {
  scaleLine: [],
  spaces: [],
  stands: [],
  entries: [],
  exits: [],
  pois: [],
  paths: [],
}

export const POI_ROLES = ['poi', 'entry', 'exit', 'both']

export const TOOLS = [
  { id: 'scale', label: 'Scale', icon: '📏' },
  { id: 'space', label: 'Space', icon: '📐' },
  { id: 'stand', label: 'Stand', icon: '🎯' },
  { id: 'entry', label: 'Entry', icon: '📍' },
  { id: 'exit', label: 'Exit', icon: '🚪' },
  { id: 'poi', label: 'POI', icon: '🏢' },
  { id: 'path', label: 'Path', icon: '🛤️' },
]
