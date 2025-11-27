import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/guestcss/Home.css'

const DEFAULT_ROTATION_INTERVAL = 6000
const MIN_ROTATION_INTERVAL = 3000
const MAX_ROTATION_INTERVAL = 20000

const defaultMissionContent = {
  heading: 'Our Commitment',
  title: 'Preserving History, Inspiring Future',
  description: 'We are dedicated to the preservation, protection, and promotion of cultural heritage through rigorous scholarship, innovative education, and meaningful community engagement.',
  rotationInterval: DEFAULT_ROTATION_INTERVAL,
  stats: [
    { label: 'Years of Excellence', value: 25, suffix: '' },
    { label: 'Active Programs', value: 15, suffix: '' },
    { label: 'Research Studies', value: 500, suffix: '+' }
  ],
  images: []
}

const clampRotationInterval = (value) => {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return DEFAULT_ROTATION_INTERVAL
  }
  return Math.min(Math.max(numericValue, MIN_ROTATION_INTERVAL), MAX_ROTATION_INTERVAL)
}

const buildImageUrl = (pathValue) => {
  if (!pathValue) return ''
  let path = pathValue
  if (path.startsWith('http')) return path
  if (path.startsWith('data:image')) return path
  if (path.startsWith('/src/')) return path
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '')
  return `http://localhost:5000/${normalized}`
}

const formatMissionContent = (section = {}) => {
  const stats = Array.isArray(section.stats) && section.stats.length
    ? section.stats.map((stat) => ({
        label: stat.label || '',
        value: typeof stat.value === 'number' ? stat.value : Number(stat.value) || 0,
        suffix: stat.suffix || ''
      }))
    : defaultMissionContent.stats.map(stat => ({ ...stat }))

  const images = Array.isArray(section.images) && section.images.length
    ? section.images
        .filter(img => img && img.url)
        .map(img => ({
          url: buildImageUrl(img.url),
          caption: img.caption || '',
          order: typeof img.order === 'number' ? img.order : 0
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  return {
    heading: section.heading || defaultMissionContent.heading,
    title: section.title || defaultMissionContent.title,
    description: section.description || defaultMissionContent.description,
    rotationInterval: clampRotationInterval(section.rotationInterval ?? defaultMissionContent.rotationInterval),
    stats,
    images
  }
}

const Home = () => {
  const heroRef = useRef(null)
  const missionRef = useRef(null)
  const animatedSections = useRef(new Set())
  const navigate = useNavigate()
  const [missionContent, setMissionContent] = useState(defaultMissionContent)
  const [activeMissionImage, setActiveMissionImage] = useState(0)
  const animateCounter = (element) => {
    if (!element || element.dataset.animated === 'true') return
    element.dataset.animated = 'true'

    const dataValue = element.getAttribute('data-value')
    const isDecimal = (dataValue || '').includes('.')
    const target = parseFloat(dataValue) || 0
    const duration = 2000
    const steps = 60
    const increment = target / steps
    let current = 0
    let step = 0

    const updateCounter = () => {
      step++
      current += increment
      if (step < steps) {
        if (isDecimal) {
          element.textContent = Math.min(current, target).toFixed(1)
        } else {
          element.textContent = Math.floor(Math.min(current, target)).toLocaleString()
        }
        setTimeout(updateCounter, duration / steps)
      } else {
        if (isDecimal) {
          element.textContent = target.toFixed(1)
        } else {
          element.textContent = Math.floor(target).toLocaleString()
        }
      }
    }
    updateCounter()
  }

  const handlePlanVisitClick = () => {
    const scrollToBooking = () => {
      const bookingSection = document.getElementById('booking')
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' })
      }
    }

    if (window.location.pathname === '/guest/book') {
      scrollToBooking()
      return
    }

    navigate('/guest/book', { state: { scrollToBooking: true } })
  }

  useEffect(() => {
    let isMounted = true

    const fetchMissionSection = async () => {
      try {
        const response = await fetch('/api/museum-settings/public')
        if (!response.ok) return
        const data = await response.json()
        const missionSection = data?.data?.missionSection
        if (missionSection && isMounted) {
          setMissionContent(formatMissionContent(missionSection))
        }
      } catch (error) {
        console.error('Error loading mission section:', error)
      }
    }

    fetchMissionSection()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!('EventSource' in window)) return undefined

    const eventSource = new EventSource('/api/realtime/stream')
    const handleSettingsEvent = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const { action, settings } = payload.data || {}
        if (action === 'updated' && settings?.missionSection) {
          setMissionContent(formatMissionContent(settings.missionSection))
        }
      } catch (error) {
        console.error('Mission section SSE error:', error)
      }
    }

    eventSource.addEventListener('settings', handleSettingsEvent)

    return () => {
      eventSource.removeEventListener('settings', handleSettingsEvent)
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    if (!missionContent.images || missionContent.images.length <= 1) return undefined
    const duration = clampRotationInterval(missionContent.rotationInterval)
    const interval = setInterval(() => {
      setActiveMissionImage((prev) => (prev + 1) % missionContent.images.length)
    }, duration)
    return () => clearInterval(interval)
  }, [missionContent.images, missionContent.rotationInterval])

  useEffect(() => {
    setActiveMissionImage(0)
  }, [missionContent.images])

  useEffect(() => {
    if (!missionRef.current) return
    const counters = missionRef.current.querySelectorAll('[data-value]')
    const missionVisible = missionRef.current.classList.contains('animate-in')
    counters.forEach(counter => {
      counter.dataset.animated = 'false'
      counter.textContent = '0'
      if (missionVisible) {
        animateCounter(counter)
      }
    })
    if (!missionVisible) {
      animatedSections.current.delete(missionRef.current)
    }
  }, [missionContent.stats])

  const hasMissionImages = Array.isArray(missionContent.images) && missionContent.images.length > 0
  const currentMissionImage = hasMissionImages
    ? missionContent.images[activeMissionImage % missionContent.images.length]
    : null

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
          
          // Animate counters only once per section
          if (entry.target === missionRef.current && !animatedSections.current.has(entry.target)) {
            animatedSections.current.add(entry.target)
            const counters = entry.target.querySelectorAll('[data-value]')
            counters.forEach(counter => {
              animateCounter(counter)
            })
          }
        }
      })
    }, observerOptions)

    const elements = [heroRef.current, missionRef.current]
    elements.forEach(el => {
      if (el) {
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section id="home" className="home-section">
      {/* Hero Section */}
      <div className="hero-section" ref={heroRef}>
        <div className="hero-background-overlay"></div>
        <div className="hero-particles"></div>
        <div className="hero-content">
          <div className="hero-text fade-in-up">
            <div className="hero-label">
              <span className="label-line"></span>
              <span className="label-text">Cultural Heritage Center</span>
            </div>
            <h1 className="hero-title">
              Discover Our Rich <span className="highlight-accent">Cultural Legacy</span>
            </h1>
            <p className="hero-subtitle">
              Immerse yourself in centuries of history, art, and tradition. Explore carefully curated exhibits that preserve and celebrate our heritage for future generations.
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-primary museum-btn"
                onClick={() => document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' })}
              >
                <span>Explore Exhibits</span>
                <span className="btn-arrow">→</span>
              </button>
              <button 
                className="btn-secondary museum-btn-outline"
                onClick={handlePlanVisitClick}
              >
                <span>Plan Your Visit</span>
              </button>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-line"></div>
          <span>Scroll to explore</span>
        </div>
      </div>

      {/* Mission Section */}
      <div className="mission-section" ref={missionRef}>
        <div className="container">
          <div className="mission-content">
            <div className="mission-text fade-in-left">
              <div className="mission-label">
                <span className="label-line"></span>
                <span className="label-text">{missionContent.heading}</span>
              </div>
              <h2 className="section-title museum-title">{missionContent.title}</h2>
              <div className="title-underline-left"></div>
              <p className="mission-description">
                {missionContent.description}
              </p>
              <div className="mission-stats">
                {missionContent.stats.map((stat, index) => (
                  <div className="stat-item museum-stat" key={`${stat.label}-${index}`}>
                    <div 
                      className="stat-number" 
                      data-value={Number(stat.value) || 0}
                    >
                      0
                    </div>
                    {stat.suffix ? <div className="stat-suffix">{stat.suffix}</div> : null}
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-line"></div>
                  </div>
                ))}
              </div>
            </div>
            {hasMissionImages && (
              <div className="mission-image fade-in-right">
                <div className="mission-image-wrapper">
                  <img 
                    src={currentMissionImage?.url || '/src/assets/img/Browse2.jpg'} 
                    alt={currentMissionImage?.caption || 'Museum mission highlight'} 
                  />
                  <div className="mission-image-overlay"></div>
                  {currentMissionImage?.caption && (
                    <div className="mission-image-caption">
                      {currentMissionImage.caption}
                    </div>
                  )}
                </div>
                <div className="mission-image-accent"></div>
                {missionContent.images.length > 1 && (
                  <div className="mission-image-dots" aria-label="Mission gallery controls">
                    {missionContent.images.map((image, idx) => (
                      <button
                        key={`${image.order ?? idx}-${idx}`}
                        type="button"
                        className={`mission-image-dot ${idx === activeMissionImage ? 'active' : ''}`}
                        onClick={() => setActiveMissionImage(idx)}
                        aria-label={`Show mission highlight ${idx + 1}`}
                      ></button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Home
