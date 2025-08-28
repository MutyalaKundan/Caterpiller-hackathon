// Mock data for the Smart Asset Rental Tracking System
import { Equipment, Customer, Site, Rental, Alert, EquipmentUsage, MaintenanceRecord, EquipmentHealth, DashboardKPIs, EquipmentTableRow } from '../types';

export const mockEquipment: Equipment[] = [
  {
    equipment_id: 'CAT-001',
    equipment_name: 'CAT 320D Excavator',
    equipment_type: 'Excavator',
    manufacturer: 'Caterpillar',
    model_number: '320D',
    serial_number: 'CAT320D2024001',
    year_manufactured: 2023,
    purchase_date: '2023-01-15',
    equipment_value: 450000,
    depreciation_rate: 8.5,
    qr_code: 'QR_CAT001',
    rfid_tag: 'RFID_CAT001',
    tracking_method: 'QR',
    status: 'Rented',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-12-01T08:30:00Z'
  },
  {
    equipment_id: 'CAT-002',
    equipment_name: 'CAT 966M Wheel Loader',
    equipment_type: 'Wheel Loader',
    manufacturer: 'Caterpillar',
    model_number: '966M',
    serial_number: 'CAT966M2024002',
    year_manufactured: 2023,
    purchase_date: '2023-02-20',
    equipment_value: 380000,
    depreciation_rate: 7.5,
    qr_code: 'QR_CAT002',
    rfid_tag: 'RFID_CAT002',
    tracking_method: 'RFID',
    status: 'Available',
    created_at: '2023-02-20T10:00:00Z',
    updated_at: '2024-12-01T08:30:00Z'
  },
  {
    equipment_id: 'CAT-003',
    equipment_name: 'CAT D6T Dozer',
    equipment_type: 'Bulldozer',
    manufacturer: 'Caterpillar',
    model_number: 'D6T',
    serial_number: 'CATD6T2024003',
    year_manufactured: 2023,
    purchase_date: '2023-03-10',
    equipment_value: 520000,
    depreciation_rate: 9.0,
    qr_code: 'QR_CAT003',
    rfid_tag: 'RFID_CAT003',
    tracking_method: 'QR',
    status: 'Rented',
    created_at: '2023-03-10T10:00:00Z',
    updated_at: '2024-12-01T08:30:00Z'
  },
  {
    equipment_id: 'CAT-004',
    equipment_name: 'CAT 730C Articulated Truck',
    equipment_type: 'Articulated Truck',
    manufacturer: 'Caterpillar',
    model_number: '730C',
    serial_number: 'CAT730C2024004',
    year_manufactured: 2023,
    purchase_date: '2023-04-05',
    equipment_value: 680000,
    depreciation_rate: 8.0,
    qr_code: 'QR_CAT004',
    rfid_tag: 'RFID_CAT004',
    tracking_method: 'RFID',
    status: 'Maintenance',
    created_at: '2023-04-05T10:00:00Z',
    updated_at: '2024-12-01T08:30:00Z'
  },
  {
    equipment_id: 'CAT-005',
    equipment_name: 'CAT 950M Wheel Loader',
    equipment_type: 'Wheel Loader',
    manufacturer: 'Caterpillar',
    model_number: '950M',
    serial_number: 'CAT950M2024005',
    year_manufactured: 2023,
    purchase_date: '2023-05-15',
    equipment_value: 320000,
    depreciation_rate: 7.0,
    qr_code: 'QR_CAT005',
    rfid_tag: 'RFID_CAT005',
    tracking_method: 'QR',
    status: 'Rented',
    created_at: '2023-05-15T10:00:00Z',
    updated_at: '2024-12-01T08:30:00Z'
  }
];

export const mockCustomers: Customer[] = [
  {
    customer_id: 'CUST-001',
    customer_name: 'MegaCorp Construction',
    customer_type: 'Corporate',
    contact_person: 'John Smith',
    phone: '+1-555-0101',
    email: 'john.smith@megacorp.com',
    address: '123 Industrial Ave',
    city: 'Chicago',
    state: 'Illinois',
    postal_code: '60601',
    credit_rating: 9,
    created_at: '2023-01-10T10:00:00Z'
  },
  {
    customer_id: 'CUST-002',
    customer_name: 'Premier Infrastructure',
    customer_type: 'Corporate',
    contact_person: 'Sarah Johnson',
    phone: '+1-555-0102',
    email: 'sarah.johnson@premier.com',
    address: '456 Construction Blvd',
    city: 'Detroit',
    state: 'Michigan',
    postal_code: '48201',
    credit_rating: 8,
    created_at: '2023-02-15T10:00:00Z'
  }
];

export const mockSites: Site[] = [
  {
    site_id: 'SITE-001',
    site_name: 'Downtown Chicago Development',
    site_type: 'Construction',
    address: '789 Development St',
    city: 'Chicago',
    state: 'Illinois',
    postal_code: '60602',
    latitude: 41.8781,
    longitude: -87.6298,
    site_manager: 'Mike Wilson',
    project_start_date: '2024-01-15',
    project_end_date: '2024-12-31',
    weather_zone: 'Midwest',
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    site_id: 'SITE-002',
    site_name: 'Detroit Infrastructure Upgrade',
    site_type: 'Infrastructure',
    address: '321 Renewal Ave',
    city: 'Detroit',
    state: 'Michigan',
    postal_code: '48202',
    latitude: 42.3314,
    longitude: -83.0458,
    site_manager: 'Lisa Garcia',
    project_start_date: '2024-03-01',
    project_end_date: '2025-02-28',
    weather_zone: 'Great Lakes',
    created_at: '2024-02-15T10:00:00Z'
  }
];

export const mockRentals: Rental[] = [
  {
    rental_id: 'RENT-001',
    equipment_id: 'CAT-001',
    customer_id: 'CUST-001',
    site_id: 'SITE-001',
    rental_start_date: '2024-11-01',
    rental_end_date_planned: '2024-12-15',
    rental_rate_per_day: 850,
    total_rental_cost: 37400,
    security_deposit: 5000,
    rental_status: 'Active',
    delivery_address: '789 Development St, Chicago, IL 60602',
    pickup_address: '789 Development St, Chicago, IL 60602',
    rental_duration_planned: 44,
    overdue_days: 0,
    late_fees_charged: 0,
    damage_charges: 0,
    created_at: '2024-10-25T10:00:00Z',
    updated_at: '2024-11-01T08:00:00Z'
  },
  {
    rental_id: 'RENT-002',
    equipment_id: 'CAT-003',
    customer_id: 'CUST-002',
    site_id: 'SITE-002',
    rental_start_date: '2024-10-15',
    rental_end_date_planned: '2024-11-30',
    rental_end_date_actual: '2024-12-05',
    rental_rate_per_day: 920,
    total_rental_cost: 42340,
    security_deposit: 6000,
    rental_status: 'Overdue',
    delivery_address: '321 Renewal Ave, Detroit, MI 48202',
    pickup_address: '321 Renewal Ave, Detroit, MI 48202',
    rental_duration_planned: 46,
    rental_duration_actual: 51,
    overdue_days: 5,
    late_fees_charged: 2300,
    damage_charges: 0,
    created_at: '2024-10-10T10:00:00Z',
    updated_at: '2024-12-05T16:30:00Z'
  },
  {
    rental_id: 'RENT-003',
    equipment_id: 'CAT-005',
    customer_id: 'CUST-001',
    site_id: 'SITE-001',
    rental_start_date: '2024-11-15',
    rental_end_date_planned: '2024-12-31',
    rental_rate_per_day: 720,
    total_rental_cost: 33120,
    security_deposit: 4500,
    rental_status: 'Active',
    delivery_address: '789 Development St, Chicago, IL 60602',
    pickup_address: '789 Development St, Chicago, IL 60602',
    rental_duration_planned: 46,
    overdue_days: 0,
    late_fees_charged: 0,
    damage_charges: 0,
    created_at: '2024-11-08T10:00:00Z',
    updated_at: '2024-11-15T08:00:00Z'
  }
];

export const mockAlerts: Alert[] = [
  {
    alert_id: 1,
    equipment_id: 'CAT-003',
    rental_id: 'RENT-002',
    alert_type: 'overdue',
    alert_message: 'Equipment CAT-003 is 5 days overdue for return',
    severity: 'High',
    created_at: '2024-12-01T09:00:00Z',
    status: 'Active'
  },
  {
    alert_id: 2,
    equipment_id: 'CAT-004',
    alert_type: 'maintenance_due',
    alert_message: 'Scheduled maintenance due for CAT-004 in 3 days',
    severity: 'Medium',
    created_at: '2024-12-01T10:15:00Z',
    status: 'Active'
  },
  {
    alert_id: 3,
    equipment_id: 'CAT-001',
    rental_id: 'RENT-001',
    alert_type: 'low_fuel',
    alert_message: 'Fuel level below 15% for CAT-001',
    severity: 'Medium',
    created_at: '2024-12-01T14:30:00Z',
    status: 'Active'
  },
  {
    alert_id: 4,
    equipment_id: 'CAT-005',
    rental_id: 'RENT-003',
    alert_type: 'geofence_violation',
    alert_message: 'CAT-005 detected outside authorized project area',
    severity: 'Critical',
    created_at: '2024-12-01T16:45:00Z',
    status: 'Active'
  }
];

export const mockDashboardKPIs: DashboardKPIs = {
  totalRentedEquipment: 3,
  activeRentals: 2,
  overdueRentals: 1,
  averageUtilization: 78.5
};

export const mockEquipmentTableData: EquipmentTableRow[] = [
  {
    ...mockEquipment[0],
    customer_name: 'MegaCorp Construction',
    site_name: 'Downtown Chicago Development',
    rental_start_date: '2024-11-01',
    rental_end_date_planned: '2024-12-15',
    runtime_hours_total: 1247.5,
    idle_hours: 285.2,
    operator_id: 'OP-001',
    utilization_rate: 81.4
  },
  {
    ...mockEquipment[1],
    utilization_rate: 0
  },
  {
    ...mockEquipment[2],
    customer_name: 'Premier Infrastructure',
    site_name: 'Detroit Infrastructure Upgrade',
    rental_start_date: '2024-10-15',
    rental_end_date_planned: '2024-11-30',
    runtime_hours_total: 1456.8,
    idle_hours: 312.5,
    operator_id: 'OP-002',
    utilization_rate: 82.3
  },
  {
    ...mockEquipment[3],
    utilization_rate: 0
  },
  {
    ...mockEquipment[4],
    customer_name: 'MegaCorp Construction',
    site_name: 'Downtown Chicago Development',
    rental_start_date: '2024-11-15',
    rental_end_date_planned: '2024-12-31',
    runtime_hours_total: 892.3,
    idle_hours: 178.9,
    operator_id: 'OP-003',
    utilization_rate: 83.3
  }
];

// Utility functions for mock API responses
export const getEquipmentById = (id: string): Equipment | undefined => {
  return mockEquipment.find(eq => eq.equipment_id === id);
};

export const getRentalsByStatus = (status: string): Rental[] => {
  return mockRentals.filter(rental => rental.rental_status === status);
};

export const getActiveAlerts = (): Alert[] => {
  return mockAlerts.filter(alert => alert.status === 'Active');
};