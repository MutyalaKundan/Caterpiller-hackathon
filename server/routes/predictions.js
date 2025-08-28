import express from 'express';
import db from '../database/init.js';

const router = express.Router();

// Get demand predictions (mock ML logic)
router.get('/demand', (req, res) => {
  const { equipment_type, period = '30' } = req.query;
  
  // Mock demand prediction logic based on historical data
  let query = `
    SELECT 
      e.equipment_type,
      COUNT(r.rental_id) as historical_rentals,
      AVG(r.rental_duration_actual) as avg_duration,
      s.weather_zone,
      strftime('%m', r.rental_start_date) as month
    FROM equipment e
    LEFT JOIN rentals r ON e.equipment_id = r.equipment_id
    LEFT JOIN sites s ON r.site_id = s.site_id
    WHERE r.rental_start_date >= date('now', '-12 months')
  `;
  
  const params = [];
  
  if (equipment_type) {
    query += ` AND e.equipment_type = ?`;
    params.push(equipment_type);
  }
  
  query += ` GROUP BY e.equipment_type, s.weather_zone, month
             ORDER BY historical_rentals DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching demand prediction data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Generate mock predictions based on historical data
    const predictions = generateDemandPredictions(rows, parseInt(period));
    res.json(predictions);
  });
});

// Get maintenance predictions
router.get('/maintenance', (req, res) => {
  const query = `
    SELECT 
      e.equipment_id,
      e.equipment_name,
      e.equipment_type,
      h.overall_health_score,
      h.engine_health,
      h.hydraulic_health,
      h.transmission_health,
      h.predicted_failure_days,
      h.maintenance_priority,
      h.recommended_actions,
      h.total_runtime_hours,
      h.utilization_rate,
      h.wear_level,
      m.next_maintenance_due,
      COALESCE(
        JULIANDAY(m.next_maintenance_due) - JULIANDAY('now'),
        h.predicted_failure_days
      ) as days_until_maintenance
    FROM equipment e
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    LEFT JOIN (
      SELECT 
        equipment_id,
        next_maintenance_due,
        ROW_NUMBER() OVER (PARTITION BY equipment_id ORDER BY maintenance_date DESC) as rn
      FROM maintenance_records
      WHERE next_maintenance_due IS NOT NULL
    ) m ON e.equipment_id = m.equipment_id AND m.rn = 1
    WHERE h.overall_health_score < 90 OR h.maintenance_priority >= 3
    ORDER BY days_until_maintenance ASC, h.maintenance_priority DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching maintenance predictions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Enhance with ML-style predictions
    const predictions = enhanceMaintenancePredictions(rows);
    res.json(predictions);
  });
});

// Get utilization predictions
router.get('/utilization', (req, res) => {
  const query = `
    SELECT 
      e.equipment_id,
      e.equipment_name,
      e.equipment_type,
      e.status,
      h.utilization_rate,
      h.total_runtime_hours,
      COUNT(r.rental_id) as rental_frequency,
      AVG(r.rental_duration_actual) as avg_rental_duration,
      MAX(r.rental_end_date_actual) as last_rental_end
    FROM equipment e
    LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
    LEFT JOIN rentals r ON e.equipment_id = r.equipment_id
    WHERE r.rental_start_date >= date('now', '-6 months')
    GROUP BY e.equipment_id
    ORDER BY h.utilization_rate DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching utilization data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Generate utilization predictions
    const predictions = generateUtilizationPredictions(rows);
    res.json(predictions);
  });
});

// Get return date predictions
router.get('/return-dates', (req, res) => {
  const query = `
    SELECT 
      r.rental_id,
      r.equipment_id,
      r.customer_id,
      r.rental_start_date,
      r.rental_end_date_planned,
      r.rental_duration_planned,
      r.rental_status,
      e.equipment_name,
      e.equipment_type,
      c.customer_name,
      c.credit_rating,
      s.site_name,
      JULIANDAY(r.rental_end_date_planned) - JULIANDAY('now') as days_until_due
    FROM rentals r
    JOIN equipment e ON r.equipment_id = e.equipment_id
    JOIN customers c ON r.customer_id = c.customer_id
    JOIN sites s ON r.site_id = s.site_id
    WHERE r.rental_status = 'Active'
    ORDER BY days_until_due ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching return date data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Generate return date predictions
    const predictions = generateReturnDatePredictions(rows);
    res.json(predictions);
  });
});

// Get comprehensive ML insights
router.get('/insights', (req, res) => {
  const queries = [
    // Equipment performance insights
    `SELECT 
       e.equipment_type,
       COUNT(*) as total_equipment,
       AVG(h.utilization_rate) as avg_utilization,
       AVG(h.overall_health_score) as avg_health_score,
       COUNT(CASE WHEN h.maintenance_priority >= 4 THEN 1 END) as high_priority_maintenance
     FROM equipment e
     LEFT JOIN equipment_health h ON e.equipment_id = h.equipment_id
     GROUP BY e.equipment_type`,
    
    // Customer behavior insights
    `SELECT 
       c.customer_type,
       COUNT(DISTINCT c.customer_id) as customer_count,
       AVG(r.rental_duration_actual) as avg_rental_duration,
       AVG(r.overdue_days) as avg_overdue_days,
       SUM(r.total_rental_cost) as total_revenue
     FROM customers c
     JOIN rentals r ON c.customer_id = r.customer_id
     WHERE r.rental_start_date >= date('now', '-12 months')
     GROUP BY c.customer_type`,
    
    // Seasonal trends
    `SELECT 
       strftime('%m', rental_start_date) as month,
       e.equipment_type,
       COUNT(*) as rental_count,
       AVG(rental_duration_actual) as avg_duration
     FROM rentals r
     JOIN equipment e ON r.equipment_id = e.equipment_id
     WHERE r.rental_start_date >= date('now', '-24 months')
     GROUP BY month, e.equipment_type
     ORDER BY month, rental_count DESC`
  ];

  let insights = {};
  let completed = 0;

  // Equipment insights
  db.all(queries[0], (err, rows) => {
    if (err) {
      console.error('Error fetching equipment insights:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    insights.equipmentPerformance = rows || [];
    completed++;
    checkCompletion();
  });

  // Customer insights
  db.all(queries[1], (err, rows) => {
    if (err) {
      console.error('Error fetching customer insights:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    insights.customerBehavior = rows || [];
    completed++;
    checkCompletion();
  });

  // Seasonal insights
  db.all(queries[2], (err, rows) => {
    if (err) {
      console.error('Error fetching seasonal insights:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    insights.seasonalTrends = rows || [];
    completed++;
    checkCompletion();
  });

  function checkCompletion() {
    if (completed === 3) {
      // Add AI-generated recommendations
      insights.recommendations = generateRecommendations(insights);
      res.json(insights);
    }
  }
});

// Helper functions for mock ML predictions

function generateDemandPredictions(historicalData, days) {
  const equipmentTypes = [...new Set(historicalData.map(row => row.equipment_type))];
  
  return equipmentTypes.map(type => {
    const typeData = historicalData.filter(row => row.equipment_type === type);
    const avgRentals = typeData.reduce((sum, row) => sum + row.historical_rentals, 0) / typeData.length || 0;
    
    // Mock seasonal adjustment
    const currentMonth = new Date().getMonth() + 1;
    const seasonalMultiplier = getSeasonalMultiplier(type, currentMonth);
    
    const predictedDemand = Math.round(avgRentals * seasonalMultiplier * (days / 30));
    const confidence = Math.min(95, Math.max(60, 80 + (typeData.length * 2)));
    
    return {
      equipment_type: type,
      predicted_demand: predictedDemand,
      confidence_score: confidence,
      trend: predictedDemand > avgRentals ? 'increasing' : 'decreasing',
      factors: ['seasonal_patterns', 'historical_demand', 'market_trends']
    };
  });
}

function enhanceMaintenancePredictions(data) {
  return data.map(item => {
    // Calculate risk score based on multiple factors
    const healthFactor = (100 - item.overall_health_score) / 100;
    const utilizationFactor = (item.utilization_rate || 0) / 100;
    const ageFactor = (item.total_runtime_hours || 0) / 10000;
    
    const riskScore = Math.min(100, Math.round((healthFactor + utilizationFactor + ageFactor) * 33.33));
    
    // Predict failure probability
    const failureProbability = Math.min(95, Math.max(5, riskScore + Math.random() * 20 - 10));
    
    return {
      ...item,
      risk_score: riskScore,
      failure_probability: Math.round(failureProbability),
      predicted_issues: generatePredictedIssues(item),
      maintenance_window: calculateMaintenanceWindow(item),
      cost_estimate: estimateMaintenanceCost(item)
    };
  });
}

function generateUtilizationPredictions(data) {
  return data.map(item => {
    const currentUtilization = item.utilization_rate || 0;
    const rentalFrequency = item.rental_frequency || 0;
    
    // Predict next 30 days utilization
    const trend = rentalFrequency > 2 ? 'increasing' : 'stable';
    const predictedUtilization = Math.min(100, Math.max(0, 
      currentUtilization + (trend === 'increasing' ? 10 : -5) + Math.random() * 10 - 5
    ));
    
    return {
      ...item,
      predicted_utilization: Math.round(predictedUtilization),
      utilization_trend: trend,
      optimization_potential: Math.max(0, 85 - currentUtilization),
      revenue_potential: calculateRevenuePotential(item)
    };
  });
}

function generateReturnDatePredictions(data) {
  return data.map(rental => {
    // Factors affecting return date prediction
    const creditRiskFactor = (10 - (rental.credit_rating || 5)) / 10;
    const durationFactor = rental.rental_duration_planned > 30 ? 0.2 : 0;
    
    // Calculate probability of late return
    const lateReturnProbability = Math.min(90, Math.max(5, 
      (creditRiskFactor + durationFactor) * 50 + Math.random() * 20
    ));
    
    // Predict actual return date
    const plannedDate = new Date(rental.rental_end_date_planned);
    const predictedDelay = lateReturnProbability > 50 ? Math.round(lateReturnProbability / 10) : 0;
    const predictedReturnDate = new Date(plannedDate);
    predictedReturnDate.setDate(plannedDate.getDate() + predictedDelay);
    
    return {
      ...rental,
      late_return_probability: Math.round(lateReturnProbability),
      predicted_return_date: predictedReturnDate.toISOString().split('T')[0],
      predicted_delay_days: predictedDelay,
      risk_level: lateReturnProbability > 70 ? 'High' : lateReturnProbability > 40 ? 'Medium' : 'Low'
    };
  });
}

function generateRecommendations(insights) {
  const recommendations = [];
  
  // Equipment recommendations
  if (insights.equipmentPerformance) {
    const lowUtilization = insights.equipmentPerformance.filter(eq => eq.avg_utilization < 70);
    if (lowUtilization.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'Improve Equipment Utilization',
        description: `${lowUtilization.length} equipment types have utilization below 70%. Consider dynamic pricing or targeted marketing.`,
        impact: 'revenue_increase'
      });
    }
  }
  
  // Maintenance recommendations
  if (insights.equipmentPerformance) {
    const highMaintenance = insights.equipmentPerformance.filter(eq => eq.high_priority_maintenance > 0);
    if (highMaintenance.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'critical',
        title: 'Urgent Maintenance Required',
        description: 'Schedule immediate maintenance for high-priority equipment to avoid breakdowns.',
        impact: 'cost_avoidance'
      });
    }
  }
  
  // Customer recommendations
  if (insights.customerBehavior) {
    const corporateCustomers = insights.customerBehavior.find(cb => cb.customer_type === 'Corporate');
    if (corporateCustomers && corporateCustomers.avg_overdue_days > 2) {
      recommendations.push({
        type: 'customer_management',
        priority: 'medium',
        title: 'Improve Corporate Customer Relations',
        description: 'Corporate customers are averaging late returns. Consider loyalty programs or stricter contracts.',
        impact: 'customer_satisfaction'
      });
    }
  }
  
  return recommendations;
}

// Helper functions
function getSeasonalMultiplier(equipmentType, month) {
  // Mock seasonal patterns
  const patterns = {
    'Excavator': [0.8, 0.9, 1.2, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7],
    'Bulldozer': [0.7, 0.8, 1.1, 1.3, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8],
    'Wheel Loader': [0.9, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9]
  };
  
  return patterns[equipmentType]?.[month - 1] || 1.0;
}

function generatePredictedIssues(equipment) {
  const issues = [];
  if (equipment.engine_health < 80) issues.push('Engine performance degradation');
  if (equipment.hydraulic_health < 75) issues.push('Hydraulic system wear');
  if (equipment.transmission_health < 70) issues.push('Transmission maintenance needed');
  return issues;
}

function calculateMaintenanceWindow(equipment) {
  const urgency = equipment.maintenance_priority || 1;
  const windows = {
    5: '1-3 days',
    4: '1-2 weeks', 
    3: '2-4 weeks',
    2: '1-2 months',
    1: '3+ months'
  };
  return windows[urgency] || '3+ months';
}

function estimateMaintenanceCost(equipment) {
  const baseCosts = {
    'Excavator': 3000,
    'Bulldozer': 3500,
    'Wheel Loader': 2500,
    'Motor Grader': 2800,
    'Articulated Truck': 4000
  };
  
  const baseCost = baseCosts[equipment.equipment_type] || 3000;
  const priorityMultiplier = (equipment.maintenance_priority || 1) * 0.3;
  
  return Math.round(baseCost * (1 + priorityMultiplier));
}

function calculateRevenuePotential(equipment) {
  const utilizationGap = Math.max(0, 85 - (equipment.utilization_rate || 0));
  const dailyRate = 800; // Average daily rental rate
  return Math.round(utilizationGap * 0.01 * dailyRate * 30);
}

export default router;