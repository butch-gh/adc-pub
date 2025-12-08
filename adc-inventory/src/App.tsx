import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute, AuthProvider } from '@repo/auth'
import { ErrorProvider } from './contexts/ErrorContext'
import { InventoryLayout } from './components/inventory/InventoryLayout'
import { InventoryDashboard } from './components/inventory/InventoryDashboard'
import { ItemsList } from './components/inventory/ItemsList'
import { StockIn } from './components/inventory/StockIn'
import StockOut from './components/inventory/Stock-Out'
import { StockBatches } from './components/inventory/StockBatches'
import { Stocks } from './components/inventory/Stocks'
import { BatchUpload } from './components/inventory/BatchUpload'
import { Suppliers } from './components/inventory/Suppliers'
import { PurchaseOrders } from './components/inventory/PurchaseOrders'
import Reports from './components/inventory/Reports'
import { Settings } from './components/inventory/Settings'
import { ReceiveDelivery } from './components/inventory/ReceiveDelivery'

function App() {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Dashboard">
                  <InventoryDashboard />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Dashboard">
                  <InventoryDashboard />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/items"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Items">
                  <ItemsList />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stock-in"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Stock In">
                  <StockIn />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/receive-delivery"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Receive Delivery">
                  <ReceiveDelivery />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stocks"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Stocks">
                  <Stocks />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stock-out"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Stock Out">
                  <StockOut />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/stock-batches"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Stock Batches">
                  <StockBatches />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/batch-upload"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Batch Upload">
                  <BatchUpload />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/suppliers"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Suppliers">
                  <Suppliers />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/purchase-orders"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Purchase Orders">
                  <PurchaseOrders />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/reports"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Reports">
                  <Reports />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/settings"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Settings">
                  <Settings />
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/prescriptions"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Prescriptions">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Prescriptions Management</h2>
                      <p className="text-gray-600">Coming soon...</p>
                    </div>
                  </div>
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/patients"
            element={
              <ProtectedRoute>
                <InventoryLayout title="ADC Inventory - Patients">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Patients Management</h2>
                      <p className="text-gray-600">Coming soon...</p>
                    </div>
                  </div>
                </InventoryLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
      </ErrorProvider>
    </BrowserRouter>
  )
}

export default App
