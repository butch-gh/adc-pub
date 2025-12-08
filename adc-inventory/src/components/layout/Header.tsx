import { useAuth } from '@repo/auth'
import { Button } from '@/components/ui/button'
import { Menu, User, LogOut } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title = "ADC Inventory" }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-20 h-16 flex items-center">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                {title}
              </h1>
            </div>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{user.full_name}</span>
              <span className="ml-2 text-xs text-gray-500">({user.role})</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              // onClick={logout}
              onClick={() => {
              const token = localStorage.getItem('token');
              const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';
              window.location.href = token ? `${portalUrl}?token=${encodeURIComponent(token)}` : portalUrl;
              localStorage.removeItem('token');
            }}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
