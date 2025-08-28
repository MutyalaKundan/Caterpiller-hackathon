import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all sites
router.get('/', (req, res) => {
  const query = `
    SELECT 
      s.*,
      COUNT(r.rental_id) as active_rentals,
      GROUP_CONCAT(DISTINCT e.equipment_type) as equipment_types
    FROM sites s
    LEFT JOIN rentals r ON s.site_id = r.site_id AND r.rental_status = 'Active'
    LEFT JOIN equipment e ON r.equipment_id = e.equipment_id
    GROUP BY s.site_id
    ORDER BY s.site_name
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching sites:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get site by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      s.*,
      COUNT(r.rental_id) as total_rentals,
      COUNT(CASE WHEN r.rental_status = 'Active' THEN 1 END) as active_rentals
    FROM sites s
    LEFT JOIN rentals r ON s.site_id = r.site_id
    WHERE s.site_id = ?
    GROUP BY s.site_id
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching site details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    res.json(row);
  });
});

// Get active equipment at site
router.get('/:id/equipment', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      e.*,
      r.rental_start_date,
      r.rental_end_date_planned,
      c.customer_name,
      u.latitude,
      u.longitude,
      u.runtime_hours_total,
      u.fuel_level,
      u.is_operating
    FROM equipment e
    JOIN rentals r ON e.equipment_id = r.equipment_id
    JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN (
      SELECT 
        equipment_id,
        latitude,
        longitude,
        runtime_hours_total,
        fuel_level,
        is_operating,
        ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY timestamp DESC) as rn
      FROM equipment_usage
    ) u ON e.equipment_id = u.equipment_id AND u.rn = 1
    WHERE r.site_id = ? AND r.rental_status = 'Active'
    ORDER BY e.equipment_name
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching site equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get site rental history
router.get('/:id/rentals', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      r.*,
      e.equipment_name,
      e.equipment_type,
      c.customer_name
    FROM rentals r
    JOIN equipment e ON r.equipment_id = e.equipment_id
    JOIN customers c ON r.customer_id = c.customer_id
    WHERE r.site_id = ?
    ORDER BY r.rental_start_date DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching site rental history:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new site
router.post('/', (req, res) => {
  const {
    site_id, site_name, site_type, address, city, state, postal_code,
    latitude, longitude, site_manager, project_start_date, project_end_date, weather_zone
  } = req.body;

  const query = `
    INSERT INTO sites (
      site_id, site_name, site_type, address, city, state, postal_code,
      latitude, longitude, site_manager, project_start_date, project_end_date, weather_zone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    site_id, site_name, site_type, address, city, state, postal_code,
    latitude, longitude, site_manager, project_start_date, project_end_date, weather_zone
  ], function(err) {
    if (err) {
      console.error('Error creating site:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Site created successfully', id: this.lastID });
  });
});

// Update site
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `UPDATE sites SET ${fields} WHERE site_id = ?`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating site:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    res.json({ message: 'Site updated successfully' });
  });
});

// Delete site
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if site has active rentals
  db.get('SELECT COUNT(*) as count FROM rentals WHERE site_id = ? AND rental_status = ?', 
    [id, 'Active'], (err, row) => {
    if (err) {
      console.error('Error checking active rentals:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Cannot delete site with active rentals' });
    }
    
    // Proceed with deletion
    const query = 'DELETE FROM sites WHERE site_id = ?';
    db.run(query, [id], function(deleteErr) {
      if (deleteErr) {
        console.error('Error deleting site:', deleteErr);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Site not found' });
      }
      
      res.json({ message: 'Site deleted successfully' });
    });
  });
});

// Get all equipment locations for map visualization
router.get('/map/equipment-locations', (req, res) => {
  const query = `
    SELECT 
      e.equipment_id,
      e.equipment_name,
      e.equipment_type,
      e.status,
      COALESCE(u.latitude, s.latitude) as latitude,
      COALESCE(u.longitude, s.longitude) as longitude,
      s.site_name,
      c.customer_name,
      r.rental_status,
      u.fuel_level,
      u.is_operating,
      u.timestamp as last_update
    FROM equipment e
    LEFT JOIN rentals r ON e.equipment_id = r.equipment_id AND r.rental_status IN ('Active', 'Overdue')
    LEFT JOIN sites s ON r.site_id = s.site_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN (
      SELECT 
        equipment_id,
        latitude,
        longitude,
        fuel_level,
        is_operating,
        timestamp,
        ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY timestamp DESC) as rn
      FROM equipment_usage
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ) u ON e.equipment_id = u.equipment_id AND u.rn = 1
    WHERE (u.latitude IS NOT NULL AND u.longitude IS NOT NULL) 
       OR (s.latitude IS NOT NULL AND s.longitude IS NOT NULL)
    ORDER BY e.equipment_name
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching equipment locations:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

export default router;