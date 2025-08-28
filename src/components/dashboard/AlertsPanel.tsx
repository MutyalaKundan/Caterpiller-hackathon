import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Fuel, MapPin, Wrench, CheckCircle } from "lucide-react";
import { Alert } from "@/types";

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getAlertIcon = (type: string) => {
    const iconMap = {
      'overdue': Clock,
      'maintenance_due': Wrench,
      'low_fuel': Fuel,
      'geofence_violation': MapPin,
      'theft_alert': AlertTriangle,
    };
    return iconMap[type as keyof typeof iconMap] || AlertTriangle;
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      'Low': { className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
      'Medium': { className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
      'High': { className: 'bg-red-100 text-red-800 hover:bg-red-200' },
      'Critical': { className: 'bg-red-600 text-white hover:bg-red-700' }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig['Low'];
    
    return (
      <Badge variant="default" className={config.className}>
        {severity}
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labelMap = {
      'overdue': 'Overdue Return',
      'maintenance_due': 'Maintenance Due',
      'low_fuel': 'Low Fuel',
      'geofence_violation': 'Geofence Violation',
      'theft_alert': 'Theft Alert',
    };
    return labelMap[type as keyof typeof labelMap] || type;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-card-foreground flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-primary" />
            Active Alerts
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {alerts.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">No active alerts</p>
            <p className="text-sm text-muted-foreground">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.alert_type);
              return (
                <div 
                  key={alert.alert_id} 
                  className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/20 transition-smooth"
                >
                  <div className="rounded-full bg-destructive/10 p-2 flex-shrink-0">
                    <AlertIcon className="h-4 w-4 text-destructive" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {getAlertTypeLabel(alert.alert_type)}
                        </span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(alert.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {alert.alert_message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>Equipment: {alert.equipment_id}</span>
                        {alert.rental_id && (
                          <>
                            <span>•</span>
                            <span>Rental: {alert.rental_id}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Acknowledge
                        </Button>
                        <Button variant="default" size="sm" className="h-7 text-xs">
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}