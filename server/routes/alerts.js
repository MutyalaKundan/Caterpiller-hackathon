import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all alerts
router.get('/', (req, res) => {
  const { status = 'Active', severity, alert_type } = req.query;
  
  let query = `
    SELECT 
      a.*,
      e.equipment_name,
      e.equipment_type,
      c.customer_name,
      s.site_name
    FROM alerts a
    JOIN equipment e ON a.equipment_id = e.equipment_id
    LEFT JOIN rentals r ON a.rental_id = r.rental_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN sites s ON r.site_id = s.site_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (status && status !== 'all') {
    conditions.push('a.status = ?');
    params.push(status);
  }
  
  if (severity) {
    conditions.push('a.severity = ?');
    params.push(severity);
  }
  
  if (alert_type) {
    conditions.push('a.alert_type = ?');
    params.push(alert_type);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY a.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching alerts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get alert by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      a.*,
      e.equipment_name,
      e.equipment_type,
      c.customer_name,
      s.site_name,
      s.address as site_address
    FROM alerts a
    JOIN equipment e ON a.equipment_id = e.equipment_id
    LEFT JOIN rentals r ON a.rental_id = r.rental_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN sites s ON r.site_id = s.site_id
    WHERE a.alert_id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching alert details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(row);
  });
});

// Acknowledge alert
router.put('/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  
  const query = `
    UPDATE alerts 
    SET status = 'Acknowledged', acknowledged_at = CURRENT_TIMESTAMP 
    WHERE alert_id = ?
  `;

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error acknowledging alert:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: 'Alert acknowledged successfully' });
  });
});

// Resolve alert
router.put('/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolution_notes } = req.body;
  
  const query = `
    UPDATE alerts 
    SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP 
    WHERE alert_id = ?
  `;

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error resolving alert:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: 'Alert resolved successfully' });
  });
});

// Dismiss alert
router.put('/:id/dismiss', (req, res) => {
  const { id } = req.params;
  
  const query = `UPDATE alerts SET status = 'Dismissed' WHERE alert_id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error dismissing alert:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: 'Alert dismissed successfully' });
  });
});

// Create new alert
router.post('/', (req, res) => {
  const {
    equipment_id, rental_id, alert_type, alert_message, severity
  } = req.body;

  const query = `
    INSERT INTO alerts (
      equipment_id, rental_id, alert_type, alert_message, severity, status
    ) VALUES (?, ?, ?, ?, ?, 'Active')
  `;

  db.run(query, [equipment_id, rental_id, alert_type, alert_message, severity], function(err) {
    if (err) {
      console.error('Error creating alert:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Alert created successfully', id: this.lastID });
  });
});

// Get alert statistics
router.get('/analytics/stats', (req, res) => {
  const queries = [
    // Total active alerts by severity
    `SELECT 
       severity, 
       COUNT(*) as count 
     FROM alerts 
     WHERE status = 'Active' 
     GROUP BY severity`,
    
    // Alert trends (last 30 days)
    `SELECT 
       date(created_at) as date,
       COUNT(*) as count,
       alert_type
     FROM alerts 
     WHERE created_at >= date('now', '-30 days')
     GROUP BY date(created_at), alert_type
     ORDER BY date DESC`,
    
    // Top equipment with most alerts
    `SELECT 
       e.equipment_name,
       e.equipment_type,
       COUNT(a.alert_id) as alert_count
     FROM equipment e
     JOIN alerts a ON e.equipment_id = a.equipment_id
     WHERE a.created_at >= date('now', '-30 days')
     GROUP BY e.equipment_id
     ORDER BY alert_count DESC
     LIMIT 5`,
    
    // Alert resolution time average
    `SELECT 
       AVG(JULIANDAY(resolved_at) - JULIANDAY(created_at)) * 24 as avg_resolution_hours
     FROM alerts 
     WHERE status = 'Resolved' 
       AND resolved_at IS NOT NULL 
       AND created_at >= date('now', '-30 days')`
  ];

  let results = {};
  let completed = 0;

  // Execute severity distribution query
  db.all(queries[0], (err, rows) => {
    if (err) {
      console.error('Error fetching alert severity distribution:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.severityDistribution = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute alert trends query
  db.all(queries[1], (err, rows) => {
    if (err) {
      console.error('Error fetching alert trends:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.alertTrends = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute top equipment query
  db.all(queries[2], (err, rows) => {
    if (err) {
      console.error('Error fetching top equipment with alerts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.topEquipmentWithAlerts = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute resolution time query
  db.get(queries[3], (err, row) => {
    if (err) {
      console.error('Error fetching average resolution time:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.averageResolutionHours = Math.round((row.avg_resolution_hours || 0) * 10) / 10;
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