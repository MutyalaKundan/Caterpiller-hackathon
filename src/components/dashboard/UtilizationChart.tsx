import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Mock data for utilization trends
const utilizationData = [
  { month: 'Jan', utilization: 72, rentals: 15 },
  { month: 'Feb', utilization: 68, rentals: 12 },
  { month: 'Mar', utilization: 81, rentals: 18 },
  { month: 'Apr', utilization: 78, rentals: 16 },
  { month: 'May', utilization: 85, rentals: 22 },
  { month: 'Jun', utilization: 92, rentals: 24 },
  { month: 'Jul', utilization: 88, rentals: 21 },
  { month: 'Aug', utilization: 94, rentals: 26 },
  { month: 'Sep', utilization: 87, rentals: 23 },
  { month: 'Oct', utilization: 83, rentals: 19 },
  { month: 'Nov', utilization: 79, rentals: 17 },
  { month: 'Dec', utilization: 82, rentals: 20 }
];

const maintenanceData = [
  { month: 'Jan', preventive: 8, corrective: 3, emergency: 1 },
  { month: 'Feb', preventive: 6, corrective: 4, emergency: 0 },
  { month: 'Mar', preventive: 9, corrective: 2, emergency: 1 },
  { month: 'Apr', preventive: 7, corrective: 5, emergency: 2 },
  { month: 'May', preventive: 10, corrective: 3, emergency: 0 },
  { month: 'Jun', preventive: 12, corrective: 4, emergency: 1 },
  { month: 'Jul', preventive: 8, corrective: 6, emergency: 3 },
  { month: 'Aug', preventive: 11, corrective: 2, emergency: 0 },
  { month: 'Sep', preventive: 9, corrective: 4, emergency: 1 },
  { month: 'Oct', preventive: 7, corrective: 5, emergency: 2 },
  { month: 'Nov', preventive: 8, corrective: 3, emergency: 1 },
  { month: 'Dec', preventive: 10, corrective: 4, emergency: 0 }
];

export function UtilizationChart() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Equipment Utilization Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="utilization" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Maintenance Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maintenanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--card-foreground))' }}
              />
              <Bar dataKey="preventive" stackId="a" fill="hsl(var(--primary))" name="Preventive" />
              <Bar dataKey="corrective" stackId="a" fill="hsl(var(--accent))" name="Corrective" />
              <Bar dataKey="emergency" stackId="a" fill="hsl(var(--destructive))" name="Emergency" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}