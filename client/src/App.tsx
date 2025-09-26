import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInterval } from './hooks/useInterval'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

interface PurchaseResponse {
  message: string
  totalPurchases?: number
  retryAfterSeconds?: number
}

interface StatusResponse {
  clientId: string
  canPurchase: boolean
  retryAfterSeconds: number
  totalPurchases: number
}

const CLIENT_ID_STORAGE_KEY = 'bob-corn-client-id'

const generateClientId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `client-${globalThis.crypto.randomUUID()}`
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`
}

const getStoredClientId = () => {
  const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) return existing
  const fresh = generateClientId()
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, fresh)
  return fresh
}

function App() {
  const [clientId, setClientId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      const stored = getStoredClientId()
      setClientId(stored)
    } catch (err) {
      console.error('Failed to get client id from storage', err)
      const fallback = generateClientId()
      setClientId(fallback)
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!clientId) return
    try {
      const res = await fetch(`${API_BASE}/status/${clientId}`)
      if (!res.ok) throw new Error('Failed to load status')
      const data: StatusResponse = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Status fetch failed', err)
    }
  }, [clientId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const pollDelay = useMemo(() => (status?.canPurchase ? null : 1000), [status?.canPurchase])

  useInterval(fetchStatus, pollDelay)

  const handlePurchase = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${API_BASE}/buy-corn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      })

      const data: PurchaseResponse = await res.json()

      if (res.ok) {
        setMessage(data.message)
        await fetchStatus()
      } else {
        setMessage(data.message || 'Too Many Requests 🌽')
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                canPurchase: false,
                retryAfterSeconds: data.retryAfterSeconds ?? prev.retryAfterSeconds,
              }
            : prev,
        )
      }
    } catch (err) {
      console.error('Purchase failed', err)
      setMessage('Unable to reach Bob\'s corn stand right now')
    } finally {
      setLoading(false)
    }
  }, [clientId, fetchStatus])

  const remainingSeconds = status?.retryAfterSeconds ?? 0

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <header className="space-y-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-corn-500/20 px-4 py-1 text-sm font-medium text-corn-400 ring-1 ring-corn-500/30">
            <span>🌽</span>
            <span>Bob&apos;s Corn Stand</span>
          </span>
          <h1 className="text-4xl font-display font-semibold tracking-tight sm:text-5xl">
            Buy fresh corn with a single click
          </h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Bob limits sales to one corn per minute to keep things fair. See your purchase history and know when you can buy again.
          </p>
        </header>

        <main className="mt-12 flex justify-center">
          <section className="w-full max-w-2xl bg-neutral-900/60 backdrop-blur rounded-3xl border border-neutral-800 shadow-corn p-8 space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-white">Instant purchase</h2>
              <p className="text-neutral-400">
                You are shopping as <span className="font-mono text-corn-400">{clientId ?? 'loading...'}</span>
              </p>
            </div>

            <div className="space-y-6">
              <button
                onClick={handlePurchase}
                disabled={loading || status?.canPurchase === false}
                className="w-full rounded-2xl bg-corn-500 hover:bg-corn-400 disabled:bg-neutral-700 disabled:text-neutral-400 transition-all duration-200 px-6 py-4 text-lg font-semibold tracking-wide uppercase shadow-corn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-corn-400"
              >
                {status?.canPurchase === false && remainingSeconds > 0
                  ? `Wait ${remainingSeconds}s`
                  : loading
                    ? 'Processing...'
                    : 'Buy corn now'}
              </button>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white">Status</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm text-neutral-300">
                  <div>
                    <dt className="text-neutral-500 font-medium">Total corn purchased</dt>
                    <dd className="mt-1 text-2xl font-bold text-corn-400">
                      {status?.totalPurchases ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 font-medium">Ready for next purchase</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {status?.canPurchase ? 'Yes' : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>

              {message && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-200">
                  {message}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
