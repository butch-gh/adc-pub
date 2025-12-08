import { Settings, Wrench } from 'lucide-react'

export function MaintenanceDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Settings className="h-20 w-20 text-blue-500 animate-pulse" />
            <Wrench className="h-10 w-10 text-blue-600 absolute -bottom-2 -right-2" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900">
          Maintenance & Configuration Center
        </h1>
        
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your central hub for managing system settings, configurations, and essential maintenance data. 
          Use the navigation menu to access specific modules.
        </p>
        
        <div className="pt-6">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Settings className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Select a module from the sidebar to begin</span>
          </div>
        </div>
      </div>
    </div>
  )
}
