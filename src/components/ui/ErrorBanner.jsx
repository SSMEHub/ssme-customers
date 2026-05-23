export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-center justify-between">
      <span>{message || 'An unexpected error occurred'}</span>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-medium">
          Retry
        </button>
      )}
    </div>
  )
}
