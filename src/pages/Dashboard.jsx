import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getExpiryAlerts, getFleetAgeStats, getQuickStats } from '../lib/db/dashboard'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const DOC_TYPE_LABELS = {
  insurance: 'Insurance',
  road_tax: 'Road Tax (LKM)',
  puspakom: 'Puspakom',
  sld: 'SLD Cert',
  permit_apad: 'Permit APAD',
  permit_lpkp: 'Permit LPKP',
  geran: 'Geran',
  report_awalan: 'Report Awalan',
  invoice_sales: 'Invoice Sales',
  invoice_service: 'Invoice Service',
  plan: 'Plan',
  other: 'Other',
}

function alertLevel(daysLeft) {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 30) return 'critical'
  return 'warning'
}

function groupAlerts(alerts) {
  const groups = { expired: [], critical: [], warning: [] }
  for (const a of alerts) {
    const level = alertLevel(a.days_until_expiry ?? -1)
    groups[level].push({ ...a, _level: level })
  }
  return groups
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-[#e0e2e6] rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#181d26]">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function AlertGroup({ title, alerts, levelColor }) {
  if (!alerts.length) return null
  return (
    <div className="mb-4">
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${levelColor}`}>
        {title} ({alerts.length})
      </h3>
      <div className="bg-white border border-[#e0e2e6] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e0e2e6]">
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Plate</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Owner</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Doc Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Expiry Date</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Days Left</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr
                key={`${a.vehicle_id}-${a.doc_type}-${i}`}
                className="border-b border-[#e0e2e6] last:border-0 hover:bg-[#f8fafc]"
              >
                <td className="px-4 py-2 font-mono text-xs font-semibold">{a.plate_number}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{a.company_name}</td>
                <td className="px-4 py-2 text-xs">{DOC_TYPE_LABELS[a.doc_type] ?? a.doc_type}</td>
                <td className="px-4 py-2 text-xs">{a.expiry_date}</td>
                <td className="px-4 py-2 text-xs">
                  {a.days_until_expiry < 0
                    ? `${Math.abs(a.days_until_expiry)}d ago`
                    : `${a.days_until_expiry}d`}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={a._level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-expiry'],
    queryFn: getExpiryAlerts,
    staleTime: 10 * 60 * 1000,
  })

  const { data: ageStats } = useQuery({
    queryKey: ['dashboard-fleet-age'],
    queryFn: getFleetAgeStats,
    staleTime: 10 * 60 * 1000,
  })

  const { data: stats, isFetching: statsFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getQuickStats,
  })

  const groups = groupAlerts(alerts)
  const hasAlerts = alerts.length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#181d26]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fleet & document health overview</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Customers" value={stats?.activeCustomers} />
        <StatCard label="Active Vehicles" value={stats?.activeVehicles} />
        <StatCard label="Docs Expiring in 30d" value={stats?.expiringIn30Days} />
        <div className="bg-white border border-[#e0e2e6] rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Replacement Due (≥7 yrs)</p>
          <p className="text-2xl font-bold text-[#181d26]">{ageStats?.replacementCount ?? '—'}</p>
          {ageStats?.replacementCount > 0 && (
            <Link
              to="/vehicles?age=replacement"
              className="text-xs text-blue-600 hover:underline mt-0.5 block"
            >
              View all →
            </Link>
          )}
        </div>
      </div>

      {/* Expiry Alerts */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#181d26]">Expiry Alerts</h2>
      </div>

      {alertsLoading && (
        <p className="text-sm text-gray-400">Loading alerts…</p>
      )}

      {!alertsLoading && !hasAlerts && (
        stats?.activeVehicles === 0 ? (
          <div className="bg-white border border-[#e0e2e6] rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500 mb-3">No vehicles in database yet</p>
            <Link to="/import" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Import fleet data →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e0e2e6] rounded-lg">
            <EmptyState message="All documents are up to date" icon="✓" />
          </div>
        )
      )}

      {!alertsLoading && hasAlerts && (
        <div>
          <AlertGroup title="Expired" alerts={groups.expired} levelColor="text-red-600" />
          <AlertGroup title="Critical — ≤30 days" alerts={groups.critical} levelColor="text-orange-600" />
          <AlertGroup title="Warning — 31–60 days" alerts={groups.warning} levelColor="text-yellow-700" />
        </div>
      )}
    </div>
  )
}
