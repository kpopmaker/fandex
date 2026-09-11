function invalidCsv(message: string): never {
  throw new Error(`lastfm_csv_invalid:${message}`);
}

export function parseCsvRows(input: string): readonly Readonly<Record<string, string>>[] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length !== 0) invalidCsv('quote_inside_unquoted_field');
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (quoted) invalidCsv('unterminated_quote');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const nonEmpty = rows.filter((item) => item.some((value) => value.length > 0));
  const header = nonEmpty[0];
  if (!header || header.length === 0) return Object.freeze([]);
  if (header.some((value) => !value.trim())) invalidCsv('blank_header');
  if (new Set(header).size !== header.length) invalidCsv('duplicate_header');

  return Object.freeze(
    nonEmpty.slice(1).map((values, rowIndex) => {
      if (values.length !== header.length) {
        invalidCsv(`column_count_row_${rowIndex + 2}`);
      }
      return Object.freeze(
        Object.fromEntries(header.map((key, columnIndex) => [key, values[columnIndex] ?? ''])),
      );
    }),
  );
}

export function requireCsvColumns(
  rows: readonly Readonly<Record<string, string>>[],
  columns: readonly string[],
): void {
  if (rows.length === 0) return;
  const keys = new Set(Object.keys(rows[0]));
  for (const column of columns) {
    if (!keys.has(column)) invalidCsv(`missing_column_${column}`);
  }
}
