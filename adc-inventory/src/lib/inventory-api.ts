import { api } from './api';

export interface InventoryItem {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: number;
  category_name?: string;
  supplier_id: number;
  supplier_name?: string;
  unit_of_measure: string;
  reorder_level: number;  
  storage_location: string;
  created_at: string;  
}

export interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StockInRecord {
  stock_in_id: number;
  item_name: string;
  batch_no?: string;
  qty_added: number;
  supplier_name?: string;
  date_in: string;
  remarks?: string;
  created_at: string;
}

export interface StockInResponse {
  success: boolean;
  data: StockInRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Enhanced Stock-In interfaces for Receive Delivery functionality
export interface StockInBatchItem {
  item_id: number;
  item_name?: string;
  batch_no: string;
  expiry_date?: string;
  qty_received: number;
  unit_cost: number;
  remarks?: string;
}

export interface ReceiveDeliveryRequest {
  stock_in_no: string;
  po_id?: number;
  supplier_id?: number;
  date_received: string;
  received_by: string;
  remarks?: string;
  items: StockInBatchItem[];
}

export interface ReceiveDeliveryResponse {
  success: boolean;
  data: {
    stock_in_id: number;
    stock_in_no: string;
    total_items: number;
    total_amount: number;
  };
  message: string;
}

export interface BatchUploadItem {
  item_code: string;
  item_name: string;
  category_id: number;
  unit_of_measure: string;
  reorder_level: number;
  supplier_id: number;
  storage_location?: string;
  batch_no?: string;
  expiry_date?: string;
  qty_available?: number;
}

export interface BatchUploadResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    item_code: string;
    error: string;
  }>;
}

export interface BatchUploadResponse {
  success: boolean;
  data: BatchUploadResult;
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalSuppliers: number;
  pendingOrders: number;
  totalValue: number;
  recentActivities: Array<{
    type: string;
    message: string;
    time: string;
  }>;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface BatchAlert {
  batch_id: number;
  batch_no: string;
  item_name: string;
  expiry_date: string;
  qty_available: number;
  status: 'expired' | 'expiring-soon' | 'good';
  days_left: number;
}

export interface BatchAlertsResponse {
  success: boolean;
  data: BatchAlert[];
}

export interface StockOutRecord {
  stock_out_id: number;
  item_name: string;
  batch_no?: string;
  qty_used: number;
  usage_type: string;
  date_out: string;
  remarks?: string;
  created_at: string;
}

export interface StockOutResponse {
  success: boolean;
  data: StockOutRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface ItemCatalogItem {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id?: number;
  category_name?: string;
  unit_of_measure: string;
  reorder_level: number;
  supplier_id?: number;
  supplier_name?: string;
  storage_location?: string;
  created_at: string;
}

export interface ItemCatalogResponse {
  success: boolean;
  data: ItemCatalogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SupplierResponse {
  success: boolean;
  data: Supplier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PurchaseOrderItem {
  poi_id: number;
  item_id: number;
  item_name?: string;
  item_code?: string;
  quantity_ordered: number;
  unit_cost: number;
  subtotal: number;
  remarks?: string;
}

export interface PurchaseOrder {
  po_id: number;
  supplier_id: number;
  supplier_name?: string;
  po_number: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  total_amount: number;
  remarks?: string;
  created_by: string;
  items_count?: number;
  items?: PurchaseOrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface PurchaseOrderResponse {
  success: boolean;
  data: PurchaseOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ExpiryReportItem {
  id: number;
  name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  days_until_expiry: number;
}

export interface ExpiryReportResponse {
  success: boolean;
  data: ExpiryReportItem[];
}

export interface LowStockReportItem {
  id: number;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  supplier_name: string;
}

export interface LowStockReportResponse {
  success: boolean;
  data: LowStockReportItem[];
}

export interface PurchaseHistoryItem {
  id: number;
  item_name: string;
  supplier_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  batch_number: string;
  expiry_date: string;
}

export interface PurchaseHistoryResponse {
  success: boolean;
  data: PurchaseHistoryItem[];
}

export interface StockBatch {
  batch_id: number;
  item_id: number;
  item_name?: string;
  batch_no: string;
  expiry_date?: string;
  qty_available: number;
  created_at: string;
}

export interface StockBatchResponse {
  success: boolean;
  data: StockBatch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StockAdjustment {
  adjustment_id: number;
  batch_id: number;
  batch_no?: string;
  item_id?: number;
  item_name?: string;
  old_qty: number;
  new_qty: number;
  qty_change?: number;
  reason?: string;
  adjustment_type?: string;
  adjusted_by?: number;
  adjusted_at: string;
}

export interface StockAdjustmentResponse {
  success: boolean;
  data: StockAdjustment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StockAdjustmentCreateRequest {
  batch_id: number;
  new_qty: number;
  reason?: string;
  adjustment_type?: string;
  adjusted_by?: number;
}

export interface StockOutItem {
  item_id: number;
  batch_id: number;
  qty_released: number;
  remarks?: string;
}

export interface StockOutTransaction {
  stock_out_id: number;
  reference_no: string;
  stock_out_date: string;
  released_to: string;
  purpose?: string;
  created_by: string;
  created_at: string;
  // Treatment usage fields
  treatment_id?: number;
  patient_name?: string;
  dentist_name?: string;
  treatment_type?: string;
  // Items
  items_count?: number;
  total_qty_released?: number;
  items?: Array<{
    id: number;
    item_id: number;
    item_name: string;
    batch_id: number;
    batch_no: string;
    qty_released: number;
    remarks?: string;
  }>;
}

export interface StockOutTransactionResponse {
  success: boolean;
  data: StockOutTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StockOutCreateRequest {
  released_to: string;
  purpose?: string;
  created_by: string;
  items: StockOutItem[];
  // Treatment usage specific fields
  //treatment_id?: number;
  patient_name?: string;
  dentist_name?: string;
  //treatment_type?: string;
  is_treatment_usage?: boolean;
  patient_id?: number;
  invoice_id?: number;
  charge_id?: number;
  service_id?: number;
}

export interface TreatmentStockUsage {
  id: number;
  treatment_id?: number;
  stock_out_id: number;
  item_id: number;
  qty_used: number;
  patient_name?: string;
  dentist_name?: string;
  treatment_type?: string;
  remarks?: string;
  created_at: string;
}

export interface TreatmentInfo {
  treatment_id?: number;
  patient_name: string;
  dentist_name: string;
  treatment_type: string;
}

export interface AvailableBatch {
  batch_id: number;
  item_id: number;
  item_name: string;
  batch_no: string;
  expiry_date?: string;
  qty_available: number;
}

export interface AvailableBatchResponse {
  success: boolean;
  data: AvailableBatch[];
}

export interface categories {
  category_id: number;
  category_name: string;
}

export interface supplierOptions {
  supplier_id: number;
  supplier_name: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Patient Types
export interface Patient {
  patient_id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

// Treatment Plan Types
export interface TreatmentPlan {
  plan_id: number;
  patient_id: number;
  status: 'planned' | 'ongoing' | 'completed';
  created_at: string;
  updated_at: string;
}
// treatment plan options
export interface TreatmentPlanOption {
  plan_id: number;
  patient_id: number;
  service_name: string;
}


export const inventoryApi = {
  // Get all inventory items
  getInventory: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    low_stock?: boolean;
  }): Promise<InventoryResponse> => {
    const response = await api.get('/inventory/items', { params });
    return response.data;
  },

  // Get item catalog (for purchase orders)
  getItemCatalog: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
  }): Promise<ItemCatalogResponse> => {
    const response = await api.get('/inventory/item-catalog', { params });
    return response.data;
  },

  // get categories for dropdowns
  getCategories: async (): Promise<categories[]> => {
    const response = await api.get('/inventory/categories');
    return response.data.data;
  },

  // Get item options for dropdowns
  getItemOptions: async (): Promise<{ item_id: number; item_name: string }[]> => {
    const response = await api.get('/inventory/item-options');
    return response.data.data;
  },

  // Get single inventory item
  getInventoryItem: async (id: number): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data.data;
  },

  // Create new inventory item
  createInventoryItem: async (item: Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> => {
    const response = await api.post('/inventory/items', item);
    return response.data.data;
  },

  // Update inventory item
  updateInventoryItem: async (id: number, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await api.put(`/inventory/items/${id}`, item);
    return response.data.data;
  },

  // Delete inventory item
  deleteInventoryItem: async (id: number): Promise<void> => {
    await api.delete(`/inventory/items/${id}`);
  },

  // Get all stock in records
  getStockInRecords: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    supplier_id?: number;
  }): Promise<StockInResponse> => {
    const response = await api.get('/inventory/stock-in', { params });
    return response.data;
  },

  // Get single stock in record
  getStockInRecord: async (id: number): Promise<StockInRecord> => {
    const response = await api.get(`/inventory/stock-in/${id}`);
    return response.data.data;
  },

  // Create new stock in record
  createStockInRecord: async (record: {
    item_id: number;
    batch_no?: string;
    qty_added: number;
    supplier_id?: number;
    date_in: string;
    expiry_date?: string;
    remarks?: string;
  }): Promise<StockInRecord> => {
    const response = await api.post('/inventory/stock-in', record);
    return response.data.data;
  },

  // Enhanced Receive Delivery function (for multiple items)
  receiveDelivery: async (deliveryData: ReceiveDeliveryRequest): Promise<ReceiveDeliveryResponse> => {
    const response = await api.post('/inventory/receive-delivery', deliveryData);
    return response.data;
  },

  // Get stock batches
  getStockBatches: async (params?: {
    item_id?: number;
    batch_no?: string;
    page?: number;
    limit?: number;
    search?: string;
    category_id?: string;
    expiry_filter?: string;
  }): Promise<StockBatchResponse> => {
    const response = await api.get('/inventory/batches', { params });
    return response.data;
  },

  // Create new stock batch
  createStockBatch: async (batch: {
    item_id: number;
    batch_no: string;
    expiry_date?: string;
    qty_available?: number;
  }): Promise<StockBatch> => {
    const response = await api.post('/inventory/batches', batch);
    return response.data.data;
  },

  // Update stock batch
  updateStockBatch: async (id: number, batch: {
    batch_no: string;
    expiry_date?: string;
    qty_available: number;
    reason?: string;
    adjusted_by?: number;
  }): Promise<StockBatch> => {
    const response = await api.put(`/inventory/batches/${id}`, batch);
    return response.data.data;
  },

  // Delete stock batch
  deleteStockBatch: async (id: number): Promise<void> => {
    await api.delete(`/inventory/batches/${id}`);
  },

  // Get all stock out records
  getStockOutRecords: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    item_id?: number;
    usage_type?: string;
  }): Promise<StockOutResponse> => {
    const response = await api.get('/inventory/stock-out', { params });
    return response.data;
  },

  // Get single stock out record
  getStockOutRecord: async (id: number): Promise<StockOutRecord> => {
    const response = await api.get(`/inventory/stock-out/${id}`);
    return response.data.data;
  },

  // Create new stock out record
  createStockOutRecord: async (record: {
    item_id: number;
    batch_id?: number;
    qty_used: number;
    usage_type?: string;
    date_out: string;
    remarks?: string;
  }): Promise<StockOutRecord> => {
    const response = await api.post('/inventory/stock-out', record);
    return response.data.data;
  },

  // Get supplier options for dropdowns
  getSupplierOptions: async (): Promise<supplierOptions[]> => {
    const response = await api.get('/inventory/supplier-options');
    return response.data.data;
  },

  // Get all suppliers
  getSuppliers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<SupplierResponse> => {
    const response = await api.get('/inventory/suppliers', { params });
    return response.data;
  },

  // Get single supplier
  getSupplier: async (id: number): Promise<Supplier> => {
    const response = await api.get(`/inventory/suppliers/${id}`);
    return response.data.data;
  },

  // Create new supplier
  createSupplier: async (supplier: {
    supplier_name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> => {
    const response = await api.post('/inventory/suppliers', supplier);
    return response.data.data;
  },

  // Update supplier
  updateSupplier: async (id: number, supplier: {
    supplier_name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> => {
    const response = await api.put(`/inventory/suppliers/${id}`, supplier);
    return response.data.data;
  },

  // Delete supplier
  deleteSupplier: async (id: number): Promise<void> => {
    await api.delete(`/inventory/suppliers/${id}`);
  },

  // Get all purchase orders
  getPurchaseOrders: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    supplier_id?: number;
    status?: string;
  }): Promise<PurchaseOrderResponse> => {
    const response = await api.get('/inventory/purchase-orders', { params });
    return response.data;
  },

  // Get single purchase order
  getPurchaseOrder: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get(`/inventory/purchase-orders/${id}`);
    return response.data.data;
  },

  // Create new purchase order
  createPurchaseOrder: async (purchaseOrder: {
    supplier_id: number;
    expected_delivery_date?: string;
    remarks?: string;
    created_by: string;
    items: Array<{
      item_id: number;
      quantity_ordered: number;
      unit_cost: number;
      remarks?: string;
    }>;
    status?: string;
  }): Promise<PurchaseOrder> => {
    const response = await api.post('/inventory/purchase-orders', purchaseOrder);
    return response.data.data;
  },

  // Update purchase order
  updatePurchaseOrder: async (id: number, purchaseOrder: {
    supplier_id: number;
    expected_delivery_date?: string;
    status?: string;
    remarks?: string;
    items?: Array<{
      item_id: number;
      quantity_ordered: number;
      unit_cost: number;
      remarks?: string;
    }>;
  }): Promise<PurchaseOrder> => {
    const response = await api.put(`/inventory/purchase-orders/${id}`, purchaseOrder);
    return response.data.data;
  },

  // Delete purchase order
  deletePurchaseOrder: async (id: number): Promise<void> => {
    await api.delete(`/inventory/purchase-orders/${id}`);
  },

  // Reports
  getExpiryReport: async (days: number = 30): Promise<ExpiryReportResponse> => {
    const response = await api.get('/inventory/reports/expiry', { params: { days } });
    return response.data;
  },

  getLowStockReport: async (): Promise<LowStockReportResponse> => {
    const response = await api.get('/inventory/reports/low-stock');
    return response.data;
  },

  getPurchaseHistory: async (days: number = 30): Promise<PurchaseHistoryResponse> => {
    const response = await api.get('/inventory/reports/purchase-history', { params: { days } });
    return response.data;
  },

  // Batch upload items
  batchUploadItems: async (items: BatchUploadItem[]): Promise<BatchUploadResponse> => {
    const response = await api.post('/inventory/batch-upload', { items });
    return response.data;
  },

  // Dashboard APIs
  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get('/inventory/dashboard/stats');
    return response.data;
  },

  getBatchAlerts: async (): Promise<BatchAlertsResponse> => {
    const response = await api.get('/inventory/dashboard/batch-alerts');
    return response.data;
  },

  // Stock Adjustments
  createStockAdjustment: async (adjustment: StockAdjustmentCreateRequest): Promise<{
    adjustment: StockAdjustment;
    updated_batch: StockBatch;
  }> => {
    const response = await api.post('/inventory/stock-adjustments', adjustment);
    return response.data.data;
  },

  getStockAdjustments: async (params?: {
    batch_id?: number;
    item_id?: number;
    adjusted_by?: number;
    days?: number;
    page?: number;
    limit?: number;
  }): Promise<StockAdjustmentResponse> => {
    const response = await api.get('/inventory/stock-adjustments', { params });
    return response.data;
  },

  getStockAdjustment: async (id: number): Promise<StockAdjustment> => {
    const response = await api.get(`/inventory/stock-adjustments/${id}`);
    return response.data.data;
  },

  // Stock-Out Transaction methods
  createStockOutTransaction: async (stockOutData: StockOutCreateRequest): Promise<{
    stock_out_id: number;
    reference_no: string;
    total_items: number;
    items_count: number;
  }> => {
    const response = await api.post('/inventory/stock-out-transaction', stockOutData);
    return response.data.data;
  },

  getStockOutTransactions: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    released_to?: string;
  }): Promise<StockOutTransactionResponse> => {
    const response = await api.get('/inventory/stock-out-transactions', { params });
    return response.data;
  },

  getStockOutTransaction: async (id: number): Promise<StockOutTransaction> => {
    const response = await api.get(`/inventory/stock-out-transactions/${id}`);
    return response.data.data;
  },

  getAvailableBatches: async (item_id?: number): Promise<AvailableBatchResponse> => {
    const response = await api.get('/inventory/available-batches', { 
      params: item_id ? { item_id } : {} 
    });
    return response.data;
  },

  // Treatment Stock Usage
  getTreatmentStockUsage: async (params?: {
    treatment_id?: number;
    patient_name?: string;
    dentist_name?: string;
    days?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: TreatmentStockUsage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await api.get('/inventory/treatment-stock-usage', { params });
    return response.data;
  },
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
    const response = await api.post('/inventory/dentists');
    console.log('Dentists response:', response.data);
    return response.data;
  },

  // Get dentist by ID
  getDentist: async (id: number): Promise<Dentist> => {
    const response = await api.post('/inventory/dentist', { id });
    return response.data;
  }
};

// Service API (for treatment types)
export interface Service {
  service_id: number;
  service_name: string;
  description?: string;
  fixed_price?: number;
  base_price_min?: number;
  base_price_max?: number;
  category?: string;
  created_at: string;
}

export const serviceApi = {
  // Get all services (treatment types)
  getServices: async (): Promise<ApiResponse<Service[]>> => {
    const response = await api.get('/billing/services');
    return response.data;
  },

  // Get service by ID
  getService: async (id: number): Promise<ApiResponse<Service>> => {
    const response = await api.get(`/billing/services/${id}`);
    return response.data;
  }
};

export const invoiceApi = {
  // Get invoice for a treatment plan
  getInvoices: async (patientId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/inventory/patients/${patientId}`);
    return response.data;
  },
  
  // Get invoice charges for a specific invoice
  getInvoiceCharges: async (invoiceId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/inventory/patients/${invoiceId}/charges`);
    return response.data;
  }
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