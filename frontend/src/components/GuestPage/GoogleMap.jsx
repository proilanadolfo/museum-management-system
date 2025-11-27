import React, { useState } from 'react'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'
import OpenStreetMap from './OpenStreetMap'

const GoogleMapComponent = () => {
  const [googleMapsError, setGoogleMapsError] = useState(false)

  // Default location - Bukidnon Studies Center Museum
  // You can update these coordinates to match your actual location
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '12px'
  }

  const center = {
    lat: 8.1574, // Update with your actual latitude
    lng: 125.1279 // Update with your actual longitude
  }

  const options = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true
  }

  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  // Check if Google Maps API key is configured AND valid
  // For now, use OpenStreetMap since Google Maps requires billing account
  // Set to false to use OpenStreetMap, or true to try Google Maps (if billing is set up)
  const useOpenStreetMap = true // Set to false if you have Google Maps billing set up
  
  const useGoogleMaps = !useOpenStreetMap && apiKey && apiKey !== 'your-google-maps-api-key' && apiKey.trim() !== ''

  // If no API key or Google Maps failed, use OpenStreetMap (free, no API key needed)
  if (!useGoogleMaps || googleMapsError) {
    return <OpenStreetMap />
  }

  // Handle Google Maps load error
  const handleLoadError = (error) => {
    console.warn('Google Maps failed to load, falling back to OpenStreetMap:', error)
    setGoogleMapsError(true)
  }

  return (
    <LoadScript 
      googleMapsApiKey={apiKey}
      onError={handleLoadError}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        options={options}
        onError={handleLoadError}
      >
        <Marker
          position={center}
          title="Bukidnon Studies Center Museum"
        />
      </GoogleMap>
    </LoadScript>
  )
}

export default GoogleMapComponent

