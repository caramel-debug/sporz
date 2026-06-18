import { useGame } from '../../store/gameStore'
import SetupScreen from './SetupScreen'
import DistributionScreen from './DistributionScreen'
import NightScreen from './NightScreen'
import DayScreen from './DayScreen'
import EndScreen from './EndScreen'

export default function CockpitRouter() {
  const { state } = useGame()

  if (!state || state.phase === 'setup') return <SetupScreen />
  if (state.phase === 'distribution')   return <DistributionScreen />
  if (state.phase === 'night')          return <NightScreen />
  if (state.phase === 'day')            return <DayScreen />
  if (state.phase === 'ended')          return <EndScreen />
  return <SetupScreen />
}
