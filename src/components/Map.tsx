import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Truck, Settings } from 'lucide-react';

interface MapProps {
  equipmentLocations?: Array<{
    equipment_id: string;
    equipment_name: string;
    latitude: number;
    longitude: number;
    status: string;
    equipment_type: string;
  }>;
}

const Map: React.FC<MapProps> = ({ equipmentLocations = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenSet, setIsTokenSet] = useState(false);

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'Available': return '#22c55e'; // green
      case 'Rented': return '#FFCC00'; // yellow
      case 'Maintenance': return '#f97316'; // orange
      case 'Out of Service': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-95.3698, 29.7604], // Houston, TX
      zoom: 10,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add equipment markers
    equipmentLocations.forEach((equipment) => {
      if (equipment.latitude && equipment.longitude) {
        // Create custom marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.style.width = '30px';
        markerEl.style.height = '30px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = getMarkerColor(equipment.status);
        markerEl.style.border = '3px solid white';
        markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerEl.style.cursor = 'pointer';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        markerEl.innerHTML = '🚜';
        markerEl.style.fontSize = '16px';

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-3">
            <h3 class="font-bold text-sm mb-2">${equipment.equipment_name}</h3>
            <p class="text-xs text-gray-600 mb-1">ID: ${equipment.equipment_id}</p>
            <p class="text-xs text-gray-600 mb-1">Type: ${equipment.equipment_type}</p>
            <p class="text-xs">
              Status: <span class="font-medium" style="color: ${getMarkerColor(equipment.status)}">${equipment.status}</span>
            </p>
          </div>
        `);

        new mapboxgl.Marker(markerEl)
          .setLngLat([equipment.longitude, equipment.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });
  };

  useEffect(() => {
    if (isTokenSet && mapboxToken) {
      initializeMap();
    }

    return () => {
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken, equipmentLocations]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setIsTokenSet(true);
    }
  };

  if (!isTokenSet) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-card-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Equipment Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">Mapbox Token Required</h4>
              <p className="text-sm text-yellow-700 mb-3">
                To display the equipment location map, please enter your Mapbox public token.
                You can get your token from{' '}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  mapbox.com
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your Mapbox public token"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleTokenSubmit}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Set Token
                </Button>
              </div>
            </div>
            
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Map will display equipment locations once token is set
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {equipmentLocations.length} equipment locations ready to display
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Equipment Location Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div ref={mapContainer} className="h-96 w-full rounded-lg shadow-lg" />
          
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
            <h4 className="font-semibold text-sm mb-2">Equipment Status</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#FFCC00'}}></div>
                <span>Rented</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span>Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Out of Service</span>
              </div>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
            <div className="text-sm">
              <p className="font-semibold">Equipment on Map</p>
              <p className="text-muted-foreground">{equipmentLocations.length} units</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Map;