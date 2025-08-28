import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import equipmentRoutes from './routes/equipment.js';
import rentalRoutes from './routes/rentals.js';
import customerRoutes from './routes/customers.js';
import siteRoutes from './routes/sites.js';
import maintenanceRoutes from './routes/maintenance.js';
import alertRoutes from './routes/alerts.js';
import anomalyRoutes from './routes/anomalies.js';
import dashboardRoutes from './routes/dashboard.js';
import predictionRoutes from './routes/predictions.js';
import usageRoutes from './routes/usage.js';

// Database initialization
import { initializeDatabase } from './database/init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
await initializeDatabase();

// Routes
app.use('/api/equipment', equipmentRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Caterpillar Fleet API is running' });
});

app.listen(PORT, () => {
  console.log(`🚜 Caterpillar Fleet Management API running on port ${PORT}`);
});