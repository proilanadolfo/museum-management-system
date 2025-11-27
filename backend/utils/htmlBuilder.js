/**
 * Build HTML for PDF generation using template layout
 * @param {Array} data - Array of attendance/visitor records
 * @param {Object} templateLayout - Template layout configuration
 * @returns {String} Complete HTML string ready for Puppeteer
 */
function buildHTML(data, templateLayout) {
  const {
    title = 'Attendance Report',
    titleAlign = 'center',
    logoUrl = '',
    logoPosition = 'left',
    headerBgColor = '#ffffff',
    footerText = 'Prepared by: __________ | Checked by: ___________',
    footerShowPageNumber = true,
    orientation = 'portrait',
    pageMargin = '15mm',
    headerTitle = 'Bukidnon Studies Center',
    headerSubtitle = 'Central Mindanao University • University Town, Musuan, Bukidnon 8710',
    visibleColumns = {}
  } = templateLayout

  // Build table headers based on visible columns
  const headers = []
  const headerMap = {
    date: 'Date',
    name: 'Visitor Name',
    idOrContact: 'ID / Contact No.',
    grade: 'Grade/Level',
    timeIn: 'Time In',
    timeOut: 'Time Out',
    purpose: 'Purpose',
    duration: 'Duration',
    status: 'Status'
  }

  Object.keys(headerMap).forEach(key => {
    if (visibleColumns[key] !== false) {
      headers.push(headerMap[key])
    }
  })

  // Build table rows
  const rows = data.map(record => {
    const row = []
    
    // Format dates
    const checkIn = new Date(record.checkInTime)
    const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
    const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
    const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
    
    // Build row based on visible columns
    if (visibleColumns.date !== false) {
      row.push(checkIn.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }))
    }
    if (visibleColumns.name !== false) {
      row.push(record.name || 'Unknown')
    }
    if (visibleColumns.idOrContact !== false) {
      row.push(record.idNumber || '-')
    }
    if (visibleColumns.grade !== false) {
      const typeStr = record.type === 'student' ? 'Student' : 
                     record.type === 'staff' ? 'Staff' : 
                     record.type === 'visitor' ? 'Visitor' : 'Unknown'
      row.push(typeStr)
    }
    if (visibleColumns.timeIn !== false) {
      row.push(checkIn.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }))
    }
    if (visibleColumns.timeOut !== false) {
      row.push(checkOut ? checkOut.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : '-')
    }
    if (visibleColumns.purpose !== false) {
      row.push(record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit'))
    }
    if (visibleColumns.duration !== false) {
      row.push(durationStr)
    }
    if (visibleColumns.status !== false) {
      row.push(record.status === 'checked-in' ? 'Checked In' : 'Checked Out')
    }
    
    return row
  })

  // Build logo + title block (professional letter-head style)
  let logoHTML = ''
  if (logoUrl) {
    const logoWrapperBase =
      'display: flex; align-items: center; justify-content: ' +
      (logoPosition === 'center' ? 'center' : logoPosition === 'right' ? 'flex-end' : 'flex-start') +
      ';'
    logoHTML = `<div style="${logoWrapperBase} margin-bottom: 8px;">
      <img src="${logoUrl}" alt="Logo" style="max-height: 70px; max-width: 220px; object-fit: contain;" />
    </div>`
  }

  // Header text block (institution + report title)
  const titleStyle = `text-align: ${titleAlign}; margin: 4px 0;`
  const titleHTML = `
    <div style="text-align: ${titleAlign};">
      <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; font-weight: 600;">
        ${escapeHtml(headerTitle)}
      </div>
      ${headerSubtitle ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${escapeHtml(headerSubtitle)}</div>` : ''}
      <h1 style="${titleStyle} color: #111827; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
        ${title}
      </h1>
    </div>`

  // Build table HTML
  const tableRows = rows.map(row => {
    const cells = row.map(cell => `<td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(cell)}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const headerCells = headers.map(header => 
    `<th style="padding: 8px 10px; background-color: #f3f4f6; color: #111827; border: 1px solid #d1d5db; font-weight: 600; font-size: 11px; text-align: left;">${header}</th>`
  ).join('')

  const tableHTML = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `

  // Build footer HTML
  let footerHTML = ''
  if (footerText) {
    const printedOn = new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    footerHTML = `
      <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #4b5563;">
        <div style="text-align: left; max-width: 65%;">
          ${footerText}
        </div>
        <div style="text-align: right;">
          <div>Printed on: ${printedOn}</div>
        </div>
      </div>`
  }

  // Complete HTML document
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 ${orientation};
      margin: ${pageMargin};
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .page {
      background-color: #ffffff;
      padding: 16px 12px 20px 12px;
      box-sizing: border-box;
      min-height: calc(100vh - 2 * ${pageMargin});
      display: flex;
      flex-direction: column;
    }
    .header {
      background-color: ${headerBgColor};
      padding: 4px 4px 12px 4px;
      margin-bottom: 8px;
      border-bottom: 2px solid #dc2626;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #4b5563;
      margin-top: 4px;
    }
    .content {
      padding: 8px 0 0 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background-color: #dc143c;
      color: white;
      font-weight: bold;
      padding: 10px;
      text-align: left;
      border: 1px solid #ddd;
    }
    td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoHTML}
    ${titleHTML}
  </div>
  <div class="content">
    ${tableHTML}
  </div>
  ${footerHTML}
  <script>
    // Page number script for Puppeteer
    window.onload = function() {
      const pageNumbers = document.querySelectorAll('.pageNumber');
      const totalPages = document.querySelectorAll('.totalPages');
      // Puppeteer will handle page numbers
    }
  </script>
</body>
</html>
  `

  return html
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return String(text).replace(/[&<>"']/g, m => map[m])
}

module.exports = { buildHTML }

