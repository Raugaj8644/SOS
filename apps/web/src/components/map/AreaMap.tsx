'use client';
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '../../stores/incidentStore';

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SafePoint {
  id: string;
  name: string;
  type: string;
  location_geojson: { coordinates: [number, number] };
  description?: string;
}

interface Area {
  id: string;
  name: string;
  polygon?: string; // WKT or GeoJSON
  centroid?: string;
}

interface Props {
  area: Area | null;
  incidents: Incident[];
  safePoints: SafePoint[];
  userPosition: { lat: number; lng: number } | null;
  isAdmin?: boolean;
  onPolygonChange?: (geoJson: object) => void;
}

// ── Icon factories ─────────────────────────────────────────────────────────────
const SAFE_POINT_ICONS: Record<string, string> = {
  toilet:           '🚻',
  medical_station:  '🏥',
  food_court:       '🍽️',
  emergency_exit:   '🚪',
  assembly_point:   '🟢',
  water_station:    '💧',
  parking:          '🅿️',
  aed:              '❤️',
  fire_extinguisher:'🧯',
  information:      'ℹ️',
  other:            '📍',
};

const INCIDENT_ICONS: Record<string, string> = {
  medical_emergency:   '🏥',
  injury:              '🩹',
  fire:                '🔥',
  violence:            '⚠️',
  missing_person:      '🔍',
  suspicious_activity: '👁️',
  emergency:           '🚨',
  other:               '📢',
};

function makeEmojiIcon(emoji: string, size = 32, pulse = false): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:white; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:${size * 0.55}px; box-shadow:0 2px 8px rgba(0,0,0,0.3);
        border:2px solid ${pulse ? '#ef4444' : '#e2e8f0'};
        ${pulse ? 'animation:sos-pulse 1.5s ease-in-out infinite;' : ''}
      ">${emoji}</div>
    `,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    className:  '',
  });
}

export function AreaMap({ area, incidents, safePoints, userPosition, isAdmin, onPolygonChange }: Props) {
  const mapRef    = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{
    polygon?: L.Polygon;
    incidents: Record<string, L.Marker>;
    safePoints: Record<string, L.Marker>;
    userMarker?: L.CircleMarker;
  }>({ incidents: {}, safePoints: {} });

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [13.7563, 100.5018], // Bangkok default
      zoom:   15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Draw Area polygon ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !area?.polygon) return;

    if (layersRef.current.polygon) {
      layersRef.current.polygon.remove();
    }

    try {
      // polygon may arrive as GeoJSON object or JSON string
      const geoJson = typeof area.polygon === 'string'
        ? JSON.parse(area.polygon)
        : area.polygon;

      if (geoJson) {
        const layer = L.geoJSON(geoJson, {
          style: {
            color:       '#dc2626',
            weight:      2.5,
            fillColor:   '#dc2626',
            fillOpacity: 0.08,
            dashArray:   '6 4',
          },
        }).addTo(map);
        layersRef.current.polygon = (layer.getLayers()[0] as L.Polygon);
        map.fitBounds(layer.getBounds(), { padding: [40, 40] });
      }
    } catch {}
  }, [area?.polygon]);

  // ── Update incidents on map ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = layersRef.current.incidents;
    const currentIds = new Set(incidents.map((i) => i.id));

    // Remove stale markers
    for (const id in existing) {
      if (!currentIds.has(id)) { existing[id].remove(); delete existing[id]; }
    }

    // Add/update markers
    for (const incident of incidents) {
      if (!incident.location_geojson) continue;
      const [lng, lat] = incident.location_geojson.coordinates;
      const isActive = incident.status === 'active';
      const emoji = INCIDENT_ICONS[incident.type] ?? '🚨';

      if (!existing[incident.id]) {
        const marker = L.marker([lat, lng], {
          icon:    makeEmojiIcon(emoji, isActive ? 40 : 28, isActive),
          zIndexOffset: isActive ? 1000 : 0,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:180px">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px">
              ${emoji} ${incident.type.replace(/_/g, ' ').toUpperCase()}
            </p>
            ${incident.description ? `<p style="font-size:12px;color:#64748b;margin:0 0 4px">${incident.description}</p>` : ''}
            <p style="font-size:11px;color:#94a3b8;margin:0">
              ${isActive ? '🔴 Active' : '✅ Resolved'} ·
              ${incident.responderCount} responding
            </p>
          </div>
        `);

        existing[incident.id] = marker;
      }
    }
  }, [incidents]);

  // ── Safe point markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = layersRef.current.safePoints;
    const currentIds = new Set(safePoints.map((sp) => sp.id));

    for (const id in existing) {
      if (!currentIds.has(id)) { existing[id].remove(); delete existing[id]; }
    }

    for (const sp of safePoints) {
      if (!sp.location_geojson || existing[sp.id]) continue;
      const [lng, lat] = sp.location_geojson.coordinates;
      const emoji = SAFE_POINT_ICONS[sp.type] ?? '📍';

      const marker = L.marker([lat, lng], { icon: makeEmojiIcon(emoji, 30) }).addTo(map);
      marker.bindPopup(`
        <div>
          <p style="font-weight:700;font-size:13px;margin:0 0 2px">${emoji} ${sp.name}</p>
          <p style="font-size:11px;color:#64748b;margin:0;text-transform:capitalize">
            ${sp.type.replace(/_/g, ' ')}
          </p>
          ${sp.description ? `<p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sp.description}</p>` : ''}
        </div>
      `);

      existing[sp.id] = marker;
    }
  }, [safePoints]);

  // ── User position ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    if (layersRef.current.userMarker) {
      layersRef.current.userMarker.setLatLng([userPosition.lat, userPosition.lng]);
    } else {
      const userIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:24px;height:24px">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:up 1.5s ease-out infinite"></div>
            <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6)"></div>
          </div>
          <style>@keyframes up{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      layersRef.current.userMarker = L.marker(
        [userPosition.lat, userPosition.lng],
        { icon: userIcon as any, zIndexOffset: 2000 },
      ).addTo(map).bindPopup('📍 ตำแหน่งของคุณ') as any;

      // Pan to user on first position
      map.setView([userPosition.lat, userPosition.lng], 17);
    }
  }, [userPosition?.lat, userPosition?.lng]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
  );
}
