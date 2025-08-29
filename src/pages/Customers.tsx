import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Building, Phone, Mail, MapPin, Star } from "lucide-react";
import { customersApi } from "@/services/api";
import { Customer } from "@/types";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then(res => res.data)
  });

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'Corporate': return <Building className="h-4 w-4" />;
      case 'Government': return <MapPin className="h-4 w-4" />;
      case 'Individual': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'Corporate': return 'bg-blue-100 text-blue-800';
      case 'Government': return 'bg-green-100 text-green-800';
      case 'Individual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreditRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const corporateCustomers = customers.filter((c: Customer) => c.customer_type === 'Corporate');
  const governmentCustomers = customers.filter((c: Customer) => c.customer_type === 'Government');
  const averageCreditRating = customers.reduce((sum: number, c: Customer) => sum + (c.credit_rating || 0), 0) / customers.length;

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
        <h1 className="text-3xl font-bold text-card-foreground">Customer Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer relationships and rental history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Customers</p>
                <p className="text-2xl font-bold text-card-foreground">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Corporate</p>
                <p className="text-2xl font-bold text-card-foreground">{corporateCustomers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Government</p>
                <p className="text-2xl font-bold text-card-foreground">{governmentCustomers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Avg Credit Rating</p>
                <p className="text-2xl font-bold text-card-foreground">{averageCreditRating.toFixed(1)}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search customers..."
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
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add New Customer
            </Button>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Customer</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Contact Person</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Phone</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Location</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Credit Rating</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: Customer) => (
                  <TableRow key={customer.customer_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        {getCustomerTypeIcon(customer.customer_type)}
                        <div>
                          <p className="font-semibold text-card-foreground">{customer.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{customer.customer_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getCustomerTypeColor(customer.customer_type)} border-0`}>
                        {customer.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">{customer.contact_person || 'N/A'}</TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{customer.email || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {customer.city && customer.state ? `${customer.city}, ${customer.state}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Star className={`h-4 w-4 ${getCreditRatingColor(customer.credit_rating || 0)}`} />
                        <span className={`font-semibold ${getCreditRatingColor(customer.credit_rating || 0)}`}>
                          {customer.credit_rating || 0}/10
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                          Rentals
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No customers found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}