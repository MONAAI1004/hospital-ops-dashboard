import { useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)
      setError('')

      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md p-8 rounded-xl border bg-white"
      >
        <h1 className="text-2xl font-bold mb-6">
          Hospital Operations Login
        </h1>

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="text-red-500 text-sm mb-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 rounded bg-purple-600 text-white"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}