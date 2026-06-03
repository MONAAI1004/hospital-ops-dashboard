import {
  Activity,
  BedDouble,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Stethoscope,
  Sun,
  Users,
} from 'lucide-react'
import { shiftInfo } from '../../data/mockHospitalData'
import { useTheme } from '../../context/ThemeContext'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { fetchCurrentProfile, type Profile } from '../../services/profiles'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true, view: 'dashboard' },
  { label: 'Patients', icon: BedDouble, active: false },
  { label: 'Admissions', icon: Users, active: false },
  { label: 'Requests', icon: ClipboardList, active: false },
  { label: 'Clinical Flow', icon: Stethoscope, active: false },
  { label: 'Analytics', icon: Activity, active: false },
]

interface SideBarProps {
  currentView: 'dashboard' | 'settings'
  onViewChange: (view: 'dashboard' | 'settings') => void
}

export default function SideBar({ currentView, onViewChange }: SideBarProps) {
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    fetchCurrentProfile()
      .then(setProfile)
      .catch(console.error)
  }, [])

  return (
    <aside className="group fixed left-0 top-0 z-50 flex h-screen w-20 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-[width,box-shadow] duration-300 hover:w-72 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200 dark:shadow-violet-950">
          <Stethoscope className="size-5 text-white" strokeWidth={2} />
        </div>

        <div className="min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <h1 className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {profile?.brandName ?? shiftInfo.brandName}
          </h1>
          <p className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
            {profile?.hospitalName ?? shiftInfo.hospitalName}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:block dark:text-slate-500">
            Navigation
          </p>

          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.label}
              onClick={() => onViewChange(item.view as 'dashboard')}
              className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                currentView === item.view && item.label === 'Overview' && item.active
                  ? 'bg-violet-50 font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={2} />

              <span className="overflow-hidden text-ellipsis whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          title="Settings"
          onClick={() => onViewChange('settings')}
          className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-sm transition-colors ${
            currentView === 'settings'
              ? 'bg-violet-50 font-semibold text-violet-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings className="size-5 shrink-0" strokeWidth={2} />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Settings
          </span>
        </button>

        <div className="mt-3 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 group-hover:block dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            User
          </p>

          <div className="mt-1 overflow-x-auto whitespace-nowrap">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {profile?.displayName ?? shiftInfo.shiftLead}
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile?.roleTitle ?? shiftInfo.shiftDescription}
            </p>
          </div>
        </div>

        <div className="mt-3 hidden grid-cols-2 rounded-lg border border-slate-200 group-hover:grid dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center border-r border-slate-200 py-2 transition-colors dark:border-slate-800 ${
              theme === 'light'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sun className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center py-2 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Moon className="size-4" />
          </button>
        </div>

        <button
          type="button"
          title="Sign out"
          onClick={async () => {
            await getSupabaseClient().auth.signOut()
          }}
          className="mt-3 flex w-full items-center gap-4 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
        >
          <LogOut className="size-5 shrink-0" strokeWidth={2} />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  )
}