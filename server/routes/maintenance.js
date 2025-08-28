import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all maintenance records
router.get('/', (req, res) => {
  const { equipment_id, maintenance_type, limit = 100 } = req.query;
  
  let query = `
    SELECT 
      m.*,
      e.equipment_name,
      e.equipment_type,
      e.manufacturer,
      e.model_number
    FROM maintenance_records m
    JOIN equipment e ON m.equipment_id = e.equipment_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (equipment_id) {
    conditions.push('m.equipment_id = ?');
    params.push(equipment_id);
  }
  
  if (maintenance_type) {
    conditions.push('m.maintenance_type = ?');
    params.push(maintenance_type);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY m.maintenance_date DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching maintenance records:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get maintenance record by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      m.*,
      e.equipment_name,
      e.equipment_type,
      e.manufacturer,
      e.model_number
    FROM maintenance_records m
    JOIN equipment e ON m.equipment_id = e.equipment_id
    WHERE m.maintenance_id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching maintenance record:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    res.json(row);
  });
});

// Get upcoming maintenance (equipment due for maintenance)
router.get('/upcoming/due', (req, res) => {
  const { days_ahead = 30 } = req.query;
  
  const query = `
    SELECT 
      m.*,
      e.equipment_name,
      e.equipment_type,
      e.status,
      h.overall_health_score,
      h.maintenance_priority,
      h.recommended_actions,
      JULIANDAY(m.next_maintenance_due) - JULIANDAY('now') as days_until_due
    FROM maintenance_records m
    JOIN equipment e ON m.equipment_id = e.equipment_id
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    WHERE m.next_maintenance_due IS NOT NULL 
      AND m.next_maintenance_due <= date('now', '+' || ? || ' days')
      AND m.maintenance_id = (
        SELECT MAX(maintenance_id) 
        FROM maintenance_records m2 
        WHERE m2.equipment_id = m.equipment_id
      )
    ORDER BY m.next_maintenance_due ASC
  `;

  db.all(query, [days_ahead], (err, rows) => {
    if (err) {
      console.error('Error fetching upcoming maintenance:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get overdue maintenance
router.get('/overdue/list', (req, res) => {
  const query = `
    SELECT 
      m.*,
      e.equipment_name,
      e.equipment_type,
      e.status,
      h.overall_health_score,
      h.maintenance_priority,
      h.recommended_actions,
      JULIANDAY('now') - JULIANDAY(m.next_maintenance_due) as days_overdue
    FROM maintenance_records m
    JOIN equipment e ON m.equipment_id = e.equipment_id
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    WHERE m.next_maintenance_due IS NOT NULL 
      AND m.next_maintenance_due < date('now')
      AND m.maintenance_id = (
        SELECT MAX(maintenance_id) 
        FROM maintenance_records m2 
        WHERE m2.equipment_id = m.equipment_id
      )
    ORDER BY days_overdue DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching overdue maintenance:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create maintenance record
router.post('/', (req, res) => {
  const {
    equipment_id, maintenance_date, maintenance_type, description,
    cost, duration_hours, technician_id, parts_replaced,
    next_maintenance_due, maintenance_score, downtime_hours
  } = req.body;

  const query = `
    INSERT INTO maintenance_records (
      equipment_id, maintenance_date, maintenance_type, description,
      cost, duration_hours, technician_id, parts_replaced,
      next_maintenance_due, maintenance_score, downtime_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    equipment_id, maintenance_date, maintenance_type, description,
    cost, duration_hours, technician_id, parts_replaced,
    next_maintenance_due, maintenance_score, downtime_hours
  ], function(err) {
    if (err) {
      console.error('Error creating maintenance record:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Update equipment status if needed
    if (maintenance_type === 'Emergency' || (duration_hours && duration_hours > 4)) {
      db.run('UPDATE equipment SET status = ? WHERE equipment_id = ?', 
        ['Maintenance', equipment_id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating equipment status:', updateErr);
        }
      });
    }

    res.status(201).json({ 
      message: 'Maintenance record created successfully', 
      id: this.lastID 
    });
  });
});

// Update maintenance record
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `UPDATE maintenance_records SET ${fields} WHERE maintenance_id = ?`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating maintenance record:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    res.json({ message: 'Maintenance record updated successfully' });
  });
});

// Get maintenance analytics
router.get('/analytics/summary', (req, res) => {
  const queries = [
    // Total maintenance cost (last 12 months)
    `SELECT SUM(cost) as total_cost 
     FROM maintenance_records 
     WHERE maintenance_date >= date('now', '-12 months')`,
    
    // Maintenance by type
    `SELECT 
       maintenance_type, 
       COUNT(*) as count,
       AVG(cost) as avg_cost,
       SUM(downtime_hours) as total_downtime
     FROM maintenance_records 
     WHERE maintenance_date >= date('now', '-12 months')
     GROUP BY maintenance_type`,
    
    // Equipment requiring urgent maintenance
    `SELECT COUNT(*) as urgent_count
     FROM equipment_health
     WHERE maintenance_priority >= 4`,
    
    // Average maintenance score
    `SELECT AVG(maintenance_score) as avg_score
     FROM maintenance_records
     WHERE maintenance_date >= date('now', '-6 months')
       AND maintenance_score IS NOT NULL`
  ];

  let results = {};
  let completed = 0;

  // Execute total cost query
  db.get(queries[0], (err, row) => {
    if (err) {
      console.error('Error fetching total maintenance cost:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.totalCost = row.total_cost || 0;
    completed++;
    checkCompletion();
  });

  // Execute maintenance by type query
  db.all(queries[1], (err, rows) => {
    if (err) {
      console.error('Error fetching maintenance by type:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.maintenanceByType = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute urgent maintenance query
  db.get(queries[2], (err, row) => {
    if (err) {
      console.error('Error fetching urgent maintenance count:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.urgentMaintenanceCount = row.urgent_count || 0;
    completed++;
    checkCompletion();
  });

  // Execute average score query
  db.get(queries[3], (err, row) => {
    if (err) {
      console.error('Error fetching average maintenance score:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.averageMaintenanceScore = Math.round((row.avg_score || 0) * 10) / 10;
    completed++;
    checkCompletion();
  });

  function checkCompletion() {
    if (completed === 4) {
      res.json(results);
    }
  }
});

export default router;