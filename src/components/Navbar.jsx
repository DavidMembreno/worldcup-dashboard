import { useWorldCup } from '../context/WorldCupContext'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { state } = useWorldCup()

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <span className="text-2xl">⚽</span>
        <span className="font-bold text-lg tracking-tight">WC26 Dashboard</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>{state.fixtures.length} matches loaded</span>
      </div>
    </nav>
  )
}
