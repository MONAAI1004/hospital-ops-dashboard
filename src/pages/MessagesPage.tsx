import { useEffect, useMemo, useRef, useState } from 'react'
import type { Patient } from '../types/hospital'
import {
  fetchPatientMessages,
  sendPatientMessage,
  subscribeToPatientMessages,
  type PatientMessage,
  fetchPatientMessageThreadSummaries,
  markPatientMessagesReadByStaff,
  type PatientMessageThreadSummary,
  sendTestPatientFamilyMessage,
} from '../services/patientMessages'

interface MessagesPageProps {
  patients: Patient[]
}

export default function MessagesPage({ patients }: MessagesPageProps) {
  const [selectedPatientId, setSelectedPatientId] = useState(
    patients[0]?.id ?? '',
  )
  const [messages, setMessages] = useState<PatientMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [threadSummaries, setThreadSummaries] = useState<PatientMessageThreadSummary[]>([])
  
  const selectedPatient = patients.find(
    (patient) => patient.id === selectedPatientId,
  )

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return patients

    return patients.filter((patient) =>
      `${patient.name} ${patient.roomNumber} Room ${patient.roomNumber} room ${patient.roomNumber} ${patient.status}`
        .toLowerCase()
        .includes(term),
    )
  }, [patients, search])

  const summariesByPatientId = useMemo(() => {
    return new Map(
      threadSummaries.map((summary) => [summary.patient_id, summary]),
    )
  }, [threadSummaries])
  
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      const aTime = summariesByPatientId.get(a.id)?.latest_message_at
      const bTime = summariesByPatientId.get(b.id)?.latest_message_at
  
      if (!aTime && !bTime) return a.roomNumber - b.roomNumber
      if (!aTime) return 1
      if (!bTime) return -1
  
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [filteredPatients, summariesByPatientId])

  const bottomRef = useRef<HTMLDivElement | null>(null)

  async function loadMessages(
    patientId: string,
    options?: { showLoading?: boolean },
  ) {
    try {
      if (options?.showLoading !== false) {
        setLoading(true)
      }
  
      const data = await fetchPatientMessages(patientId)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      if (options?.showLoading !== false) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!selectedPatientId) return
  
    void loadMessages(selectedPatientId, { showLoading: true })
  
    const unsubscribe = subscribeToPatientMessages(selectedPatientId, () => {
        void loadMessages(selectedPatientId, { showLoading: false })
        void markPatientMessagesReadByStaff(selectedPatientId)
        void loadThreadSummaries()
      })
  
    return unsubscribe
  }, [selectedPatientId])

  async function handleSend() {
    const trimmed = draft.trim()
    if (!selectedPatientId || !trimmed) return

    try {
      setSending(true)

      await sendPatientMessage({
        patientId: selectedPatientId,
        body: trimmed,
      })

      setDraft('')
      await loadMessages(selectedPatientId, { showLoading: false })
      await loadThreadSummaries()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages.length, selectedPatientId])

  async function loadThreadSummaries() {
    try {
      const data = await fetchPatientMessageThreadSummaries()
      setThreadSummaries(data)
    } catch (error) {
      console.error('Failed to load thread summaries:', error)
    }
  }

  useEffect(() => {
    void loadThreadSummaries()
  }, [])

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      <aside className="w-80 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Patient Messages
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hospital Manager messages · CareConnect sync pending
          </p>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, room, status..."
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="overflow-y-auto p-3">
            {sortedPatients.map((patient) => {
                const summary = summariesByPatientId.get(patient.id)

                return (
            <button
              key={patient.id}
              type="button"
              onClick={async () => {
                setSelectedPatientId(patient.id)
                await markPatientMessagesReadByStaff(patient.id)
                await loadMessages(patient.id, { showLoading: false })
                await loadThreadSummaries()
              }}
              className={`mb-2 w-full rounded-xl border p-3 text-left transition-colors ${
                selectedPatientId === patient.id
                  ? 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{patient.name}</p>

                    <div className="flex items-center gap-2">
                        {summary?.unread_count ? (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {summary.unread_count}
                        </span>
                        ) : null}

                        {patient.activeRequestIds.length > 0 && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                            {patient.activeRequestIds.length}
                        </span>
                        )}
                    </div>
                </div>

              <p className="mt-1 text-sm opacity-70">
                Room {patient.roomNumber} · {patient.status.replaceAll('_', ' ')}
              </p>
              {summary?.latest_message_body && (
                <p className="mt-2 truncate text-xs opacity-70">
                    {summary.latest_message_sender}: {summary.latest_message_body}
                </p>
                )}
            </button>
            )
            })}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {selectedPatient?.name ?? 'Select a patient'}
        </h2>

        {selectedPatient && (
            <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Room {selectedPatient.roomNumber} ·{' '}
                {selectedPatient.status.replaceAll('_', ' ')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
                {[
                'Can someone give us an update?',
                'Can I get water?',
                'Can a nurse come by?',
                'I am having pain.',
                ].map((text) => (
                <button
                    key={text}
                    type="button"
                    onClick={async () => {
                    await sendTestPatientFamilyMessage({
                        patientId: selectedPatient.id,
                        body: text,
                    })

                    await loadMessages(selectedPatient.id, {
                        showLoading: false,
                    })

                    await loadThreadSummaries()
                    }}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    {text}
                </button>
                ))}
            </div>
            </>
        )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              No messages yet. Start the thread below.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isStaff = message.sender_role === 'staff'
                const syncLabel =
                    message.sync_status === 'synced'
                        ? '✓ Synced to CareConnect'
                        : message.sync_status === 'sync_failed'
                        ? '⚠ Sync failed'
                        : 'Sending...'

                return (
                  <div
                    key={message.id}
                    className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl border p-4 shadow-sm ${
                        isStaff
                          ? 'border-violet-500/20 bg-violet-600 text-white'
                          : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="font-semibold">{message.sender_name}</p>
                        <p
                          className={`text-xs ${
                            isStaff ? 'text-violet-100' : 'text-slate-400'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap text-sm">
                        {message.body}
                      </p>

                      {message.sync_status && (
                        <p
                          className={`mt-2 text-xs ${
                            isStaff ? 'text-violet-100' : 'text-slate-400'
                          }`}
                        >
                          {syncLabel}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Type a message..."
              className="min-h-20 flex-1 resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim() || !selectedPatientId}
              className="self-end rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}