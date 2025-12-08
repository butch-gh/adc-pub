import { useState } from 'react'
import { useAuth } from '@repo/auth';
import { Button } from '@/components/ui/button'
import { Sidebar } from './layout/Sidebar'
import { Header } from './layout/Header'

export function Dashboard() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-64">
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-white shadow p-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome to ADC Inventory, {user.full_name}!
              </h1>
              <p className="mt-2 text-gray-600">
                Roles: {user.role}
              </p>
              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Button variant="outline">Billing</Button>
                  <Button variant="outline">Inventory</Button>
                  <Button variant="outline">Suppliers</Button>
                  <Button variant="outline">Prescriptions</Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
