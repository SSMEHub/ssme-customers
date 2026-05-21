import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchCustomers } from '../../lib/db/customers'
import { searchVehicles } from '../../lib/db/vehicles'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState({ customers: [], vehicles: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debouncedTerm = useDebounce(term, 300)
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    if (!debouncedTerm || debouncedTerm.length < 2) {
      setResults({ customers: [], vehicles: [] })
      setOpen(false)
      return
    }
    setLoading(true)
    Promise.all([
      searchCustomers(debouncedTerm),
      searchVehicles(debouncedTerm),
    ])
      .then(([customers, vehicles]) => {
        setResults({ customers, vehicles })
        setOpen(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedTerm])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(path) {
    setTerm('')
    setOpen(false)
    navigate(path)
  }

  const hasResults = results.customers.length > 0 || results.vehicles.length > 0

  return (
    <div ref={ref} className="relative w-72">
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search plate, chassis, company…"
        className="w-full h-8 pl-8 pr-3 text-sm border border-[#e0e2e6] rounded bg-[#f8fafc] focus:outline-none focus:border-blue-400 focus:bg-white"
      />
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">&#9906;</span>
      {loading && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">…</span>
      )}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#e0e2e6] rounded shadow-lg z-50 max-h-72 overflow-y-auto">
          {!hasResults && (
            <p className="text-xs text-gray-400 px-3 py-2">No results found</p>
          )}
          {results.customers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">
                Customers
              </p>
              {results.customers.map((c) => (
                <button
                  key={c.customer_id}
                  onClick={() => select(`/customers/${c.customer_id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-[#f8fafc] text-sm text-[#181d26]"
                >
                  <span className="font-medium">{c.company_name}</span>
                  {c.customer_code && (
                    <span className="text-xs text-gray-400 ml-2">{c.customer_code}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {results.vehicles.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">
                Vehicles
              </p>
              {results.vehicles.map((v) => (
                <button
                  key={v.vehicle_id}
                  onClick={() => select(`/vehicles/${v.vehicle_id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-[#f8fafc] text-sm text-[#181d26]"
                >
                  <span className="font-medium font-mono">{v.plate_number}</span>
                  {v.customers?.company_name && (
                    <span className="text-xs text-gray-400 ml-2">{v.customers.company_name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
