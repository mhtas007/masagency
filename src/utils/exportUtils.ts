export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof cell === 'string') {
          cell = cell.replace(/"/g, '""');
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            cell = `"${cell}"`;
          }
        }
        return cell;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download link
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
