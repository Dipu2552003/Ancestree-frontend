'use client'

// Admin dashboard route — a full, mobile-responsive control centre for
// community owners and admins. Access is gated inside AdminDashboard (community
// owner/admin only); everything else lives in components/admin.

import AdminDashboard from '@/components/admin/AdminDashboard'

export default function AdminPage() {
  return <AdminDashboard />
}
