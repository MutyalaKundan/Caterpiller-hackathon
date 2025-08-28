import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get equipment usage data
router.get('/:equipment_id', (req, res) => {
  const { equipment_id } = req.params;
  const { limit = 100, start_date, end_date } = req.query;
  
  let query = `
    SELECT 
      u.*,
      r.rental_id,
      r.customer_id,
      c.customer_name
    FROM equipment_usage u
    LEFT JOIN rentals r ON u.rental_id = r.rental_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    WHERE u.equipment_id = ?
  `;
  
  const params = [equipment_id];
  
  if (start_date) {
    query += ` AND u.timestamp >= ?`;
    params.push(start_date);
  }
  
  if (end_date) {
    query += ` AND u.timestamp <= ?`;
    params.push(end_date);
  }
  
  query += ` ORDER BY u.timestamp DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching equipment usage:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get latest usage data for all equipment
router.get('/latest/all', (req, res) => {
  const query = `
    SELECT 
      u.*,
      e.equipment_name,
      e.equipment_type,
      r.customer_id,
      c.customer_name
    FROM equipment_usage u
    JOIN equipment e ON u.equipment_id = e.equipment_id
    LEFT JOIN rentals r ON u.rental_id = r.rental_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    WHERE u.usage_id IN (
      SELECT MAX(usage_id) 
      FROM equipment_usage 
      GROUP BY equipment_id
    )
    ORDER BY u.timestamp DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching latest usage data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create usage record
router.post('/', (req, res) => {
  const {
    equipment_id, rental_id, latitude, longitude, runtime_hours_total,
    runtime_hours_session, idle_hours, fuel_level, fuel_consumption_rate,
    engine_temperature, hydraulic_pressure, vibration_level, load_weight,
    speed_kmh, battery_level, signal_strength, is_operating, operator_id
  } = req.body;

  const query = `
    INSERT INTO equipment_usage (
      equipment_id, rental_id, latitude, longitude, runtime_hours_total,
      runtime_hours_session, idle_hours, fuel_level, fuel_consumption_rate,
      engine_temperature, hydraulic_pressure, vibration_level, load_weight,
      speed_kmh, battery_level, signal_strength, is_operating, operator_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    equipment_id, rental_id, latitude, longitude, runtime_hours_total,
    runtime_hours_session, idle_hours, fuel_level, fuel_consumption_rate,
    engine_temperature, hydraulic_pressure, vibration_level, load_weight,
    speed_kmh, battery_level, signal_strength, is_operating, operator_id
  ], function(err) {
    if (err) {
      console.error('Error creating usage record:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Usage record created successfully', id: this.lastID });
  });
});

export default router;