import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import {
  Settings,
  Shield,
  Briefcase,
  Stethoscope,
  LogOut,
  User,
  FileText,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query';
//import { userAccessApi } from '@/lib/maintenance-api';
import { usersGraphQL } from '@/lib/users-graphql';

interface MaintenanceLayoutProps {
  children: ReactNode
  title: string
}

export function MaintenanceLayout({ children, title }: MaintenanceLayoutProps) {
  const { user } = useAuth()
  const location = useLocation()
  const [userAccess, setUserAccess] = useState<string[]>([]);

  useEffect(() => {
    document.title = title
  }, [title])

  const navigation = [
    // { code: 'AP60', name: 'Dashboard', href: '/maintenance', icon: LayoutDashboard },
    {
      code: 'AP61',
      name: 'Access Privileges',
      href: '/maintenance/access-privileges',
      icon: Shield,
    },
    { code: 'AP62', name: 'Job/Roles', href: '/maintenance/job-roles', icon: Briefcase },
    {
      code: 'AP63',
      name: 'Services (Treatments)',
      href: '/maintenance/services',
      icon: Stethoscope,
    },
    {
      code: 'AP64',
      name: 'Account Settings',
      href: '/maintenance/account-settings',
      icon: User,
    },
    {
      code: 'AP65',
      name: 'Activity Logs',
      href: '/maintenance/activity-logs',
      icon: FileText,
    },
  ]

  // Fetch user access
  const { data: userAccessData } = useQuery({
    queryKey: ['get-user-access-code'],
    queryFn: () => usersGraphQL.getUserAccess(),
  });

  useEffect(() => {    
    if (userAccessData && userAccessData.access) {
      try {        
        setUserAccess(userAccessData.access);        
      } catch (error) {
        console.error('Error setting user access:', error);
      }
    }
  }, [userAccessData]);


  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                ADC Maintenance
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-700">{user?.username}</span>
                <span className="ml-2 text-gray-500">({user?.role})</span>
              </div>
              <button
                // onClick={logout}
                onClick={() => {
              const token = localStorage.getItem('token');
              const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';
              window.location.href = token ? `${portalUrl}?token=${encodeURIComponent(token)}` : portalUrl;
              localStorage.removeItem('token');
            }}
                className="flex items-center text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Back to Portal
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <nav className="px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const hasAccess = userAccess.includes(item.code);
              if (!hasAccess) {
                return null; // Skip rendering this item if no access
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
