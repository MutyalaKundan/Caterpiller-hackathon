// TypeScript interfaces matching the SQLite database schema

export interface Equipment {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  year_manufactured: number;
  purchase_date: string;
  equipment_value: number;
  depreciation_rate: number;
  qr_code: string;
  rfid_tag: string;
  tracking_method: string;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Out of Service';
  created_at: string;
  updated_at: string;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  customer_type: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  credit_rating: number;
  created_at: string;
}

export interface Site {
  site_id: string;
  site_name: string;
  site_type: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  site_manager: string;
  project_start_date: string;
  project_end_date: string;
  weather_zone: string;
  created_at: string;
}

export interface Rental {
  rental_id: string;
  equipment_id: string;
  customer_id: string;
  site_id: string;
  rental_start_date: string;
  rental_end_date_planned: string;
  rental_end_date_actual?: string;
  rental_rate_per_day: number;
  total_rental_cost: number;
  security_deposit: number;
  rental_status: 'Active' | 'Returned' | 'Overdue' | 'Cancelled';
  delivery_address: string;
  pickup_address: string;
  rental_duration_planned: number;
  rental_duration_actual?: number;
  overdue_days: number;
  late_fees_charged: number;
  damage_charges: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentUsage {
  usage_id: number;
  equipment_id: string;
  rental_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  runtime_hours_total: number;
  runtime_hours_session: number;
  idle_hours: number;
  fuel_level: number;
  fuel_consumption_rate: number;
  engine_temperature: number;
  hydraulic_pressure: number;
  vibration_level: number;
  load_weight: number;
  speed_kmh: number;
  battery_level: number;
  signal_strength: number;
  is_operating: boolean;
  operator_id: string;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  equipment_id: string;
  maintenance_date: string;
  maintenance_type: 'Preventive' | 'Corrective' | 'Emergency';
  description: string;
  cost: number;
  duration_hours: number;
  technician_id: string;
  parts_replaced: string;
  next_maintenance_due: string;
  maintenance_score: number;
  downtime_hours: number;
  created_at: string;
}

export interface Alert {
  alert_id: number;
  equipment_id: string;
  rental_id?: string;
  alert_type: 'overdue' | 'maintenance_due' | 'low_fuel' | 'geofence_violation' | 'theft_alert';
  alert_message: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  status: 'Active' | 'Acknowledged' | 'Resolved' | 'Dismissed';
}

export interface EquipmentHealth {
  health_id: number;
  equipment_id: string;
  assessment_date: string;
  overall_health_score: number;
  engine_health: number;
  hydraulic_health: number;
  transmission_health: number;
  electrical_health: number;
  structural_health: number;
  predicted_failure_days: number;
  maintenance_priority: number;
  recommended_actions: string;
  total_runtime_hours: number;
  total_idle_hours: number;
  utilization_rate: number;
  wear_level: 'Low' | 'Medium' | 'High' | 'Critical';
}

// Dashboard KPI interface
export interface DashboardKPIs {
  totalRentedEquipment: number;
  activeRentals: number;
  overdueRentals: number;
  averageUtilization: number;
}

// Equipment with extended information for table display
export interface EquipmentTableRow extends Equipment {
  customer_name?: string;
  site_name?: string;
  rental_start_date?: string;
  rental_end_date_planned?: string;
  runtime_hours_total?: number;
  idle_hours?: number;
  operator_id?: string;
  utilization_rate?: number;
}