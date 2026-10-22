// Exportación a Excel (RF-E43). Se carga bajo demanda para no pesar en la app.
export interface Hoja { nombre: string; columnas: { titulo: string; clave: string; ancho?: number }[]; filas: Record<string, unknown>[] }

export async function exportarExcel(hojas: Hoja[], nombreArchivo: string) {
  const ExcelJS = (await import('exceljs')).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Pequeños Atletas';
  libro.created = new Date();
  for (const h of hojas) {
    const ws = libro.addWorksheet(h.nombre.slice(0, 31));
    ws.columns = h.columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? Math.max(12, c.titulo.length + 2) }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4FD8' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    h.filas.forEach((f) => ws.addRow(f));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } };
  }
  const buf = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
