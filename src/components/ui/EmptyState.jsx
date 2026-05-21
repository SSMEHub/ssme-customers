export default function EmptyState({ icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="text-4xl mb-3 text-gray-300">{icon}</div>
      )}
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}
