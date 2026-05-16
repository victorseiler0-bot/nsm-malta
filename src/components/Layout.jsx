import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  {
    to: '/',
    label: 'Classement',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#CF101A' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/defis',
    label: 'Défis',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#CF101A' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    to: '/paris',
    label: 'Paris',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#CF101A' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    to: '/profil',
    label: 'Profil',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#CF101A' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => { localStorage.removeItem('nsm_uid'); window.location.reload() }}
          className="flex items-center gap-1.5 active:opacity-60 transition-opacity"
        >
          <span className="text-xl font-black text-white tracking-tight">NSM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#CF101A]"></span>
        </button>
        <span className="text-[#CF101A] text-xs font-medium tracking-widest uppercase">Malta</span>
      </header>

      <main className="flex-1 pb-safe overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d]/98 backdrop-blur border-t border-[#1a1a1a] z-20 safe-area-inset-bottom">
        <div className="flex">
          {tabs.map((tab) => {
            const active = pathname === tab.to
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 active:opacity-70 transition-opacity"
              >
                {tab.icon(active)}
                <span className={`text-[10px] font-medium ${active ? 'text-[#CF101A]' : 'text-[#666]'}`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </div>
        <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </div>
  )
}
