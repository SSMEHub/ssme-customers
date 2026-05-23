import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = searchParams.get('returnTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    else navigate(returnTo, { replace: true })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="bg-white border border-[#e0e2e6] rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-[#181d26] mb-1">SSME Hub</h1>
        <p className="text-sm text-gray-500 mb-6">Module 1 — Customer Database</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-8 px-3 text-sm border border-[#e0e2e6] rounded focus:outline-none focus:border-blue-400"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-8 px-3 text-sm border border-[#e0e2e6] rounded focus:outline-none focus:border-blue-400"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
