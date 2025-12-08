import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userAccessApi } from '@/lib/billing-api';

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // If useLocation fails, we're not in a Router context
    console.warn('Sidebar rendered outside Router context');
    location = { pathname: '/' };
  }

  const [userAccess, setUserAccess] = useState<string[]>([]);

  const menuItems = [
    { code:'AP20', id: 'billing-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/billing' },
    { code:'AP21', id: 'invoices', label: 'Invoices', icon: FileText, path: '/billing/invoices' },
    { code:'AP22', id: 'payments', label: 'Payments', icon: CreditCard, path: '/billing/payments' },
    // { code:'AP23', id: 'services', label: 'Services', icon: Stethoscope, path: '/billing/services' },
  ]

// Fetch user access
  const { data: userAccessData } = useQuery({
    queryKey: ['get-user-access-code'],
    queryFn: () => userAccessApi.getUserAccessCode(),
  });
  

  useEffect(() => {
    console.log('Raw user access data:', userAccessData); // Debug log
    if (userAccessData && userAccessData.data) {
      try {
        const parsedAccess = JSON.parse(userAccessData.data);
        console.log('Parsed user access:', parsedAccess); // Debug log
        setUserAccess(parsedAccess);        
      } catch (error) {
        console.error('Error setting user access:', error);
      }
    }
  }, [userAccessData]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo/Brand Section */}
        <div className="flex items-center justify-center h-2 bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm">          
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              const hasAccess = userAccess.includes(item.code);
              if (!hasAccess) {
                return null; // Skip rendering this item if no access
              }

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            ADC Dental Clinic
          </div>
        </div>
      </div>
    </>
  )
}
