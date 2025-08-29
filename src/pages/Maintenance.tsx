import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, AlertTriangle, Calendar, DollarSign, Clock, CheckCircle } from "lucide-react";
import { maintenanceApi } from "@/services/api";
import { MaintenanceRecord } from "@/types";
import { format, parseISO } from 'date-fns';

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: maintenance = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceApi.getAll().then(res => res.data)
  });

  const { data: upcomingMaintenance = [] } = useQuery({
    queryKey: ['maintenance-upcoming'],
    queryFn: () => maintenanceApi.getUpcoming(30).then(res => res.data)
  });

  const { data: overdueMaintenance = [] } = useQuery({
    queryKey: ['maintenance-overdue'],
    queryFn: () => maintenanceApi.getOverdue().then(res => res.data)
  });

  const filteredMaintenance = maintenance.filter((record: MaintenanceRecord) => {
    const matchesSearch = record.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.technician_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || record.maintenance_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'Preventive': return 'bg-green-100 text-green-800';
      case 'Corrective': return 'bg-orange-100 text-orange-800';
      case 'Emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'Preventive': return <CheckCircle className="h-4 w-4" />;
      case 'Corrective': return <Wrench className="h-4 w-4" />;
      case 'Emergency': return <AlertTriangle className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const totalMaintenanceCost = maintenance.reduce((sum: number, record: MaintenanceRecord) => sum + (record.cost || 0), 0);
  const preventiveMaintenance = maintenance.filter((record: MaintenanceRecord) => record.maintenance_type === 'Preventive');
  const emergencyMaintenance = maintenance.filter((record: MaintenanceRecord) => record.maintenance_type === 'Emergency');

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-card-foreground">Maintenance Management</h1>
        <p className="text-muted-foreground mt-1">
          Track equipment maintenance, schedules, and service history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Records</p>
                <p className="text-2xl font-bold text-card-foreground">{maintenance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-card-foreground">{upcomingMaintenance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Overdue</p>
                <p className="text-2xl font-bold text-card-foreground">{overdueMaintenance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-card-foreground">${totalMaintenanceCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(overdueMaintenance.length > 0 || upcomingMaintenance.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {overdueMaintenance.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueMaintenance.slice(0, 5).map((item: any) => (
                    <div key={item.equipment_id} className="p-3 rounded-lg bg-red-100 text-red-800">
                      <p className="font-medium">Equipment {item.equipment_id}</p>
                      <p className="text-sm opacity-75">
                        Due: {item.next_maintenance_due ? format(parseISO(item.next_maintenance_due), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {upcomingMaintenance.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingMaintenance.slice(0, 5).map((item: any) => (
                    <div key={item.equipment_id} className="p-3 rounded-lg bg-orange-100 text-orange-800">
                      <p className="font-medium">Equipment {item.equipment_id}</p>
                      <p className="text-sm opacity-75">
                        Due: {item.next_maintenance_due ? format(parseISO(item.next_maintenance_due), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Maintenance Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Maintenance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search maintenance records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-72"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Preventive">Preventive</SelectItem>
                <SelectItem value="Corrective">Corrective</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Schedule Maintenance
            </Button>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Equipment ID</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Date</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Description</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Cost</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Duration</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Technician</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Next Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenance.map((record: MaintenanceRecord) => (
                  <TableRow key={record.maintenance_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-card-foreground">{record.equipment_id}</TableCell>
                    <TableCell>
                      <Badge className={`${getMaintenanceTypeColor(record.maintenance_type)} border-0 flex items-center gap-1 w-fit`}>
                        {getMaintenanceTypeIcon(record.maintenance_type)}
                        {record.maintenance_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {record.maintenance_date ? format(parseISO(record.maintenance_date), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-card-foreground max-w-xs truncate" title={record.description || ''}>
                      {record.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      ${record.cost?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{record.duration_hours ? `${record.duration_hours}h` : 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">{record.technician_id || 'N/A'}</TableCell>
                    <TableCell className="text-card-foreground">
                      {record.next_maintenance_due ? format(parseISO(record.next_maintenance_due), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredMaintenance.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No maintenance records found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}