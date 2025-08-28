import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get dashboard KPIs
router.get('/kpis', (req, res) => {
  const queries = [
    // Total rented equipment
    `SELECT COUNT(*) as count FROM equipment WHERE status = 'Rented'`,
    
    // Active rentals
    `SELECT COUNT(*) as count FROM rentals WHERE rental_status = 'Active'`,
    
    // Overdue rentals
    `SELECT COUNT(*) as count FROM rentals WHERE rental_status = 'Overdue'`,
    
    // Average utilization
    `SELECT AVG(utilization_rate) as avg_utilization FROM equipment_health`
  ];

  let results = {};
  let completed = 0;

  queries.forEach((query, index) => {
    db.get(query, (err, row) => {
      if (err) {
        console.error(`Error executing query ${index}:`, err);
        return res.status(500).json({ error: 'Database error' });
      }

      switch(index) {
        case 0:
          results.totalRentedEquipment = row.count || 0;
          break;
        case 1:
          results.activeRentals = row.count || 0;
          break;
        case 2:
          results.overdueRentals = row.count || 0;
          break;
        case 3:
          results.averageUtilization = Math.round(row.avg_utilization || 0);
          break;
      }

      completed++;
      if (completed === queries.length) {
        res.json(results);
      }
    });
  });
});

// Get utilization chart data
router.get('/utilization-chart', (req, res) => {
  const query = `
    SELECT 
      e.equipment_type,
      AVG(h.utilization_rate) as utilization,
      COUNT(e.equipment_id) as count
    FROM equipment e
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    GROUP BY e.equipment_type
    ORDER BY utilization DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching utilization data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const data = rows.map(row => ({
      name: row.equipment_type,
      utilization: Math.round(row.utilization || 0),
      count: row.count
    }));

    res.json(data);
  });
});

// Get maintenance chart data
router.get('/maintenance-chart', (req, res) => {
  const query = `
    SELECT 
      strftime('%Y-%m', maintenance_date) as month,
      COUNT(*) as count,
      AVG(cost) as avg_cost,
      maintenance_type
    FROM maintenance_records
    WHERE maintenance_date >= date('now', '-6 months')
    GROUP BY month, maintenance_type
    ORDER BY month DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching maintenance data:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Transform data for chart
    const monthlyData = {};
    rows.forEach(row => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = {
          month: row.month,
          Preventive: 0,
          Corrective: 0,
          Emergency: 0
        };
      }
      monthlyData[row.month][row.maintenance_type] = row.count;
    });

    const data = Object.values(monthlyData).reverse();
    res.json(data);
  });
});

export default router;