export function normalizeDate(date?: Date): string {
  return date ? date.toISOString().slice(0, 10) : "";
}
