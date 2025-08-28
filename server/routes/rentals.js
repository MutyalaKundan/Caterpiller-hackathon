import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all rentals with customer and equipment details
router.get('/', (req, res) => {
  const { status, customer_id, equipment_id } = req.query;
  
  let query = `
    SELECT 
      r.*,
      e.equipment_name,
      e.equipment_type,
      c.customer_name,
      c.contact_person,
      s.site_name,
      s.city as site_city,
      s.state as site_state
    FROM rentals r
    JOIN equipment e ON r.equipment_id = e.equipment_id
    JOIN customers c ON r.customer_id = c.customer_id
    JOIN sites s ON r.site_id = s.site_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (status) {
    conditions.push('r.rental_status = ?');
    params.push(status);
  }
  
  if (customer_id) {
    conditions.push('r.customer_id = ?');
    params.push(customer_id);
  }
  
  if (equipment_id) {
    conditions.push('r.equipment_id = ?');
    params.push(equipment_id);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY r.rental_start_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching rentals:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get rental by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      r.*,
      e.equipment_name,
      e.equipment_type,
      e.manufacturer,
      e.model_number,
      c.customer_name,
      c.contact_person,
      c.phone,
      c.email,
      s.site_name,
      s.address as site_address,
      s.city as site_city,
      s.state as site_state,
      s.latitude as site_latitude,
      s.longitude as site_longitude
    FROM rentals r
    JOIN equipment e ON r.equipment_id = e.equipment_id
    JOIN customers c ON r.customer_id = c.customer_id
    JOIN sites s ON r.site_id = s.site_id
    WHERE r.rental_id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching rental details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    
    res.json(row);
  });
});

// Create new rental
router.post('/', (req, res) => {
  const {
    rental_id, equipment_id, customer_id, site_id,
    rental_start_date, rental_end_date_planned, rental_rate_per_day,
    total_rental_cost, security_deposit, delivery_address,
    pickup_address, rental_duration_planned
  } = req.body;

  const query = `
    INSERT INTO rentals (
      rental_id, equipment_id, customer_id, site_id,
      rental_start_date, rental_end_date_planned, rental_rate_per_day,
      total_rental_cost, security_deposit, delivery_address,
      pickup_address, rental_duration_planned, rental_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `;

  db.run(query, [
    rental_id, equipment_id, customer_id, site_id,
    rental_start_date, rental_end_date_planned, rental_rate_per_day,
    total_rental_cost, security_deposit, delivery_address,
    pickup_address, rental_duration_planned
  ], function(err) {
    if (err) {
      console.error('Error creating rental:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Update equipment status to 'Rented'
    db.run('UPDATE equipment SET status = ? WHERE equipment_id = ?', ['Rented', equipment_id], (updateErr) => {
      if (updateErr) {
        console.error('Error updating equipment status:', updateErr);
      }
    });

    res.status(201).json({ message: 'Rental created successfully', id: this.lastID });
  });
});

// Return rental
router.put('/:id/return', (req, res) => {
  const { id } = req.params;
  const { return_date, actual_condition, damage_charges = 0, late_fees = 0 } = req.body;
  
  // First get the rental details
  db.get('SELECT * FROM rentals WHERE rental_id = ?', [id], (err, rental) => {
    if (err) {
      console.error('Error fetching rental:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Calculate actual duration and overdue days
    const startDate = new Date(rental.rental_start_date);
    const plannedEndDate = new Date(rental.rental_end_date_planned);
    const actualEndDate = new Date(return_date);
    
    const actualDuration = Math.ceil((actualEndDate - startDate) / (1000 * 60 * 60 * 24));
    const overdueDays = Math.max(0, Math.ceil((actualEndDate - plannedEndDate) / (1000 * 60 * 60 * 24)));

    const query = `
      UPDATE rentals SET 
        rental_end_date_actual = ?,
        rental_duration_actual = ?,
        overdue_days = ?,
        late_fees_charged = ?,
        damage_charges = ?,
        rental_status = 'Returned',
        updated_at = CURRENT_TIMESTAMP
      WHERE rental_id = ?
    `;

    db.run(query, [return_date, actualDuration, overdueDays, late_fees, damage_charges, id], function(returnErr) {
      if (returnErr) {
        console.error('Error returning rental:', returnErr);
        return res.status(500).json({ error: 'Database error' });
      }

      // Update equipment status to 'Available'
      db.run('UPDATE equipment SET status = ? WHERE equipment_id = ?', ['Available', rental.equipment_id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating equipment status:', updateErr);
        }
      });

      res.json({ message: 'Rental returned successfully' });
    });
  });
});

// Update rental
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `UPDATE rentals SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE rental_id = ?`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating rental:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Rental not found' });
    }
    
    res.json({ message: 'Rental updated successfully' });
  });
});

// Get rental analytics
router.get('/analytics/summary', (req, res) => {
  const queries = [
    // Total revenue
    `SELECT SUM(total_rental_cost) as total_revenue 
     FROM rentals WHERE rental_status IN ('Returned', 'Active')`,
    
    // Average rental duration
    `SELECT AVG(rental_duration_actual) as avg_duration 
     FROM rentals WHERE rental_duration_actual IS NOT NULL`,
    
    // Most popular equipment type
    `SELECT e.equipment_type, COUNT(*) as rental_count 
     FROM rentals r JOIN equipment e ON r.equipment_id = e.equipment_id 
     GROUP BY e.equipment_type ORDER BY rental_count DESC LIMIT 1`,
    
    // Revenue by month (last 6 months)
    `SELECT strftime('%Y-%m', rental_start_date) as month, 
            SUM(total_rental_cost) as revenue
     FROM rentals 
     WHERE rental_start_date >= date('now', '-6 months')
     GROUP BY month ORDER BY month`
  ];

  let results = {};
  let completed = 0;

  // Execute total revenue query
  db.get(queries[0], (err, row) => {
    if (err) {
      console.error('Error fetching total revenue:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.totalRevenue = row.total_revenue || 0;
    completed++;
    checkCompletion();
  });

  // Execute average duration query
  db.get(queries[1], (err, row) => {
    if (err) {
      console.error('Error fetching average duration:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.averageDuration = Math.round(row.avg_duration || 0);
    completed++;
    checkCompletion();
  });

  // Execute popular equipment query
  db.get(queries[2], (err, row) => {
    if (err) {
      console.error('Error fetching popular equipment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.popularEquipmentType = row ? row.equipment_type : 'N/A';
    completed++;
    checkCompletion();
  });

  // Execute monthly revenue query
  db.all(queries[3], (err, rows) => {
    if (err) {
      console.error('Error fetching monthly revenue:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.monthlyRevenue = rows || [];
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