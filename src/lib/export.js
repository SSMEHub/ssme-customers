// @ts-check
/**
 * Generic Excel export helper.
 *
 * Usage:
 *   import { exportToExcel } from '../lib/export'
 *   exportToExcel(rows, { plate_number: 'Plate No.', status: 'Status' }, 'vehicles-2026-06-10.xlsx')
 *
 * @param {object[]} rows      - Array of plain row objects (from a useQuery result).
 * @param {Record<string, string>} columns - Ordered map of { rowKey: 'Header Label' }.
 *                               Only keys listed here appear in the sheet, in that order.
 * @param {string}   filename  - Desired download filename (must end in .xlsx).
 */
import * as XLSX from 'xlsx'

export function exportToExcel(rows, columns, filename) {
  // 1. Map every row to a plain object whose keys are the human-readable header labels.
  //    Unknown keys are silently dropped; missing values become an empty string.
  const keys = Object.keys(columns)
  const sheetData = rows.map((row) => {
    const out = {}
    for (const key of keys) {
      const label = columns[key]
      const val = row[key]
      // Normalise undefined / null to empty string so xlsx doesn't emit "#ERROR"
      out[label] = val === undefined || val === null ? '' : val
    }
    return out
  })

  // 2. Build worksheet and workbook.
  const worksheet = XLSX.utils.json_to_sheet(sheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  // 3. Trigger browser download.  writeFile delegates to FileSaver/anchor-click internally.
  XLSX.writeFile(workbook, filename)
}

/**
 * Returns a filename like "prefix-2026-06-10.xlsx" using today's local date.
 * @param {string} prefix - e.g. "customers" or "vehicles"
 * @returns {string}
 */
export function dateSuffixFilename(prefix) {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${prefix}-${yyyy}-${mm}-${dd}.xlsx`
}
