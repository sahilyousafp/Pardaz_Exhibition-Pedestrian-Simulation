import { useState } from 'react'
import Setup from './pages/Setup'
import Results from './pages/Results'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './hooks/useTheme'

export default function App() {
  const [results, setResults] = useState(null)
  const [setupState, setSetupState] = useState(null)

  const handleResults = (data, state) => {
    setResults(data)
    setSetupState(state)
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {results
          ? <Results results={results} setupState={setupState} onBack={() => setResults(null)} />
          : <Setup onResults={handleResults} initialState={setupState} />
        }
      </ErrorBoundary>
    </ThemeProvider>
  )
}

