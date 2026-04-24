// Minimal CSV export utility used by the Reports tab. Accepts a list of
// typed rows and a column spec, builds a CSV blob, and triggers a
// browser download. Escapes quotes, commas, and newlines per RFC 4180.
//
// Intentionally dependency-free — shipping a full CSV library for this
// demo would be overkill and the edge cases we care about (commas in
// names, quoted paths) are handled below.

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function escapeCell(raw: string | number | boolean | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(","));
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revocation slightly so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampedFilename(base: string, ext: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${base}_${yyyy}-${mm}-${dd}.${ext}`;
}
