export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  /* تحسين (التدقيق 3-a / I1): الإلغاء الفوري بعد click() يسبق
     قراءة سفاري للرابط أحياناً فيُنزّل ملفاً فارغاً — تأجيل دورة
     مهام واحدة يحرّر الـObject URL بأمان بعد بدء التنزيل فعلياً. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
