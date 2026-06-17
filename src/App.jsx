import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WorldCupProvider } from './context/WorldCupContext'
import SplashScreen from './components/SplashScreen'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MatchPage from './pages/MatchPage'
import BracketPage from './pages/BracketPage'
import TeamPage from './pages/TeamPage'
import ModelPage from './pages/ModelPage'
import AllGamesPage from './pages/AllGamesPage'
import PredictionHistoryPage from './pages/PredictionHistoryPage'
import MonteCarloPage from './pages/MonteCarloPage'
import StatsComparisonPage from './pages/StatsComparisonPage'

function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {splashDone && (
        <WorldCupProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/match/:espnId" element={<MatchPage />} />
              <Route path="/bracket" element={<BracketPage />} />
              <Route path="/team/:teamName" element={<TeamPage />} />
              <Route path="/model" element={<ModelPage />} />
              <Route path="/games" element={<AllGamesPage />} />
              <Route path="/history" element={<PredictionHistoryPage />} />
              <Route path="/montecarlo" element={<MonteCarloPage />} />
              <Route path="/compare" element={<StatsComparisonPage />} />
            </Routes>
          </BrowserRouter>
        </WorldCupProvider>
      )}
    </>
  )
}

export default App
