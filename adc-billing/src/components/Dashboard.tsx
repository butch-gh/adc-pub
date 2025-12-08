import { useState } from 'react'
import { useAuth } from '@repo/auth';
import { Sidebar } from './layout/Sidebar'
import { Header } from './layout/Header'

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  console.log('BILLING: User permissions:', user)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-white shadow p-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome to ADC Billing, {user.full_name}!
              </h1>
              <p className="mt-2 text-gray-600">
                Your permissions: {user.permissions.join(', ')}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
