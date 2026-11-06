// Cells that start with = + - @ (or a tab/CR) are executed as formulas by Excel and Sheets, and
// names, titles and emails are user-controlled — so a signup called "=HYPERLINK(...)" would
// become a live formula in an admin's spreadsheet. A leading apostrophe makes it plain text.
// Only strings are touched; real numbers (including negatives) pass through as numbers.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);

  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
