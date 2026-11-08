export function csvText(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let cell = String(value);
          if (/^[=+@\-\t\r]/.test(cell)) cell = `'${cell}`;
          return `"${cell.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
