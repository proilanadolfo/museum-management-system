import React, { useState, useEffect } from 'react'
import { jsPDF, verifyAutoTable } from '../../utils/pdfUtils'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import '../../styles/AdminCss/reports.css'


const AdminReports = () => {
  const [reportData, setReportData] = useState([])
  const [reportType, setReportType] = useState('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  
  // Template selection state
  const [templates, setTemplates] = useState([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedExportType, setSelectedExportType] = useState(null) // 'pdf', 'excel', 'csv'
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)

  // Verify autoTable on component mount
  useEffect(() => {
    verifyAutoTable()
  }, [])

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token = raw && raw !== 'null' && raw !== 'undefined' ? raw : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/report-templates', {
        headers: {
          ...getAuthHeaders()
        }
      })
      // Only redirect on 401 if we have a token (means token is invalid/expired)
      // BUT: Don't logout immediately - might be a temporary issue
      const token = getAuthHeaders().Authorization
      if (response.status === 401 && token) {
        // Show error instead of logging out
        console.error('Unauthorized: Please check your session or try refreshing the page')
        return
      }
      // If 401 and no token, just skip (component might be loading)
      if (response.status === 401 && !token) {
        return
      }
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || data.data || [])
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  const handleExportClick = (exportType) => {
    if (reportData.length === 0) {
      Swal.fire({
        title: 'No Data Available',
        text: 'No data to export. Please generate a report first.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    // If no templates, use default export
    if (templates.length === 0) {
      if (exportType === 'pdf') exportToPDF()
      else if (exportType === 'excel') exportToExcel()
      else if (exportType === 'csv') exportToCSV()
      return
    }
    
    // Show template selection modal
    setSelectedExportType(exportType)
    setShowTemplateModal(true)
    // Auto-select first template if available
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0]._id)
    }
  }

  const confirmExport = async () => {
    if (!selectedTemplateId && templates.length > 0) {
      Swal.fire({
        title: 'Template Required',
        text: 'Please select a template to continue.',
        icon: 'info',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    setShowTemplateModal(false)
    setTemplateLoading(true)
    
    try {
      if (selectedExportType === 'pdf') {
        await exportToPDFWithTemplate()
      } else if (selectedExportType === 'excel') {
        await exportToExcelWithTemplate()
      } else if (selectedExportType === 'csv') {
        await exportToCSVWithTemplate()
      }
    } catch (error) {
      console.error('Export error:', error)
      Swal.fire({
        title: 'Export Error',
        text: 'Error exporting: ' + error.message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setTemplateLoading(false)
    }
  }

  const exportToPDFWithTemplate = async () => {
    if (!selectedTemplateId) {
      exportToPDF()
      return
    }
    
    try {
      const storedUser = localStorage.getItem('admin_user')
      if (!storedUser) {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in to export reports.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        return
      }
      
      const userData = JSON.parse(storedUser)
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          adminId: userData.id,
          templateId: selectedTemplateId,
          startDate: reportType === 'custom' ? startDate : '',
          endDate: reportType === 'custom' ? endDate : '',
          filters: {}
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const template = templates.find(t => t._id === selectedTemplateId)
        link.download = `Report-${template?.name || 'Report'}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json().catch(() => ({ message: 'Failed to generate PDF' }))
        Swal.fire({
          title: 'PDF Generation Failed',
          text: data.message || 'Failed to generate PDF',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (err) {
      console.error('PDF export error:', err)
      Swal.fire({
        title: 'PDF Generation Error',
        text: 'Error generating PDF: ' + err.message,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    }
  }

  const exportToExcelWithTemplate = async () => {
    if (!selectedTemplateId || templates.length === 0) {
      exportToExcel()
      return
    }
    
    const template = templates.find(t => t._id === selectedTemplateId)
    if (!template) {
      exportToExcel()
      return
    }
    
    const visibleColumns = template.layout.visibleColumns || {}
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
    
    const headers = []
    Object.keys(headerMap).forEach(key => {
      if (visibleColumns[key] !== false) {
        headers.push(headerMap[key])
      }
    })
    
    const worksheetData = reportData.map(record => {
      const checkIn = new Date(record.checkInTime)
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
      const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
      const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
      
      const row = {}
      if (visibleColumns.date !== false) row[headerMap.date] = checkIn.toLocaleDateString()
      if (visibleColumns.name !== false) row[headerMap.name] = record.name || 'Unknown'
      if (visibleColumns.idOrContact !== false) row[headerMap.idOrContact] = record.idNumber || '-'
      if (visibleColumns.grade !== false) {
        row[headerMap.grade] = record.type === 'student' ? 'Student' : 
                               record.type === 'staff' ? 'Staff' : 
                               record.type === 'visitor' ? 'Visitor' : 'Unknown'
      }
      if (visibleColumns.timeIn !== false) row[headerMap.timeIn] = checkIn.toLocaleTimeString()
      if (visibleColumns.timeOut !== false) row[headerMap.timeOut] = checkOut ? checkOut.toLocaleTimeString() : '-'
      if (visibleColumns.purpose !== false) row[headerMap.purpose] = record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit')
      if (visibleColumns.duration !== false) row[headerMap.duration] = durationStr
      if (visibleColumns.status !== false) row[headerMap.status] = record.status === 'checked-in' ? 'Checked In' : 'Checked Out'
      
      return row
    })
    
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    XLSX.writeFile(workbook, `Report-${template.name}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToCSVWithTemplate = async () => {
    if (!selectedTemplateId || templates.length === 0) {
      exportToCSV()
      return
    }
    
    const template = templates.find(t => t._id === selectedTemplateId)
    if (!template) {
      exportToCSV()
      return
    }
    
    const visibleColumns = template.layout.visibleColumns || {}
    const headerMap = {
      date: 'Date',
      name: 'Name',
      idOrContact: 'ID/Contact',
      grade: 'Type',
      timeIn: 'Check-In',
      timeOut: 'Check-Out',
      purpose: 'Purpose',
      duration: 'Duration',
      status: 'Status'
    }
    
    const headers = []
    Object.keys(headerMap).forEach(key => {
      if (visibleColumns[key] !== false) {
        headers.push(headerMap[key])
      }
    })
    
    let csvContent = headers.join(',') + '\n'
    
    reportData.forEach(record => {
      const checkIn = new Date(record.checkInTime)
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
      const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
      const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
      
      const escapeCSV = (str) => {
        if (str == null) return ''
        const strValue = String(str)
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return strValue
      }
      
      const row = []
      if (visibleColumns.date !== false) row.push(escapeCSV(checkIn.toLocaleDateString()))
      if (visibleColumns.name !== false) row.push(escapeCSV(record.name || 'Unknown'))
      if (visibleColumns.idOrContact !== false) row.push(escapeCSV(record.idNumber || '-'))
      if (visibleColumns.grade !== false) {
        row.push(escapeCSV(record.type === 'student' ? 'Student' : 
                          record.type === 'staff' ? 'Staff' : 
                          record.type === 'visitor' ? 'Visitor' : 'Unknown'))
      }
      if (visibleColumns.timeIn !== false) row.push(escapeCSV(checkIn.toLocaleTimeString()))
      if (visibleColumns.timeOut !== false) row.push(escapeCSV(checkOut ? checkOut.toLocaleTimeString() : '-'))
      if (visibleColumns.purpose !== false) row.push(escapeCSV(record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit')))
      if (visibleColumns.duration !== false) row.push(escapeCSV(durationStr))
      if (visibleColumns.status !== false) row.push(escapeCSV(record.status === 'checked-in' ? 'Checked In' : 'Checked Out'))
      
      csvContent += row.join(',') + '\n'
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `Report-${template.name}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    if (reportData.length === 0) {
      Swal.fire({
        title: 'No Data Available',
        text: 'No data to export. Please generate a report first.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    try {
      // Verify autoTable is available (async)
      const isAvailable = await verifyAutoTable()
      if (!isAvailable) {
        console.error('❌ autoTable is not available')
        console.error('Troubleshooting steps:')
        console.error('1. Stop dev server (Ctrl+C)')
        console.error('2. Delete node_modules/.vite folder')
        console.error('3. Run: npm install')
        console.error('4. Restart: npm run dev')
        console.error('5. Hard refresh: Ctrl+Shift+R')
        Swal.fire({
          title: 'Plugin Error',
          html: '❌ Error: autoTable plugin not loaded.<br/><br/>Please:<br/>1. Stop dev server (Ctrl+C)<br/>2. Delete node_modules/.vite folder<br/>3. Run: npm install<br/>4. Restart: npm run dev<br/>5. Hard refresh: Ctrl+Shift+R',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        return
      }
      
      // ===== PDF CONFIGURATION (CUSTOMIZABLE) =====
      const config = {
        // Report Title
        reportTitle: 'Attendance Report',
        
        // Logo Path (can be changed)
        logoPath: '/src/assets/img/Logo.jpg',
        
        // Organization Information
        organizationName: 'Bukidnon Studies Center',
        organizationAddress: 'Bukidnon, Philippines',
        organizationContact: 'Email: info@bsc.edu.ph | Phone: (088) 123-4567',
        
        // Footer Text
        footerPreparedBy: 'Prepared by:',
        footerCheckedBy: 'Checked by:',
        
        // Margins (in mm)
        marginTop: 30,
        marginBottom: 25,
        marginLeft: 15,
        marginRight: 15,
        
        // Table Column Visibility (set to false to hide a column)
        showColumns: {
          date: true,
          name: true,
          idOrContact: true, // Student/Faculty ID or Visitor contact number
          type: true,
          timeIn: true,
          timeOut: true,
          status: true,
          duration: true
        }
      }
      
      // Create jsPDF instance AFTER plugin is loaded
      const doc = new jsPDF('p', 'mm', 'a4')
      
      // Verify autoTable is available on this instance
        if (typeof doc.autoTable !== 'function') {
          console.error('❌ autoTable not available on doc instance')
          Swal.fire({
            title: 'Plugin Error',
            html: '❌ Error: autoTable plugin not attached to jsPDF.<br/><br/>Please:<br/>1. Hard refresh: Ctrl+Shift+R<br/>2. Restart dev server: npm run dev',
            icon: 'error',
            confirmButtonColor: '#dc143c'
          })
          return
        }
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Helper function to add header
      const addHeader = () => {
        const headerY = config.marginTop - 20
        
        // Add Logo (Left Side)
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          logoImg.src = config.logoPath
          
          // Try to load logo from various sources
          const logoSources = [
            config.logoPath,
            '/src/assets/img/Logo.jpg',
            '/Logo.jpg',
            'logo.png'
          ]
          
          let logoAdded = false
          for (const logoSource of logoSources) {
            try {
              const img = document.querySelector(`img[src*="Logo"]`) || 
                         document.querySelector(`img[alt*="BSC"]`) ||
                         document.querySelector(`img[alt*="logo"]`)
              
              if (img && img.complete && img.naturalWidth > 0) {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                ctx.drawImage(img, 0, 0)
                const imgData = canvas.toDataURL('image/png', 0.9)
                const logoWidth = 25
              const logoHeight = (canvas.height * logoWidth) / canvas.width
                doc.addImage(imgData, 'PNG', config.marginLeft, headerY, logoWidth, logoHeight)
                logoAdded = true
                break
              }
            } catch (e) {
              continue
            }
          }
          
          if (!logoAdded) {
            // Draw a placeholder box for logo
            doc.setDrawColor(200, 200, 200)
            doc.setFillColor(245, 245, 245)
            doc.rect(config.marginLeft, headerY, 25, 15, 'FD')
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text('LOGO', config.marginLeft + 12.5, headerY + 8, { align: 'center' })
          }
        } catch (e) {
          console.log('Logo not added:', e)
      }
      
        // Report Title (Center)
        doc.setFontSize(18)
      doc.setTextColor(220, 20, 60)
      doc.setFont('helvetica', 'bold')
      const reportTypeText = reportType === 'today' ? 'Today' : 
                            reportType === 'week' ? 'This Week' : 
                            reportType === 'month' ? 'This Month' : 
                            `Custom Range (${startDate} to ${endDate})`
        doc.text(`${config.reportTitle} - ${reportTypeText}`, pageWidth / 2, headerY + 8, { align: 'center' })
        
        // Organization Information (Right Side)
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        const orgInfoY = headerY + 3
        doc.text(config.organizationName, pageWidth - config.marginRight, orgInfoY, { align: 'right' })
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        doc.text(config.organizationAddress, pageWidth - config.marginRight, orgInfoY + 5, { align: 'right' })
        doc.text(config.organizationContact, pageWidth - config.marginRight, orgInfoY + 9, { align: 'right' })
        
        // Report Metadata
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        const metadataY = headerY + 20
        doc.text(`Generated: ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, config.marginLeft, metadataY)
      
      const students = reportData.filter(r => r.type === 'student').length
      const staff = reportData.filter(r => r.type === 'staff').length
      const visitors = reportData.filter(r => r.type === 'visitor').length
        doc.text(`Total: ${reportData.length} | Students: ${students} | Staff: ${staff} | Visitors: ${visitors}`, 
                 pageWidth - config.marginRight, metadataY, { align: 'right' })
      }
      
      // Helper function to add footer
      const addFooter = (currentPage, totalPages) => {
        const footerY = pageHeight - config.marginBottom
        
        // Draw footer line
        doc.setDrawColor(200, 200, 200)
        doc.line(config.marginLeft, footerY - 15, pageWidth - config.marginRight, footerY - 15)
        
        // Prepared by and Checked by
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.text(`${config.footerPreparedBy} __________`, config.marginLeft, footerY - 8)
        doc.text(`${config.footerCheckedBy} ___________`, config.marginLeft, footerY - 3)
        
        // Page number and date
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        const dateTime = new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth / 2, footerY - 8, { align: 'center' })
        doc.text(`Generated: ${dateTime}`, pageWidth / 2, footerY - 3, { align: 'center' })
      }
      
      // Process table data
      const tableData = []
      const headers = []
      
      // Build headers based on visibility settings
      if (config.showColumns.date) headers.push('Date')
      if (config.showColumns.name) headers.push('Visitor Name')
      if (config.showColumns.idOrContact) headers.push('ID / Contact No.')
      if (config.showColumns.type) headers.push('Grade/Level')
      if (config.showColumns.timeIn) headers.push('Time In')
      if (config.showColumns.timeOut) headers.push('Time Out')
      if (config.showColumns.status) headers.push('Purpose')
      if (config.showColumns.duration) headers.push('Duration')
      
      reportData.forEach((record, index) => {
        try {
          if (!record || !record.checkInTime) {
            console.warn(`Invalid record at index ${index}:`, record)
            return
          }
          
          const checkIn = new Date(record.checkInTime)
          if (isNaN(checkIn.getTime())) {
            console.warn(`Invalid checkInTime at index ${index}:`, record.checkInTime)
            return
          }
          
          let checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
          if (checkOut && isNaN(checkOut.getTime())) {
            checkOut = null
          }
          
          const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
          const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
          
          // Format data
          const dateStr = checkIn.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }) || 'N/A'
          
          const timeInStr = checkIn.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) || 'N/A'
          
          const timeOutStr = checkOut ? checkOut.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : '-'
          
          const nameStr = (record.name || 'Unknown').toString().trim()
          const idOrContactStr = (record.idNumber || '').toString().trim() || '-'
          const typeStr = record.type === 'student' ? 'Student' : 
                         record.type === 'staff' ? 'Staff' : 
                         record.type === 'visitor' ? 'Visitor' : 'Unknown'
          const purposeStr = record.notes || (record.status === 'checked-in' ? 'Visit' : 'Completed Visit')
          
          // Build row based on visibility settings
          const row = []
          if (config.showColumns.date) row.push(dateStr)
          if (config.showColumns.name) row.push(nameStr)
          if (config.showColumns.idOrContact) row.push(idOrContactStr)
          if (config.showColumns.type) row.push(typeStr)
          if (config.showColumns.timeIn) row.push(timeInStr)
          if (config.showColumns.timeOut) row.push(timeOutStr)
          if (config.showColumns.status) row.push(purposeStr)
          if (config.showColumns.duration) row.push(durationStr)
          
          if (row.length === headers.length) {
            tableData.push(row)
          }
        } catch (e) {
          console.error(`Error processing record at index ${index}:`, e, record)
        }
      })
      
      if (tableData.length === 0) {
        Swal.fire({
          title: 'No Valid Data',
          text: 'No valid data to export. Please check your report data.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        return
      }
      
      // Add header to first page
      addHeader()
      
      // Generate table with autoTable
      try {
        const tableStartY = config.marginTop + 15
        
        // autoTable should already be loaded and verified above
        // Just double-check before using
        if (typeof doc.autoTable !== 'function') {
          console.error('❌ autoTable not available on doc instance')
          Swal.fire({
            title: 'Plugin Error',
            html: '❌ Error: autoTable plugin not attached.<br/><br/>Please hard refresh: Ctrl+Shift+R',
            icon: 'error',
            confirmButtonColor: '#dc143c'
          })
          return
        }
        
        console.log('✅ Using autoTable to generate table')
        
        // Verify doc has internal property (required by autoTable)
        if (!doc || !doc.internal) {
          throw new Error('jsPDF instance is invalid - missing internal property')
        }
        
        // Verify doc.internal has required methods
        if (!doc.internal.getFontSize || typeof doc.internal.getFontSize !== 'function') {
          throw new Error('jsPDF instance is corrupted - missing internal.getFontSize method')
        }
        
        // Use the autoTable function
        const tableConfig = {
          head: [headers],
            body: tableData,
          startY: tableStartY,
          margin: { 
            top: config.marginTop + 15, 
            left: config.marginLeft, 
            right: config.marginRight,
            bottom: config.marginBottom + 20
          },
            styles: { 
              fontSize: 8,
              cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            overflow: 'linebreak',
            cellWidth: 'wrap'
            },
            headStyles: { 
              fillColor: [220, 20, 60],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
            lineColor: [255, 255, 255],
            lineWidth: 0.1
          },
          bodyStyles: {
            lineColor: [0, 0, 0],
            lineWidth: 0.1
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
          theme: 'striped',
          showHead: 'everyPage',
          didDrawPage: function (data) {
            // Add header and footer to each page
            if (data.pageNumber > 1) {
              addHeader()
            }
            addFooter(data.pageNumber, data.pageCount)
          },
          didParseCell: function (data) {
            // Ensure all cell values are strings
            if (data.cell.text !== null && data.cell.text !== undefined) {
              data.cell.text = String(data.cell.text)
            }
          }
        }
        
        // Call autoTable - ensure it's called as a method on doc
        try {
          // Call as method (this should work if properly loaded)
          if (typeof doc.autoTable === 'function') {
            doc.autoTable(tableConfig)
          } else {
            throw new Error('autoTable is not a function on doc instance')
          }
        } catch (callError) {
          console.error('Error calling autoTable:', callError)
          // If calling as method fails, try with explicit context
          if (typeof doc.autoTable === 'function') {
            doc.autoTable.call(doc, tableConfig)
          } else {
            throw callError
          }
        }
        
        // Add footer to first page if only one page (autoTable handles multi-page footers via didDrawPage)
        const totalPages = doc.internal.getNumberOfPages()
        if (totalPages === 1) {
          addFooter(1, 1)
        }
      } catch (autoTableError) {
        console.error('Error in autoTable:', autoTableError)
        console.error('Full error:', autoTableError)
        Swal.fire({
          title: 'PDF Table Error',
          html: `Error generating PDF table: ${autoTableError.message}<br/><br/>Please check the browser console for details. If the error persists, try:<br/>1. Restarting the development server<br/>2. Running: npm install jspdf-autotable`,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        return
      }
      
      // Save PDF
      const fileName = `BSC-Attendance-Report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      Swal.fire({
        title: 'PDF Generation Error',
        text: `Error generating PDF: ${error.message}. Please check the console for details.`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    }
  }
  
  const exportToExcel = () => {
    if (reportData.length === 0) {
      Swal.fire({
        title: 'No Data Available',
        text: 'No data to export. Please generate a report first.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    try {
    const worksheetData = reportData.map(record => {
        try {
          if (!record || !record.checkInTime) {
            console.warn('Invalid record:', record)
            return null
          }
          
      const checkIn = new Date(record.checkInTime)
          if (isNaN(checkIn.getTime())) {
            console.warn('Invalid checkInTime:', record.checkInTime)
            return null
          }
          
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
          if (checkOut && isNaN(checkOut.getTime())) {
            console.warn('Invalid checkOutTime:', record.checkOutTime)
            return null
          }
          
      const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
      const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
      const idOrContact = (record.idNumber || '').toString().trim() || '-'
          
      return {
            Date: checkIn.toLocaleDateString() || 'N/A',
            Name: record.name || 'Unknown',
            'ID / Contact': idOrContact,
            Type: record.type === 'student' ? 'Student' : record.type === 'staff' ? 'Staff' : record.type === 'visitor' ? 'Visitor' : 'Unknown',
            'Check-In': checkIn.toLocaleTimeString() || 'N/A',
        'Check-Out': checkOut ? checkOut.toLocaleTimeString() : '-',
            Status: record.status === 'checked-in' ? 'Checked In' : record.status === 'checked-out' ? 'Checked Out' : 'Unknown',
        Duration: durationStr
          }
        } catch (e) {
          console.error('Error processing record:', e, record)
          return null
        }
      }).filter(row => row !== null)
      
      if (worksheetData.length === 0) {
        Swal.fire({
          title: 'No Valid Data',
          text: 'No valid data to export. Please check your report data.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        return
      }
    
    const workbook = XLSX.utils.book_new()
    
    const reportTypeText = reportType === 'today' ? 'Today' : 
                          reportType === 'week' ? 'This Week' : 
                          reportType === 'month' ? 'This Month' : 
                          `Custom Range (${startDate} to ${endDate})`
    
    const students = reportData.filter(r => r.type === 'student').length
    const staff = reportData.filter(r => r.type === 'staff').length
    const visitors = reportData.filter(r => r.type === 'visitor').length
    const checkedIn = reportData.filter(r => r.status === 'checked-in').length
    
    const headerData = [
      ['BUKIDNON STUDIES CENTER'],
      ['Attendance Report'],
      [''],
      [`Report Period: ${reportTypeText}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Total Records: ${reportData.length}`],
      [`Students: ${students} | Staff: ${staff} | Visitors: ${visitors} | Currently Inside: ${checkedIn}`],
      [''],
      ['Date', 'Name', 'ID / Contact', 'Type', 'Check-In', 'Check-Out', 'Status', 'Duration']
    ]
    
    const dataRows = worksheetData.map(row => [
        row.Date || '',
        row.Name || '',
        row['ID / Contact'] || '',
        row.Type || '',
        row['Check-In'] || '',
        row['Check-Out'] || '',
        row.Status || '',
        row.Duration || ''
    ])
    
    const allData = [...headerData, ...dataRows]
    const worksheet = XLSX.utils.aoa_to_sheet(allData)
    
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 25 }, // Name
      { wch: 18 }, // ID / Contact
      { wch: 10 }, // Type
      { wch: 12 }, // Check-In
      { wch: 12 }, // Check-Out
      { wch: 12 }, // Status
      { wch: 10 }  // Duration
    ]
    
    if (!worksheet['!merges']) worksheet['!merges'] = []
    worksheet['!merges'].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 6 } }
    )
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    XLSX.writeFile(workbook, `BSC-Attendance-Report-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error generating Excel:', error)
      Swal.fire({
        title: 'Excel Generation Error',
        text: `Error generating Excel: ${error.message}. Please check the console for details.`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    }
  }
  
  const exportToCSV = () => {
    if (reportData.length === 0) {
      Swal.fire({
        title: 'No Data Available',
        text: 'No data to export. Please generate a report first.',
        icon: 'warning',
        confirmButtonColor: '#dc143c'
      })
      return
    }
    
    try {
    const reportTypeText = reportType === 'today' ? 'Today' : 
                          reportType === 'week' ? 'This Week' : 
                          reportType === 'month' ? 'This Month' : 
                          `Custom Range (${startDate} to ${endDate})`
    
    const students = reportData.filter(r => r.type === 'student').length
    const staff = reportData.filter(r => r.type === 'staff').length
    const visitors = reportData.filter(r => r.type === 'visitor').length
    const checkedIn = reportData.filter(r => r.status === 'checked-in').length
    
    let csvContent = '# BUKIDNON STUDIES CENTER\n'
    csvContent += '# Attendance Report\n'
    csvContent += '#\n'
    csvContent += `# Report Period: ${reportTypeText}\n`
    csvContent += `# Generated: ${new Date().toLocaleString()}\n`
    csvContent += `# Total Records: ${reportData.length}\n`
    csvContent += `# Students: ${students} | Staff: ${staff} | Visitors: ${visitors} | Currently Inside: ${checkedIn}\n`
    csvContent += '#\n'
    csvContent += 'Date,Name,ID/Contact,Type,Check-In,Check-Out,Status,Duration\n'
    
    reportData.forEach(record => {
        try {
          if (!record || !record.checkInTime) {
            console.warn('Invalid record:', record)
            return
          }
          
      const checkIn = new Date(record.checkInTime)
          if (isNaN(checkIn.getTime())) {
            console.warn('Invalid checkInTime:', record.checkInTime)
            return
          }
          
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null
          if (checkOut && isNaN(checkOut.getTime())) {
            console.warn('Invalid checkOutTime:', record.checkOutTime)
            return
          }
          
      const duration = checkOut ? Math.floor((checkOut - checkIn) / (1000 * 60)) : 0
      const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
      const idOrContact = (record.idNumber || '').toString().trim() || '-'
          
          // Escape CSV special characters (commas, quotes, newlines)
          const escapeCSV = (str) => {
            if (str == null) return ''
            const strValue = String(str)
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
              return `"${strValue.replace(/"/g, '""')}"`
            }
            return strValue
          }
      
      const row = [
            escapeCSV(checkIn.toLocaleDateString() || 'N/A'),
            escapeCSV(record.name || 'Unknown'),
            escapeCSV(idOrContact),
            escapeCSV(record.type === 'student' ? 'Student' : record.type === 'staff' ? 'Staff' : record.type === 'visitor' ? 'Visitor' : 'Unknown'),
            escapeCSV(checkIn.toLocaleTimeString() || 'N/A'),
            escapeCSV(checkOut ? checkOut.toLocaleTimeString() : '-'),
            escapeCSV(record.status === 'checked-in' ? 'Checked In' : record.status === 'checked-out' ? 'Checked Out' : 'Unknown'),
            escapeCSV(durationStr)
      ].join(',')
      
      csvContent += row + '\n'
        } catch (e) {
          console.error('Error processing record:', e, record)
        }
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `BSC-Attendance-Report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating CSV:', error)
      Swal.fire({
        title: 'CSV Generation Error',
        text: `Error generating CSV: ${error.message}. Please check the console for details.`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    }
  }

  const generateReport = async () => {
    setReportLoading(true)
    try {
      const storedUser = localStorage.getItem('admin_user')
      if (!storedUser) {
        Swal.fire({
          title: 'Authentication Required',
          text: 'Please log in to generate reports.',
          icon: 'warning',
          confirmButtonColor: '#dc143c'
        })
        setReportLoading(false)
        return
      }
      const userData = JSON.parse(storedUser)
      let url = `/api/attendance/reports?adminId=${userData.id}&type=${reportType}`
      if (reportType === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const response = await fetch(url, {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        const records = data.records || []
        console.log('Report data loaded:', records.length, 'records')
        setReportData(records)
        if (records.length === 0) {
          Swal.fire({
            title: 'No Records Found',
            text: 'No attendance records found for the selected period.',
            icon: 'info',
            confirmButtonColor: '#dc143c'
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch report data' }))
        Swal.fire({
          title: 'Report Generation Failed',
          text: `Error: ${errorData.message || 'Failed to generate report'}`,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Error generating report:', error)
      Swal.fire({
        title: 'Report Generation Error',
        text: `Error generating report: ${error.message}`,
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally { 
      setReportLoading(false) 
    }
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">📊 Attendance Reports</h2>
          <p className="dash-subtitle">Generate and view attendance statistics reports</p>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        {/* Filter Bar */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setReportType('today')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: reportType === 'today' ? 'none' : '1px solid #e5e7eb',
                background: reportType === 'today' ? 'linear-gradient(135deg, #dc143c, #ff8c00)' : '#fff',
                color: reportType === 'today' ? '#fff' : '#495057',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📆 Today
            </button>
            <button
              onClick={() => setReportType('week')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: reportType === 'week' ? 'none' : '1px solid #e5e7eb',
                background: reportType === 'week' ? 'linear-gradient(135deg, #dc143c, #ff8c00)' : '#fff',
                color: reportType === 'week' ? '#fff' : '#495057',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📅 Week
            </button>
            <button
              onClick={() => setReportType('month')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: reportType === 'month' ? 'none' : '1px solid #e5e7eb',
                background: reportType === 'month' ? 'linear-gradient(135deg, #dc143c, #ff8c00)' : '#fff',
                color: reportType === 'month' ? '#fff' : '#495057',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📅 Month
            </button>
            <button
              onClick={() => setReportType('custom')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: reportType === 'custom' ? 'none' : '1px solid #e5e7eb',
                background: reportType === 'custom' ? 'linear-gradient(135deg, #dc143c, #ff8c00)' : '#fff',
                color: reportType === 'custom' ? '#fff' : '#495057',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📆 Custom
            </button>
            
            {reportType === 'custom' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
              </div>
            )}
            
            <button
              onClick={generateReport}
              disabled={reportLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc143c, #ff8c00)',
                color: '#fff',
                fontWeight: '600',
                cursor: reportLoading ? 'not-allowed' : 'pointer',
                opacity: reportLoading ? 0.7 : 1
              }}
            >
              {reportLoading ? '⏳ Generating...' : '📊 Generate Report'}
            </button>
          </div>
        </div>

        {/* Summary Statistics Cards */}
        {reportData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc143c, #ff8c00)', padding: '16px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(220,20,60,0.2)' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px' }}>👥 Total Visitors</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{reportData.length}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #dc143c, #ff8c00)', padding: '16px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(220,20,60,0.2)' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px' }}>🎓 Students</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{reportData.filter(r => r.type === 'student').length}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #dc143c, #ff8c00)', padding: '16px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(220,20,60,0.2)' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px' }}>👨‍💼 Staff</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{reportData.filter(r => r.type === 'staff').length}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #dc143c, #ff8c00)', padding: '16px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(220,20,60,0.2)' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px' }}>✅ Currently Inside</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{reportData.filter(r => r.status === 'checked-in').length}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #dc143c, #ff8c00)', padding: '16px', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(220,20,60,0.2)' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px' }}>⏱️ Avg Stay Time</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>--</div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {reportData.length > 0 && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', color: '#495057', fontSize: '18px', fontWeight: '700' }}>📋 Attendance Details</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>ID / Contact</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Check-In</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Check-Out</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((record, index) => {
                    const checkIn = new Date(record.checkInTime)
                    const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : new Date()
                    const duration = Math.floor((checkOut - checkIn) / (1000 * 60))
                    const durationStr = duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '-'
                    const idOrContact = (record.idNumber || '').toString().trim() || '-'
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ padding: '12px' }}>{checkIn.toLocaleDateString()}</td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{record.name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{idOrContact}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: record.type === 'student' ? '#dbeafe' : record.type === 'staff' ? 'rgba(255, 140, 0, 0.1)' : '#fef3c7',
                            color: record.type === 'student' ? '#1e40af' : record.type === 'staff' ? '#B8860B' : '#92400e'
                          }}>
                            {record.type === 'student' ? '🎓 Student' : record.type === 'staff' ? '👨‍💼 Staff' : '👤 Visitor'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{checkIn.toLocaleTimeString()}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: record.status === 'checked-in' ? 'rgba(22, 101, 52, 0.1)' : '#f3f4f6',
                            color: record.status === 'checked-in' ? '#166534' : '#6b7280'
                          }}>
                            {record.status === 'checked-in' ? '✅ Checked In' : '🚪 Checked Out'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{durationStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Export Buttons and Footer */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#6c757d' }}>
                📊 Total Records: {reportData.length} • Last Updated: {new Date().toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleExportClick('pdf')}
                  disabled={reportData.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportData.length === 0 ? '#9ca3af' : '#dc143c',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: reportData.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: reportData.length === 0 ? 0.6 : 1
                  }}
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => handleExportClick('excel')}
                  disabled={reportData.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportData.length === 0 ? '#9ca3af' : '#2563eb',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: reportData.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: reportData.length === 0 ? 0.6 : 1
                  }}
                >
                  📊 Export Excel
                </button>
                <button
                  onClick={() => handleExportClick('csv')}
                  disabled={reportData.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportData.length === 0 ? '#9ca3af' : '#22c55e',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: reportData.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: reportData.length === 0 ? 0.6 : 1
                  }}
                >
                  📈 Export CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTemplateModal(false)
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', color: '#111827', fontSize: '20px', fontWeight: '700' }}>
              Select Template
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Choose Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff'
                }}
              >
                <option value="">-- Use Default Format --</option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplateId && (() => {
              const template = templates.find(t => t._id === selectedTemplateId)
              return template ? (
                <div style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#6c757d'
                }}>
                  <strong>Template:</strong> {template.name}<br/>
                  <strong>Title:</strong> {template.layout.title}<br/>
                  {template.layout.headerTitle && (
                    <><strong>Header:</strong> {template.layout.headerTitle}<br/></>
                  )}
                  <strong>Orientation:</strong> {template.layout.orientation}
                </div>
              ) : null
            })()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTemplateModal(false)}
                disabled={templateLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: templateLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                disabled={templateLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: templateLoading ? '#9ca3af' : 
                             selectedExportType === 'pdf' ? '#dc143c' :
                             selectedExportType === 'excel' ? '#2563eb' : '#22c55e',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: templateLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {templateLoading ? 'Exporting...' : 
                 selectedExportType === 'pdf' ? '📄 Export PDF' :
                 selectedExportType === 'excel' ? '📊 Export Excel' : '📈 Export CSV'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReports

