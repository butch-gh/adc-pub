import { api } from './api';
import {
  Invoice,
  Payment,
  Service,
  Patient,
  TreatmentPlanOption,
  TreatmentPlansOption,
  TreatmentPlanEntries,
  Installment,
  InstallmentPayment,
  AdjustmentLog,
  CreateInvoiceRequest,
  CreatePaymentRequest,
  ApplyAdjustmentRequest,
  ApiResponse,
  PaginatedResponse
} from '../types';

// Invoice API
export const invoiceApi = {
  // Get all invoices with pagination
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    patient_id?: number;
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await api.get('/billing/invoices', { params });
    return response.data;
  },

  // Get invoice by ID
  getInvoice: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.get(`/billing/invoices/${id}`);
    return response.data;
  },

  // Create new invoice
  createInvoice: async (data: CreateInvoiceRequest): Promise<ApiResponse<Invoice>> => {
    const response = await api.post('/billing/invoices', data);
    return response.data;
  },

  // Update invoice
  updateInvoice: async (id: number, data: Partial<Invoice>): Promise<ApiResponse<Invoice>> => {
    const response = await api.put(`/billing/invoices/${id}`, data);
    return response.data;
  },

  // Finalize invoice (confirm final amounts)
  finalizeInvoice: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.post(`/billing/invoices/${id}/finalize`);
    return response.data;
  },

  // Get installments for invoice
  getInstallments: async (invoiceId: number): Promise<ApiResponse<Installment[]>> => {
    const response = await api.get(`/billing/invoices/${invoiceId}/installments`);
    return response.data;
  },

  // Create installment
  createInstallment: async (invoiceId: number, data: { due_date: string; amount_due: number }): Promise<ApiResponse<Installment>> => {
    const response = await api.post(`/billing/invoices/${invoiceId}/installments`, data);
    return response.data;
  },

  // Get adjustment logs for invoice
  getAdjustmentLogs: async (invoiceId: number): Promise<ApiResponse<AdjustmentLog[]>> => {
    const response = await api.get(`/billing/invoices/${invoiceId}/adjustments`);
    return response.data;
  },

  // Apply adjustment
  applyAdjustment: async (invoiceId: number, data: ApplyAdjustmentRequest): Promise<ApiResponse<AdjustmentLog>> => {
    const response = await api.post(`/billing/invoices/${invoiceId}/adjustments`, data);
    return response.data;
  }
};

// Payment API
export const paymentApi = {
  // Get all payments with pagination and filters
  getAllPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get('/billing/payments', { params });
    return response.data;
  },

  // Get payments for invoice
  getPayments: async (invoiceId: number): Promise<ApiResponse<Payment[]>> => {
    const response = await api.get(`/billing/invoices/${invoiceId}/payments`);
    return response.data;
  },

  // Create payment
  createPayment: async (data: CreatePaymentRequest): Promise<ApiResponse<Payment>> => {
    const response = await api.post('/billing/payments', data);
    return response.data;
  },

  // Upload payment proof
  uploadPaymentProof: async (paymentId: number, file: File): Promise<ApiResponse<Payment>> => {
    const formData = new FormData();
    formData.append('proof', file);

    const response = await api.post(`/billing/payments/${paymentId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Generate payment link (PayMongo)
  generatePaymentLink: async (data: {
    invoice_id: number;
    amount: number;
    description: string;
  }): Promise<ApiResponse<{
    link_id: string;
    checkout_url: string;
    qr_code?: string;
  }>> => {
    console.log('Generating payment link with data:', data);
    const response = await api.post('/gw/payments/generate-link', data);
    return response.data;
  },

  // Generate QR code for payment
  generatePaymentQR: async (data: {
    invoice_id: number;
    amount: number;
    description: string;
  }): Promise<ApiResponse<{
    link_id: string;
    checkout_url: string;
    qr_code: string;
  }>> => {
    console.log('[QR] Generating payment QR with data:', data);
    const response = await api.post('/gw/payments/generate-qr', data);
    return response.data;
  },

  // Check payment status for invoice
  checkPaymentStatus: async (invoiceId: number): Promise<ApiResponse<{
    invoice_id: number;
    paymongo_status: string;
    payment_completed: boolean;
    payment_completed_at?: string;
    total_payments: number;
    total_amount_paid: number;
    isAfterLinkCreation?: boolean;
    recent_payments: any[];
    link_id?: string;
    reference_number?: string;
  }>> => {
    const response = await api.get(`/gw/payments/status/${invoiceId}`);
    return response.data;
  }
};

// Service API
export const serviceApi = {
  // Get all services
  getServices: async (): Promise<ApiResponse<Service[]>> => {
    const response = await api.get('/billing/services');
    return response.data;
  },

  // Get service by ID
  getService: async (id: number): Promise<ApiResponse<Service>> => {
    const response = await api.get(`/billing/services/${id}`);
    return response.data;
  },

  // Create service
  createService: async (data: Omit<Service, 'service_id' | 'created_at'>): Promise<ApiResponse<Service>> => {
    const response = await api.post('/billing/services', data);
    return response.data;
  },

  // Update service
  updateService: async (id: number, data: Partial<Service>): Promise<ApiResponse<Service>> => {
    const response = await api.put(`/billing/services/${id}`, data);
    return response.data;
  },

  // Delete service
  deleteService: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/billing/services/${id}`);
    return response.data;
  }
};

// Patient API (for billing context)
export const patientApi = {
  // Get patients for billing
  getPatients: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Patient>> => {
    const response = await api.get('/billing/patients', { params });
    return response.data;
  }
};


export const treatmentPlansApi = {
  // Get treatment plans for patient
  getTreatmentPlansByPatient: async (patientId: number): Promise<ApiResponse<TreatmentPlansOption[]>> => {
    const response = await api.post(`/billing/treatmentplans/getall`, { patientId });
    return response.data;
  },
  getTreatmentPlansEntries: async (planId: number): Promise<ApiResponse<TreatmentPlanEntries>> => {
    const response = await api.post(`/billing/treatmentplans/getall-entries`, { planId });
    return response.data;
  }
};

// Treatment Plan API
export const treatmentPlanApi = {
  // Get treatment plans for patient
  getPatientPlans: async (patientId: number): Promise<ApiResponse<TreatmentPlanOption[]>> => {
    const response = await api.get(`/billing/patients/${patientId}/treatment-plans`);
    return response.data;
  },

  // Get a single treatment plan with its service/details
  getPlanById: async (planId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/billing/treatment-plans/${planId}`);
    return response.data;
  },

  // Create treatment plan
  createPlan: async (data: {
    patient_id: number;
    charges: {
      service_id: number;
      estimated_amount?: number;
      notes?: string;
    }[];
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/billing/treatment-plans', data);
    return response.data;
  },

  // Add a charge to an existing plan
  addCharge: async (planId: number, data: { service_id: number; estimated_amount?: number; notes?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post(`/billing/treatment-plans/${planId}/charges`, data);
    return response.data;
  }
};

// Adjustment API
export const adjustmentApi = {
  // Apply adjustment to invoice
  applyAdjustment: async (data: ApplyAdjustmentRequest): Promise<ApiResponse<AdjustmentLog>> => {
    const response = await api.post('/billing/adjustments', data);
    return response.data;
  },

  // Get adjustments for invoice
  getAdjustments: async (invoiceId: number): Promise<ApiResponse<AdjustmentLog[]>> => {
    const response = await api.get(`/billing/invoices/${invoiceId}/adjustments`);
    return response.data;
  }
};

// Installment API
export const installmentApi = {
  // Create installments for invoice
  createInstallments: async (data: {
    invoice_id: number;
    installments: {
      due_date: string;
      amount_due: number;
    }[];
  }): Promise<ApiResponse<Installment[]>> => {
    const response = await api.post('/billing/installments', data);
    return response.data;
  },

  // Get installments for invoice
  getInstallments: async (invoiceId: number): Promise<ApiResponse<Installment[]>> => {
    const response = await api.get(`/billing/invoices/${invoiceId}/installments`);
    return response.data;
  },

  // Update installment
  updateInstallment: async (id: number, data: Partial<Installment>): Promise<ApiResponse<Installment>> => {
    const response = await api.put(`/billing/installments/${id}`, data);
    return response.data;
  },

  // Record payment for installment
  recordPayment: async (installmentId: number, data: {
    invoice_id: number;
    amount: number;
    method: string;
    transaction_ref?: string;
    notes?: string;
    proof_of_payment?: string;
  }): Promise<ApiResponse<InstallmentPayment>> => {
    const response = await api.post(`/billing/installments/${installmentId}/payments`, data);
    return response.data;
  },

  // Get payment history for installment
  getPaymentHistory: async (installmentId: number): Promise<ApiResponse<InstallmentPayment[]>> => {
    const response = await api.get(`/billing/installments/${installmentId}/payments`);
    return response.data;
  },

  // Get all installment payments across all invoices
  getAllInstallmentPayments: async (): Promise<ApiResponse<InstallmentPayment[]>> => {
    // First get all invoices to find their installments
    const invoicesResponse = await api.get('/billing/invoices');
    const invoices = invoicesResponse.data.data || [];
    
    const allInstallmentPayments: InstallmentPayment[] = [];
    
    // For each invoice, get its installments and their payments
    for (const invoice of invoices) {
      try {
        // Get installments for this invoice
        const installmentsResponse = await api.get(`/billing/invoices/${invoice.invoice_id}/installments`);
        const installments = installmentsResponse.data.data || [];
        
        // For each installment, get its payments
        for (const installment of installments) {
          try {
            const paymentsResponse = await api.get(`/billing/installments/${installment.installment_id}/payments`);
            const payments = paymentsResponse.data.data || [];
            
            // Add patient and invoice context to each payment
            const enrichedPayments = payments.map((payment: InstallmentPayment) => ({
              ...payment,
              patient_name: invoice.patient_name,
              invoice_id: invoice.invoice_id
            }));
            
            allInstallmentPayments.push(...enrichedPayments);
          } catch (error) {
            console.warn(`Failed to fetch payments for installment ${installment.installment_id}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch installments for invoice ${invoice.invoice_id}:`, error);
      }
    }
    
    return { data: allInstallmentPayments, success: true, message: 'Successfully fetched all installment payments' };
  },

  // Delete installment
  deleteInstallment: async (installmentId: number): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/billing/installments/${installmentId}`);
    return response.data;
  }
};

// Reports API
export const reportsApi = {
  // Get billing reports
  getRevenueReport: async (params: {
    start_date: string;
    end_date: string;
    group_by?: 'day' | 'month' | 'year';
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/billing/reports/revenue', { params });
    return response.data;
  },

  // Get payment method statistics
  getPaymentMethodStats: async (params: {
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/billing/reports/payment-methods', { params });
    return response.data;
  },

  // Get patient statistics
  getPatientStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/billing/reports/patient-stats', { params });
    return response.data;
  },

  // Get growth rate report
  getGrowthRate: async (params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/billing/reports/growth-rate', { params });
    return response.data;
  }
};


// Dentist API (from appointment service)
export interface Dentist {
  dentist_id?: number;
  id?: number; // Alternative ID field name
  full_name?: string;  
  specialization?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  status?: 'active' | 'inactive';
}

export const dentistApi = {
  // Get all dentists
  getDentists: async (): Promise<Dentist[]> => {
    const response = await api.post('/billing/dentist/getall');
    console.log('Dentists response:', response.data);
    return response.data;
  },

  // Get dentist by ID
  // getDentist: async (id: number): Promise<Dentist> => {
  //   const response = await api.post('/billing/dentist', { id });
  //   return response.data;
  // }
};

// User Access API
export const userAccessApi = {
  // Get user access items
  getUserAccessCode: async (): Promise<ApiResponse<string>> => {
    const response = await api.post('/appointment/user/get-access');
    return {
      data: response.data.access,
      success: true,
      message: 'Successfully fetched user access codes'
    };
  }
};
