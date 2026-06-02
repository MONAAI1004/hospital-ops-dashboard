import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DashboardSnapshot } from '../lib/dashboardStorage'
import { getSupabaseClient } from '../lib/supabaseClient'
import { fetchDashboardData } from './dashboardData'

const REALTIME_TABLES = [
  'patients',
  'requests',
  'beds',
  'wards',
  'discharge_tasks',
] as const
const REFRESH_DEBOUNCE_MS = 150

export function subscribeToDashboardChanges(
  onUpdate: (snapshot: DashboardSnapshot) => void,
): () => void {
  const supabase = getSupabaseClient()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let pendingRefresh = false
  let disposed = false

  async function refreshDashboard() {
    if (disposed) {
      return
    }

    if (inFlight) {
      pendingRefresh = true
      return
    }

    inFlight = true

    try {
      const snapshot = await fetchDashboardData()

      if (!disposed) {
        onUpdate(snapshot)
      }
    } catch (error) {
      console.error('Failed to refresh dashboard from Realtime:', error)
    } finally {
      inFlight = false

      if (pendingRefresh && !disposed) {
        pendingRefresh = false
        void refreshDashboard()
      }
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void refreshDashboard()
    }, REFRESH_DEBOUNCE_MS)
  }

  let channel: RealtimeChannel = supabase.channel('dashboard-changes')

  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      scheduleRefresh,
    )
  }

  channel.subscribe()

  return () => {
    disposed = true

    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    void supabase.removeChannel(channel)
  }
}
