import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MaintenanceLayout } from './components/maintenance/MaintenanceLayout'
import { MaintenanceDashboard } from './pages/MaintenanceDashboard'
import { AccessPrivilegeList } from './pages/AccessPrivilegeList'
import { JobRoleList } from './pages/JobRoleList'
import { ServicesList } from './pages/ServicesList'
import { AccountSettings } from './pages/AccountSettings'
import { ActivityLogsViewer } from './pages/ActivityLogsViewer'
import { ProtectedRoute, AuthProvider } from '@repo/auth'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Dashboard">
                  <MaintenanceDashboard />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Dashboard">
                  <MaintenanceDashboard />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/access-privileges"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Access Privileges">
                  <AccessPrivilegeList />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/job-roles"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Job Roles">
                  <JobRoleList />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/services"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Services (Treatments)">
                  <ServicesList />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/account-settings"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Account Settings">
                  <AccountSettings />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/activity-logs"
            element={
              <ProtectedRoute>
                <MaintenanceLayout title="ADC Maintenance - Activity Logs">
                  <ActivityLogsViewer />
                </MaintenanceLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
