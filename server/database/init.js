import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = join(__dirname, 'caterpillar_fleet.db');

// Create and configure database
const db = new sqlite3.Database(DB_PATH);

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

export const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    console.log('🗄️ Initializing SQLite database...');
    
    // Create tables
    db.serialize(() => {
      // Equipment table
      db.run(`
        CREATE TABLE IF NOT EXISTS equipment (
          equipment_id VARCHAR(20) PRIMARY KEY,
          equipment_name VARCHAR(100) NOT NULL,
          equipment_type VARCHAR(50) NOT NULL,
          manufacturer VARCHAR(50),
          model_number VARCHAR(50),
          serial_number VARCHAR(100) UNIQUE,
          year_manufactured INTEGER,
          purchase_date DATE,
          equipment_value DECIMAL(12,2),
          depreciation_rate DECIMAL(5,2),
          qr_code VARCHAR(50) UNIQUE,
          rfid_tag VARCHAR(50) UNIQUE,
          tracking_method VARCHAR(20) DEFAULT 'QR',
          status VARCHAR(20) DEFAULT 'Available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          customer_id VARCHAR(20) PRIMARY KEY,
          customer_name VARCHAR(100) NOT NULL,
          customer_type VARCHAR(30),
          contact_person VARCHAR(100),
          phone VARCHAR(20),
          email VARCHAR(100),
          address TEXT,
          city VARCHAR(50),
          state VARCHAR(50),
          postal_code VARCHAR(20),
          credit_rating INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sites table
      db.run(`
        CREATE TABLE IF NOT EXISTS sites (
          site_id VARCHAR(20) PRIMARY KEY,
          site_name VARCHAR(100) NOT NULL,
          site_type VARCHAR(50),
          address TEXT,
          city VARCHAR(50),
          state VARCHAR(50),
          postal_code VARCHAR(20),
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          site_manager VARCHAR(100),
          project_start_date DATE,
          project_end_date DATE,
          weather_zone VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rentals table
      db.run(`
        CREATE TABLE IF NOT EXISTS rentals (
          rental_id VARCHAR(20) PRIMARY KEY,
          equipment_id VARCHAR(20),
          customer_id VARCHAR(20),
          site_id VARCHAR(20),
          rental_start_date DATE NOT NULL,
          rental_end_date_planned DATE NOT NULL,
          rental_end_date_actual DATE,
          rental_rate_per_day DECIMAL(10,2),
          total_rental_cost DECIMAL(12,2),
          security_deposit DECIMAL(10,2),
          rental_status VARCHAR(20) DEFAULT 'Active',
          delivery_address TEXT,
          pickup_address TEXT,
          rental_duration_planned INTEGER,
          rental_duration_actual INTEGER,
          overdue_days INTEGER DEFAULT 0,
          late_fees_charged DECIMAL(10,2) DEFAULT 0,
          damage_charges DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
          FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
          FOREIGN KEY (site_id) REFERENCES sites(site_id)
        )
      `);

      // Equipment usage table
      db.run(`
        CREATE TABLE IF NOT EXISTS equipment_usage (
          usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id VARCHAR(20),
          rental_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          runtime_hours_total DECIMAL(8,2),
          runtime_hours_session DECIMAL(6,2),
          idle_hours DECIMAL(6,2),
          fuel_level DECIMAL(5,2),
          fuel_consumption_rate DECIMAL(8,3),
          engine_temperature DECIMAL(5,2),
          hydraulic_pressure DECIMAL(8,2),
          vibration_level DECIMAL(6,3),
          load_weight DECIMAL(10,2),
          speed_kmh DECIMAL(6,2),
          battery_level INTEGER,
          signal_strength INTEGER,
          is_operating BOOLEAN DEFAULT FALSE,
          operator_id VARCHAR(20),
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
          FOREIGN KEY (rental_id) REFERENCES rentals(rental_id)
        )
      `);

      // Maintenance records table
      db.run(`
        CREATE TABLE IF NOT EXISTS maintenance_records (
          maintenance_id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id VARCHAR(20),
          maintenance_date DATE NOT NULL,
          maintenance_type VARCHAR(50),
          description TEXT,
          cost DECIMAL(10,2),
          duration_hours DECIMAL(6,2),
          technician_id VARCHAR(20),
          parts_replaced TEXT,
          next_maintenance_due DATE,
          maintenance_score INTEGER,
          downtime_hours DECIMAL(6,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
        )
      `);

      // Alerts table
      db.run(`
        CREATE TABLE IF NOT EXISTS alerts (
          alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id VARCHAR(20),
          rental_id VARCHAR(20),
          alert_type VARCHAR(50),
          alert_message TEXT,
          severity VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          acknowledged_at TIMESTAMP,
          resolved_at TIMESTAMP,
          status VARCHAR(20) DEFAULT 'Active',
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
          FOREIGN KEY (rental_id) REFERENCES rentals(rental_id)
        )
      `);

      // Anomalies table
      db.run(`
        CREATE TABLE IF NOT EXISTS anomalies (
          anomaly_id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id VARCHAR(20),
          rental_id VARCHAR(20),
          anomaly_type VARCHAR(50),
          detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          anomaly_score DECIMAL(6,3),
          description TEXT,
          baseline_value DECIMAL(10,3),
          actual_value DECIMAL(10,3),
          threshold_value DECIMAL(10,3),
          severity VARCHAR(10),
          status VARCHAR(20) DEFAULT 'Open',
          resolution_notes TEXT,
          resolved_at TIMESTAMP,
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
          FOREIGN KEY (rental_id) REFERENCES rentals(rental_id)
        )
      `);

      // Equipment health table
      db.run(`
        CREATE TABLE IF NOT EXISTS equipment_health (
          health_id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id VARCHAR(20),
          assessment_date DATE DEFAULT (date('now')),
          overall_health_score DECIMAL(5,2),
          engine_health DECIMAL(5,2),
          hydraulic_health DECIMAL(5,2),
          transmission_health DECIMAL(5,2),
          electrical_health DECIMAL(5,2),
          structural_health DECIMAL(5,2),
          predicted_failure_days INTEGER,
          maintenance_priority INTEGER,
          recommended_actions TEXT,
          total_runtime_hours DECIMAL(10,2),
          total_idle_hours DECIMAL(10,2),
          utilization_rate DECIMAL(5,2),
          wear_level VARCHAR(20),
          FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
        )
      `);

      // Indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_rental_dates ON rentals(rental_start_date, rental_end_date_planned)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_rental_status ON rentals(rental_status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON equipment_usage(timestamp)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_usage_equipment_date ON equipment_usage(equipment_id, timestamp)`);

      console.log('✅ Database tables created successfully');
      
      // Seed initial data
      seedDatabase();
      
      resolve();
    });
  });
};

const seedDatabase = () => {
  console.log('🌱 Seeding database with initial data...');
  
  // Check if data already exists
  db.get("SELECT COUNT(*) as count FROM equipment", (err, row) => {
    if (err) {
      console.error('Error checking existing data:', err);
      return;
    }
    
    // Only seed if empty
    if (row.count === 0) {
      insertSeedData();
    } else {
      console.log('✅ Database already contains data, skipping seed');
    }
  });
};

const insertSeedData = () => {
  db.serialize(() => {
    // Equipment data
    const equipmentData = [
      ['EQ001', 'CAT 336 Excavator', 'Excavator', 'Caterpillar', '336FL', 'SN336001', 2022, '2022-01-15', 450000, 0.15, 'QR336001', 'RFID336001', 'QR', 'Rented'],
      ['EQ002', 'CAT 966M Loader', 'Wheel Loader', 'Caterpillar', '966M', 'SN966002', 2021, '2021-08-20', 380000, 0.12, 'QR966002', 'RFID966002', 'QR', 'Available'],
      ['EQ003', 'CAT D8T Bulldozer', 'Bulldozer', 'Caterpillar', 'D8T', 'SND8T003', 2023, '2023-03-10', 520000, 0.14, 'QRD8T003', 'RFIDD8T003', 'QR', 'Rented'],
      ['EQ004', '140M3 Motor Grader', 'Motor Grader', 'Caterpillar', '140M3', 'SN140004', 2022, '2022-06-05', 420000, 0.13, 'QR140004', 'RFID140004', 'QR', 'Maintenance'],
      ['EQ005', 'CAT 320 Excavator', 'Excavator', 'Caterpillar', '320GC', 'SN320005', 2021, '2021-11-12', 320000, 0.16, 'QR320005', 'RFID320005', 'QR', 'Available'],
      ['EQ006', 'CAT 730C Articulated Truck', 'Articulated Truck', 'Caterpillar', '730C', 'SN730006', 2020, '2020-09-18', 580000, 0.18, 'QR730006', 'RFID730006', 'QR', 'Rented']
    ];

    const equipmentStmt = db.prepare(`
      INSERT OR REPLACE INTO equipment (
        equipment_id, equipment_name, equipment_type, manufacturer, 
        model_number, serial_number, year_manufactured, purchase_date, 
        equipment_value, depreciation_rate, qr_code, rfid_tag, 
        tracking_method, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    equipmentData.forEach(row => equipmentStmt.run(row));
    equipmentStmt.finalize();

    // Customers data
    const customerData = [
      ['CU001', 'BuildCorp Construction', 'Corporate', 'John Smith', '+1-555-0101', 'john.smith@buildcorp.com', '123 Industrial Ave', 'Houston', 'TX', '77001', 9],
      ['CU002', 'MegaConstruct LLC', 'Corporate', 'Sarah Johnson', '+1-555-0102', 'sarah.j@megaconstruct.com', '456 Construction Blvd', 'Dallas', 'TX', '75201', 8],
      ['CU003', 'Urban Development Inc', 'Corporate', 'Mike Wilson', '+1-555-0103', 'mike.w@urbandevelopment.com', '789 Developer St', 'Austin', 'TX', '73301', 7],
      ['CU004', 'Highway Solutions', 'Government', 'Lisa Brown', '+1-555-0104', 'lisa.brown@highways.gov', '321 State Route 1', 'San Antonio', 'TX', '78201', 10],
      ['CU005', 'Green Infrastructure', 'Corporate', 'David Lee', '+1-555-0105', 'david.lee@greeninfra.com', '654 Eco Drive', 'Fort Worth', 'TX', '76101', 8]
    ];

    const customerStmt = db.prepare(`
      INSERT OR REPLACE INTO customers (
        customer_id, customer_name, customer_type, contact_person, 
        phone, email, address, city, state, postal_code, credit_rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    customerData.forEach(row => customerStmt.run(row));
    customerStmt.finalize();

    // Sites data
    const siteData = [
      ['ST001', 'Downtown Houston Project', 'Commercial', '100 Main Street, Houston, TX', 'Houston', 'TX', '77002', 29.7604, -95.3698, 'John Smith', '2024-01-15', '2024-12-31', 'Gulf Coast'],
      ['ST002', 'Dallas Highway Extension', 'Infrastructure', '2000 Interstate 35, Dallas, TX', 'Dallas', 'TX', '75201', 32.7767, -96.7970, 'Sarah Johnson', '2024-02-01', '2025-01-15', 'North Texas'],
      ['ST003', 'Austin Tech Campus', 'Commercial', '500 Tech Boulevard, Austin, TX', 'Austin', 'TX', '78701', 30.2672, -97.7431, 'Mike Wilson', '2024-03-01', '2024-11-30', 'Central Texas'],
      ['ST004', 'San Antonio Bridge Repair', 'Infrastructure', '1500 River Walk, San Antonio, TX', 'San Antonio', 'TX', '78205', 29.4241, -98.4936, 'Lisa Brown', '2024-01-20', '2024-08-15', 'South Texas'],
      ['ST005', 'Fort Worth Industrial Complex', 'Industrial', '800 Industrial Park Dr, Fort Worth, TX', 'Fort Worth', 'TX', '76102', 32.7555, -97.3308, 'David Lee', '2024-04-01', '2025-03-31', 'North Texas']
    ];

    const siteStmt = db.prepare(`
      INSERT OR REPLACE INTO sites (
        site_id, site_name, site_type, address, city, state, postal_code,
        latitude, longitude, site_manager, project_start_date, project_end_date, weather_zone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    siteData.forEach(row => siteStmt.run(row));
    siteStmt.finalize();

    // Rentals data
    const rentalData = [
      ['RN001', 'EQ001', 'CU001', 'ST001', '2024-06-01', '2024-09-01', null, 850.00, 76500.00, 5000.00, 'Active', '100 Main Street, Houston, TX', '123 Industrial Ave', 92, null, 0, 0, 0],
      ['RN002', 'EQ003', 'CU002', 'ST002', '2024-07-15', '2024-10-15', null, 920.00, 82800.00, 6000.00, 'Active', '2000 Interstate 35, Dallas, TX', '456 Construction Blvd', 92, null, 0, 0, 0],
      ['RN003', 'EQ006', 'CU003', 'ST003', '2024-08-01', '2024-08-25', '2024-08-26', 1100.00, 27500.00, 7000.00, 'Overdue', '500 Tech Boulevard, Austin, TX', '789 Developer St', 24, 25, 3, 330.00, 0],
      ['RN004', 'EQ002', 'CU004', 'ST004', '2024-05-01', '2024-08-31', '2024-08-30', 750.00, 91500.00, 4500.00, 'Returned', '1500 River Walk, San Antonio, TX', '321 State Route 1', 122, 121, 0, 0, 0],
      ['RN005', 'EQ005', 'CU005', 'ST005', '2024-08-20', '2024-12-20', null, 680.00, 81600.00, 4000.00, 'Active', '800 Industrial Park Dr, Fort Worth, TX', '654 Eco Drive', 120, null, 0, 0, 0]
    ];

    const rentalStmt = db.prepare(`
      INSERT OR REPLACE INTO rentals (
        rental_id, equipment_id, customer_id, site_id, rental_start_date,
        rental_end_date_planned, rental_end_date_actual, rental_rate_per_day,
        total_rental_cost, security_deposit, rental_status, delivery_address,
        pickup_address, rental_duration_planned, rental_duration_actual,
        overdue_days, late_fees_charged, damage_charges
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    rentalData.forEach(row => rentalStmt.run(row));
    rentalStmt.finalize();

    // Equipment usage data
    const usageData = [
      ['EQ001', 'RN001', '2024-08-28 10:30:00', 29.7604, -95.3698, 1245.5, 8.5, 2.5, 78.5, 12.4, 85.2, 2100.5, 0.8, 15.2, 25.0, 85, 92, true, 'OP001'],
      ['EQ003', 'RN002', '2024-08-28 11:15:00', 32.7767, -96.7970, 980.2, 7.8, 1.2, 82.1, 15.8, 88.9, 2200.3, 0.6, 18.5, 30.5, 88, 95, true, 'OP002'],
      ['EQ006', 'RN003', '2024-08-28 09:45:00', 30.2672, -97.7431, 1567.8, 6.2, 3.8, 65.3, 18.2, 82.4, 1950.7, 0.9, 22.8, 35.2, 78, 87, false, 'OP003'],
      ['EQ005', 'RN005', '2024-08-28 14:20:00', 32.7555, -97.3308, 756.3, 9.1, 0.9, 89.4, 10.7, 91.6, 2050.8, 0.4, 12.5, 20.8, 92, 98, true, 'OP004']
    ];

    const usageStmt = db.prepare(`
      INSERT OR REPLACE INTO equipment_usage (
        equipment_id, rental_id, timestamp, latitude, longitude,
        runtime_hours_total, runtime_hours_session, idle_hours, fuel_level,
        fuel_consumption_rate, engine_temperature, hydraulic_pressure,
        vibration_level, load_weight, speed_kmh, battery_level,
        signal_strength, is_operating, operator_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    usageData.forEach(row => usageStmt.run(row));
    usageStmt.finalize();

    // Maintenance records
    const maintenanceData = [
      ['EQ004', '2024-08-15', 'Preventive', 'Routine hydraulic system maintenance', 2500.00, 4.5, 'TECH001', 'Hydraulic filters, oil seals', '2024-11-15', 8, 4.5],
      ['EQ001', '2024-07-20', 'Corrective', 'Engine oil leak repair', 1800.00, 6.0, 'TECH002', 'Engine gaskets, oil filter', '2024-10-20', 7, 6.0],
      ['EQ003', '2024-06-10', 'Preventive', 'Track and undercarriage inspection', 3200.00, 8.0, 'TECH001', 'Track pads, roller bearings', '2024-09-10', 9, 8.0],
      ['EQ006', '2024-08-05', 'Emergency', 'Transmission failure repair', 8500.00, 24.0, 'TECH003', 'Transmission assembly, cooling lines', '2024-11-05', 6, 24.0]
    ];

    const maintenanceStmt = db.prepare(`
      INSERT OR REPLACE INTO maintenance_records (
        equipment_id, maintenance_date, maintenance_type, description,
        cost, duration_hours, technician_id, parts_replaced,
        next_maintenance_due, maintenance_score, downtime_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    maintenanceData.forEach(row => maintenanceStmt.run(row));
    maintenanceStmt.finalize();

    // Alerts data
    const alertData = [
      ['EQ006', 'RN003', 'overdue', 'Equipment return is 3 days overdue', 'High', '2024-08-26 09:00:00', null, null, 'Active'],
      ['EQ004', null, 'maintenance_due', 'Preventive maintenance due in 2 days', 'Medium', '2024-08-26 14:30:00', null, null, 'Active'],
      ['EQ001', 'RN001', 'low_fuel', 'Fuel level below 20%', 'Low', '2024-08-28 08:15:00', null, null, 'Active'],
      ['EQ003', 'RN002', 'geofence_violation', 'Equipment detected outside designated work area', 'Medium', '2024-08-27 16:45:00', null, null, 'Active']
    ];

    const alertStmt = db.prepare(`
      INSERT OR REPLACE INTO alerts (
        equipment_id, rental_id, alert_type, alert_message,
        severity, created_at, acknowledged_at, resolved_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    alertData.forEach(row => alertStmt.run(row));
    alertStmt.finalize();

    // Anomalies data
    const anomalyData = [
      ['EQ001', 'RN001', 'idle_hours', '2024-08-27 12:00:00', 0.75, 'Excessive idle time detected', 2.0, 4.5, 3.0, 'Medium', 'Open', null, null],
      ['EQ003', 'RN002', 'fuel_consumption', '2024-08-26 14:30:00', 0.82, 'Higher than normal fuel consumption rate', 12.5, 18.2, 15.0, 'High', 'Investigating', null, null],
      ['EQ006', 'RN003', 'usage_pattern', '2024-08-25 10:15:00', 0.68, 'Unusual operating pattern detected', 8.0, 3.2, 6.0, 'Low', 'Resolved', 'Normal variation in work pattern', '2024-08-28 09:00:00']
    ];

    const anomalyStmt = db.prepare(`
      INSERT OR REPLACE INTO anomalies (
        equipment_id, rental_id, anomaly_type, detected_at, anomaly_score,
        description, baseline_value, actual_value, threshold_value,
        severity, status, resolution_notes, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    anomalyData.forEach(row => anomalyStmt.run(row));
    anomalyStmt.finalize();

    // Equipment health data
    const healthData = [
      ['EQ001', '2024-08-28', 85.5, 88.0, 82.0, 87.5, 86.0, 84.0, 45, 2, 'Monitor hydraulic system', 1245.5, 156.8, 88.8, 'Low'],
      ['EQ002', '2024-08-28', 92.3, 94.0, 91.5, 93.0, 90.5, 92.0, 120, 1, 'Continue regular maintenance', 2156.2, 289.4, 88.1, 'Low'],
      ['EQ003', '2024-08-28', 78.2, 75.0, 80.5, 79.0, 82.0, 76.5, 30, 3, 'Schedule engine inspection', 980.2, 145.7, 87.1, 'Medium'],
      ['EQ004', '2024-08-15', 65.8, 60.0, 70.5, 68.0, 72.0, 66.0, 15, 4, 'Immediate maintenance required', 3245.8, 456.9, 87.7, 'High'],
      ['EQ005', '2024-08-28', 88.7, 90.0, 87.5, 89.0, 88.5, 87.0, 60, 2, 'Good condition, monitor wear', 756.3, 98.2, 88.5, 'Low'],
      ['EQ006', '2024-08-20', 72.4, 68.0, 75.0, 70.5, 76.0, 74.0, 25, 3, 'Transmission needs attention', 1567.8, 298.5, 84.0, 'Medium']
    ];

    const healthStmt = db.prepare(`
      INSERT OR REPLACE INTO equipment_health (
        equipment_id, assessment_date, overall_health_score, engine_health,
        hydraulic_health, transmission_health, electrical_health, structural_health,
        predicted_failure_days, maintenance_priority, recommended_actions,
        total_runtime_hours, total_idle_hours, utilization_rate, wear_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    healthData.forEach(row => healthStmt.run(row));
    healthStmt.finalize();

    console.log('✅ Database seeded successfully with sample data');
  });
};

export default db;