import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Eye, MapPin } from "lucide-react";
import { EquipmentTableRow } from "@/types";

interface EquipmentTableProps {
  equipment: EquipmentTableRow[];
}

export function EquipmentTable({ equipment }: EquipmentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = 
      item.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === "all" || item.equipment_type.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Available': { variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-200' },
      'Rented': { variant: 'default' as const, className: 'bg-primary/20 text-primary hover:bg-primary/30' },
      'Maintenance': { variant: 'default' as const, className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
      'Out of Service': { variant: 'default' as const, className: 'bg-red-100 text-red-800 hover:bg-red-200' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Available'];
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const uniqueTypes = [...new Set(equipment.map(item => item.equipment_type))];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-card-foreground">Equipment Inventory</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out of service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-muted-foreground">Equipment ID</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Name & Type</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Customer/Site</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Rental Period</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Runtime</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Utilization</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.equipment_id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">
                    {item.equipment_id}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-card-foreground">{item.equipment_name}</div>
                      <div className="text-sm text-muted-foreground">{item.equipment_type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell>
                    {item.customer_name ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{item.customer_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {item.site_name}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.rental_start_date ? (
                      <div className="space-y-1">
                        <div className="text-sm">{formatDate(item.rental_start_date)}</div>
                        <div className="text-xs text-muted-foreground">to {formatDate(item.rental_end_date_planned)}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.runtime_hours_total ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{item.runtime_hours_total.toFixed(1)}h</div>
                        <div className="text-xs text-muted-foreground">
                          Idle: {item.idle_hours?.toFixed(1) || 0}h
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.utilization_rate ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.utilization_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium min-w-[40px]">
                          {item.utilization_rate.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">0%</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="h-8">
                      <Eye className="h-4 w-4 mr-1" />
                      View
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
  );
}