import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get all customers
router.get('/', (req, res) => {
  const { search } = req.query;
  
  let query = `
    SELECT 
      c.*,
      COUNT(r.rental_id) as total_rentals,
      SUM(r.total_rental_cost) as total_spent,
      MAX(r.rental_start_date) as last_rental_date
    FROM customers c
    LEFT JOIN rentals r ON c.customer_id = r.customer_id
  `;
  
  const params = [];
  
  if (search) {
    query += ` WHERE c.customer_name LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  query += ` GROUP BY c.customer_id ORDER BY c.customer_name`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get customer by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      c.*,
      COUNT(r.rental_id) as total_rentals,
      SUM(r.total_rental_cost) as total_spent,
      MAX(r.rental_start_date) as last_rental_date,
      AVG(r.rental_duration_actual) as avg_rental_duration
    FROM customers c
    LEFT JOIN rentals r ON c.customer_id = r.customer_id
    WHERE c.customer_id = ?
    GROUP BY c.customer_id
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching customer details:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(row);
  });
});

// Get customer rental history
router.get('/:id/rentals', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      r.*,
      e.equipment_name,
      e.equipment_type,
      s.site_name
    FROM rentals r
    JOIN equipment e ON r.equipment_id = e.equipment_id
    JOIN sites s ON r.site_id = s.site_id
    WHERE r.customer_id = ?
    ORDER BY r.rental_start_date DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Error fetching customer rental history:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new customer
router.post('/', (req, res) => {
  const {
    customer_id, customer_name, customer_type, contact_person,
    phone, email, address, city, state, postal_code, credit_rating
  } = req.body;

  const query = `
    INSERT INTO customers (
      customer_id, customer_name, customer_type, contact_person,
      phone, email, address, city, state, postal_code, credit_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    customer_id, customer_name, customer_type, contact_person,
    phone, email, address, city, state, postal_code, credit_rating
  ], function(err) {
    if (err) {
      console.error('Error creating customer:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Customer created successfully', id: this.lastID });
  });
});

// Update customer
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  const query = `UPDATE customers SET ${fields} WHERE customer_id = ?`;

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating customer:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer updated successfully' });
  });
});

// Delete customer
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if customer has active rentals
  db.get('SELECT COUNT(*) as count FROM rentals WHERE customer_id = ? AND rental_status = ?', 
    [id, 'Active'], (err, row) => {
    if (err) {
      console.error('Error checking active rentals:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with active rentals' });
    }
    
    // Proceed with deletion
    const query = 'DELETE FROM customers WHERE customer_id = ?';
    db.run(query, [id], function(deleteErr) {
      if (deleteErr) {
        console.error('Error deleting customer:', deleteErr);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({ message: 'Customer deleted successfully' });
    });
  });
});

// Get customer analytics
router.get('/analytics/summary', (req, res) => {
  const queries = [
    // Total customers
    `SELECT COUNT(*) as total_customers FROM customers`,
    
    // Top customers by spending
    `SELECT 
      c.customer_name, 
      SUM(r.total_rental_cost) as total_spent,
      COUNT(r.rental_id) as rental_count
     FROM customers c 
     JOIN rentals r ON c.customer_id = r.customer_id 
     GROUP BY c.customer_id 
     ORDER BY total_spent DESC 
     LIMIT 5`,
    
    // Customer type distribution
    `SELECT 
       customer_type, 
       COUNT(*) as count 
     FROM customers 
     GROUP BY customer_type`,
    
    // Average credit rating
    `SELECT AVG(credit_rating) as avg_credit_rating FROM customers WHERE credit_rating IS NOT NULL`
  ];

  let results = {};
  let completed = 0;

  // Execute total customers query
  db.get(queries[0], (err, row) => {
    if (err) {
      console.error('Error fetching total customers:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.totalCustomers = row.total_customers || 0;
    completed++;
    checkCompletion();
  });

  // Execute top customers query
  db.all(queries[1], (err, rows) => {
    if (err) {
      console.error('Error fetching top customers:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.topCustomers = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute customer type distribution query
  db.all(queries[2], (err, rows) => {
    if (err) {
      console.error('Error fetching customer type distribution:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.customerTypeDistribution = rows || [];
    completed++;
    checkCompletion();
  });

  // Execute average credit rating query
  db.get(queries[3], (err, row) => {
    if (err) {
      console.error('Error fetching average credit rating:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    results.averageCreditRating = Math.round((row.avg_credit_rating || 0) * 10) / 10;
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