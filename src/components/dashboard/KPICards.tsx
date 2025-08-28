import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { DashboardKPIs } from "@/types";

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const kpiData = [
    {
      title: "Total Rented Equipment",
      value: kpis.totalRentedEquipment,
      icon: Truck,
      change: "+12%",
      changeType: "positive" as const,
      description: "Currently deployed assets"
    },
    {
      title: "Active Rentals",
      value: kpis.activeRentals,
      icon: Calendar,
      change: "+8%",
      changeType: "positive" as const,
      description: "Ongoing rental agreements"
    },
    {
      title: "Overdue Rentals",
      value: kpis.overdueRentals,
      icon: AlertTriangle,
      change: "-25%",
      changeType: "negative" as const,
      description: "Past due returns"
    },
    {
      title: "Average Utilization",
      value: `${kpis.averageUtilization}%`,
      icon: TrendingUp,
      change: "+5.2%",
      changeType: "positive" as const,
      description: "Fleet efficiency rate"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi, index) => (
        <Card 
          key={index} 
          className="relative overflow-hidden border-border bg-card hover:shadow-caterpillar transition-smooth"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              {kpi.title}
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <kpi.icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-card-foreground">
                {kpi.value}
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span 
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    kpi.changeType === 'positive' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-muted-foreground">{kpi.description}</span>
              </div>
            </div>
          </CardContent>
          
          {/* Caterpillar Yellow Accent Bar */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-caterpillar" />
        </Card>
      ))}
    </div>
  );
}