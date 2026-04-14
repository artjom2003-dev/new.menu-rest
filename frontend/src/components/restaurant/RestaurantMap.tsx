'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [mapReady, setMapReady] = useState(false);

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

    // Enable scroll zoom on click (hide hint), disable on mouse leave
    map.on('click', () => {
      map.scrollWheelZoom.enable();
      const hint = document.getElementById('map-scroll-hint');
      if (hint) hint.style.opacity = '0';
    });
    map.on('mouseout', () => { map.scrollWheelZoom.disable(); });

    // Zoom controls bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom marker icon with pulse animation
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:40px;height:40px;">
          <div style="
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:40px;height:40px;border-radius:50%;
            background:rgba(255,92,40,0.15);
            animation:marker-pulse 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:32px;height:32px;border-radius:50%;
            background:linear-gradient(135deg,#ff5c28,#e04820);
            border:3px solid white;
            box-shadow:0 2px 12px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
          ">🍽️</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Inject pulse animation
    if (!document.getElementById('marker-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'marker-pulse-style';
      style.textContent = `@keyframes marker-pulse{0%{transform:translate(-50%,-50%) scale(1);opacity:0.6}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}`;
      document.head.appendChild(style);
    }

    const marker = L.marker([lat, lng], { icon }).addTo(map);

    if (address) {
      marker.bindPopup(
        `<div style="font-size:13px;font-weight:600;max-width:200px;line-height:1.3">${name}</div>` +
        `<div style="font-size:11px;color:#666;margin-top:3px;line-height:1.4">${address}</div>`,
        { closeButton: false, offset: [0, -12], className: 'restaurant-popup' }
      );
      // Open popup by default so address is visible
      marker.openPopup();
    }

    // Small attribution in corner
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('<a href="https://osm.org" target="_blank" rel="noopener" style="font-size:9px;color:#999">OSM</a>')
      .addTo(map);

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [lat, lng, name, address]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-[16px] overflow-hidden border"
        style={{ aspectRatio: '16 / 9', minHeight: 180, maxHeight: 280, borderColor: 'var(--card-border)' }}
      />

      {/* Scroll hint overlay — shown until user clicks */}
      {mapReady && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] pointer-events-none opacity-60 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)' }}
          id="map-scroll-hint"
        >
          Нажмите на карту для масштабирования
        </div>
      )}
    </div>
  );
}
