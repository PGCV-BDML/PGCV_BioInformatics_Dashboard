/**
 * Formats a "YYYY-MM-DD" date string to "MM/DD/YYYY".
 * Returns an empty string for null/undefined/falsy input.
 * Returns the raw string if it doesn"t match the expected format.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  return `${month}/${day}/${year}`;
}
