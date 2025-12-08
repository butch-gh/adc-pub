import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BillingDashboard } from './components/billing/BillingDashboard'
import { InvoiceList } from './components/billing/InvoiceList'
import { InvoiceDetail } from './components/billing/InvoiceDetail'
import { CreateInvoice } from './components/billing/CreateInvoice'
import { RecordPayment } from './components/billing/RecordPayment'
import { InstallmentManagement } from './components/billing/InstallmentManagement'
import { ManualAdjustments } from './components/billing/ManualAdjustments'
import { EditInvoice } from './components/billing/EditInvoice'
import { PaymentList } from './components/billing/PaymentList'
import { ServicesList } from './components/billing/ServicesList'
import { BillingLayout } from './components/billing/BillingLayout'
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
                <BillingLayout title="ADC Billing - Dashboard">
                  <BillingDashboard />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Dashboard">
                  <BillingDashboard />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Invoices">
                  <InvoiceList />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Invoice Details">
                  <InvoiceDetail />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id/edit"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Edit Invoice">
                  <EditInvoice />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id/record-payment"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Record Payment">
                  <RecordPayment />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id/installments"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Installment Management">
                  <InstallmentManagement />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/:id/adjustments"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Manual Adjustments">
                  <ManualAdjustments />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices/create/:patient_id?"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Create Invoice">
                  <CreateInvoice />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/payments"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Payments">
                  <PaymentList />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/services"
            element={
              <ProtectedRoute>
                <BillingLayout title="ADC Billing - Services">
                  <ServicesList />
                </BillingLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
