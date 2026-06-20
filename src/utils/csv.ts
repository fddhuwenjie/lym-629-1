import { generateId } from './id';

export interface ExportColumn {
  key: string;
  label: string;
}

export const exportToCSV = (
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
): string => {
  const header = columns.map((col) => col.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        if (value === null || value === undefined) {
          return '';
        }
        return String(value);
      })
      .join(',')
  );
  const csvContent = [header, ...rows].join('\n');
  const BOM = '\uFEFF';
  return BOM + csvContent;
};

export const downloadCSV = (
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
): void => {
  const csvContent = exportToCSV(data, columns, filename);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export { generateId };
