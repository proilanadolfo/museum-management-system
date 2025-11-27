import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const OpenStreetMapComponent = () => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    // Default location - Bukidnon Studies Center Museum
    // Update these coordinates to match your actual location
    const center = [8.1574, 125.1279] // [latitude, longitude]

    if (!mapInstanceRef.current && mapRef.current) {
      // Initialize map
      const map = L.map(mapRef.current).setView(center, 15)

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add marker
      const marker = L.marker(center).addTo(map)
      marker.bindPopup('<b>Bukidnon Studies Center Museum</b><br>Visit us at our location').openPopup()

      mapInstanceRef.current = map
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        zIndex: 0
      }}
    />
  )
}

export default OpenStreetMapComponent

