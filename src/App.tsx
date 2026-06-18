import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { decodeToken } from './engine'
import PlayerCard from './ui/player/PlayerCard'
import CockpitRouter from './ui/cockpit/CockpitRouter'
import ReferencePage from './ui/reference/ReferencePage'

export default function App() {
  const location = useLocation()
  const [tokenData, setTokenData] = useState<ReturnType<typeof decodeToken>>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) setTokenData(decodeToken(hash))
    else setTokenData(null)
  }, [location.hash])

  // Priorité 1 : hash présent → carte joueur
  if (tokenData) return <PlayerCard token={tokenData} />

  return (
    <Routes>
      <Route path="/odb" element={<CockpitRouter />} />
      <Route path="/*" element={<ReferencePage />} />
    </Routes>
  )
}
