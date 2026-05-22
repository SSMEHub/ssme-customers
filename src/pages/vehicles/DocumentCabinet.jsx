import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSignedUrl } from '../../lib/storage'
import { uploadDocument } from '../../lib/db/documents'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

const DOC_TYPES = [
  { key: 'geran', label: 'Geran', hasExpiry: false },
  { key: 'insurance', label: 'Insurance', hasExpiry: true },
  { key: 'road_tax', label: 'Road Tax (LKM)', hasExpiry: true },
  { key: 'puspakom', label: 'Puspakom', hasExpiry: true },
  { key: 'sld', label: 'SLD Cert', hasExpiry: true },
  { key: 'permit_apad', label: 'Permit APAD', hasExpiry: true },
  { key: 'permit_lpkp', label: 'Permit LPKP', hasExpiry: true },
  { key: 'report_awalan', label: 'Report Awalan', hasExpiry: false },
  { key: 'invoice_sales', label: 'Invoice Sales', hasExpiry: false },
  { key: 'invoice_service', label: 'Invoice Service', hasExpiry: false },
  { key: 'plan', label: 'Plan', hasExpiry: false },
  { key: 'other', label: 'Other', hasExpiry: false },
]

function docStatus(doc) {
  if (!doc) return 'not_uploaded'
  if (!doc.expiry_date) return 'valid'
  const days = Math.ceil((new Date(doc.expiry_date) - new Date()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 60) return 'expiring'
  return 'valid'
}

function daysLabel(expiryDate) {
  if (!expiryDate) return null
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
  if (days < 0) return `${Math.abs(days)}d overdue`
  return `${days}d left`
}

function DocCard({ docType, current, history, vehicleId, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showMeta, setShowMeta] = useState(false)
  const [meta, setMeta] = useState({ doc_number: '', issue_date: '', expiry_date: '' })
  const fileRef = useRef(null)
  const status = docStatus(current)

  async function handleView() {
    if (!current?.file_url) return
    try {
      const url = await getSignedUrl(current.file_url)
      window.open(url, '_blank')
    } catch (e) {
      alert('Failed to get document URL: ' + e.message)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setShowMeta(true)
    setMeta((m) => ({ ...m, _file: file }))
  }

  async function handleSubmitUpload() {
    const file = meta._file
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      await uploadDocument(vehicleId, file, {
        doc_type: docType.key,
        doc_number: meta.doc_number || null,
        issue_date: meta.issue_date || null,
        expiry_date: meta.expiry_date || null,
      })
      setShowMeta(false)
      setMeta({ doc_number: '', issue_date: '', expiry_date: '' })
      if (fileRef.current) fileRef.current.value = ''
      onRefresh()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-[#e0e2e6] rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold text-[#181d26]">{docType.label}</span>
        <StatusBadge status={status} />
      </div>

      {current && (
        <div className="space-y-0.5">
          {current.doc_number && (
            <p className="text-xs text-gray-500">No: {current.doc_number}</p>
          )}
          {current.issue_date && (
            <p className="text-xs text-gray-500">Issued: {current.issue_date}</p>
          )}
          {current.expiry_date && (
            <p className="text-xs text-gray-500">
              Expires: {current.expiry_date}{' '}
              <span
                className={
                  status === 'expired'
                    ? 'text-red-600 font-medium'
                    : status === 'expiring'
                    ? 'text-orange-600 font-medium'
                    : 'text-gray-400'
                }
              >
                ({daysLabel(current.expiry_date)})
              </span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1">
        {current?.file_url && (
          <button
            onClick={handleView}
            className="text-xs text-blue-600 hover:underline"
          >
            View
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs text-gray-600 border border-[#e0e2e6] rounded px-2 py-0.5 hover:bg-[#f8fafc]"
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUpload}
          className="hidden"
        />
        {history.length > 1 && (
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            {expanded ? 'Hide history' : `History (${history.length - 1})`}
          </button>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {showMeta && (
        <div className="border-t border-[#e0e2e6] pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Document details (optional)</p>
          <input
            type="text"
            placeholder="Document number"
            value={meta.doc_number}
            onChange={(e) => setMeta((m) => ({ ...m, doc_number: e.target.value }))}
            className="w-full h-7 px-2 text-xs border border-[#e0e2e6] rounded focus:outline-none focus:border-blue-400"
          />
          {docType.hasExpiry && (
            <>
              <input
                type="date"
                placeholder="Issue date"
                value={meta.issue_date}
                onChange={(e) => setMeta((m) => ({ ...m, issue_date: e.target.value }))}
                className="w-full h-7 px-2 text-xs border border-[#e0e2e6] rounded focus:outline-none focus:border-blue-400"
              />
              <input
                type="date"
                placeholder="Expiry date"
                value={meta.expiry_date}
                onChange={(e) => setMeta((m) => ({ ...m, expiry_date: e.target.value }))}
                className="w-full h-7 px-2 text-xs border border-[#e0e2e6] rounded focus:outline-none focus:border-blue-400"
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmitUpload}
              disabled={uploading}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Confirm Upload'}
            </button>
            <button
              onClick={() => { setShowMeta(false); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs px-3 py-1 border border-[#e0e2e6] rounded hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && history.length > 1 && (
        <div className="border-t border-[#e0e2e6] pt-2 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Previous versions</p>
          {history.slice(1).map((h) => (
            <div key={h.document_id} className="text-xs text-gray-500 flex items-center gap-2">
              <span>{h.file_name}</span>
              <span className="text-gray-300">·</span>
              <span>{new Date(h.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentCabinet({ vehicleId, documents }) {
  const queryClient = useQueryClient()

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] })
  }

  function getDocsForType(key) {
    return documents
      .filter((d) => d.doc_type === key)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-[#181d26] mb-3">Document Cabinet</h2>
      <div className="grid grid-cols-3 gap-4">
        {DOC_TYPES.map((dt) => {
          const docs = getDocsForType(dt.key)
          return (
            <DocCard
              key={dt.key}
              docType={dt}
              current={docs[0] ?? null}
              history={docs}
              vehicleId={vehicleId}
              onRefresh={refresh}
            />
          )
        })}
      </div>
    </div>
  )
}
