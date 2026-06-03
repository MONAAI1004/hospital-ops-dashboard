import { useEffect, useState } from 'react'
import {
  fetchCurrentProfile,
  updateCurrentProfile,
  type Profile,
} from '../services/profiles'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchCurrentProfile()
      .then((profile) => {
        setProfile(profile)
        setDisplayName(profile?.displayName ?? '')
        setHospitalName(profile?.hospitalName ?? '')
      })
      .catch(console.error)
  }, [])

  async function handleSave() {
    try {
      setSaving(true)
      setMessage('')

      await updateCurrentProfile({
        displayName,
        hospitalName,
      })

      setProfile((current) =>
        current
          ? {
              ...current,
              displayName,
              hospitalName,
            }
          : current,
      )

      setMessage('Settings saved.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-slate-100">
          Settings
        </h1>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Profile
          </h2>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Display Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Role
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                value={profile.roleTitle ?? ''}
                readOnly
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Hospital Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={hospitalName}
                onChange={(event) => setHospitalName(event.target.value)}
              />
            </div>

            {message && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}