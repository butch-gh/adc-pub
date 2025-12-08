import React from 'react';
import { useAuth } from '@repo/auth';
import './PortalHome.css';

const PortalHome: React.FC = () => {
  const { user } = useAuth();
  
  const handleAppClick = (appUrl: string) => {
    const token = localStorage.getItem('token');
    const url = token ? `${appUrl}?token=${encodeURIComponent(token)}` : appUrl;
    window.location.href = url;
  };

  // Get URLs from environment variables with fallbacks
  const billingUrl = import.meta.env.VITE_BILLING_SITE_URL || 'http://localhost:5174';
  const inventoryUrl = import.meta.env.VITE_INVENTORY_SITE_URL || 'http://localhost:5175';  
  const appointmentUrl = import.meta.env.VITE_ADMIN_SITE_URL || 'http://localhost:5177';
  const maintenanceUrl = import.meta.env.VITE_MAINTENANCE_SITE_URL || 'http://localhost:5178';
  console.log('user:', user);
  return (
    <div className="portal-home">
      <div className="app-grid">
        {user?.permissions?.includes('billing') && (
          <div
            className="app-card"
            role="button"
            tabIndex={0}
            aria-label="Open ADC Billing"
            onClick={() => handleAppClick(billingUrl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAppClick(billingUrl);
              }
            }}
          >
            <div className="card-icon">
              <svg className="billing-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
              <path d="M7 9l2 2-2 2"/>
              <path d="M17 9l-2 2 2 2"/>
              <circle cx="12" cy="12" r="1"/>
              </svg>
            </div>
            <h3>ADC Billing</h3>
            <p>Manage billing and payments with precision and care</p>
          </div>
        )}
        {user?.permissions?.includes('inventory') && (
          <div
            className="app-card"
            role="button"
            tabIndex={0}
            aria-label="Open ADC Inventory"
            onClick={() => handleAppClick(inventoryUrl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAppClick(inventoryUrl);
              }
            }}
          >
            <div className="card-icon">
              <svg className="inventory-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="7.5,4.5 12,7.5 16.5,4.5"/>
              <polyline points="7.5,9.5 12,12.5 16.5,9.5"/>
              <polyline points="7.5,14.5 12,17.5 16.5,14.5"/>
              </svg>
            </div>
            <h3>ADC Inventory</h3>
            <p>Track and manage dental supplies and equipment</p>
          </div>
        )}
        
        {user?.permissions?.includes('appointment') && (
          <div
            className="app-card"
            role="button"
            tabIndex={0}
            aria-label="Open ADC Appointment"
            onClick={() => handleAppClick(appointmentUrl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAppClick(appointmentUrl);
              }
            }}
          >
            <div className="card-icon">
              <svg className="admin-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {/* Doctor / user-with-plus icon */}
                <circle cx="12" cy="6" r="2" />
                <path d="M5 20c1-4 6-4 7-4s6 0 7 4" />
                <path d="M8 11h8v2H8z" />
                <path d="M18 8v4" />
                <path d="M16 10h4" />
              </svg>
            </div>
            <h3>Dental Clinic Management</h3>
            <p>Comprehensive clinic administration and management</p>
          </div>
        )}

        {user?.permissions?.includes('maintenance') && (
          <div
            className="app-card"
            role="button"
            tabIndex={0}
            aria-label="Open ADC Maintenance"
            onClick={() => handleAppClick(maintenanceUrl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAppClick(maintenanceUrl);
              }
            }}
          >
            <div className="card-icon">
              <svg className="maintenance-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <h3>ADC Maintenance</h3>
            <p>Ensure smooth operation and upkeep of clinic systems</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalHome;
