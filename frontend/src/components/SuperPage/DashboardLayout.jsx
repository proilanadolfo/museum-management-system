import React from 'react'
import '../../styles/SuperCss/super-dashboard-layout.css'

export default function DashboardLayout({ sidebar, children }) {
  return (
    <div className="dash-root">
      {sidebar}
      <main className="dash-content">
        {children}
      </main>
    </div>
  )
}

