import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all equipment with extended information
router.get('/', (req, res) => {
  const query = `
    SELECT 
      e.*,
      c.customer_name,
      s.site_name,
      r.rental_start_date,
      r.rental_end_date_planned,
      u.runtime_hours_total,
      u.idle_hours,
      u.operator_id,
      h.utilization_rate
    FROM equipment e
    LEFT JOIN rentals r ON e.equipment_id = r.equipment_id AND r.rental_status = 'Active'
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN sites s ON r.site_id = s.site_id
    LEFT JOIN (
      SELECT 
        equipment_id,
        runtime_hours_total,
        idle_hours,
        operator_id,
        ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY timestamp DESC) as rn
      FROM equipment_usage
    ) u ON e.equipment_id = u.equipment_id AND u.rn = 1
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    ORDER BY e.equipment_id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get equipment by ID with full details
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      e.*,
      c.customer_name,
      s.site_name,
      s.latitude as site_latitude,
      s.longitude as site_longitude,
      r.rental_start_date,
      r.rental_end_date_planned,
      r.rental_status,
      h.*
    FROM equipment e
    LEFT JOIN rentals r ON e.equipment_id = r.equipment_id AND r.rental_status IN ('Active', 'Overdue')
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN sites s ON r.site_id = s.site_id
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    WHERE e.equipment_id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching equipment details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    res.json(row);
  });
});

// Get equipment usage history
router.get('/:id/usage', (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  const query = `
    SELECT * FROM equipment_usage 
    WHERE equipment_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;

  db.all(query, [id, limit], (err, rows) => {
    if (err) {
      console.error('Error fetching equipment usage:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get equipment maintenance history
router.get('/:id/maintenance', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT * FROM maintenance_records 
    WHERE equipment_id = ? 
    ORDER BY maintenance_date DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching maintenance history:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new equipment
router.post('/', (req, res) => {
  const {
    equipment_id, equipment_name, equipment_type, manufacturer,
    model_number, serial_number, year_manufactured, purchase_date,
    equipment_value, depreciation_rate, qr_code, rfid_tag,
    tracking_method, status
  } = req.body;

  const query = `
    INSERT INTO equipment (
      equipment_id, equipment_name, equipment_type, manufacturer,
      model_number, serial_number, year_manufactured, purchase_date,
      equipment_value, depreciation_rate, qr_code, rfid_tag,
      tracking_method, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    equipment_id, equipment_name, equipment_type, manufacturer,
    model_number, serial_number, year_manufactured, purchase_date,
    equipment_value, depreciation_rate, qr_code, rfid_tag,
    tracking_method, status
  ], function(err) {
    if (err) {
      console.error('Error creating equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Equipment created successfully', id: this.lastID });
  });
});

// Update equipment
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `UPDATE equipment SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE equipment_id = ?`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    res.json({ message: 'Equipment updated successfully' });
  });
});

// Delete equipment
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM equipment WHERE equipment_id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    res.json({ message: 'Equipment deleted successfully' });
  });
});

export default router;