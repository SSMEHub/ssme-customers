import { Link } from 'react-router-dom'

export default function PageHeader({ title, breadcrumb, action }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="mb-1">
          <Link
            to={breadcrumb.to}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span>&#8592;</span>
            <span>{breadcrumb.label}</span>
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#181d26]">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
