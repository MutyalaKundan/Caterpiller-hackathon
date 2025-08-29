import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Activity, Eye, CheckCircle, X, TrendingUp } from "lucide-react";
import { anomaliesApi } from "@/services/api";
import { format, parseISO } from 'date-fns';

interface Anomaly {
  anomaly_id: number;
  equipment_id: string;
  rental_id?: string;
  anomaly_type: string;
  detected_at: string;
  anomaly_score: number;
  description: string;
  baseline_value: number;
  actual_value: number;
  threshold_value: number;
  severity: string;
  status: string;
  resolution_notes?: string;
  resolved_at?: string;
}

export default function Anomalies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => anomaliesApi.getAll().then(res => res.data)
  });

  const filteredAnomalies = anomalies.filter((anomaly: Anomaly) => {
    const matchesSearch = anomaly.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         anomaly.anomaly_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         anomaly.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || anomaly.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || anomaly.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'Investigating': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'False_Positive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnomalyTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'idle_hours': return <Activity className="h-4 w-4" />;
      case 'location': return <Eye className="h-4 w-4" />;
      case 'usage_pattern': return <TrendingUp className="h-4 w-4" />;
      case 'fuel_consumption': return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const openAnomalies = anomalies.filter((a: Anomaly) => a.status === 'Open');
  const criticalAnomalies = anomalies.filter((a: Anomaly) => a.severity === 'Critical');
  const resolvedAnomalies = anomalies.filter((a: Anomaly) => a.status === 'Resolved');
  const avgAnomalyScore = anomalies.reduce((sum: number, a: Anomaly) => sum + (a.anomaly_score || 0), 0) / anomalies.length;

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
        <h1 className="text-3xl font-bold text-card-foreground">Anomaly Detection</h1>
        <p className="text-muted-foreground mt-1">
          Monitor unusual equipment behavior and operational patterns
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold text-card-foreground">{anomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Open Issues</p>
                <p className="text-2xl font-bold text-card-foreground">{openAnomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Critical</p>
                <p className="text-2xl font-bold text-card-foreground">{criticalAnomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Resolved</p>
                <p className="text-2xl font-bold text-card-foreground">{resolvedAnomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Anomalies Alert */}
      {criticalAnomalies.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Anomalies Require Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAnomalies.slice(0, 5).map((anomaly: Anomaly) => (
                <div key={anomaly.anomaly_id} className="p-3 rounded-lg bg-red-100 text-red-800">
                  <p className="font-medium">
                    Equipment {anomaly.equipment_id} - {anomaly.anomaly_type}
                  </p>
                  <p className="text-sm opacity-75">{anomaly.description}</p>
                  <p className="text-sm font-medium">
                    Score: {(anomaly.anomaly_score * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomalies Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground">Anomaly Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search anomalies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-72"
            />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Investigating">Investigating</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="False_Positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-card-foreground">Equipment</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Detected</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Description</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Score</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Values</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Severity</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnomalies.map((anomaly: Anomaly) => (
                  <TableRow key={anomaly.anomaly_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-card-foreground">{anomaly.equipment_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getAnomalyTypeIcon(anomaly.anomaly_type)}
                        <span className="text-card-foreground">{anomaly.anomaly_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      {format(parseISO(anomaly.detected_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-card-foreground max-w-xs truncate" title={anomaly.description}>
                      {anomaly.description}
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              anomaly.anomaly_score > 0.8 ? 'bg-red-600' :
                              anomaly.anomaly_score > 0.6 ? 'bg-orange-600' :
                              anomaly.anomaly_score > 0.4 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{width: `${anomaly.anomaly_score * 100}%`}}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {(anomaly.anomaly_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-card-foreground">
                      <div className="text-xs">
                        <div>Actual: {anomaly.actual_value?.toFixed(2)}</div>
                        <div className="text-muted-foreground">Expected: {anomaly.baseline_value?.toFixed(2)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(anomaly.severity)} border-0`}>
                        {anomaly.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(anomaly.status)} border-0`}>
                        {anomaly.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {anomaly.status === 'Open' && (
                          <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAnomalies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No anomalies found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}