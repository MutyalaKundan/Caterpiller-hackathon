import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Building, User, Calendar, Truck } from "lucide-react";
import { sitesApi } from "@/services/api";
import { Site } from "@/types";
import Map from "@/components/Map";
import { format, parseISO } from 'date-fns';

export default function Sites() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesApi.getAll().then(res => res.data)
  });

  const { data: equipmentLocations = [] } = useQuery({
    queryKey: ['equipment-locations'],
    queryFn: () => sitesApi.getEquipmentLocations().then(res => res.data)
  });

  const filteredSites = sites.filter((site: Site) => {
    const matchesSearch = site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.site_manager?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || site.site_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getSiteTypeColor = (type: string) => {
    switch (type) {
      case 'Commercial': return 'bg-blue-100 text-blue-800';
      case 'Infrastructure': return 'bg-green-100 text-green-800';
      case 'Mining': return 'bg-orange-100 text-orange-800';
      case 'Construction': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSiteTypeIcon = (type: string) => {
    switch (type) {
      case 'Commercial': return <Building className="h-4 w-4" />;
      case 'Infrastructure': return <MapPin className="h-4 w-4" />;
      case 'Mining': return <Truck className="h-4 w-4" />;
      case 'Construction': return <Building className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const siteTypes = [...new Set(sites.map((site: Site) => site.site_type))].filter(Boolean) as string[];
  const activeSites = sites.filter((site: Site) => {
    if (site.project_start_date && site.project_end_date) {
      const today = new Date();
      const startDate = parseISO(site.project_start_date);
      const endDate = parseISO(site.project_end_date);
      return today >= startDate && today <= endDate;
    }
    return false;
  });

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
        <h1 className="text-3xl font-bold text-card-foreground">Site Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor project sites and equipment deployment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Sites</p>
                <p className="text-2xl font-bold text-card-foreground">{sites.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-card-foreground">{activeSites.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Equipment Deployed</p>
                <p className="text-2xl font-bold text-card-foreground">{equipmentLocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Locations</p>
                <p className="text-2xl font-bold text-card-foreground">{[...new Set(sites.map(s => s.city))].length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Location Map */}
      <Map equipmentLocations={equipmentLocations} />

      {/* Sites Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Project Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search sites..."
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
                {siteTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add New Site
            </Button>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Site</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Location</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Manager</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Project Period</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Weather Zone</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site: Site) => (
                  <TableRow key={site.site_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        {getSiteTypeIcon(site.site_type)}
                        <div>
                          <p className="font-semibold text-card-foreground">{site.site_name}</p>
                          <p className="text-sm text-muted-foreground">{site.site_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSiteTypeColor(site.site_type)} border-0`}>
                        {site.site_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{site.city && site.state ? `${site.city}, ${site.state}` : 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{site.site_manager || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {site.project_start_date && site.project_end_date ? (
                        <div className="text-sm">
                          <div>{format(parseISO(site.project_start_date), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">to {format(parseISO(site.project_end_date), 'MMM dd, yyyy')}</div>
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-card-foreground">{site.weather_zone || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                          Equipment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSites.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sites found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}