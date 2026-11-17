import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
}

export function exportToPdf(options: {
  title: string;
  subtitle: string;
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  generatedBy?: string;
}) {
  const doc = new jsPDF({
    orientation: options.columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  doc.setFillColor(29, 84, 151);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 68, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Manajemen Sekolah — Proyek Kelas XI RPL/PPLG', 40, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.title} · ${options.subtitle}`, 40, 48);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(
    `Dicetak pada: ${nowStr}${options.generatedBy ? ` · Oleh: ${options.generatedBy}` : ''} · Total baris: ${options.rows.length}`,
    40,
    88
  );

  const head = [options.columns.map((c) => c.header)];
  const body = options.rows.map((r) =>
    options.columns.map((c) => {
      const val = r[c.key];
      return val === null || val === undefined ? '-' : String(val);
    })
  );

  autoTable(doc, {
    startY: 102,
    head,
    body,
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [29, 84, 151],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${options.filename}.pdf`);
}

export function exportToExcel(options: {
  sheetName: string;
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}) {
  const formattedRows = options.rows.map((row) => {
    const obj: Record<string, string | number> = {};
    for (const col of options.columns) {
      const val = row[col.key];
      obj[col.header] = val === null || val === undefined ? '-' : (typeof val === 'number' ? val : String(val));
    }
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}
