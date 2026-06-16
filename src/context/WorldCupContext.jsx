import { createContext, useContext, useReducer, useEffect } from 'react'
import { getAllFixtures } from '../api/espn'
import predictionsData from '../ml/predictions.json'
import historyData from '../ml/prediction_history.json'

const WorldCupContext = createContext(null)

const initialState = {
  fixtures: [],
  matchCache: {},
  predictions: predictionsData,
  loading: true,
  error: null,
  viewMode: 'horizontal',
  predictionHistory: historyData,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIXTURES':
      return { ...state, fixtures: action.payload }
    case 'SET_MATCH_CACHE':
      return { ...state, matchCache: { ...state.matchCache, [action.fixtureId]: action.payload } }
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'TOGGLE_VIEW_MODE':
      return { ...state, viewMode: state.viewMode === 'horizontal' ? 'vertical' : 'horizontal' }
    default:
      return state
  }
}

export function WorldCupProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    async function loadInitialData() {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const fixtures = await getAllFixtures()
        dispatch({ type: 'SET_FIXTURES', payload: fixtures })
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    loadInitialData()
  }, [])

  return (
    <WorldCupContext.Provider value={{ state, dispatch }}>
      {children}
    </WorldCupContext.Provider>
  )
}

export function useWorldCup() {
  const ctx = useContext(WorldCupContext)
  if (!ctx) throw new Error('useWorldCup must be used inside WorldCupProvider')
  return ctx
}
