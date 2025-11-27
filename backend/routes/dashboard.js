const express = require('express')
const Attendance = require('../models/Attendance')
const Booking = require('../models/Booking')
const Announcement = require('../models/Announcement')
const Gallery = require('../models/Gallery')

const router = express.Router()

const ensureDateMap = (startDate, days, existing, labelFormatter) => {
  const result = []
  for (let i = 0; i < days; i++) {
    const current = new Date(startDate)
    current.setDate(current.getDate() + i)
    const key = current.toISOString().slice(0, 10)
    const existingItem = existing.get(key)
    result.push({
      date: labelFormatter(current),
      total: existingItem?.count ?? 0
    })
  }
  return result
}

const formatShortDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Dashboard overview
// NOTE: This endpoint is intentionally left unauthenticated for now to
// avoid breaking the existing dashboard view while RBAC is being rolled out.
router.get('/dashboard/overview', async (_req, res) => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const last7Start = new Date(todayStart)
    last7Start.setDate(last7Start.getDate() - 6)

    const last30Start = new Date(todayStart)
    last30Start.setDate(last30Start.getDate() - 29)

    const [
      attendanceTodayRecords,
      attendanceTypeStats,
      attendanceTrendRaw,
      bookingStatusCounts,
      bookingsTrendRaw,
      upcomingBookings,
      totalAnnouncements,
      activeAnnouncements,
      activeExhibits
    ] = await Promise.all([
      Attendance.find({ checkInTime: { $gte: todayStart, $lt: tomorrow } })
        .select('status type')
        .lean(),
      Attendance.aggregate([
        {
          $match: {
            checkInTime: { $gte: todayStart, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),
      Attendance.aggregate([
        {
          $match: {
            checkInTime: { $gte: last7Start, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$checkInTime' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: last30Start, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.find({
        visitDate: { $gte: todayStart },
        status: { $in: ['pending', 'confirmed'] }
      })
        .sort({ visitDate: 1 })
        .limit(6)
        .select('fullName visitDate numberOfVisitors status purpose confirmationCode email')
        .lean(),
      Announcement.countDocuments({}),
      Announcement.countDocuments({ isActive: true }),
      Gallery.countDocuments({ isActive: true })
    ])

    const totalToday = attendanceTodayRecords.length
    const checkedIn = attendanceTodayRecords.filter(
      (record) => record.status === 'checked-in'
    ).length
    const checkedOut = totalToday - checkedIn

    const typeBreakdown = {
      student: 0,
      staff: 0,
      visitor: 0
    }

    attendanceTypeStats.forEach((item) => {
      typeBreakdown[item._id] = item.count
    })

    const attendanceTrendMap = new Map(
      attendanceTrendRaw.map((item) => [item._id, { count: item.count }])
    )
    const attendanceTrend = ensureDateMap(
      last7Start,
      7,
      attendanceTrendMap,
      formatShortDate
    )

    const bookingStatus = {
      pending: 0,
      confirmed: 0,
      cancelled: 0
    }
    bookingStatusCounts.forEach((item) => {
      bookingStatus[item._id] = item.count
    })

    const bookingsTrend = bookingsTrendRaw.map((item) => ({
      date: formatShortDate(new Date(item._id)),
      total: item.count
    }))

    res.json({
      success: true,
      summary: {
        attendance: {
          totalToday,
          checkedIn,
          checkedOut,
          typeBreakdown
        },
        bookings: {
          ...bookingStatus,
          total: bookingStatus.pending + bookingStatus.confirmed + bookingStatus.cancelled,
          upcoming: upcomingBookings.length
        },
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements
        },
        exhibits: {
          active: activeExhibits
        }
      },
      charts: {
        attendanceTrend,
        visitorType: [
          { type: 'Students', value: typeBreakdown.student },
          { type: 'Staff', value: typeBreakdown.staff },
          { type: 'Visitors', value: typeBreakdown.visitor }
        ],
        bookingStatus: [
          { status: 'Pending', value: bookingStatus.pending },
          { status: 'Confirmed', value: bookingStatus.confirmed },
          { status: 'Cancelled', value: bookingStatus.cancelled }
        ],
        bookingsTrend
      },
      upcomingBookings: upcomingBookings.map((booking) => ({
        id: booking._id,
        fullName: booking.fullName,
        visitDate: booking.visitDate,
        numberOfVisitors: booking.numberOfVisitors,
        status: booking.status,
        purpose: booking.purpose,
        confirmationCode: booking.confirmationCode,
        email: booking.email
      })),
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard overview error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard overview'
    })
  }
})

module.exports = router

