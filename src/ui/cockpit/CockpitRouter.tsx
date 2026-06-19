import { useGame } from '../../store/gameStore'
import SetupScreen from './SetupScreen'
import DistributionScreen from './DistributionScreen'
import NightScreen from './NightScreen'
import DayScreen from './DayScreen'
import EndScreen from './EndScreen'
import StatusBar from './StatusBar'

export default function CockpitRouter() {
  const { state, reset } = useGame()

  if (!state || state.phase === 'setup') return <SetupScreen />
  if (state.phase === 'ended') return <EndScreen />

  const handleAbandon = () => {
    if (window.confirm('Abandonner la partie en cours et revenir à l\'accueil ?')) reset()
  }

  return (
    <div>
      <StatusBar />
      <div className="max-w-lg mx-auto px-4 pt-2 flex justify-end">
        <button
          onClick={handleAbandon}
          className="text-xs text-hud-muted hover:text-hud-red transition-colors border border-hud-border hover:border-hud-red px-2 py-1 rounded-sm"
        >
          × Abandonner
        </button>
      </div>
      {state.phase === 'distribution' && <DistributionScreen />}
      {state.phase === 'night'        && <NightScreen />}
      {state.phase === 'day'          && <DayScreen />}
    </div>
  )
}
