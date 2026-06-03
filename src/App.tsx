import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import { getSupabaseClient } from './lib/supabaseClient'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <Login />
  }

  return <Dashboard />
}