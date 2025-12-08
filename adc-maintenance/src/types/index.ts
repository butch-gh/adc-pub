// User Types
export type UserRole = 'Superadmin' | 'Admin' | 'Moderator' | 'Staff';

export interface UserAccess {
  access: string[];
}

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


interface toothOption {
  id: number;
  description: string;
}

// Service Types
export interface Service {
  service_id: number;
  service_name: string;
  fixed_price?: number;
  base_price_min?: number;
  base_price_max?: number;
  default_notes?: string;
  service_time?: number; // Time in minutes
  created_at: string;
  tooth_options?: toothOption[]; // New field for tooth options
}

// Treatment Plan Types
export interface TreatmentPlan {
  plan_id: number;
  patient_id: number;
  status: 'planned' | 'ongoing' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlansOption {  
  plan_id: number;
  plan_name: string;
}
//entry_id, procedure_name, dentist_name, estimated_cost, status
export interface TreatmentPlanEntries {
  entry_id: number;  
  procedure_name: string;
  dentist_name: string;
  estimated_cost: number;
  status: 'Planned' | 'On-Going' | 'Performed' | 'Cancelled' | 'Invoiced';
  note?: string;
}

// treatment plan options
export interface TreatmentPlanOption {
  plan_id: number;
  patient_id: number;
  service_name: string;
}


// Treatment Charge Types
export interface TreatmentCharge {
  charge_id: number;
  plan_id: number;
  service_id: number;
  estimated_amount?: number;
  final_amount?: number;
  notes?: string;
  status: 'pending' | 'confirmed';
  created_at: string;
  service?: Service;
}

// Billing Types
export interface Invoice {
  invoice_id: number;
  invoice_code: string;
  patient_id: number;
  plan_id?: number;
  plan_mode?: 'with-plan' | 'without-plan'; // Added for mode tracking
  total_amount_estimated: number;
  final_amount?: number;
  discount_amount: number;
  writeoff_amount: number;
  net_amount_due: number;
  amount: number; // Added for API compatibility
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'pending_adjustment';
  created_at: string;
  updated_at: string;
  patient?: Patient;
  patient_name?: string; // Added for API compatibility
  mobile_number?: string; // Added for API compatibility
  email?: string; // Added for API compatibility
  dentist_id?: number;
  dentist_name?: string; // Added for API compatibility
  treatment_plan?: TreatmentPlan;
  charges?: TreatmentCharge[];
  treatments?: TreatmentCharge[]; // Added for API compatibility
  payments?: Payment[];
}

export interface Payment {
  payment_id: number;
  invoice_id: number;
  invoice_code?: string;
  amount_paid: number;
  change_amount: number;
  received_amount: number;
  method: 'QR' | 'Cash';
  transaction_ref?: string;
  proof_of_payment?: string;
  payment_date: string;
  payment_type?: string; // For unified payment listing
  patient_name?: string; // Added for API compatibility
}

export interface Installment {
  installment_id: number;
  invoice_id: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
}

export interface InstallmentPayment {
  payment_id: number;
  installment_id: number;
  invoice_code?: string;
  amount: number;
  method: 'Cash' | 'QR' ;
  transaction_ref?: string;
  notes?: string;
  proof_of_payment?: string;
  payment_date: string;
  created_at: string;
}

export interface InstallmentPaymentRequest {
  amount: number;
  method: string;
  transaction_ref?: string;
  notes?: string;
}

export interface Receipt {
  receipt_id: number;
  payment_id: number;
  receipt_number: string;
  digital_copy?: string;
  issued_at: string;
}

export interface AdjustmentLog {
  adjustment_id: number;
  invoice_id: number;
  type: 'discount' | 'write-off' | 'refund';
  amount: number;
  note?: string;
  created_by: number;
  created_at: string;
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

// Form Types
export interface CreateInvoiceRequest {
  patient_id: number;
  plan_id?: number;
  charges: {
    service_id: number;
    estimated_amount?: number;
    notes?: string;
  }[];
}

export interface CreatePaymentRequest {
  invoice_id: number;
  amount_paid: number;
  change_amount: number;
  received_amount: number;
  method: 'QR' | 'Cash';
  transaction_ref?: string;
  proof_of_payment?: string;
}

export interface TreatmentCharge {
  charge_id: number;
  service_name: string;
  estimated_amount?: number;
  final_amount?: number;
  status: 'pending' | 'confirmed';
  notes?: string;
}

export interface ApplyAdjustmentRequest {
  type: 'discount' | 'write-off' | 'refund';
  amount: number;
  note: string;
}

export interface AdjustmentLog {
  adjustment_id: number;
  invoice_id: number;
  type: 'discount' | 'write-off' | 'refund';
  amount: number;
  note?: string;
  created_by: number;
  created_at: string;
}