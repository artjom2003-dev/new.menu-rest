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

  const openInMaps = () => {
    // Try Yandex Maps for Russian users, Google Maps as universal fallback
    const yandexUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map&text=${encodeURIComponent(name)}`;
    window.open(yandexUrl, '_blank', 'noopener');
  };

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

      {/* Open in maps button */}
      <button
        onClick={openInMaps}
        className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer border-none transition-all hover:scale-105"
        style={{
          background: 'rgba(255,255,255,0.92)',
          color: '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Открыть в Яндекс Картах
      </button>
    </div>
  );
}
