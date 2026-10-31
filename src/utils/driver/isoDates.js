// src/utils/istDates.js
// India has no daylight saving, so a fixed +05:30 offset is exact.
// Adjust this import to wherever your error helpers live
import { BadRequestError } from "../../middleware/ErrorHandler.js"

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (00:00 IST) of the IST day that contains `date`, returned as a real instant. */
export function istDayStart(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS)
}

/** Start of today, this week (Monday) and this month, all in IST. */
export function getStatsRanges(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const todayStart = istDayStart(now)
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7
  const weekStart = new Date(todayStart.getTime() - daysSinceMonday * DAY_MS)
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_OFFSET_MS)
  return { todayStart, weekStart, monthStart }
}

/** Parses "YYYY-MM-DD" as an IST calendar day. Returns null if empty, throws 400 if invalid. */
export function parseIstDay(value, name) {
  if (value === undefined || value === null || value === '') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (!m) throw BadRequestError(`${name} must be a date like 2026-10-14`)
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const utc = new Date(Date.UTC(y, mo - 1, d))
  // reject impossible dates such as 2026-02-31
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) {
    throw BadRequestError(`${name} is not a valid date`)
  }
  return new Date(utc.getTime() - IST_OFFSET_MS)
}