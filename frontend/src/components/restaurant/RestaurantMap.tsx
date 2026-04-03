'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export function RestaurantMap({ lat, lng, name, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
    }).addTo(map);

    // Custom marker icon
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:linear-gradient(135deg,#ff5c28,#e04820);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
      ">🍽️</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    if (address) {
      marker.bindPopup(
        `<div style="font-size:12px;font-weight:600;max-width:180px">${name}</div>` +
        `<div style="font-size:11px;color:#666;margin-top:2px">${address}</div>`,
        { closeButton: false, offset: [0, -10] }
      );
    }

    // Small attribution in corner
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('<a href="https://osm.org" target="_blank" rel="noopener" style="font-size:9px;color:#999">OSM</a>')
      .addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [lat, lng, name, address]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-[12px] overflow-hidden border"
      style={{ height: 160, borderColor: 'var(--card-border)' }}
    />
  );
}
