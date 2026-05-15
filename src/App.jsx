import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './contexts/UserContext'
import Layout from './components/Layout'
import UserSetup from './components/UserSetup'
import Home from './pages/Home'
import Challenges from './pages/Challenges'
import Bets from './pages/Bets'
import Profile from './pages/Profile'

function AppRoutes() {
  const { currentUser, loading } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-white">NSM</span>
          <span className="w-2 h-2 rounded-full bg-[#CF101A] animate-pulse"></span>
        </div>
      </div>
    )
  }

  if (!currentUser) return <UserSetup />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/defis" element={<Challenges />} />
        <Route path="/paris" element={<Bets />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/nsm-malta">
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}
