import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { rentalsApi } from "@/services/api";
import { Rental } from "@/types";
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';

export default function Rentals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ['rentals'],
    queryFn: () => rentalsApi.getAll().then(res => res.data)
  });

  const filteredRentals = rentals.filter((rental: Rental) => {
    const matchesSearch = rental.rental_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rental.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rental.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rental.rental_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Returned': return 'bg-blue-100 text-blue-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRentalAlert = (rental: Rental) => {
    if (rental.rental_status === 'Active' && rental.rental_end_date_planned) {
      const endDate = parseISO(rental.rental_end_date_planned);
      const today = new Date();
      const daysUntilReturn = differenceInDays(endDate, today);
      
      if (daysUntilReturn <= 0) {
        return { type: 'overdue', message: 'Overdue!', days: Math.abs(daysUntilReturn) };
      } else if (daysUntilReturn <= 2) {
        return { type: 'warning', message: `Due in ${daysUntilReturn} day${daysUntilReturn === 1 ? '' : 's'}`, days: daysUntilReturn };
      }
    }
    return null;
  };

  const activeRentals = rentals.filter((r: Rental) => r.rental_status === 'Active');
  const overdueRentals = rentals.filter((r: Rental) => r.rental_status === 'Overdue');
  const totalRevenue = rentals.reduce((sum: number, r: Rental) => sum + (r.total_rental_cost || 0), 0);

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
        <h1 className="text-3xl font-bold text-card-foreground">Rental Management</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage equipment rentals and customer agreements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Active Rentals</p>
                <p className="text-2xl font-bold text-card-foreground">{activeRentals.length}</p>
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
                <p className="text-2xl font-bold text-card-foreground">{overdueRentals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Rentals</p>
                <p className="text-2xl font-bold text-card-foreground">{rentals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-card-foreground">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {activeRentals.some((rental: Rental) => getRentalAlert(rental)) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Rental Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeRentals.map((rental: Rental) => {
                const alert = getRentalAlert(rental);
                if (!alert) return null;
                
                return (
                  <div key={rental.rental_id} className={`p-3 rounded-lg ${
                    alert.type === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <p className="font-medium">
                      Equipment {rental.equipment_id} - {alert.message}
                    </p>
                    <p className="text-sm opacity-75">Customer: {rental.customer_id}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rentals Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Rental History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search rentals..."
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Rental ID</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Equipment</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Customer</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Start Date</TableHead>
                  <TableHead className="font-semibold text-card-foreground">End Date</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Duration</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Cost</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRentals.map((rental: Rental) => {
                  const alert = getRentalAlert(rental);
                  return (
                    <TableRow key={rental.rental_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-card-foreground">{rental.rental_id}</TableCell>
                      <TableCell className="text-card-foreground">{rental.equipment_id}</TableCell>
                      <TableCell className="text-card-foreground">{rental.customer_id}</TableCell>
                      <TableCell className="text-card-foreground">
                        {rental.rental_start_date ? format(parseISO(rental.rental_start_date), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-card-foreground">
                        {rental.rental_end_date_planned ? format(parseISO(rental.rental_end_date_planned), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-card-foreground">
                        {rental.rental_duration_planned ? `${rental.rental_duration_planned} days` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-card-foreground">
                        ${rental.total_rental_cost?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(rental.rental_status)} border-0`}>
                          {rental.rental_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alert && (
                          <Badge className={`${
                            alert.type === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          } border-0`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {alert.message}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredRentals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No rentals found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}