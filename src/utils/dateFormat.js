/**
 * Format a date string (YYYY-MM-DD or ISO) as "Jun 1, 2026".
 * Appends T12:00:00 to YYYY-MM-DD strings to avoid UTC midnight
 * shifting the displayed date by one day in negative-offset timezones.
 */
export function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T12:00:00' : dateStr
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
