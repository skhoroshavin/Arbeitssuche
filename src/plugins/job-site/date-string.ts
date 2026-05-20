export function makeDateString(raw: string): DateString {
  const trimmed = raw.trim()
  if (!trimmed) return { value: "" }

  const isoPattern = /^\d{4}-\d{2}-\d{2}$/
  if (isoPattern.test(trimmed)) return { value: trimmed }

  const germanMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    const paddedMonth = month.padStart(2, "0")
    const paddedDay = day.padStart(2, "0")
    return { value: `${year}-${paddedMonth}-${paddedDay}` }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return { value: "" }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return { value: `${year}-${month}-${day}` }
}

export interface DateString {
  readonly value: string
}
