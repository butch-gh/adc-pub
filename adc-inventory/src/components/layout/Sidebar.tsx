import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, TrendingUp, FileText, ArrowUp, Archive, PackageCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userAccessApi } from '@/lib/inventory-api';

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
    {code: 'AP40', id: 'inventory-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/inventory' },
    {code: 'AP41', id: 'purchase-orders', label: 'Purchase Orders', icon: FileText, path: '/inventory/purchase-orders' },
    {code: 'AP42', id: 'receive-delivery', label: 'Receive Delivery', icon: PackageCheck, path: '/inventory/receive-delivery' },
    {code: 'AP43', id: 'stocks', label: 'Stocks', icon: Archive, path: '/inventory/stocks' },
    {code: 'AP44', id: 'stock-out', label: 'Stock Out', icon: ArrowUp, path: '/inventory/stock-out' },
    {code: 'AP45', id: 'items', label: 'Items', icon: Package, path: '/inventory/items' },
    // { id: 'stock-in', label: 'Stock In', icon: ArrowDown, path: '/inventory/stock-in' },
    // { id: 'stock-batches', label: 'Stock Batches', icon: Archive, path: '/inventory/stock-batches' },
    // { id: 'batch-upload', label: 'Batch Upload', icon: Upload, path: '/inventory/batch-upload' },
    { code: 'AP46', id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/inventory/suppliers' },
    { code: 'AP47', id: 'reports', label: 'Reports', icon: TrendingUp, path: '/inventory/reports' },
    // { id: 'settings', label: 'Settings', icon: Settings, path: '/inventory/settings' },
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
        <div className="flex items-center justify-center h-2 bg-gradient-to-r from-green-600 to-green-700 shadow-sm">
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
                      ? 'bg-green-50 text-green-700 border-r-2 border-green-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-green-600 rounded-full"></div>
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
