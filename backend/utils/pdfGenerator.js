const puppeteer = require('puppeteer')
const { buildHTML } = require('./htmlBuilder')

/**
 * Generate PDF from HTML using Puppeteer
 * @param {String} html - HTML content
 * @param {Object} options - PDF generation options
 * @returns {Buffer} PDF buffer
 */
async function generatePDF(html, options = {}) {
  const {
    orientation = 'portrait',
    margin = '15mm',
    format = 'A4',
    footerTemplate = '<div></div>'
  } = options

  let browser = null
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    const page = await browser.newPage()
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format,
      orientation: orientation,
      margin: {
        top: margin,
        right: margin,
        bottom: margin,
        left: margin
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: footerTemplate
    })

    return pdfBuffer
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error(`PDF generation failed: ${error.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Generate PDF report from data and template
 * @param {Array} data - Report data
 * @param {Object} templateLayout - Template layout configuration
 * @returns {Buffer} PDF buffer
 */
async function generateReportPDF(data, templateLayout) {
  try {
    // Build HTML from data and template
    const html = buildHTML(data, templateLayout)
    
    // Build footer template with page numbers if enabled
    const footerShowPageNumber = templateLayout.footerShowPageNumber !== false
    let footerTemplate = '<div></div>'
    
    if (footerShowPageNumber) {
      footerTemplate = `
        <div style="font-size: 9px; color: #4b5563; width: 100%; padding: 0 20px; text-align: right;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    }
    
    // Generate PDF with custom footer
    const pdfBuffer = await generatePDF(html, {
      orientation: templateLayout.orientation || 'portrait',
      margin: templateLayout.pageMargin || '15mm',
      format: 'A4',
      footerTemplate: footerTemplate
    })

    return pdfBuffer
  } catch (error) {
    console.error('Error generating report PDF:', error)
    throw error
  }
}

module.exports = {
  generatePDF,
  generateReportPDF
}

