import { useState, useEffect } from "react";
import { KPICards } from "@/components/dashboard/KPICards";
import { EquipmentTable } from "@/components/dashboard/EquipmentTable";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";
import { dashboardApi, equipmentApi, alertsApi } from "@/services/api";
import caterpillarHero from "@/assets/caterpillar-hero.jpg";
import type { DashboardKPIs, EquipmentTableRow, Alert } from "@/types";

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalRentedEquipment: 0,
    activeRentals: 0,
    overdueRentals: 0,
    averageUtilization: 0,
  });
  const [equipment, setEquipment] = useState<EquipmentTableRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [kpisRes, equipmentRes, alertsRes] = await Promise.all([
          dashboardApi.getKPIs(),
          equipmentApi.getAll(),
          alertsApi.getAll({ status: 'Active' })
        ]);
        
        setKpis(kpisRes.data);
        setEquipment(equipmentRes.data);
        setAlerts(alertsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <div 
        className="relative h-64 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${caterpillarHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="relative flex h-full items-center justify-center text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">Smart Asset Dashboard</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Monitor and manage your Caterpillar equipment fleet with real-time insights, 
              predictive maintenance, and advanced analytics
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Page Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Real-time fleet monitoring and analytics
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Last updated</div>
            <div className="text-sm font-medium text-foreground">
              {new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards kpis={kpis} />

        {/* Charts Section */}
        <UtilizationChart />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Equipment Table - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <EquipmentTable equipment={equipment} />
          </div>

          {/* Alerts Panel - Takes up 1 column */}
          <div className="lg:col-span-1">
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}