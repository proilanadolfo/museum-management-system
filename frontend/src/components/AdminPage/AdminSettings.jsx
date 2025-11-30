import React, { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import '../../styles/AdminCss/settings.css'

const defaultMissionSection = {
  heading: 'Our Commitment',
  title: 'Preserving History, Inspiring Future',
  description: 'We are dedicated to the preservation, protection, and promotion of cultural heritage through rigorous scholarship, innovative education, and meaningful community engagement.',
  rotationInterval: 6000,
  stats: [
    { label: 'Years of Excellence', value: 25, suffix: '' },
    { label: 'Active Programs', value: 15, suffix: '' },
    { label: 'Research Studies', value: 500, suffix: '+' }
  ],
  images: []
}

const MIN_MISSION_ROTATION = 3000
const MAX_MISSION_ROTATION = 20000
const MAX_MISSION_IMAGES = 6

const clampMissionRotation = (value) => {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return defaultMissionSection.rotationInterval
  }
  return Math.min(Math.max(numericValue, MIN_MISSION_ROTATION), MAX_MISSION_ROTATION)
}

const toStringId = (value) => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') {
      return value.toHexString()
    }
    if (value.$oid) {
      return value.$oid
    }
  }
  return String(value)
}

const normalizeMissionSection = (section = {}) => {
  const base = typeof section === 'object' && section !== null ? section : {}
  const stats = Array.isArray(base.stats) && base.stats.length
    ? base.stats.map(stat => ({
        _id: toStringId(stat._id),
        label: stat.label || '',
        value: stat.value ?? 0,
        suffix: stat.suffix || ''
      }))
    : defaultMissionSection.stats.map(stat => ({ ...stat }))

  const images = Array.isArray(base.images)
    ? base.images.map((img, idx) => ({
        _id: toStringId(img._id),
        url: img.url,
        caption: img.caption || '',
        order: typeof img.order === 'number' ? img.order : idx
      }))
    : []

  return {
    heading: base.heading || defaultMissionSection.heading,
    title: base.title || defaultMissionSection.title,
    description: base.description || defaultMissionSection.description,
    rotationInterval: clampMissionRotation(base.rotationInterval ?? defaultMissionSection.rotationInterval),
    stats,
    images
  }
}

const sanitizeMissionSectionForSubmit = (section) => {
  const normalized = normalizeMissionSection(section)
  return {
    heading: normalized.heading.trim(),
    title: normalized.title.trim(),
    description: normalized.description.trim(),
    rotationInterval: clampMissionRotation(normalized.rotationInterval),
    stats: normalized.stats.map(stat => ({
      _id: toStringId(stat._id),
      label: stat.label.trim(),
      value: Number(stat.value) || 0,
      suffix: stat.suffix?.trim() || ''
    }))
  }
}

const getImagePreviewUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://localhost:5000/${path.replace(/^\//, '')}`
}

const AdminSettings = ({ onActiveChange }) => {
  const [museumSettings, setMuseumSettings] = useState({
    availableDays: [1, 2, 3, 4, 5],
    operatingHours: {
      0: { open: '10:00', close: '17:00' },
      1: { open: '09:00', close: '18:00' },
      2: { open: '09:00', close: '18:00' },
      3: { open: '09:00', close: '18:00' },
      4: { open: '09:00', close: '18:00' },
      5: { open: '09:00', close: '18:00' },
      6: { open: '10:00', close: '17:00' }
    },
    blockedDates: [],
    availableDates: [],
    timeSlots: [],
    minAdvanceBookingDays: 1,
    maxAdvanceBookingDays: 90,
    maxVisitorsPerSlot: 50,
    isAcceptingBookings: true,
    mission: '',
    vision: '',
    missionSection: defaultMissionSection
  })
  const [museumSettingsLoading, setMuseumSettingsLoading] = useState(false)
  const [museumSettingsError, setMuseumSettingsError] = useState('')
  const [museumSettingsSuccess, setMuseumSettingsSuccess] = useState('')
  const [showAdvancedAvailability, setShowAdvancedAvailability] = useState(false)
  const [showMuseumAvailability, setShowMuseumAvailability] = useState(false)
  const [hasPendingAvailabilityChanges, setHasPendingAvailabilityChanges] = useState(false)
  const [showMuseumInfo, setShowMuseumInfo] = useState(false)
  const [museumInfoLoading, setMuseumInfoLoading] = useState(false)
  const [museumInfoError, setMuseumInfoError] = useState('')
  const [museumInfoSuccess, setMuseumInfoSuccess] = useState('')
  const [missionImageUploading, setMissionImageUploading] = useState(false)
  const [missionImageError, setMissionImageError] = useState('')
  const [originalMuseumInfo, setOriginalMuseumInfo] = useState(null)
  const [museumInfoVersion, setMuseumInfoVersion] = useState(null)
  const [pendingMissionImages, setPendingMissionImages] = useState([])
  const [missionImagesToDelete, setMissionImagesToDelete] = useState([])
  const [hasMissionImageChanges, setHasMissionImageChanges] = useState(false)
  const missionChangesRef = useRef(false)

  // Museum info concurrency now handled optimistically via backend TBCC (no UI locks)
  const getAuthHeaders = () => {
    const raw = localStorage.getItem('admin_token')
    const token = raw && raw !== 'null' && raw !== 'undefined' ? raw : null
    return token
      ? { Authorization: `Bearer ${token}` }
      : {}
  }

  // No TBCC lock endpoints on frontend; TBCC conflict handled on save response

  const [googleCalendarStatus, setGoogleCalendarStatus] = useState({
    configured: false,
    enabled: false,
    connected: false,
    email: null
  })
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false)
  const [googleCalendarError, setGoogleCalendarError] = useState('')
  const [googleCalendarSuccess, setGoogleCalendarSuccess] = useState('')

  const handleMissionSectionChange = (field, value) => {
    setMuseumSettings(prev => ({
      ...prev,
      missionSection: {
        ...prev.missionSection,
        [field]: field === 'rotationInterval' ? value : value
      }
    }))
  }

  const handleMissionStatChange = (index, field, value) => {
    setMuseumSettings(prev => {
      const stats = prev.missionSection.stats.map((stat, idx) => {
        if (idx !== index) return stat
        return {
          ...stat,
          [field]: field === 'value' ? value : value
        }
      })
      return {
        ...prev,
        missionSection: {
          ...prev.missionSection,
          stats
        }
      }
    })
  }

  const handleMissionImageCaptionChange = (image, value) => {
    if (image?.isPending) {
      setPendingMissionImages(prev => prev.map(item => (
        item.tempId === image.tempId
          ? { ...item, caption: value }
          : item
      )))
    } else if (image?._id) {
      setMuseumSettings(prev => ({
        ...prev,
        missionSection: {
          ...prev.missionSection,
          images: prev.missionSection.images.map(existing =>
            String(existing._id) === String(image._id)
              ? { ...existing, caption: value }
              : existing
          )
        }
      }))
    }
    setHasMissionImageChanges(true)
  }

  const handleMissionImageUpload = (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const previewUrl = URL.createObjectURL(file)
    setPendingMissionImages(prev => ([
      ...prev,
      {
        tempId,
        file,
        previewUrl,
        caption: '',
        order: prev.length
      }
    ]))
    setMissionImageError('')
    setHasMissionImageChanges(true)
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleRemoveMissionImage = (image) => {
    if (image?.isPending) {
      setPendingMissionImages(prev => {
        const next = prev.filter(item => item.tempId !== image.tempId)
        URL.revokeObjectURL(image.previewUrl)
        return next
      })
      setHasMissionImageChanges(true)
      return
    }

    if (!image?._id) {
      console.warn('Cannot remove image without ID:', image)
      return
    }

    const isAlreadyMarked = missionImagesToDelete.includes(image._id)
    if (isAlreadyMarked) return

    // Just mark for deletion, don't remove from local state yet
    setMissionImagesToDelete(prev => [...prev, image._id])
    setHasMissionImageChanges(true)
  }

  const discardMissionImageChanges = () => {
    setPendingMissionImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.previewUrl))
      return []
    })
    setMissionImagesToDelete([])
    setHasMissionImageChanges(false)
  }

  const processMissionImageChanges = async () => {
    if (!hasMissionImageChanges) {
      return
    }

    setMissionImageUploading(true)
    setMissionImageError('')
    try {
      for (const imageId of missionImagesToDelete) {
        const response = await fetch(`/api/museum-settings/mission-images/${imageId}`, {
          method: 'DELETE',
          headers: {
            ...getAuthHeaders()
          }
        })
        if (!response.ok) {
          let errorMessage = 'Failed to remove mission image'
          try {
            const data = await response.json()
            if (data?.message) {
              errorMessage = data.message
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
            }
          } catch (jsonError) {
            // Response body already consumed, can't read text
            errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
          }
          
          // Don't throw error for 404 (image already deleted) or 500 (document not found)
          if (response.status === 404 || response.status === 500) {
            console.warn('Mission image delete failed (may already be deleted):', response.status, errorMessage)
            // Continue with next image instead of throwing
            continue
          }
          
          console.error('Mission image delete failed', response.status, errorMessage)
          throw new Error(errorMessage)
        }
      }

      for (const pending of pendingMissionImages) {
        const formData = new FormData()
        formData.append('image', pending.file)
        if (pending.caption) {
          formData.append('caption', pending.caption)
        }
        const response = await fetch('/api/museum-settings/mission-images', {
          method: 'POST',
          headers: {
            ...getAuthHeaders()
          },
          body: formData
        })
        if (!response.ok) {
          let errorMessage = 'Failed to upload mission image'
          try {
            const data = await response.json()
            if (data?.message) {
              errorMessage = data.message
            }
          } catch (jsonError) {
            try {
              const text = await response.text()
              if (text) errorMessage = text
            } catch (textError) {
              errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
            }
          }
          console.error('Mission image upload failed', response.status, errorMessage)
          throw new Error(errorMessage)
        }
      }

      discardMissionImageChanges()
      await fetchMuseumSettings()
    } catch (error) {
      console.error('Mission image change error:', error)
      setMissionImageError(error.message || 'An error occurred while saving mission images')
      throw error
    } finally {
      setMissionImageUploading(false)
    }
  }

  const hasTextualInfoChanges = () => {
    if (!originalMuseumInfo) return false
    const currentInfo = JSON.stringify({
      mission: museumSettings.mission || '',
      vision: museumSettings.vision || '',
      missionSection: sanitizeMissionSectionForSubmit(museumSettings.missionSection)
    })
    return currentInfo !== originalMuseumInfo
  }

  const handleSaveMuseumInfo = async () => {
    const textChanged = hasTextualInfoChanges()

    if (!textChanged && !hasMissionImageChanges) {
      Swal.fire({
        title: 'No Changes Detected',
        text: 'Please make changes to the mission information or carousel images before saving.',
        icon: 'info',
        confirmButtonColor: '#dc143c'
      })
      return
    }

    let imageChangesSuccess = false
    if (hasMissionImageChanges) {
      try {
        await processMissionImageChanges()
        imageChangesSuccess = true
      } catch (error) {
        Swal.fire({
          title: 'Image Upload Failed',
          text: error.message || 'An error occurred while saving mission images. Please try again.',
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        return
      }
    }

    if (textChanged) {
      try {
        await updateMuseumInfo()
        // Refresh settings after successful update
        await fetchMuseumSettings()
      } catch (error) {
        // Error already handled in updateMuseumInfo
        return
      }
    } else {
      // Only image changes were made
      await fetchMuseumSettings()
      if (imageChangesSuccess) {
        Swal.fire({
          title: 'Success!',
          text: 'Mission carousel images have been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
      }
    }
  }

  useEffect(() => {
    fetchMuseumSettings()
    fetchGoogleCalendarStatus()
  }, [])

  // Reset error states when navigating away from museum info
  useEffect(() => {
    if (!showMuseumInfo) {
      setMuseumInfoError('')
      setMuseumInfoSuccess('')
      setMissionImageError('')
    }
  }, [showMuseumInfo])

  useEffect(() => {
    missionChangesRef.current = hasMissionImageChanges
  }, [hasMissionImageChanges])

  useEffect(() => {
    if (!('EventSource' in window)) return undefined

    const eventSource = new EventSource('/api/realtime/stream')
    const handleSettingsEvent = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const { action, settings } = payload.data || {}
        if (action === 'updated' && settings?.missionSection) {
          if (missionChangesRef.current) return
          setMuseumSettings(prev => ({
            ...prev,
            missionSection: normalizeMissionSection(settings.missionSection)
          }))
        }
      } catch (error) {
        console.error('Mission section SSE (admin) error:', error)
      }
    }

    eventSource.addEventListener('settings', handleSettingsEvent)

    return () => {
      eventSource.removeEventListener('settings', handleSettingsEvent)
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const googleCalendarSuccess = urlParams.get('googleCalendarSuccess')
    const googleCalendarError = urlParams.get('googleCalendarError')
    
    if (googleCalendarSuccess === 'true') {
      setGoogleCalendarSuccess('Google Calendar connected successfully!')
      fetchGoogleCalendarStatus()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    if (googleCalendarError) {
      setGoogleCalendarError(decodeURIComponent(googleCalendarError))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchMuseumSettings = async () => {
    setMuseumSettingsLoading(true)
    setMuseumSettingsError('')
    // Also set museumInfoLoading if we're on the museum info view
    if (showMuseumInfo) {
      setMuseumInfoLoading(true)
      setMuseumInfoError('')
    }
    try {
      const response = await fetch('/api/museum-settings', {
        headers: {
          ...getAuthHeaders()
        }
      })
      // Don't redirect on 401 for settings fetch - might be module permission issue
      // Only show error, don't force logout
      if (response.status === 401) {
        setMuseumSettingsError('Unauthorized: You may not have permission to view settings')
        setMuseumSettingsLoading(false)
        if (showMuseumInfo) {
          setMuseumInfoLoading(false)
          setMuseumInfoError('Unauthorized: You may not have permission to view museum info')
        }
        return
      }
      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          const settings = { ...data.data }
          if (settings.operatingHours) {
            const hoursObj = {}
            Object.keys(settings.operatingHours).forEach(key => {
              hoursObj[key] = settings.operatingHours[key]
            })
            for (let day = 0; day <= 6; day++) {
              if (!hoursObj[day]) {
                hoursObj[day] = day >= 1 && day <= 5 
                  ? { open: '09:00', close: '18:00' }
                  : { open: '10:00', close: '17:00' }
              }
            }
            settings.operatingHours = hoursObj
          }
          settings.missionSection = normalizeMissionSection(settings.missionSection)
          setMuseumSettings(settings)
          const infoSnapshot = JSON.stringify({
            mission: settings.mission || '',
            vision: settings.vision || '',
            missionSection: sanitizeMissionSectionForSubmit(settings.missionSection)
          })
          setOriginalMuseumInfo(infoSnapshot)
          if (settings.updatedAt) {
            setMuseumInfoVersion(new Date(settings.updatedAt).getTime())
          } else {
            setMuseumInfoVersion(Date.now())
          }
          setPendingMissionImages(prev => {
            prev.forEach(img => URL.revokeObjectURL(img.previewUrl))
            return []
          })
          setMissionImagesToDelete([])
          setHasMissionImageChanges(false)
        }
      } else {
        const errorMsg = 'Failed to load museum settings'
        setMuseumSettingsError(errorMsg)
        if (showMuseumInfo) {
          setMuseumInfoError(errorMsg)
        }
      }
    } catch (error) {
      console.error('Fetch museum settings error:', error)
      const errorMsg = 'An error occurred while loading museum settings'
      setMuseumSettingsError(errorMsg)
      if (showMuseumInfo) {
        setMuseumInfoError(errorMsg)
      }
    } finally {
      setMuseumSettingsLoading(false)
      if (showMuseumInfo) {
        setMuseumInfoLoading(false)
      }
    }
  }

  const updateMuseumSettings = async (updatedSettings) => {
    setMuseumSettingsLoading(true)
    setMuseumSettingsError('')
    setMuseumSettingsSuccess('')
    try {
      const response = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updatedSettings)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          const settings = { ...data.data }
          if (settings.operatingHours) {
            const hoursObj = {}
            Object.keys(settings.operatingHours).forEach(key => {
              hoursObj[key] = settings.operatingHours[key]
            })
            for (let day = 0; day <= 6; day++) {
              if (!hoursObj[day]) {
                hoursObj[day] = day >= 1 && day <= 5 
                  ? { open: '09:00', close: '18:00' }
                  : { open: '10:00', close: '17:00' }
              }
            }
            settings.operatingHours = hoursObj
          }
          settings.missionSection = normalizeMissionSection(settings.missionSection)
          setMuseumSettings(settings)
        }
        setMuseumSettingsSuccess('Museum settings updated successfully!')
        setHasPendingAvailabilityChanges(false)
        setTimeout(() => setMuseumSettingsSuccess(''), 3000)

        Swal.fire({
          title: 'Settings Saved',
          text: 'Museum availability settings have been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
      } else {
        const data = await response.json()
        let message = data.message || 'Failed to update museum settings'
        
        // Handle version mismatch errors more gracefully
        if (data.error === 'Transaction conflict' || message.includes('Conflict') || message.includes('version') || message.includes('No matching document')) {
          message = 'Your changes could not be saved because another admin saved first. Please reload to get the latest content.'
        }
        
        setMuseumSettingsError(message)
        Swal.fire({
          title: 'Update Failed',
          text: message,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
      }
    } catch (error) {
      console.error('Update museum settings error:', error)
      setMuseumSettingsError('An error occurred while updating museum settings')
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while updating museum settings.',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setMuseumSettingsLoading(false)
    }
  }

  const fetchGoogleCalendarStatus = async () => {
    try {
      const response = await fetch('/api/google-calendar/status', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        setGoogleCalendarStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching Google Calendar status:', error)
    }
  }

  const connectGoogleCalendar = async () => {
    setGoogleCalendarLoading(true)
    setGoogleCalendarError('')
    setGoogleCalendarSuccess('')
    try {
      const response = await fetch('/api/google-calendar/auth', {
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          setGoogleCalendarError(data.message || 'Failed to get authorization URL')
        }
      } else {
        const errorData = await response.json()
        setGoogleCalendarError(errorData.message || 'Failed to connect to Google Calendar')
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error)
      setGoogleCalendarError('An error occurred while connecting to Google Calendar')
    } finally {
      setGoogleCalendarLoading(false)
    }
  }

  const disconnectGoogleCalendar = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? This will stop syncing bookings to Google Calendar.')) {
      return
    }

    setGoogleCalendarLoading(true)
    setGoogleCalendarError('')
    setGoogleCalendarSuccess('')
    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      })
      if (response.ok) {
        setGoogleCalendarSuccess('Google Calendar disconnected successfully')
        await fetchGoogleCalendarStatus()
      } else {
        const errorData = await response.json()
        setGoogleCalendarError(errorData.message || 'Failed to disconnect Google Calendar')
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      setGoogleCalendarError('An error occurred while disconnecting Google Calendar')
    } finally {
      setGoogleCalendarLoading(false)
    }
  }

  const updateMuseumInfo = async () => {
    setMuseumInfoLoading(true)
    setMuseumInfoError('')
    setMuseumInfoSuccess('')
    try {
      const response = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          mission: museumSettings.mission,
          vision: museumSettings.vision,
          missionSection: sanitizeMissionSectionForSubmit(museumSettings.missionSection),
          clientTimestamp: museumInfoVersion || Date.now()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          const updatedSettings = {
            ...museumSettings,
            mission: data.data.mission || museumSettings.mission,
            vision: data.data.vision || museumSettings.vision,
            missionSection: normalizeMissionSection(data.data.missionSection || museumSettings.missionSection)
          }
          setMuseumSettings(updatedSettings)
          // Update the original snapshot to reflect the saved state
          const newSnapshot = JSON.stringify({
            mission: updatedSettings.mission || '',
            vision: updatedSettings.vision || '',
            missionSection: sanitizeMissionSectionForSubmit(updatedSettings.missionSection)
          })
          setOriginalMuseumInfo(newSnapshot)
        }
        if (data.newTimestamp) {
          setMuseumInfoVersion(data.newTimestamp)
        }
        setMuseumInfoSuccess('Museum information updated successfully!')
        Swal.fire({
          title: 'Success!',
          text: 'Museum information has been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#dc143c'
        })
        setTimeout(() => setMuseumInfoSuccess(''), 3000)
      } else {
        const data = await response.json()
        let errorMessage = data.message || 'Failed to update museum information'
        
        // Check for TBCC conflict error or version mismatch
        if (data.error === 'Transaction conflict' || errorMessage.includes('Conflict') || errorMessage.includes('version') || errorMessage.includes('No matching document')) {
          errorMessage = '⚠️ Your changes could not be saved because another admin saved first. Please reload to get the latest content.'
          setMuseumInfoError(errorMessage)
          Swal.fire({
            title: '⚠️ Edit Conflict',
            html: '<p>Another admin saved changes to Museum Information before you.</p><p>Your edits were not saved. Please reload this page to get the latest version, then try again.</p>',
            icon: 'warning',
            confirmButtonColor: '#dc143c',
            confirmButtonText: 'Reload Page',
            showCancelButton: true,
            cancelButtonText: 'Close'
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload()
            }
          })
        } else {
          setMuseumInfoError(errorMessage)
        Swal.fire({
          title: 'Update Failed',
            text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#dc143c'
        })
        }
      }
    } catch (error) {
      console.error('Update museum info error:', error)
      setMuseumInfoError('An error occurred while updating museum information')
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while updating museum information',
        icon: 'error',
        confirmButtonColor: '#dc143c'
      })
    } finally {
      setMuseumInfoLoading(false)
    }
  }

  const activeMissionImages = museumSettings.missionSection.images
    .filter(image => !missionImagesToDelete.includes(image._id))
    .map(image => ({ ...image, isPending: false }))

  const displayedMissionImages = [
    ...activeMissionImages,
    ...pendingMissionImages.map(image => ({
      ...image,
      isPending: true,
      url: image.previewUrl
    }))
  ]

  const textInfoChanged = hasTextualInfoChanges()
  const saveDisabled = museumInfoLoading || missionImageUploading || (!textInfoChanged && !hasMissionImageChanges)

  if (showMuseumInfo) {
    const totalImagesCount = displayedMissionImages.length
    const maxMissionImagesReached = totalImagesCount >= MAX_MISSION_IMAGES
    return (
      <div className="dash-section">
        <div style={{ marginTop: '32px' }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '24px', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#212529', margin: '0 0 8px' }}>
                  Museum Information
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  Edit mission, vision, and public-facing content displayed on the About page.
                </p>
              </div>
              <button
                onClick={() => setShowMuseumInfo(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ← Back to Settings
              </button>
            </div>

            {museumInfoError && (
              <div style={{
                background: 'rgba(220, 20, 60, 0.1)',
                border: '1px solid rgba(220, 20, 60, 0.3)',
                color: '#dc143c',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {museumInfoError}
              </div>
            )}

            {museumInfoSuccess && (
              <div style={{
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                color: '#16a34a',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {museumInfoSuccess}
              </div>
            )}

            {museumInfoLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <div>Loading museum information...</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Mission */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                    Our Mission
                  </h4>
                  <textarea
                    value={museumSettings.mission || ''}
                    onChange={(e) => {
                      setMuseumSettings(prev => ({ ...prev, mission: e.target.value }))
                    }}
                    placeholder="Enter the museum's mission statement..."
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: '120px',
                      backgroundColor: '#ffffff',
                      cursor: 'text'
                    }}
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6c757d' }}>
                    This text will be displayed on the About page under "Our Mission"
                  </p>
                </div>

                {/* Vision */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                    Our Vision
                  </h4>
                  <textarea
                    value={museumSettings.vision || ''}
                    onChange={(e) => {
                      setMuseumSettings(prev => ({ ...prev, vision: e.target.value }))
                    }}
                    placeholder="Enter the museum's vision statement..."
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: '120px',
                      backgroundColor: '#ffffff',
                      cursor: 'text'
                    }}
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6c757d' }}>
                    This text will be displayed on the About page under "Our Vision"
                  </p>
                </div>

                {/* Mission Section Settings */}
                <div className="mission-config-card">
                  <div className="mission-config-header">
                    <div>
                      <h4>Guest Mission Section</h4>
                      <p>Customize the hero text, stats, and rotating imagery shown on the guest landing page.</p>
                    </div>
                  </div>

                  <div className="mission-config-fields">
                    <div className="mission-config-field">
                      <label>Section Label</label>
                      <input
                        type="text"
                        value={museumSettings.missionSection.heading}
                        onChange={(e) => handleMissionSectionChange('heading', e.target.value)}
                        placeholder="e.g., Our Commitment"
                      />
                    </div>
                    <div className="mission-config-field">
                      <label>Section Title</label>
                      <input
                        type="text"
                        value={museumSettings.missionSection.title}
                        onChange={(e) => handleMissionSectionChange('title', e.target.value)}
                        placeholder="e.g., Preserving History, Inspiring Future"
                      />
                    </div>
                  </div>

                  <div className="mission-config-field">
                    <label>Description</label>
                    <textarea
                      rows={4}
                      value={museumSettings.missionSection.description}
                      onChange={(e) => handleMissionSectionChange('description', e.target.value)}
                      placeholder="Describe the museum promise that appears beneath the title."
                    />
                  </div>

                  <div className="mission-stats-grid">
                    {museumSettings.missionSection.stats.map((stat, index) => (
                      <div className="mission-stat-card" key={`mission-stat-${index}`}>
                        <label>Stat Label</label>
                        <input
                          type="text"
                          value={stat.label}
                          onChange={(e) => handleMissionStatChange(index, 'label', e.target.value)}
                          placeholder="e.g., Years of Excellence"
                        />
                        <label>Value</label>
                        <input
                          type="number"
                          min="0"
                          value={stat.value}
                          onChange={(e) => handleMissionStatChange(index, 'value', e.target.value)}
                        />
                        <label>Suffix</label>
                        <input
                          type="text"
                          value={stat.suffix || ''}
                          onChange={(e) => handleMissionStatChange(index, 'suffix', e.target.value)}
                          placeholder="e.g., +"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mission-rotation-control">
                    <label>Image Swap Interval (milliseconds)</label>
                    <input
                      type="number"
                      min={MIN_MISSION_ROTATION}
                      max={MAX_MISSION_ROTATION}
                      step="250"
                      value={museumSettings.missionSection.rotationInterval}
                      onChange={(e) => handleMissionSectionChange('rotationInterval', e.target.value)}
                    />
                    <small>Use a value between {MIN_MISSION_ROTATION.toLocaleString()} and {MAX_MISSION_ROTATION.toLocaleString()} milliseconds.</small>
                  </div>

                  <div className="mission-image-manager">
                    <div className="mission-image-grid">
                      {displayedMissionImages.length === 0 && (
                        <div className="mission-image-placeholder">
                          <p>No mission images yet. Upload a photo to start the carousel.</p>
                        </div>
                      )}
                      {displayedMissionImages.map((image, idx) => (
                        <div className="mission-image-card" key={image.isPending ? image.tempId : image._id || idx}>
                          <div className="mission-image-preview">
                            <img src={image.isPending ? image.previewUrl : getImagePreviewUrl(image.url)} alt={`Mission highlight ${idx + 1}`} />
                          </div>
                          <input
                            type="text"
                            placeholder="Caption (optional)"
                            value={image.caption || ''}
                            onChange={(e) => handleMissionImageCaptionChange(image, e.target.value)}
                          />
                          <div className="mission-image-card-footer">
                            <span>{image.isPending ? 'Pending' : `Order ${idx + 1}`}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMissionImage(image)}
                              disabled={missionImageUploading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mission-image-actions">
                      <label className={`mission-upload-button ${missionImageUploading || maxMissionImagesReached ? 'disabled' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMissionImageUpload}
                          disabled={missionImageUploading || maxMissionImagesReached}
                        />
                        <span>
                          {missionImageUploading
                            ? 'Processing...'
                            : maxMissionImagesReached
                              ? 'Image Limit Reached'
                              : 'Upload Image'}
                        </span>
                      </label>
                      <p>
                        You can upload up to {MAX_MISSION_IMAGES} images. Photos rotate automatically with the interval set above.
                      </p>
                      {missionImageError && <p className="mission-image-error">{missionImageError}</p>}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => {
                      discardMissionImageChanges()
                      setShowMuseumInfo(false)
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#f8f9fa',
                      color: '#495057',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMuseumInfo}
                    disabled={saveDisabled}
                    style={{
                      padding: '12px 24px',
                      background: 'var(--primary-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saveDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saveDisabled ? 0.7 : 1
                    }}
                  >
                    {museumInfoLoading || missionImageUploading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (showMuseumAvailability) {
    return (
      <div className="dash-section">
        <div style={{ marginTop: '32px' }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '24px', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#212529', margin: '0 0 8px' }}>
                  Museum Availability Settings
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  Configure available days, hours, and dates for guest bookings.
                </p>
              </div>
              <button
                onClick={() => setShowMuseumAvailability(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ← Back to Settings
              </button>
            </div>

            {museumSettingsError && (
              <div style={{
                background: 'rgba(220, 20, 60, 0.1)',
                border: '1px solid rgba(220, 20, 60, 0.3)',
                color: '#dc143c',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {museumSettingsError}
              </div>
            )}

            {museumSettingsSuccess && (
              <div style={{
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                color: '#16a34a',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {museumSettingsSuccess}
              </div>
            )}

            {museumSettingsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <div>Loading museum settings...</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Accepting Bookings Toggle */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#212529'
                  }}>
                    <input
                      type="checkbox"
                      checked={museumSettings.isAcceptingBookings}
                      onChange={(e) => {
                        const updated = { ...museumSettings, isAcceptingBookings: e.target.checked }
                        setMuseumSettings(updated)
                        setHasPendingAvailabilityChanges(true)
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span>Accepting New Bookings</span>
                  </label>
                  <p style={{ margin: '8px 0 0 32px', color: '#6c757d', fontSize: '14px' }}>
                    When disabled, guests cannot submit new booking requests
                  </p>
                </div>

                {/* Available Days */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                    Available Days of Week
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { value: 0, label: 'Sunday' },
                      { value: 1, label: 'Monday' },
                      { value: 2, label: 'Tuesday' },
                      { value: 3, label: 'Wednesday' },
                      { value: 4, label: 'Thursday' },
                      { value: 5, label: 'Friday' },
                      { value: 6, label: 'Saturday' }
                    ].map(day => (
                      <label key={day.value} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 16px',
                        background: museumSettings.availableDays.includes(day.value) ? 'var(--primary-gradient)' : 'white',
                        color: museumSettings.availableDays.includes(day.value) ? 'white' : '#495057',
                        border: `1px solid ${museumSettings.availableDays.includes(day.value) ? 'transparent' : '#dee2e6'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={museumSettings.availableDays.includes(day.value)}
                          onChange={(e) => {
                            let updatedDays = [...museumSettings.availableDays]
                            if (e.target.checked) {
                              updatedDays.push(day.value)
                            } else {
                              updatedDays = updatedDays.filter(d => d !== day.value)
                            }
                            const updated = { ...museumSettings, availableDays: updatedDays }
                            setMuseumSettings(updated)
                            setHasPendingAvailabilityChanges(true)
                          }}
                          style={{ display: 'none' }}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Operating Hours */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                    Operating Hours
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { value: 0, label: 'Sunday' },
                      { value: 1, label: 'Monday' },
                      { value: 2, label: 'Tuesday' },
                      { value: 3, label: 'Wednesday' },
                      { value: 4, label: 'Thursday' },
                      { value: 5, label: 'Friday' },
                      { value: 6, label: 'Saturday' }
                    ].map(day => {
                      const hours = museumSettings.operatingHours[day.value] || { open: '09:00', close: '18:00' }
                      return (
                        <div key={day.value} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ minWidth: '100px', fontWeight: '600', color: '#495057' }}>
                            {day.label}:
                          </div>
                          <input
                            type="time"
                            value={hours.open || '09:00'}
                            onChange={(e) => {
                              const updatedHours = {
                                ...museumSettings.operatingHours,
                                [day.value]: { ...hours, open: e.target.value }
                              }
                              const updated = { ...museumSettings, operatingHours: updatedHours }
                              setMuseumSettings(updated)
                              setHasPendingAvailabilityChanges(true)
                            }}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                          <span style={{ color: '#6c757d' }}>to</span>
                          <input
                            type="time"
                            value={hours.close || '18:00'}
                            onChange={(e) => {
                              const updatedHours = {
                                ...museumSettings.operatingHours,
                                [day.value]: { ...hours, close: e.target.value }
                              }
                              const updated = { ...museumSettings, operatingHours: updatedHours }
                              setMuseumSettings(updated)
                              setHasPendingAvailabilityChanges(true)
                            }}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Advanced toggle + Save button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: hasPendingAvailabilityChanges ? '#b45309' : '#6c757d' }}>
                    {hasPendingAvailabilityChanges ? 'You have unsaved changes.' : 'All changes are saved.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedAvailability(v => !v)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#495057'
                    }}
                  >
                    {showAdvancedAvailability ? 'Hide advanced options' : 'Show advanced options'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMuseumSettings(museumSettings)}
                    disabled={museumSettingsLoading || !hasPendingAvailabilityChanges}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: hasPendingAvailabilityChanges ? 'var(--primary-gradient)' : '#9ca3af',
                      color: '#fff',
                      cursor: museumSettingsLoading || !hasPendingAvailabilityChanges ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {museumSettingsLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {showAdvancedAvailability && (
                  <>
                    {/* Advance Booking Days */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                        Advance Booking Settings
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                            Minimum Advance Days
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={museumSettings.minAdvanceBookingDays}
                            onChange={(e) => {
                              const updated = { ...museumSettings, minAdvanceBookingDays: parseInt(e.target.value) || 0 }
                              setMuseumSettings(updated)
                              setHasPendingAvailabilityChanges(true)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          />
                          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6c757d' }}>
                            Guests must book at least this many days in advance
                          </p>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                            Maximum Advance Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={museumSettings.maxAdvanceBookingDays}
                            onChange={(e) => {
                              const updated = { ...museumSettings, maxAdvanceBookingDays: parseInt(e.target.value) || 90 }
                              setMuseumSettings(updated)
                              setHasPendingAvailabilityChanges(true)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          />
                          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6c757d' }}>
                            Guests can book up to this many days in advance
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Max Visitors Per Slot */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px', color: '#212529' }}>
                        Maximum Visitors Per Time Slot
                      </h4>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={museumSettings.maxVisitorsPerSlot}
                        onChange={(e) => {
                          const updated = { ...museumSettings, maxVisitorsPerSlot: parseInt(e.target.value) || 50 }
                          setMuseumSettings(updated)
                          setHasPendingAvailabilityChanges(true)
                        }}
                        style={{
                          width: '200px',
                          padding: '10px',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                      <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#6c757d' }}>
                        Maximum number of visitors allowed per time slot
                      </p>
                    </div>

                    {/* Time Slot Templates */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px', color: '#212529' }}>
                        Booking Time Slots
                      </h4>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6c757d' }}>
                        Define the default time slots that guests can choose from when booking.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>Start Time</label>
                          <input
                            type="time"
                            defaultValue="09:00"
                            id="slotStartTime"
                            style={{
                              padding: '8px 10px',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              fontSize: '13px',
                              minWidth: '110px'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>End Time</label>
                          <input
                            type="time"
                            defaultValue="17:00"
                            id="slotEndTime"
                            style={{
                              padding: '8px 10px',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              fontSize: '13px',
                              minWidth: '110px'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>Interval (minutes)</label>
                          <input
                            type="number"
                            min="15"
                            max="240"
                            step="5"
                            defaultValue="60"
                            id="slotInterval"
                            style={{
                              padding: '8px 10px',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              fontSize: '13px',
                              minWidth: '110px'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const startEl = document.getElementById('slotStartTime')
                            const endEl = document.getElementById('slotEndTime')
                            const intervalEl = document.getElementById('slotInterval')
                            if (!startEl || !endEl || !intervalEl) return

                            const start = startEl.value || '09:00'
                            const end = endEl.value || '17:00'
                            const interval = parseInt(intervalEl.value, 10) || 60

                            const toMinutes = (t) => {
                              const [h, m] = t.split(':').map(Number)
                              return h * 60 + m
                            }
                            const toTime = (mins) => {
                              const h = String(Math.floor(mins / 60)).padStart(2, '0')
                              const m = String(mins % 60).padStart(2, '0')
                              return `${h}:${m}`
                            }

                            const startMins = toMinutes(start)
                            const endMins = toMinutes(end)
                            if (Number.isNaN(startMins) || Number.isNaN(endMins) || endMins <= startMins) {
                              alert('Please provide a valid start and end time (end must be after start).')
                              return
                            }
                            if (interval <= 0) {
                              alert('Interval must be greater than 0 minutes.')
                              return
                            }

                            const slots = []
                            for (let t = startMins; t <= endMins; t += interval) {
                              slots.push(toTime(t))
                            }

                            const updated = { ...museumSettings, timeSlots: slots }
                            setMuseumSettings(updated)
                            setHasPendingAvailabilityChanges(true)
                          }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary-gradient)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Generate Time Slots
                        </button>
                      </div>

                      <div style={{ fontSize: '13px', color: '#495057' }}>
                        <div style={{ marginBottom: '6px', fontWeight: 600 }}>Current time slots:</div>
                        {museumSettings.timeSlots && museumSettings.timeSlots.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {museumSettings.timeSlots.map((slot) => (
                              <span
                                key={slot}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  background: '#ffffff',
                                  border: '1px solid #dee2e6',
                                  fontSize: '12px'
                                }}
                              >
                                {slot}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>
                            No custom time slots defined yet. Guests will see times based on operating hours.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Blocked Dates */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px', color: '#212529' }}>
                        Blocked Dates (Holidays/Maintenance)
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <input
                          type="date"
                          onChange={(e) => {
                            const val = e.target.value
                            if (!val) return
                            const dateStr = new Date(val).toISOString().split('T')[0]
                            const existing = (museumSettings.blockedDates || []).map(d => new Date(d).toISOString().split('T')[0])
                            if (existing.includes(dateStr)) return
                            const updated = { ...museumSettings, blockedDates: [...(museumSettings.blockedDates || []), val] }
                            setMuseumSettings(updated)
                            updateMuseumSettings(updated)
                            e.target.value = ''
                          }}
                          style={{
                            padding: '10px',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>Pick a date to block bookings</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(museumSettings.blockedDates || []).sort().map((d, idx) => {
                          const ds = new Date(d)
                          const label = isNaN(ds.getTime()) ? d : ds.toISOString().split('T')[0]
                          return (
                            <span key={label + idx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#fff',
                              border: '1px solid #dee2e6',
                              color: '#495057',
                              borderRadius: '999px',
                              padding: '6px 10px',
                              fontSize: '13px'
                            }}>
                              {label}
                              <button
                                onClick={() => {
                                  const dateStr = label
                                  const remaining = (museumSettings.blockedDates || []).filter(x => {
                                    const xs = new Date(x)
                                    const xl = isNaN(xs.getTime()) ? x : xs.toISOString().split('T')[0]
                                    return xl !== dateStr
                                  })
                                  const updated = { ...museumSettings, blockedDates: remaining }
                                  setMuseumSettings(updated)
                                  updateMuseumSettings(updated)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc143c',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 700
                                }}
                                title="Remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                        {(!museumSettings.blockedDates || museumSettings.blockedDates.length === 0) && (
                          <span style={{ color: '#6c757d', fontSize: '14px' }}>No blocked dates</span>
                        )}
                      </div>
                    </div>

                    {/* Additional Available Dates */}
                    <div style={{
                      background: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px', color: '#212529' }}>
                        Additional Available Dates
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <input
                          type="date"
                          onChange={(e) => {
                            const val = e.target.value
                            if (!val) return
                            const dateStr = new Date(val).toISOString().split('T')[0]
                            const existing = (museumSettings.availableDates || []).map(d => new Date(d).toISOString().split('T')[0])
                            if (existing.includes(dateStr)) return
                            const updated = { ...museumSettings, availableDates: [...(museumSettings.availableDates || []), val] }
                            setMuseumSettings(updated)
                            updateMuseumSettings(updated)
                            e.target.value = ''
                          }}
                          style={{
                            padding: '10px',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>Pick a date to force availability</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(museumSettings.availableDates || []).sort().map((d, idx) => {
                          const ds = new Date(d)
                          const label = isNaN(ds.getTime()) ? d : ds.toISOString().split('T')[0]
                          return (
                            <span key={label + idx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#fff',
                              border: '1px solid #dee2e6',
                              color: '#495057',
                              borderRadius: '999px',
                              padding: '6px 10px',
                              fontSize: '13px'
                            }}>
                              {label}
                              <button
                                onClick={() => {
                                  const dateStr = label
                                  const remaining = (museumSettings.availableDates || []).filter(x => {
                                    const xs = new Date(x)
                                    const xl = isNaN(xs.getTime()) ? x : xs.toISOString().split('T')[0]
                                    return xl !== dateStr
                                  })
                                  const updated = { ...museumSettings, availableDates: remaining }
                                  setMuseumSettings(updated)
                                  updateMuseumSettings(updated)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc143c',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 700
                                }}
                                title="Remove"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                        {(!museumSettings.availableDates || museumSettings.availableDates.length === 0) && (
                          <span style={{ color: '#6c757d', fontSize: '14px' }}>No additional available dates</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-section">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Settings</h2>
          <p className="dash-subtitle">Manage museum settings and system preferences</p>
        </div>
      </div>

      {museumSettingsLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Loading settings...</div>
        </div>
      )}

      {museumSettingsError && !museumSettingsLoading && (
        <div style={{
          background: 'rgba(220, 20, 60, 0.1)',
          border: '1px solid rgba(220, 20, 60, 0.3)',
          color: '#dc143c',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {museumSettingsError}
          <button
            onClick={() => fetchMuseumSettings()}
            style={{
              marginLeft: '12px',
              padding: '4px 12px',
              background: '#dc143c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {!museumSettingsLoading && (
      <div className="settings-grid">
        <div 
          className="setting-card"
          onClick={() => setShowMuseumAvailability(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="setting-icon">🏛️</div>
          <h3>Museum Availability</h3>
          <p>Set available days, hours, and dates for bookings</p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
            {museumSettings.isAcceptingBookings ? (
              <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Accepting Bookings</span>
            ) : (
              <span style={{ color: '#dc143c', fontWeight: '600' }}>✗ Not Accepting Bookings</span>
            )}
          </div>
        </div>

        {/* Museum Information Card */}
        <div 
          className="setting-card"
          onClick={() => setShowMuseumInfo(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="setting-icon">📝</div>
          <h3>Museum Information</h3>
          <p>Edit mission, vision, and public-facing content</p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
            <span style={{ color: '#495057', fontWeight: '600' }}>Mission & Vision</span>
          </div>
        </div>

        {/* Google Calendar Integration Card */}
        <div className="setting-card">
          <div className="setting-icon">📅</div>
          <h3>Google Calendar Sync</h3>
          <p>Sync confirmed bookings to Google Calendar automatically</p>
          
          {googleCalendarError && (
            <div style={{
              background: 'rgba(220, 20, 60, 0.1)',
              border: '1px solid rgba(220, 20, 60, 0.3)',
              color: '#dc143c',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontSize: '12px'
            }}>
              {googleCalendarError}
            </div>
          )}

          {googleCalendarSuccess && (
            <div style={{
              background: 'rgba(40, 167, 69, 0.1)',
              border: '1px solid rgba(40, 167, 69, 0.3)',
              color: '#28a745',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              fontSize: '12px'
            }}>
              {googleCalendarSuccess}
            </div>
          )}

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
            {googleCalendarStatus.connected ? (
              <div>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Connected</span>
                {googleCalendarStatus.email && (
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    {googleCalendarStatus.email}
                  </div>
                )}
              </div>
            ) : googleCalendarStatus.configured ? (
              <span style={{ color: '#ffc107', fontWeight: '600' }}>⚠ Not Connected</span>
            ) : (
              <span style={{ color: '#6c757d', fontWeight: '600' }}>⚙ Not Configured</span>
            )}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!googleCalendarStatus.connected ? (
              <button
                onClick={connectGoogleCalendar}
                disabled={googleCalendarLoading || !googleCalendarStatus.configured}
                style={{
                  padding: '8px 16px',
                  background: googleCalendarStatus.configured ? 'var(--primary-gradient)' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: googleCalendarStatus.configured && !googleCalendarLoading ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: '600',
                  opacity: googleCalendarLoading ? 0.7 : 1
                }}
              >
                {googleCalendarLoading ? 'Connecting...' : '🔗 Connect Google Calendar'}
              </button>
            ) : (
              <button
                onClick={disconnectGoogleCalendar}
                disabled={googleCalendarLoading}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: googleCalendarLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  opacity: googleCalendarLoading ? 0.7 : 1
                }}
              >
                {googleCalendarLoading ? 'Disconnecting...' : '🔌 Disconnect'}
              </button>
            )}
          </div>

          {!googleCalendarStatus.configured && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#856404'
            }}>
              <strong>Setup Required:</strong> Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env file and enable Google Calendar API in Google Cloud Console.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default AdminSettings

