import jsPDF from 'jspdf'

// Import jspdf-autotable and manually apply the plugin
// This ensures it works correctly with Vite
let pluginApplied = false

const applyAutoTablePlugin = async () => {
  if (pluginApplied) return true
  
  try {
    // Import the plugin module
    const autoTableModule = await import('jspdf-autotable')
    
    // Check if applyPlugin function exists
    if (autoTableModule.applyPlugin) {
      // Manually apply the plugin to jsPDF
      autoTableModule.applyPlugin(jsPDF)
      pluginApplied = true
      console.log('✅ autoTable plugin applied manually')
      return true
    } else if (autoTableModule.default && typeof autoTableModule.default === 'function') {
      // Try default export as function
      autoTableModule.default(jsPDF)
      pluginApplied = true
      console.log('✅ autoTable plugin applied via default export')
      return true
    } else {
      // Plugin should auto-apply, but verify
      await new Promise(resolve => setTimeout(resolve, 100))
      const testDoc = new jsPDF()
      if (typeof testDoc.autoTable === 'function') {
        pluginApplied = true
        console.log('✅ autoTable plugin auto-applied')
        return true
      }
    }
    
    console.warn('⚠️ Could not apply autoTable plugin')
    return false
  } catch (error) {
    console.error('❌ Failed to apply autoTable plugin:', error)
    return false
  }
}

// Apply plugin on module load
applyAutoTablePlugin().catch(err => {
  console.warn('Pre-apply failed, will try on demand:', err)
})

// Verify that autoTable is attached
let verified = false
export const verifyAutoTable = async () => {
  if (verified) return true
  
  // Ensure plugin is applied
  if (!pluginApplied) {
    const applied = await applyAutoTablePlugin()
    if (!applied) {
      return false
    }
  }
  
  try {
    // Create a test instance to check if plugin is attached
    const testDoc = new jsPDF()
    const isAvailable = typeof testDoc.autoTable === 'function'
    
    if (isAvailable) {
      verified = true
      console.log('✅ autoTable is available')
      return true
    } else {
      console.warn('⚠️ autoTable not found on jsPDF instance')
      return false
    }
  } catch (e) {
    console.error('Error checking autoTable:', e)
    return false
  }
}

// Export jsPDF for use in components
export { jsPDF }

