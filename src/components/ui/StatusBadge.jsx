const VEHICLE_STATUS = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  in_shop: { label: 'In Shop', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  decommissioned: { label: 'Decommissioned', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  scrapped: { label: 'Scrapped', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
}

const DOC_STATUS = {
  valid: { label: 'Valid', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  expiring: { label: 'Expiring', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  expired: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  not_uploaded: { label: 'Not Uploaded', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
}

const CUSTOMER_STATUS = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
}

const ALERT_LEVEL = {
  expired: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  critical: { label: 'Critical', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  warning: { label: 'Warning', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
}

const ALL_MAPS = { ...VEHICLE_STATUS, ...DOC_STATUS, ...CUSTOMER_STATUS, ...ALERT_LEVEL }

export default function StatusBadge({ status, className = '' }) {
  const cfg = ALL_MAPS[status] ?? {
    label: status ?? '—',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  )
}
