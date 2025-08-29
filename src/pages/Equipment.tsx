import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Settings, Truck, Activity, Calendar } from "lucide-react";
import { equipmentApi } from "@/services/api";
import { Equipment as EquipmentType } from "@/types";

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.getAll().then(res => res.data)
  });

  const filteredEquipment = equipment.filter((item: EquipmentType) => {
    const matchesSearch = item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.equipment_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.equipment_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'Rented': return 'bg-primary/10 text-primary';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      case 'Out of Service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEquipmentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'excavator': return '🚜';
      case 'wheel loader': return '🏗️';
      case 'bulldozer': return '🚧';
      case 'motor grader': return '🛣️';
      case 'compressor': return '⚙️';
      case 'backhoe loader': return '🚜';
      case 'off-highway truck': return '🚛';
      default: return '🏗️';
    }
  };

  const equipmentTypes = [...new Set(equipment.map((item: EquipmentType) => item.equipment_type))].filter(Boolean) as string[];

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
        <h1 className="text-3xl font-bold text-card-foreground">Equipment Fleet</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage your Caterpillar equipment inventory
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Equipment</p>
                <p className="text-2xl font-bold text-card-foreground">{equipment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Available</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {equipment.filter((item: EquipmentType) => item.status === 'Available').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Rented</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {equipment.filter((item: EquipmentType) => item.status === 'Rented').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {equipment.filter((item: EquipmentType) => item.status === 'Maintenance').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Equipment Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-72"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Rented">Rented</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Out of Service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Table */}
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Equipment</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Model</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Serial Number</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Year</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Value</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item: EquipmentType) => (
                  <TableRow key={item.equipment_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getEquipmentIcon(item.equipment_type)}</span>
                        <div>
                          <p className="font-semibold text-card-foreground">{item.equipment_name}</p>
                          <p className="text-sm text-muted-foreground">{item.equipment_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">{item.equipment_type}</TableCell>
                    <TableCell className="text-card-foreground">{item.model_number}</TableCell>
                    <TableCell className="text-card-foreground">{item.serial_number}</TableCell>
                    <TableCell className="text-card-foreground">{item.year_manufactured}</TableCell>
                    <TableCell className="text-card-foreground">
                      ${item.equipment_value?.toLocaleString() || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(item.status)} border-0`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEquipment.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No equipment found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}