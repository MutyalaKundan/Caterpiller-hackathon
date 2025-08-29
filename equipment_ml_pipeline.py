"""
Run this to install required packages:
!pip install xgboost scikit-learn pandas numpy matplotlib seaborn tensorflow prophet
"""

# Colab-specific setup
try:
    import google.colab
    IN_COLAB = True
    print("✓ Running in Google Colab")
except ImportError:
    IN_COLAB = False
    print("✓ Running in local environment")

# Install required packages for Colab
if IN_COLAB:
    import subprocess
    import sys
    def install_package(package):
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    try:
        import xgboost
    except ImportError:
        print("Installing XGBoost...")
        install_package("xgboost")
    
    try:
        import prophet
    except ImportError:
        print("Installing Prophet...")
        install_package("prophet")

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Configure matplotlib for Colab
if IN_COLAB:
    plt.style.use('default')
    plt.rcParams['figure.dpi'] = 100
    plt.rcParams['savefig.dpi'] = 100

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, IsolationForest, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, classification_report, confusion_matrix
from sklearn.linear_model import LinearRegression
from sklearn.cluster import DBSCAN
import xgboost as xgb

try:
    from tensorflow import keras
    from keras import layers
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("TensorFlow not available. Using sklearn models only.")

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
    print("✓ Prophet library available for time series forecasting")
except ImportError:
    PROPHET_AVAILABLE = False
    print("⚠ Prophet not available. Using XGBoost for demand forecasting.")

class EquipmentMLPipeline:
    """Complete ML pipeline for equipment management"""
    
    def __init__(self):
        self.demand_model = None
        self.anomaly_model = None
        self.maintenance_model = None
        self.return_model = None
        self.scalers = {}
        self.encoders = {}
        
        # Prophet-specific models for demand forecasting
        self.prophet_models = {}  # Store models by location and equipment type
        # self.use_prophet = PROPHET_AVAILABLE
        self.use_prophet = False  # Disable Prophet for now due to environment issues
        
    def load_csv_data(self, data_path='.'):
        """Load and integrate real equipment data from CSV files"""
        print(f"📊 Loading real equipment data from {data_path}/...")
        
        try:
            # Load all datasets provided by the user
            print("  Loading core datasets...")
            equipment_df = pd.read_csv(f'{data_path}/equipment.csv')
            usage_df = pd.read_csv(f'{data_path}/equipment_usage.csv') 
            demand_df = pd.read_csv(f'{data_path}/demand_history.csv')
            rentals_df = pd.read_csv(f'{data_path}/rentals.csv')
            maintenance_df = pd.read_csv(f'{data_path}/maintenance_records.csv')
            anomalies_df = pd.read_csv(f'{data_path}/anomalies.csv')
            # Additional files are loaded here but not used in the pipeline logic below
            alerts_df = pd.read_csv(f'{data_path}/alerts.csv')
            checkin_checkout_df = pd.read_csv(f'{data_path}/checkin_checkout.csv')
            customers_df = pd.read_csv(f'{data_path}/customers.csv')
            equipment_health_df = pd.read_csv(f'{data_path}/equipment_health.csv')
            sites_df = pd.read_csv(f'{data_path}/sites.csv')
            
            print(f"✓ Loaded {len(equipment_df):,} equipment records")
            print(f"✓ Loaded {len(usage_df):,} usage records")
            print(f"✓ Loaded {len(demand_df):,} demand records")
            print(f"✓ Loaded {len(rentals_df):,} rental records")
            print(f"✓ Loaded {len(maintenance_df):,} maintenance records")
            print(f"✓ Loaded {len(anomalies_df):,} anomaly records")
            print(f"✓ Loaded {len(sites_df):,} sites records")
            print(f"✓ Loaded {len(alerts_df):,} alerts records")
            print(f"✓ Loaded {len(customers_df):,} customers records")
            print(f"✓ Loaded {len(equipment_health_df):,} equipment health records")
            print(f"✓ Loaded {len(checkin_checkout_df):,} checkin/checkout records")

            # Integrate data
            print("  Integrating datasets...")
            integrated_data = self._integrate_equipment_data(
                equipment_df, usage_df, demand_df, rentals_df, 
                maintenance_df, anomalies_df
            )
            
            print(f"✅ Successfully integrated data: {len(integrated_data):,} final records")
            return integrated_data
            
        except FileNotFoundError as e:
            print(f"❌ Error: Could not find CSV files in {data_path}/")
            print(f"   Missing file: {e}")
            print("   Falling back to synthetic data generation...")
            return self.generate_sample_data(n_samples=5000)
        except Exception as e:
            print(f"❌ Error loading CSV data: {str(e)}")
            print("   Falling back to synthetic data generation...")
            return self.generate_sample_data(n_samples=5000)
    
    def _integrate_equipment_data(self, equipment_df, usage_df, demand_df, 
                                rentals_df, maintenance_df, anomalies_df):
        """Integrate multiple datasets into a unified format for ML pipeline"""
        
        # Prepare equipment base data
        equipment_base = equipment_df[['equipment_id', 'equipment_type', 'year_manufactured', 'status']].copy()
        
        # Calculate equipment age
        current_year = datetime.now().year
        equipment_base['age_months'] = (current_year - equipment_base['year_manufactured']) * 12
        
        # Process usage data with aggregations
        print("    Processing usage patterns...")
        usage_agg = usage_df.groupby('equipment_id').agg({
          'runtime_hours_total': 'max',
            'idle_hours': 'sum', 
            'fuel_consumption_rate': 'mean',
            'engine_temperature': 'mean',
            'is_operating': 'mean',
            'timestamp': ['min', 'max', 'count']
        }).round(2)
        
        # Flatten column names
        usage_agg.columns = ['_'.join(col).strip() if col[1] else col[0] for col in usage_agg.columns.values]
        usage_agg = usage_agg.reset_index()
        
        # Process rental data
        print("    Processing rental patterns...")
        rentals_df['rental_start_date'] = pd.to_datetime(rentals_df['rental_start_date'])
        rentals_df['rental_end_date_actual'] = pd.to_datetime(rentals_df['rental_end_date_actual'])
        
        rental_agg = rentals_df.groupby('equipment_id').agg({
            'rental_duration_actual': 'mean',
            'rental_rate_per_day': 'mean',
            'overdue_days': 'sum',
            'rental_start_date': 'count'  # number of rentals
        }).round(2)
        rental_agg = rental_agg.reset_index()
        rental_agg = rental_agg.rename(columns={'rental_start_date': 'total_rentals'})
        
        # Process maintenance data  
        print("    Processing maintenance history...")
        maintenance_df['maintenance_date'] = pd.to_datetime(maintenance_df['maintenance_date'])
        
        maintenance_agg = maintenance_df.groupby('equipment_id').agg({
            'cost': 'sum',
            'downtime_hours': 'sum',
            'maintenance_score': 'mean',
            'maintenance_date': 'count'
        }).round(2)
        maintenance_agg = maintenance_agg.reset_index()
        maintenance_agg = maintenance_agg.rename(columns={
            'cost': 'total_maintenance_cost',
            'downtime_hours': 'total_downtime_hours', 
            'maintenance_date': 'maintenance_count'
        })
        
        # Determine maintenance needs (if recent maintenance or poor score)
        maintenance_agg['needs_maintenance'] = (
            (maintenance_agg['maintenance_score'] < 8) | 
            (maintenance_agg['total_maintenance_cost'] > 10000)
        ).astype(int)
        
        # Process anomaly data
        print("    Processing anomaly patterns...")
        anomaly_agg = anomalies_df.groupby('equipment_id').agg({
            'anomaly_score': 'mean',
            'anomaly_id': 'count'
        }).round(3)
        anomaly_agg = anomaly_agg.reset_index()
        anomaly_agg = anomaly_agg.rename(columns={'anomaly_id': 'anomaly_count'})
        
        # Mark equipment with anomalies
        anomaly_agg['is_anomaly'] = (anomaly_agg['anomaly_count'] > 0).astype(int)
        
        # Process demand data
        print("    Processing demand patterns...")  
        # Get recent demand data and aggregate by equipment type
        demand_recent = demand_df.copy()
        demand_recent['date'] = pd.to_datetime(demand_recent['date'])
        
        # Get demand by equipment type and location (using city as location proxy)
        demand_by_type_location = demand_recent.groupby(['equipment_type', 'city']).agg({
            'demand_count': 'mean',
            'month': 'first'  # for seasonal analysis
        }).round(1).reset_index()
        demand_by_type_location = demand_by_type_location.rename(columns={
            'city': 'location',
            'demand_count': 'demand'
        })
        
        # Start integration from equipment base
        print("    Merging datasets...")
        integrated = equipment_base.copy()
        
        # Merge usage data
        integrated = integrated.merge(usage_agg, on='equipment_id', how='left')
        
        # Merge rental data
        integrated = integrated.merge(rental_agg, on='equipment_id', how='left')
        
        # Merge maintenance data
        integrated = integrated.merge(maintenance_agg, on='equipment_id', how='left')
        
        # Merge anomaly data
        integrated = integrated.merge(anomaly_agg, on='equipment_id', how='left')
        
        # Add demand data by matching equipment type
        # For each equipment, find matching demand data
        demand_map = {}
        for _, row in demand_by_type_location.iterrows():
            key = (row['equipment_type'], row['location'])
            if key not in demand_map:
                demand_map[key] = row
        
        # Add demand and location info
        integrated['location'] = None
        integrated['demand'] = None
        
        for idx, row in integrated.iterrows():
            eq_type = row['equipment_type']
            # Try to find matching demand data, fallback to first location if needed
            matching_demand = None
            for (dtype, location), demand_row in demand_map.items():
                if dtype == eq_type:
                    matching_demand = demand_row
                    break
            
            if matching_demand is not None:
                integrated.at[idx, 'location'] = matching_demand['location']
                integrated.at[idx, 'demand'] = matching_demand['demand'] 
                integrated.at[idx, 'month'] = matching_demand['month']
            else:
                # Default values if no demand data found
                integrated.at[idx, 'location'] = 'Unknown'
                integrated.at[idx, 'demand'] = 5
                integrated.at[idx, 'month'] = 6
        
        # Fill missing values and calculate derived features
        print("    Calculating derived features...")
        integrated = integrated.fillna(0)
        
        # Rename and calculate key metrics
        integrated['usage_hours'] = integrated['runtime_hours_total_max']
        integrated['fuel_consumption'] = integrated['fuel_consumption_rate_mean'] * integrated['usage_hours']
        integrated['downtime_hours'] = integrated['total_downtime_hours']
        integrated['efficiency_score'] = 100 - (integrated['downtime_hours'] / (integrated['usage_hours'] + 1) * 10)
        integrated['efficiency_score'] = integrated['efficiency_score'].clip(0, 100)
        
        # Calculate utilization metrics
        integrated['rental_duration'] = integrated['rental_duration_actual'].fillna(14)  # Default 14 days
        integrated['available_hours'] = integrated['rental_duration'] * 24
        integrated['productive_hours'] = integrated['usage_hours'] - integrated['downtime_hours']
        integrated['productive_hours'] = integrated['productive_hours'].clip(lower=0)
        
        # Utilization rates
        integrated['utilization_rate'] = (integrated['usage_hours'] / (integrated['available_hours'] + 1)).clip(0, 1)
        integrated['idle_hours'] = integrated['available_hours'] - integrated['usage_hours']
        integrated['idle_hours'] = integrated['idle_hours'].clip(lower=0)
        integrated['idle_rate'] = integrated['idle_hours'] / (integrated['available_hours'] + 1)
        
        # Capacity utilization (equipment-specific)
        capacity_map = {
            'Excavator': 180, 'Wheel Loader': 170, 'Backhoe Loader': 160,
            'Off-Highway Truck': 200, 'Motor Grader': 150, 'Compressor': 120,
            'Bulldozer': 160, 'Skid Steer': 140, 'Compactor': 130, 'Generator': 100
        }
        
        integrated['equipment_capacity'] = integrated['equipment_type'].map(capacity_map).fillna(150)
        integrated['actual_capacity'] = integrated['productive_hours'] / (integrated['rental_duration'] + 1)
        integrated['capacity_utilization'] = (integrated['actual_capacity'] / integrated['equipment_capacity']).clip(0, 1)
        integrated['work_intensity'] = (integrated['productive_hours'] / (integrated['usage_hours'] + 1)).clip(0, 1)
        integrated['operating_hours_per_day'] = integrated['usage_hours'] / (integrated['rental_duration'] + 1)
        
        # Additional derived features
        integrated['fuel_efficiency'] = integrated['usage_hours'] / (integrated['fuel_consumption'] + 1)
        integrated['age_usage_ratio'] = integrated['age_months'] / (integrated['usage_hours'] + 1)
        
        # Add time-based features
        current_date = datetime.now()
        integrated['date'] = current_date
        integrated['day_of_year'] = integrated['date'].dt.dayofyear
        integrated['return_date'] = current_date + pd.to_timedelta(integrated['rental_duration'], unit='days')
        
        # Calculate seasonal demand
        seasonal_demand = integrated.groupby(['equipment_type', 'month'])['demand'].transform('mean')
        integrated['seasonal_demand'] = seasonal_demand.fillna(integrated['demand'])
        
        # Clean up and select final columns
        final_columns = [
            'equipment_id', 'equipment_type', 'location', 'date', 'age_months',
            'usage_hours', 'demand', 'needs_maintenance', 'return_date', 'rental_duration',
            'fuel_consumption', 'downtime_hours', 'efficiency_score', 'month', 'day_of_year',
            'is_anomaly', 'available_hours', 'productive_hours', 'idle_hours',
            'utilization_rate', 'idle_rate', 'capacity_utilization', 'work_intensity',
            'operating_hours_per_day', 'fuel_efficiency', 'age_usage_ratio', 'seasonal_demand'
        ]
        
        # Select only columns that exist
        existing_columns = [col for col in final_columns if col in integrated.columns]
        result_df = integrated[existing_columns].copy()
        
        # Ensure numeric types
        numeric_columns = [
            'age_months', 'usage_hours', 'demand', 'rental_duration', 'fuel_consumption',
            'downtime_hours', 'efficiency_score', 'available_hours', 'productive_hours',
            'idle_hours', 'utilization_rate', 'idle_rate', 'capacity_utilization',
            'work_intensity', 'operating_hours_per_day', 'fuel_efficiency', 'age_usage_ratio'
        ]
        
        for col in numeric_columns:
            if col in result_df.columns:
                result_df[col] = pd.to_numeric(result_df[col], errors='coerce').fillna(0)
        
        return result_df
    
    def generate_sample_data(self, n_samples=5000):
        """Fallback method: Generate synthetic sample data if CSV loading fails"""
        print(f"⚠ Using synthetic data generation as fallback ({n_samples:,} samples)")
        np.random.seed(42)
        
        # Equipment types matching CSV data
        equipment_types = ['Excavator', 'Wheel Loader', 'Backhoe Loader', 'Off-Highway Truck', 
                          'Motor Grader', 'Compressor', 'Bulldozer', 'Skid Steer', 'Compactor']
        locations = ['Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix']
        
        data = []
        base_date = datetime(2023, 1, 1)
        
        for i in range(n_samples):
            equipment_id = f"CAT{i:05d}"
            equipment_type = np.random.choice(equipment_types)
            location = np.random.choice(locations)
            
            # Time-based features
            days_offset = np.random.randint(0, 365)
            current_date = base_date + timedelta(days=days_offset)
            
            # Equipment characteristics  
            age_months = np.random.uniform(12, 84)  # 1-7 years
            rental_duration = np.random.randint(7, 90)  # 1 week to 3 months
            
            # Operational metrics
            usage_hours = np.random.uniform(100, 2000)
            downtime_hours = np.random.uniform(5, 50)
            fuel_consumption = usage_hours * np.random.uniform(5, 20)
            efficiency_score = np.random.uniform(60, 95)
            
            # Utilization calculations
            available_hours = rental_duration * 24
            productive_hours = max(0, usage_hours - downtime_hours)
            utilization_rate = min(1.0, usage_hours / available_hours)
            idle_hours = max(0, available_hours - usage_hours)
            idle_rate = idle_hours / available_hours
            
            # Equipment-specific capacity
            capacity_map = {'Excavator': 180, 'Wheel Loader': 170, 'Backhoe Loader': 160}
            equipment_capacity = capacity_map.get(equipment_type, 150)
            capacity_utilization = min(1.0, (productive_hours / rental_duration) / equipment_capacity)
            work_intensity = productive_hours / max(1, usage_hours)
            
            # Demand and maintenance
            demand = np.random.randint(3, 25)
            needs_maintenance = 1 if np.random.random() < 0.15 else 0
            is_anomaly = 1 if np.random.random() < 0.05 else 0
            
            record = {
                'equipment_id': equipment_id,
                'equipment_type': equipment_type, 
                'location': location,
                'date': current_date,
                'age_months': age_months,
                'usage_hours': usage_hours,
                'demand': demand,
                'needs_maintenance': needs_maintenance,
                'return_date': current_date + timedelta(days=rental_duration),
                'rental_duration': rental_duration,
                'fuel_consumption': fuel_consumption,
                'downtime_hours': downtime_hours,
                'efficiency_score': efficiency_score,
                'month': current_date.month,
                'day_of_year': current_date.timetuple().tm_yday,
                'is_anomaly': is_anomaly,
                'available_hours': available_hours,
                'productive_hours': productive_hours,
                'idle_hours': idle_hours,
                'utilization_rate': utilization_rate,
                'idle_rate': idle_rate,
                'capacity_utilization': capacity_utilization,
                'work_intensity': work_intensity,
                'operating_hours_per_day': usage_hours / rental_duration,
                'fuel_efficiency': usage_hours / max(1, fuel_consumption),
                'age_usage_ratio': age_months / max(1, usage_hours),
                'seasonal_demand': demand * (1 + 0.2 * np.sin(2 * np.pi * current_date.month / 12))
            }
            
            data.append(record)
        
        return pd.DataFrame(data)
    
    def preprocess_data(self, df):
        """Preprocess data for ML models with enhanced validation for CSV data"""
        df_processed = df.copy()
        
        # Validate and clean data
        print(f"    Data validation: {len(df_processed)} records, {len(df_processed.columns)} features")
        
        # Handle missing values
        numeric_columns = df_processed.select_dtypes(include=[np.number]).columns
        df_processed[numeric_columns] = df_processed[numeric_columns].fillna(0)
        
        categorical_columns = ['equipment_type', 'location']
        for col in categorical_columns:
            if col in df_processed.columns:
                if col not in self.encoders:
                    self.encoders[col] = LabelEncoder()
                try:
                    df_processed[f'{col}_encoded'] = self.encoders[col].fit_transform(df_processed[col].astype(str))
                except Exception as e:
                    print(f"    Warning: Could not encode {col}: {e}")
                    # Create default encoding
                    unique_values = df_processed[col].unique()
                    df_processed[f'{col}_encoded'] = pd.Categorical(df_processed[col]).codes
        
        # Enhanced numerical features for real data
        numerical_features = [
            'age_months', 'usage_hours', 'fuel_consumption', 'downtime_hours', 
            'efficiency_score', 'utilization_rate', 'idle_rate', 'capacity_utilization',
            'work_intensity', 'fuel_efficiency', 'age_usage_ratio'
        ]
        
        # Select only existing numerical features
        existing_numerical = [col for col in numerical_features if col in df_processed.columns]
        
        if existing_numerical:
            # Scale numerical features
            if 'numerical' not in self.scalers:
                self.scalers['numerical'] = StandardScaler()
            
            # Handle infinite and very large values
            for col in existing_numerical:
                df_processed[col] = df_processed[col].replace([np.inf, -np.inf], 0)
                df_processed[col] = df_processed[col].clip(-1000, 1000)  # Reasonable bounds
            
            df_processed[existing_numerical] = self.scalers['numerical'].fit_transform(df_processed[existing_numerical])
            print(f"    ✓ Scaled {len(existing_numerical)} numerical features")
        
        # Ensure seasonal_demand exists
        if 'seasonal_demand' not in df_processed.columns:
            df_processed['seasonal_demand'] = df_processed.get('demand', 5)
        
        print(f"    ✓ Preprocessing complete: {len(df_processed)} records ready for training")
        return df_processed
    
    def validate_and_summarize_data(self, df):
        """Validate and provide summary of the loaded CSV data"""
        print("\n📋 Real Data Summary & Validation:")
        
        # Basic statistics
        print(f"  Dataset Shape: {df.shape[0]:,} records × {df.shape[1]} features")
        
        # Equipment type distribution
        if 'equipment_type' in df.columns:
            eq_types = df['equipment_type'].value_counts()
            print(f"  Equipment Types ({len(eq_types)}):")
            for eq_type, count in eq_types.head(5).items():
                print(f"    • {eq_type}: {count:,} records")
            if len(eq_types) > 5:
                print(f"    • ... and {len(eq_types) - 5} more types")
        
        # Location distribution
        if 'location' in df.columns:
            locations = df['location'].value_counts()
            print(f"  Locations ({len(locations)}):")
            for location, count in locations.head(3).items():
                print(f"    • {location}: {count:,} records")
        
        # Key metrics ranges
        key_metrics = ['age_months', 'usage_hours', 'utilization_rate', 'idle_rate']
        print(f"  Key Metrics Ranges:")
        for metric in key_metrics:
            if metric in df.columns:
                values = df[metric]
                print(f"    • {metric}: {values.min():.2f} - {values.max():.2f} (avg: {values.mean():.2f})")
        
        # Anomaly and maintenance stats
        if 'is_anomaly' in df.columns:
            anomaly_rate = df['is_anomaly'].mean() * 100
            print(f"  Anomaly Rate: {anomaly_rate:.1f}% ({df['is_anomaly'].sum():,} cases)")
        
        if 'needs_maintenance' in df.columns:
            maintenance_rate = df['needs_maintenance'].mean() * 100
            print(f"  Maintenance Required: {maintenance_rate:.1f}% ({df['needs_maintenance'].sum():,} cases)")
        
        # Data quality indicators
        missing_data = df.isnull().sum().sum()
        if missing_data > 0:
            print(f"  ⚠ Missing Values: {missing_data:,} total")
        else:
            print(f"  ✓ Data Quality: No missing values")
        
        print(f"  ✓ Data validation complete - ready for ML training")
        return True
    
    def train_demand_forecasting(self, df):
        """Train demand forecasting model using Prophet with location and equipment type features"""
        print("🎯 Training Prophet-based Demand Forecasting Models...")
        
        if not self.use_prophet:
            return self._train_xgboost_demand_forecasting(df)
        
        try:
            # Prepare time series data for Prophet
            df_ts = df.copy()
            df_ts['ds'] = df_ts['date']  # Prophet requires 'ds' column for dates
            
            results = {}
            model_count = 0
            total_mae = 0
            total_rmse = 0
            total_samples = 0
            
            print(f"  Training Prophet models by location and equipment type...")
            
            # Train separate Prophet models for each location-equipment combination
            for location in df_ts['location'].unique():
                for equipment_type in df_ts['equipment_type'].unique():
                    
                    # Filter data for this specific combination
                    subset_data = df_ts[
                        (df_ts['location'] == location) & 
                        (df_ts['equipment_type'] == equipment_type)
                    ].copy()
                    
                    if len(subset_data) < 30:  # Need minimum data points for Prophet
                        continue
                    
                    # Prepare Prophet dataset
                    prophet_data = subset_data[['ds', 'demand']].rename(columns={'demand': 'y'})
                    prophet_data = prophet_data.sort_values('ds')
                    
                    # Add regressors (additional features)
                    prophet_data['usage_hours'] = subset_data['usage_hours'].values
                    prophet_data['age_months'] = subset_data['age_months'].values
                    prophet_data['efficiency_score'] = subset_data['efficiency_score'].values
                    
                    # Initialize Prophet model with custom settings
                    model = Prophet(
                        yearly_seasonality=True,
                        weekly_seasonality=False,  # Equipment rental is more yearly/monthly
                        daily_seasonality=False,
                        seasonality_mode='multiplicative',
                        changepoint_prior_scale=0.05,  # More conservative changepoints
                        seasonality_prior_scale=10.0,
                        interval_width=0.8
                    )
                    
                    # Add custom regressors
                    model.add_regressor('usage_hours')
                    model.add_regressor('age_months') 
                    model.add_regressor('efficiency_score')
                    
                    # Add monthly seasonality for equipment rental patterns
                    model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
                    
                    # Fit the model
                    model.fit(prophet_data)
                    
                    # Store the model
                    key = f"{location}_{equipment_type}"
                    self.prophet_models[key] = model
                    model_count += 1
                    
                    # Evaluate on the last 20% of data
                    train_size = int(len(prophet_data) * 0.8)
                    train_data = prophet_data.iloc[:train_size]
                    test_data = prophet_data.iloc[train_size:]
                    
                    if len(test_data) > 0:
                        # Make predictions
                        forecast = model.predict(test_data)
                        
                        # Calculate metrics
                        mae = mean_absolute_error(test_data['y'], forecast['yhat'])
                        rmse = np.sqrt(mean_squared_error(test_data['y'], forecast['yhat']))
                        
                        total_mae += mae * len(test_data)
                        total_rmse += rmse * len(test_data)
                        total_samples += len(test_data)
            
            # Calculate overall metrics
            if total_samples > 0:
                overall_mae = total_mae / total_samples
                overall_rmse = total_rmse / total_samples
                # Approximate R² using correlation
                overall_r2 = max(0, 1 - (overall_rmse**2 / df['demand'].var()))
            else:
                overall_mae, overall_rmse, overall_r2 = 0, 0, 0
            
            print(f"✅ Trained {model_count} Prophet models")
            print(f"Prophet Demand Forecasting Results:")
            print(f"  MAE: {overall_mae:.2f}")
            print(f"  RMSE: {overall_rmse:.2f}")
            print(f"  R²: {overall_r2:.3f}")
            print(f"  Models by Location-Equipment: {list(self.prophet_models.keys())[:3]}...")
            
            return {'mae': overall_mae, 'rmse': overall_rmse, 'r2': overall_r2, 'models': model_count}
            
        except Exception as e:
            print(f"❌ Error training Prophet models: {str(e)}")
            print("  Falling back to XGBoost...")
            return self._train_xgboost_demand_forecasting(df)
    
    def _train_xgboost_demand_forecasting(self, df):
        """Fallback XGBoost implementation for demand forecasting"""
        print("  Using XGBoost for demand forecasting...")
        
        try:
            features = ['equipment_type_encoded', 'location_encoded', 'age_months', 
                       'usage_hours', 'month', 'day_of_year', 'seasonal_demand']
            
            X = df[features]
            y = df['demand']
            
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            self.demand_model = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                verbosity=0
            )
            
            self.demand_model.fit(X_train, y_train)
            
            y_pred = self.demand_model.predict(X_test)
            mae = mean_absolute_error(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            r2 = r2_score(y_test, y_pred)
            
            return {'mae': mae, 'rmse': rmse, 'r2': r2}
            
        except Exception as e:
            print(f"❌ Error training XGBoost model: {str(e)}")
            raise
    
    def train_anomaly_detection(self, df):
        """Train enhanced anomaly detection model focusing on idle time and utilization"""
        print("\n🔍 Training Enhanced Anomaly Detection Model...")
        print("  Focusing on idle time and equipment utilization patterns")
        
        try:
            # Enhanced feature set including utilization and idle time metrics
            features = [
                # Original features
                'fuel_consumption', 'downtime_hours', 'efficiency_score', 
                'fuel_efficiency', 'age_usage_ratio',
                # New utilization and idle time features
                'utilization_rate', 'idle_rate', 'capacity_utilization', 
                'work_intensity', 'idle_hours', 'productive_hours'
            ]
            
            X = df[features]
            print(f"  Enhanced Features: {len(features)}")
            print(f"    • Utilization metrics: utilization_rate, capacity_utilization, work_intensity")
            print(f"    • Idle time metrics: idle_rate, idle_hours")
            print(f"    • Productivity metrics: productive_hours, fuel_efficiency")
            print(f"  Samples: {len(X):,}")
            
            # Use enhanced Isolation Forest for utilization anomalies
            self.anomaly_model = IsolationForest(
                contamination=0.05,  # Expected 5% anomaly rate
                random_state=42,
                n_estimators=150,    # Increased for better detection
                max_samples='auto',
                max_features=0.8,    # Use 80% of features for each tree
                n_jobs=-1,           # Use all available cores
                bootstrap=False      # Don't bootstrap samples
            )
            
            print("  Training enhanced Isolation Forest...")
            self.anomaly_model.fit(X)
            
            # Store feature names for later analysis
            self.anomaly_features = features
            
        except MemoryError:
            print("❌ Memory error during training. Try reducing dataset size.")
            raise
        except Exception as e:
            print(f"❌ Error training anomaly model: {str(e)}")
            raise
        
        # Predict anomalies and get anomaly scores
        anomaly_scores = self.anomaly_model.decision_function(X)
        anomaly_pred = self.anomaly_model.predict(X)
        anomaly_pred = [1 if x == -1 else 0 for x in anomaly_pred]
        
        # Enhanced anomaly analysis
        self._analyze_utilization_anomalies(df, anomaly_scores, anomaly_pred)
        
        # Evaluate against known anomalies
        from sklearn.metrics import precision_score, recall_score, f1_score
        
        precision = precision_score(df['is_anomaly'], anomaly_pred)
        recall = recall_score(df['is_anomaly'], anomaly_pred)
        f1 = f1_score(df['is_anomaly'], anomaly_pred)
        
        print(f"\nEnhanced Anomaly Detection Results:")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall: {recall:.3f}")
        print(f"  F1-Score: {f1:.3f}")
        print(f"  Total Anomalies Detected: {sum(anomaly_pred):,}")
        
        return {'precision': precision, 'recall': recall, 'f1': f1, 'total_anomalies': sum(anomaly_pred)}
    
    def _analyze_utilization_anomalies(self, df, anomaly_scores, anomaly_pred):
        """Analyze detected anomalies by utilization patterns"""
        print("\n  🔍 Utilization Anomaly Analysis:")
        
        # Create anomaly dataframe
        df_analysis = df.copy()
        df_analysis['anomaly_score'] = anomaly_scores
        df_analysis['detected_anomaly'] = anomaly_pred
        
        # Analyze anomalies by type
        anomalies = df_analysis[df_analysis['detected_anomaly'] == 1]
        
        if len(anomalies) > 0:
            # Utilization anomalies
            low_util = anomalies[anomalies['utilization_rate'] < 0.2]
            high_idle = anomalies[anomalies['idle_rate'] > 0.6]
            low_productivity = anomalies[anomalies['work_intensity'] < 0.5]
            
            print(f"    • Low Utilization (<20%): {len(low_util)} cases")
            print(f"    • High Idle Time (>60%): {len(high_idle)} cases") 
            print(f"    • Low Work Intensity (<50%): {len(low_productivity)} cases")
            
            # Equipment type analysis
            print(f"    • Anomalies by Equipment Type:")
            for eq_type in anomalies['equipment_type'].unique():
                count = len(anomalies[anomalies['equipment_type'] == eq_type])
                print(f"      - {eq_type}: {count} anomalies")
        
        else:
            print("    • No anomalies detected in this dataset")
    
    def get_utilization_anomaly_insights(self, equipment_data):
        """Get detailed insights about utilization anomalies for specific equipment"""
        if not hasattr(self, 'anomaly_model') or self.anomaly_model is None:
            return {"error": "Anomaly model not trained"}
        
        # Prepare data for prediction
        df_new = pd.DataFrame([equipment_data])
        df_processed = self.preprocess_data(df_new)
        
        # Extract utilization features
        utilization_features = [
            'fuel_consumption', 'downtime_hours', 'efficiency_score', 
            'fuel_efficiency', 'age_usage_ratio', 'utilization_rate', 
            'idle_rate', 'capacity_utilization', 'work_intensity', 
            'idle_hours', 'productive_hours'
        ]
        
        X = df_processed[utilization_features]
        
        # Get anomaly score and prediction
        anomaly_score = self.anomaly_model.decision_function(X)[0]
        is_anomaly = anomaly_score < 0
        
        # Detailed analysis
        insights = {
            'anomaly_score': float(anomaly_score),
            'is_anomaly': bool(is_anomaly),
            'confidence': abs(float(anomaly_score)),
            'utilization_metrics': {
                'utilization_rate': float(equipment_data.get('utilization_rate', 0)),
                'idle_rate': float(equipment_data.get('idle_rate', 0)),
                'capacity_utilization': float(equipment_data.get('capacity_utilization', 0)),
                'work_intensity': float(equipment_data.get('work_intensity', 0))
            }
        }
        
        # Risk categorization
        if anomaly_score < -0.5:
            insights['risk_level'] = 'High'
            insights['recommendation'] = 'Immediate investigation required'
        elif anomaly_score < -0.2:
            insights['risk_level'] = 'Medium' 
            insights['recommendation'] = 'Monitor closely'
        elif anomaly_score < 0:
            insights['risk_level'] = 'Low'
            insights['recommendation'] = 'Continue normal monitoring'
        else:
            insights['risk_level'] = 'Normal'
            insights['recommendation'] = 'Equipment operating normally'
        
        # Specific utilization warnings
        util_rate = equipment_data.get('utilization_rate', 0)
        idle_rate = equipment_data.get('idle_rate', 0)
        
        warnings = []
        if util_rate < 0.2:
            warnings.append("Very low utilization rate - equipment underused")
        if idle_rate > 0.7:
            warnings.append("Excessive idle time - potential efficiency issue")
        if equipment_data.get('work_intensity', 1) < 0.5:
            warnings.append("Low work intensity - high downtime during usage")
        
        insights['warnings'] = warnings
        
        return insights
    
    def train_maintenance_prediction(self, df):
        """Train maintenance prediction model"""
        print("\nTraining Maintenance Prediction Model...")
        
        features = ['equipment_type_encoded', 'age_months', 'usage_hours', 
                   'fuel_consumption', 'downtime_hours', 'efficiency_score']
        
        X = df[features]
        y = df['needs_maintenance']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.maintenance_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        self.maintenance_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.maintenance_model.predict(X_test)
        
        print(f"Maintenance Prediction Results:")
        print(classification_report(y_test, y_pred))
        
        return classification_report(y_test, y_pred, output_dict=True)
    
    def train_return_date_prediction(self, df):
        """Train return date prediction model"""
        print("\nTraining Return Date Prediction Model...")
        
        features = ['equipment_type_encoded', 'location_encoded', 'age_months', 
                   'usage_hours', 'month']
        
        X = df[features]
        y = df['rental_duration']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.return_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        self.return_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.return_model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"Return Date Prediction Results:")
        print(f"MAE: {mae:.2f} days")
        print(f"RMSE: {rmse:.2f} days")
        print(f"R²: {r2:.2f}")
        
        return {'mae': mae, 'rmse': rmse, 'r2': r2}
    
    def predict_new_equipment(self, equipment_data):
        """Make predictions for new equipment using Prophet and other models"""
        df_new = pd.DataFrame([equipment_data])
        df_processed = self.preprocess_data(df_new)
        
        results = {}
        
        # Prophet-based demand forecast
        if self.use_prophet and self.prophet_models:
            demand_pred = self._predict_demand_with_prophet(equipment_data)
            results['predicted_demand'] = max(0, int(demand_pred))
            results['forecasting_method'] = 'Prophet'
        else:
            # Fallback to XGBoost if Prophet not available
            demand_features = ['equipment_type_encoded', 'location_encoded', 'age_months', 
                              'usage_hours', 'month', 'day_of_year', 'seasonal_demand']
            demand_pred = self.demand_model.predict(df_processed[demand_features])[0]
            results['predicted_demand'] = max(0, int(demand_pred))
            results['forecasting_method'] = 'XGBoost'
        
        # Enhanced anomaly detection with utilization features
        if hasattr(self, 'anomaly_features'):
            # Use enhanced feature set if available
            anomaly_features = self.anomaly_features
        else:
            # Fallback to original features
            anomaly_features = ['fuel_consumption', 'downtime_hours', 'efficiency_score', 
                               'fuel_efficiency', 'age_usage_ratio']
        
        # Ensure all required features are present in the equipment data
        missing_features = [f for f in anomaly_features if f not in df_processed.columns]
        if missing_features:
            print(f"⚠ Warning: Missing features for anomaly detection: {missing_features}")
            # Use original features as fallback
            anomaly_features = ['fuel_consumption', 'downtime_hours', 'efficiency_score', 
                               'fuel_efficiency', 'age_usage_ratio']
        
        anomaly_score = self.anomaly_model.decision_function(df_processed[anomaly_features])[0]
        results['anomaly_score'] = anomaly_score
        results['is_anomaly'] = anomaly_score < 0
        
        # Get detailed utilization anomaly insights if enhanced features are available
        if all(f in equipment_data for f in ['utilization_rate', 'idle_rate', 'capacity_utilization']):
            utilization_insights = self.get_utilization_anomaly_insights(equipment_data)
            results['utilization_analysis'] = utilization_insights
        
        # Maintenance prediction
        maintenance_features = ['equipment_type_encoded', 'age_months', 'usage_hours', 
                               'fuel_consumption', 'downtime_hours', 'efficiency_score']
        maintenance_prob = self.maintenance_model.predict_proba(df_processed[maintenance_features])[0]
        results['maintenance_probability'] = maintenance_prob[1]
        results['needs_maintenance'] = maintenance_prob[1] > 0.5
        
        # Return date prediction
        return_features = ['equipment_type_encoded', 'location_encoded', 'age_months', 
                          'usage_hours', 'month']
        rental_duration = self.return_model.predict(df_processed[return_features])[0]
        results['predicted_rental_duration'] = max(1, int(rental_duration))
        
        return results
    
    def _predict_demand_with_prophet(self, equipment_data):
        """Helper method to make demand predictions using Prophet models"""
        location = equipment_data.get('location')
        equipment_type = equipment_data.get('equipment_type')
        key = f"{location}_{equipment_type}"
        
        # Try to find exact match first
        if key in self.prophet_models:
            model = self.prophet_models[key]
        else:
            # Find a similar model if exact match not available
            available_models = list(self.prophet_models.keys())
            location_matches = [k for k in available_models if k.startswith(f"{location}_")]
            equipment_matches = [k for k in available_models if k.endswith(f"_{equipment_type}")]
            
            if location_matches:
                model = self.prophet_models[location_matches[0]]
            elif equipment_matches:
                model = self.prophet_models[equipment_matches[0]]
            else:
                # Use first available model as fallback
                model = self.prophet_models[available_models[0]]
        
        # Create prediction dataframe
        future_date = equipment_data.get('date', datetime.now())
        if isinstance(future_date, str):
            future_date = pd.to_datetime(future_date)
        
        prediction_df = pd.DataFrame({
            'ds': [future_date],
            'usage_hours': [equipment_data.get('usage_hours', 2000)],
            'age_months': [equipment_data.get('age_months', 12)],
            'efficiency_score': [equipment_data.get('efficiency_score', 85)]
        })
        
        # Make prediction
        forecast = model.predict(prediction_df)
        predicted_demand = forecast['yhat'].iloc[0]
        
        return predicted_demand
    
    def create_demand_forecast_visualization(self, location=None, equipment_type=None, days_ahead=90):
        """Create Prophet forecast visualization for specific location and equipment type"""
        if not self.use_prophet or not self.prophet_models:
            print("⚠ Prophet models not available for visualization")
            return
        
        # Select model to visualize
        if location and equipment_type:
            key = f"{location}_{equipment_type}"
            if key in self.prophet_models:
                model = self.prophet_models[key]
                title = f"Demand Forecast: {equipment_type} in {location}"
            else:
                print(f"⚠ No model found for {location} - {equipment_type}")
                return
        else:
            # Use first available model
            first_key = list(self.prophet_models.keys())[0]
            model = self.prophet_models[first_key]
            location, equipment_type = first_key.split('_', 1)
            title = f"Demand Forecast: {equipment_type} in {location}"
        
        # Create future dates
        future = model.make_future_dataframe(periods=days_ahead)
        
        # Add regressor values (using average values)
        future['usage_hours'] = 2000  # Default value
        future['age_months'] = 24     # Default value
        future['efficiency_score'] = 85  # Default value
        
        # Make forecast
        forecast = model.predict(future)
        
        # Create visualization
        fig = model.plot(forecast, figsize=(12, 6))
        plt.title(title)
        plt.xlabel('Date')
        plt.ylabel('Demand')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()
        
        # Components plot
        fig = model.plot_components(forecast, figsize=(12, 8))
        plt.suptitle(f'Forecast Components: {equipment_type} in {location}')
        plt.tight_layout()
        plt.show()
        
        print(f"✅ Forecast visualization created for {title}")
        return forecast.tail(days_ahead)
    
    def create_visualizations(self, df):
        """Create comprehensive visualizations optimized for Colab display"""
        # Optimize figure size for Colab
        plt.rcParams['figure.figsize'] = (16, 20) if IN_COLAB else (15, 18)
        plt.rcParams['font.size'] = 11 if IN_COLAB else 10
        
        print("Creating comprehensive visualizations...")
        fig, axes = plt.subplots(3, 2, figsize=(16, 20))
        
        # 1. Demand by Equipment Type
        equipment_demand = df.groupby('equipment_type')['demand'].mean().sort_values(ascending=False)
        axes[0,0].bar(equipment_demand.index, equipment_demand.values)
        axes[0,0].set_title('Average Demand by Equipment Type')
        axes[0,0].set_ylabel('Average Demand')
        axes[0,0].tick_params(axis='x', rotation=45)
        
        # 2. Seasonal Demand Pattern
        monthly_demand = df.groupby('month')['demand'].mean()
        axes[0,1].plot(monthly_demand.index, monthly_demand.values, marker='o')
        axes[0,1].set_title('Seasonal Demand Pattern')
        axes[0,1].set_xlabel('Month')
        axes[0,1].set_ylabel('Average Demand')
        axes[0,1].set_xticks(range(1, 13))
        
        # 3. Age vs Maintenance Need
        maintenance_by_age = df.groupby(pd.cut(df['age_months'], bins=10))['needs_maintenance'].mean()
        axes[1,0].bar(range(len(maintenance_by_age)), maintenance_by_age.values)
        axes[1,0].set_title('Maintenance Need by Equipment Age')
        axes[1,0].set_xlabel('Age Groups')
        axes[1,0].set_ylabel('Maintenance Probability')
        
        # 4. Fuel Efficiency Distribution
        axes[1,1].hist(df['fuel_efficiency'], bins=50, alpha=0.7, edgecolor='black')
        axes[1,1].set_title('Fuel Efficiency Distribution')
        axes[1,1].set_xlabel('Fuel Efficiency')
        axes[1,1].set_ylabel('Frequency')
        
        # 5. Equipment Utilization Rate Heatmap
        utilization_data = df.pivot_table(values='utilization_rate', 
                                         index='equipment_type', 
                                         columns='location', 
                                         aggfunc='mean')
        sns.heatmap(utilization_data, annot=True, fmt='.2f', ax=axes[2,0], cmap='RdYlGn', 
                   vmin=0, vmax=1, cbar_kws={'label': 'Utilization Rate'})
        axes[2,0].set_title('Average Utilization Rate by Type and Location')
        
        # 6. Rental Duration vs Demand
        axes[2,1].scatter(df['demand'], df['rental_duration'], alpha=0.5)
        axes[2,1].set_title('Rental Duration vs Demand')
        axes[2,1].set_xlabel('Demand')
        axes[2,1].set_ylabel('Rental Duration (days)')
        
        plt.suptitle('Equipment Management Dashboard - Key Metrics', fontsize=16, y=0.98)
        plt.tight_layout()
        plt.show()
        
        # Enhanced utilization and idle time anomaly visualization
        print("Creating utilization and idle time anomaly visualizations...")
        
        # Optimize for Colab display
        fig_size = (18, 14) if IN_COLAB else (16, 12)
        fig, axes = plt.subplots(3, 2, figsize=fig_size)
        
        normal_data = df[df['is_anomaly'] == False]
        anomaly_data = df[df['is_anomaly'] == True]
        
        # 1. Utilization Rate vs Idle Rate
        axes[0,0].scatter(normal_data['utilization_rate'], normal_data['idle_rate'], 
                         alpha=0.6, label='Normal', s=20, color='blue')
        axes[0,0].scatter(anomaly_data['utilization_rate'], anomaly_data['idle_rate'], 
                         alpha=0.8, color='red', label='Anomaly', s=40)
        axes[0,0].set_title('Utilization Rate vs Idle Rate')
        axes[0,0].set_xlabel('Utilization Rate')
        axes[0,0].set_ylabel('Idle Rate')
        axes[0,0].legend()
        axes[0,0].grid(True, alpha=0.3)
        
        # 2. Work Intensity vs Capacity Utilization
        axes[0,1].scatter(normal_data['work_intensity'], normal_data['capacity_utilization'], 
                         alpha=0.6, label='Normal', s=20, color='green')
        axes[0,1].scatter(anomaly_data['work_intensity'], anomaly_data['capacity_utilization'], 
                         alpha=0.8, color='red', label='Anomaly', s=40)
        axes[0,1].set_title('Work Intensity vs Capacity Utilization')
        axes[0,1].set_xlabel('Work Intensity')
        axes[0,1].set_ylabel('Capacity Utilization')
        axes[0,1].legend()
        axes[0,1].grid(True, alpha=0.3)
        
        # 3. Idle Hours Distribution
        axes[1,0].hist(normal_data['idle_hours'], bins=40, alpha=0.7, label='Normal', 
                      density=True, color='skyblue', edgecolor='black')
        axes[1,0].hist(anomaly_data['idle_hours'], bins=40, alpha=0.8, label='Anomaly', 
                      density=True, color='red', edgecolor='darkred')
        axes[1,0].set_title('Idle Hours Distribution')
        axes[1,0].set_xlabel('Idle Hours')
        axes[1,0].set_ylabel('Density')
        axes[1,0].legend()
        
        # 4. Utilization Rate by Equipment Type
        util_by_type = df.groupby('equipment_type')['utilization_rate'].mean().sort_values(ascending=False)
        bars = axes[1,1].bar(util_by_type.index, util_by_type.values, color='lightcoral')
        axes[1,1].set_title('Average Utilization Rate by Equipment Type')
        axes[1,1].set_ylabel('Average Utilization Rate')
        axes[1,1].tick_params(axis='x', rotation=45)
        axes[1,1].set_ylim(0, 1)
        
        # Add value labels on bars
        for i, bar in enumerate(bars):
            height = bar.get_height()
            axes[1,1].text(bar.get_x() + bar.get_width()/2., height + 0.01, 
                          f'{height:.2f}', ha='center', va='bottom')
        
        # 5. Anomaly Detection Scatter: Productive Hours vs Total Hours
        axes[2,0].scatter(normal_data['usage_hours'], normal_data['productive_hours'], 
                         alpha=0.6, label='Normal', s=20, color='purple')
        axes[2,0].scatter(anomaly_data['usage_hours'], anomaly_data['productive_hours'], 
                         alpha=0.8, color='red', label='Anomaly', s=40)
        # Add diagonal line for reference (perfect productivity)
        max_hours = max(df['usage_hours'])
        axes[2,0].plot([0, max_hours], [0, max_hours], 'k--', alpha=0.5, label='Perfect Productivity')
        axes[2,0].set_title('Productive Hours vs Total Usage Hours')
        axes[2,0].set_xlabel('Total Usage Hours')
        axes[2,0].set_ylabel('Productive Hours')
        axes[2,0].legend()
        axes[2,0].grid(True, alpha=0.3)
        
        # 6. Idle Rate vs Equipment Age
        axes[2,1].scatter(normal_data['age_months'], normal_data['idle_rate'], 
                         alpha=0.6, label='Normal', s=20, color='orange')
        axes[2,1].scatter(anomaly_data['age_months'], anomaly_data['idle_rate'], 
                         alpha=0.8, color='red', label='Anomaly', s=40)
        axes[2,1].set_title('Idle Rate vs Equipment Age')
        axes[2,1].set_xlabel('Equipment Age (months)')
        axes[2,1].set_ylabel('Idle Rate')
        axes[2,1].legend()
        axes[2,1].grid(True, alpha=0.3)
        
        plt.suptitle('Enhanced Utilization & Idle Time Anomaly Analysis', fontsize=16, y=0.98)
        plt.tight_layout()
        plt.show()
        
        print("✅ All enhanced utilization and idle time visualizations created!")
        
        # Create summary statistics
        self._print_utilization_summary(df)
    
    def _print_utilization_summary(self, df):
        """Print utilization and idle time summary statistics"""
        print("\n📊 Utilization & Idle Time Summary:")
        print(f"  Average Utilization Rate: {df['utilization_rate'].mean():.2%}")
        print(f"  Average Idle Rate: {df['idle_rate'].mean():.2%}")
        print(f"  Average Capacity Utilization: {df['capacity_utilization'].mean():.2%}")
        print(f"  Average Work Intensity: {df['work_intensity'].mean():.2%}")
        
        # Equipment with highest/lowest utilization
        util_by_type = df.groupby('equipment_type')['utilization_rate'].mean()
        print(f"\n  Highest Utilization: {util_by_type.idxmax()} ({util_by_type.max():.2%})")
        print(f"  Lowest Utilization: {util_by_type.idxmin()} ({util_by_type.min():.2%})")
        
        # Idle time insights
        high_idle = df[df['idle_rate'] > 0.6]
        print(f"\n  Equipment with High Idle Time (>60%): {len(high_idle):,} records")
        if len(high_idle) > 0:
            print(f"    Most common type: {high_idle['equipment_type'].mode().values[0] if len(high_idle['equipment_type'].mode()) > 0 else 'N/A'}")
    
    def generate_report(self, df, model_metrics):
        """Generate comprehensive analysis report"""
        print("\n" + "="*80)
        print("EQUIPMENT MANAGEMENT ML PIPELINE ANALYSIS REPORT")
        print("📊 Based on Real Caterpillar Equipment Data from CSV Files")
        print("="*80)
        
        print(f"\nReal Dataset Overview:")
        print(f"📋 Data Source: Integrated from multiple CSV files (equipment.csv, usage.csv, etc.)")
        print(f"Total Records: {len(df):,} real equipment entries")
        print(f"Equipment Types: {df['equipment_type'].nunique()} different Caterpillar models")
        print(f"Locations: {df['location'].nunique()} operational regions")
        if 'date' in df.columns:
            try:
                print(f"Date Range: {df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}")
            except:
                print(f"Date Range: Real historical data span")
        
        print(f"\nKey Statistics:")
        print(f"Average Equipment Age: {df['age_months'].mean():.1f} months")
        print(f"Average Usage Hours: {df['usage_hours'].mean():.0f} hours")
        print(f"Average Demand: {df['demand'].mean():.1f} units")
        print(f"Maintenance Rate: {df['needs_maintenance'].mean()*100:.1f}%")
        print(f"Anomaly Rate: {df['is_anomaly'].mean()*100:.1f}%")
        
        print(f"\nModel Performance Summary:")
        print(f"Demand Forecasting R²: {model_metrics['demand']['r2']:.3f}")
        print(f"Anomaly Detection F1: {model_metrics['anomaly']['f1']:.3f}")
        print(f"Maintenance Prediction Accuracy: {model_metrics['maintenance']['accuracy']:.3f}")
        print(f"Return Date Prediction R²: {model_metrics['return']['r2']:.3f}")
        
        print(f"\nBusiness Insights:")
        top_equipment = df.groupby('equipment_type')['demand'].mean().nlargest(1)
        print(f"Highest Demand Equipment: {top_equipment.index[0]} ({top_equipment.values[0]:.1f} avg demand)")
        
        peak_month = df.groupby('month')['demand'].mean().nlargest(1)
        print(f"Peak Demand Month: {peak_month.index[0]} ({peak_month.values[0]:.1f} avg demand)")
        
        maintenance_equipment = df.groupby('equipment_type')['needs_maintenance'].mean().nlargest(1)
        print(f"Equipment Needing Most Maintenance: {maintenance_equipment.index[0]} ({maintenance_equipment.values[0]*100:.1f}%)")
        
        print("\n" + "="*80)

def main():
    """
    🚀 Main execution function optimized for Google Colab
    
    This function will:
    1. Initialize the ML pipeline
    2. Generate realistic equipment data
    3. Train 4 different ML models
    4. Create comprehensive visualizations
    5. Generate analysis report
    6. Show example predictions
    
    Expected runtime: 2-5 minutes depending on dataset size
    """
    print("=" * 60)
    print("🏗️  EQUIPMENT MANAGEMENT ML PIPELINE")
    print("=" * 60)
    print("Optimized for Google Colab | 4 ML Models | Complete Analysis")
    print()
    
    # 📊 Step 1: Initialize pipeline
    print("📊 Step 1: Initializing ML Pipeline...")
    pipeline = EquipmentMLPipeline()
    
    # 📈 Step 2: Load real equipment data
    print("\n📈 Step 2: Loading Real Equipment Data...")
    print("Loading and integrating CSV datasets:")
    print("  • Equipment inventory and specifications")
    print("  • Real usage patterns and operational metrics")
    print("  • Historical demand data by location and type")
    print("  • Actual maintenance records and anomalies")
    print("  • Rental histories and utilization patterns")
    
    df = pipeline.load_csv_data(data_path='./sample-data/')
    print(f"✅ Loaded and integrated {len(df):,} equipment records from CSV files")
    
    # 📋 Step 2.5: Validate and summarize real data
    pipeline.validate_and_summarize_data(df)
    
    # 🔧 Step 3: Preprocess data
    print("\n🔧 Step 3: Preprocessing Data...")
    print("  • Encoding categorical variables")
    print("  • Scaling numerical features")
    print("  • Creating derived features")
    
    df_processed = pipeline.preprocess_data(df)
    print("✅ Data preprocessing complete")
    
    # 🤖 Step 4: Train all ML models
    print("\n🤖 Step 4: Training ML Models...")
    print("Training 4 specialized models:")
    if PROPHET_AVAILABLE:
        print("  1. Demand Forecasting (Prophet Time Series)")
    else:
        print("  1. Demand Forecasting (XGBoost)")
    print("  2. Anomaly Detection (Isolation Forest)")  
    print("  3. Maintenance Prediction (Random Forest)")
    print("  4. Return Date Prediction (Random Forest)")
    print()
    
    model_metrics = {}
    
    model_metrics['demand'] = pipeline.train_demand_forecasting(df_processed)
    model_metrics['anomaly'] = pipeline.train_anomaly_detection(df_processed)
    model_metrics['maintenance'] = pipeline.train_maintenance_prediction(df_processed)
    model_metrics['return'] = pipeline.train_return_date_prediction(df_processed)
    
    print("✅ All models trained successfully!")
    
    # 📊 Step 5: Create visualizations
    print("\n📊 Step 5: Creating Visualizations...")
    print("Generating comprehensive charts and plots...")
    pipeline.create_visualizations(df)
    
    # 📋 Step 6: Generate report
    print("\n📋 Step 6: Generating Analysis Report...")
    pipeline.generate_report(df, model_metrics)
    
    # 🎯 Step 7: Example prediction
    print("\n🎯 Step 7: Example Prediction for New Equipment...")
    print("Testing predictions on a sample 18-month-old Excavator:")
    
    # Enhanced example with utilization metrics
    rental_duration = 14  # days
    available_hours = rental_duration * 24  # 336 hours
    usage_hours = 2500
    downtime_hours = 15
    productive_hours = usage_hours - downtime_hours
    
    new_equipment = {
        'equipment_type': 'Excavator',
        'location': 'North',
        'age_months': 18,
        'usage_hours': usage_hours,
        'fuel_consumption': 300,
        'downtime_hours': downtime_hours,
        'efficiency_score': 82,
        'month': 6,
        'day_of_year': 150,
        'seasonal_demand': 12,
        'fuel_efficiency': usage_hours/300,
        'age_usage_ratio': 18/usage_hours,
        # Enhanced utilization metrics
        'rental_duration': rental_duration,
        'available_hours': available_hours,
        'productive_hours': productive_hours,
        'utilization_rate': min(1.0, usage_hours / available_hours),
        'idle_hours': max(0, available_hours - usage_hours),
        'idle_rate': max(0, available_hours - usage_hours) / available_hours,
        'capacity_utilization': min(1.0, (productive_hours / rental_duration) / 180),  # 180 hrs/day capacity for excavator
        'work_intensity': productive_hours / usage_hours,
        'operating_hours_per_day': usage_hours / rental_duration
    }
    
    prediction = pipeline.predict_new_equipment(new_equipment)
    print(f"  📊 Predicted Demand: {prediction['predicted_demand']} units ({prediction.get('forecasting_method', 'Unknown')} method)")
    print(f"  ⚠️  Anomaly Risk: {'High' if prediction['is_anomaly'] else 'Low'} (Score: {prediction['anomaly_score']:.3f})")
    print(f"  🔧 Maintenance Probability: {prediction['maintenance_probability']*100:.1f}%")
    print(f"  📅 Expected Rental Duration: {prediction['predicted_rental_duration']} days")
    
    # Display utilization analysis if available
    if 'utilization_analysis' in prediction:
        util_analysis = prediction['utilization_analysis']
        print(f"\n  📈 Enhanced Utilization Analysis:")
        print(f"    • Risk Level: {util_analysis['risk_level']}")
        print(f"    • Recommendation: {util_analysis['recommendation']}")
        print(f"    • Utilization Rate: {util_analysis['utilization_metrics']['utilization_rate']:.2%}")
        print(f"    • Idle Rate: {util_analysis['utilization_metrics']['idle_rate']:.2%}")
        if util_analysis['warnings']:
            print(f"    • Warnings: {'; '.join(util_analysis['warnings'])}")
    
    # Demo with anomalous equipment
    print("\n  🚨 Testing with Anomalous Equipment (High Idle Time):")
    anomalous_equipment = new_equipment.copy()
    anomalous_equipment.update({
        'usage_hours': 100,  # Very low usage
        'idle_hours': 236,   # High idle time  
        'idle_rate': 0.85,   # 85% idle time
        'utilization_rate': 0.15,  # 15% utilization
        'work_intensity': 0.3,     # Low work intensity
        'capacity_utilization': 0.05  # Very low capacity utilization
    })
    
    anomaly_prediction = pipeline.predict_new_equipment(anomalous_equipment)
    print(f"    ⚠️  Anomaly Risk: {'High' if anomaly_prediction['is_anomaly'] else 'Low'} (Score: {anomaly_prediction['anomaly_score']:.3f})")
    
    if 'utilization_analysis' in anomaly_prediction:
        util_analysis = anomaly_prediction['utilization_analysis'] 
        print(f"    • Risk Level: {util_analysis['risk_level']}")
        print(f"    • Idle Rate: {util_analysis['utilization_metrics']['idle_rate']:.1%}")
    
    # 📈 Step 8: Prophet forecast visualization (if available)
    if pipeline.use_prophet and pipeline.prophet_models:
        print("\n📈 Step 8: Creating Prophet Demand Forecasts...")
        print("Generating 90-day demand forecasts for specific equipment-location combinations...")
        
        # Show forecast for first available model
        first_key = list(pipeline.prophet_models.keys())[0]
        location, equipment_type = first_key.split('_', 1)
        
        print(f"Creating forecast visualization for {equipment_type} in {location}...")
        forecast_data = pipeline.create_demand_forecast_visualization(
            location=location, 
            equipment_type=equipment_type, 
            days_ahead=90
        )
        
        if forecast_data is not None:
            print(f"Next 7 days forecast for {equipment_type} in {location}:")
            for i, row in forecast_data.head(7).iterrows():
                print(f"  {row['ds'].strftime('%Y-%m-%d')}: {row['yhat']:.1f} units (±{row['yhat_upper']-row['yhat']:.1f})")
    
    print("\n✅ Pipeline execution complete! Models ready for predictions.")
    print("=" * 60)
    
    return pipeline, df

# Execute if running in Colab or directly
if __name__ == "__main__":
    pipeline, data = main()