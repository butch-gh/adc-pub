// Treatment Plans Types

export interface TreatmentPlanEntry {
  entry_id?: number;
  plan_id: number;
  tooth_code: string;
  procedure_id: number;
  procedure_name?: string;
  group_type_id: number;
  notes?: string;
  estimated_cost: number;
  dentist_id?: number;
  dentist_name?: string;
  status: EntryStatus;
  performed_date?: string;
  invoice_id?: number;
  invoice_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TreatmentPlanHeader {
  plan_id?: number;
  patient_id: number;
  plan_name: string;
  diagnosis_summary?: string;
  created_by?: number;
  created_by_name?: string;
  status: PlanStatus;
  created_at?: string;
  updated_at?: string;
  total_estimated_cost?: number;
}

export type PlanStatus = 'Active' | 'Completed' | 'Cancelled';
export type EntryStatus = 'Planned' | 'On-Going' | 'Performed' | 'Cancelled' | 'Invoiced';

export interface TreatmentPlanFormData {
  plan_name: string;
  diagnosis_summary?: string;
  status: PlanStatus;
}

export interface TreatmentPlanEntryFormData {
  tooth_code: string;
  procedure_id: number;
  group_type_id: number;
  notes?: string;
  estimated_cost: number;
  dentist_id?: number;
  status: EntryStatus;
  performed_date?: string;
  invoice_id?: number;
}

export interface Procedure {
  id?: number; // Primary ID field (from service table)
  procedure_id?: number;
  service_id?: number; // Alternative ID field name
  name?: string;
  service_name?: string; // Alternative name field
  description?: string; // Primary description field (from service table)
  base_cost?: number;
}

export interface Dentist {
  dentist_id?: number;
  id?: number;
  full_name?: string;
  name?: string;
}
