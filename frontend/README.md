# Pardaz Frontend

A production-grade pedestrian simulation visualization platform built with React and Vite.

## Architecture

### Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Spinner.jsx
│   │   ├── Alert.jsx
│   │   └── index.js
│   ├── layout/             # Layout components
│   │   ├── Header.jsx
│   │   ├── Container.jsx
│   │   ├── MainLayout.jsx
│   │   └── index.js
│   ├── AnnotationCanvas.jsx
│   ├── Toolbar.jsx
│   ├── HeatmapOverlay.jsx
│   ├── CentralityPanel.jsx
│   └── ErrorBoundary.jsx
├── pages/
│   ├── Setup.jsx           # Simulation configuration page
│   └── Results.jsx         # Visualization & results page
├── hooks/
│   ├── useAsync.js         # Async state management
│   └── index.js
├── utils/
│   ├── errorHandler.js     # Error parsing & formatting
│   ├── constants.js        # Shared constants
│   └── index.js
├── styles/
│   └── index.css           # Global styles & Tailwind
├── App.jsx                 # Root component
└── main.jsx                # Entry point
```

## Design System

### Color Palette
- **Surface**: `#0d1117` - Main background
- **Panel**: `#161b22` - Card/panel background
- **Border**: `#30363d` - Dividers and borders
- **Accent**: `#10b981` - Primary action color (emerald)
- **Text Primary**: `#e6edf3` - Main text
- **Text Secondary**: `#8b949e` - Secondary text
- **Text Muted**: `#6e7681` - Muted/disabled text

### Typography
- **Display**: Crimson Text (serif) - Headings
- **Body**: Fira Sans (sans-serif) - Body text
- **Mono**: IBM Plex Mono (monospace) - Code

### Component Conventions

#### Buttons
- `variant`: primary | secondary | ghost
- `size`: sm | md | lg
- `disabled`: boolean

#### Forms
- Always use `<Input />` for text inputs
- Include `label` and `error` props
- Apply validation classes automatically

#### Cards & Panels
- Use `<Card />` for elevated content
- Use `.panel` class for inline sections
- Maintain consistent padding

## Development

### Setup
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### API Integration
The frontend proxies to the backend API:
- `/api/*` → `http://localhost:8000`
- `/uploads/*` → `http://localhost:8000`
- `/heatmaps/*` → `http://localhost:8000`

See `vite.config.js` for proxy configuration.

## Best Practices

1. **Component Organization**: Keep components focused and single-responsibility
2. **State Management**: Use hooks (useState, useCallback) for local state
3. **Error Handling**: Use ErrorBoundary for component crashes; use parseError() for API errors
4. **Accessibility**: Use semantic HTML, ARIA labels, and keyboard navigation
5. **Performance**: Memoize expensive computations; lazy-load images
6. **Styling**: Use Tailwind classes; avoid inline styles except for dynamic values
7. **Documentation**: Include JSDoc comments for complex components/functions

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance Optimizations

- CSS animations for smooth transitions
- React strict mode for detecting issues
- Lazy image loading
- Code splitting via dynamic imports
