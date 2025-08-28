import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all anomalies
router.get('/', (req, res) => {
  const { status = 'Open', severity, anomaly_type, equipment_id } = req.query;
  
  let query = `
    SELECT 
      a.*,
      e.equipment_name,
      e.equipment_type,
      c.customer_name,
      s.site_name
    FROM anomalies a
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
  
  if (anomaly_type) {
    conditions.push('a.anomaly_type = ?');
    params.push(anomaly_type);
  }
  
  if (equipment_id) {
    conditions.push('a.equipment_id = ?');
    params.push(equipment_id);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY a.detected_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching anomalies:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get anomaly by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      a.*,
      e.equipment_name,
      e.equipment_type,
      e.manufacturer,
      e.model_number,
      c.customer_name,
      s.site_name,
      s.address as site_address
    FROM anomalies a
    JOIN equipment e ON a.equipment_id = e.equipment_id
    LEFT JOIN rentals r ON a.rental_id = r.rental_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN sites s ON r.site_id = s.site_id
    WHERE a.anomaly_id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching anomaly details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    res.json(row);
  });
});

// Update anomaly status
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, resolution_notes } = req.body;
  
  let query = `UPDATE anomalies SET status = ?`;
  let params = [status, id];
  
  if (status === 'Resolved' && resolution_notes) {
    query += `, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP`;
    params = [status, resolution_notes, id];
  }
  
  query += ` WHERE anomaly_id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating anomaly status:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    res.json({ message: 'Anomaly status updated successfully' });
  });
});

// Create new anomaly
router.post('/', (req, res) => {
  const {
    equipment_id, rental_id, anomaly_type, description,
    anomaly_score, baseline_value, actual_value, threshold_value, severity
  } = req.body;

  const query = `
    INSERT INTO anomalies (
      equipment_id, rental_id, anomaly_type, description,
      anomaly_score, baseline_value, actual_value, threshold_value, severity, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
  `;

  db.run(query, [
    equipment_id, rental_id, anomaly_type, description,
    anomaly_score, baseline_value, actual_value, threshold_value, severity
  ], function(err) {
    if (err) {
      console.error('Error creating anomaly:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Anomaly created successfully', id: this.lastID });
  });
});

// Get anomaly analytics
router.get('/analytics/summary', (req, res) => {
  const queries = [
    // Anomaly distribution by type
    `SELECT 
       anomaly_type, 
       COUNT(*) as count,
       AVG(anomaly_score) as avg_score
     FROM anomalies 
     WHERE detected_at >= date('now', '-30 days')
     GROUP BY anomaly_type
     ORDER BY count DESC`,
    
    // Anomaly trends (last 30 days)
    `SELECT 
       date(detected_at) as date,
       COUNT(*) as count,
       AVG(anomaly_score) as avg_score
     FROM anomalies 
     WHERE detected_at >= date('now', '-30 days')
     GROUP BY date(detected_at)
     ORDER BY date DESC`,
    
    // Equipment with highest anomaly scores
    `SELECT 
       e.equipment_name,
       e.equipment_type,
       COUNT(a.anomaly_id) as anomaly_count,
       AVG(a.anomaly_score) as avg_anomaly_score
     FROM equipment e
     JOIN anomalies a ON e.equipment_id = a.equipment_id
     WHERE a.detected_at >= date('now', '-30 days')
     GROUP BY e.equipment_id
     ORDER BY avg_anomaly_score DESC
     LIMIT 5`,
    
    // Anomaly resolution rate
    `SELECT 
       COUNT(CASE WHEN status = 'Resolved' THEN 1 END) * 100.0 / COUNT(*) as resolution_rate
     FROM anomalies 
     WHERE detected_at >= date('now', '-30 days')`
  ];

  let results = {};
  let completed = 0;

  // Execute anomaly type distribution query
  db.all(queries[0], (err, rows) => {
    if (err) {
      console.error('Error fetching anomaly type distribution:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.anomalyTypeDistribution = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute anomaly trends query
  db.all(queries[1], (err, rows) => {
    if (err) {
      console.error('Error fetching anomaly trends:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.anomalyTrends = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute top equipment query
  db.all(queries[2], (err, rows) => {
    if (err) {
      console.error('Error fetching top equipment with anomalies:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.topEquipmentWithAnomalies = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute resolution rate query
  db.get(queries[3], (err, row) => {
    if (err) {
      console.error('Error fetching anomaly resolution rate:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.resolutionRate = Math.round((row.resolution_rate || 0) * 10) / 10;
    completed++;
    checkCompletion();
  });

  function checkCompletion() {
    if (completed === 4) {
      res.json(results);
    }
  }
});

// Get anomaly patterns (for ML insights)
router.get('/patterns/analysis', (req, res) => {
  const query = `
    SELECT 
      anomaly_type,
      AVG(anomaly_score) as avg_score,
      COUNT(*) as frequency,
      e.equipment_type,
      strftime('%H', detected_at) as hour_of_day,
      strftime('%w', detected_at) as day_of_week
    FROM anomalies a
    JOIN equipment e ON a.equipment_id = e.equipment_id
    WHERE a.detected_at >= date('now', '-90 days')
    GROUP BY anomaly_type, e.equipment_type, hour_of_day, day_of_week
    HAVING frequency >= 2
    ORDER BY avg_score DESC, frequency DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching anomaly patterns:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

export default router;