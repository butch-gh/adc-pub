// User Types
export type UserRole = 'Superadmin' | 'Admin' | 'Moderator' | 'Staff';

export interface User {
  user_id: number;
  username: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
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

// Theme
export type Theme = 'light' | 'dark';

// Navigation
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  requiredRoles?: UserRole[];
  children?: MenuItem[];
}

// Inventory Types
export interface Category {
  category_id: number;
  category_name: string;
  description?: string;
}

export interface Item {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: number;
  category?: Category;
  unit_of_measure: string;
  reorder_level: number;
  supplier_id?: number;
  supplier?: Supplier;
  storage_location?: string;
  created_at: string;
  updated_at?: string;
}

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  created_at: string;
}

export interface StockBatch {
  batch_id: number;
  item_id: number;
  batch_no: string;
  expiry_date?: string;
  qty_available: number;
  created_at: string;
}

export interface StockIn {
  stock_in_id: number;
  item_id: number;
  batch_id: number;
  qty_added: number;
  supplier_id: number;
  purchase_order_id?: number;
  date_in: string;
  remarks?: string;
}

export interface StockOut {
  stock_out_id: number;
  item_id: number;
  batch_id: number;
  qty_used: number;
  usage_type: 'treatment' | 'wastage' | 'adjustment' | 'other';
  treatment_id?: number;
  date_out: string;
  remarks?: string;
}

export interface PurchaseOrder {
  purchase_order_id: number;
  supplier_id: number;
  po_number: string;
  order_date: string;
  status: 'pending' | 'approved' | 'ordered' | 'delivered' | 'cancelled';
  total_amount?: number;
  remarks?: string;
}
