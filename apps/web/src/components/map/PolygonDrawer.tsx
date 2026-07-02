'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

interface Props {
  initialPolygon?: object | null;
  onPolygonChange: (geoJson: object | null) => void;
  center?: [number, number]; // [lat, lng]
}

export function PolygonDrawer({ initialPolygon, onPolygonChange, center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const drawnRef     = useRef<L.FeatureGroup | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);
  const watchRef     = useRef<number | null>(null);
  const [hasPolygon, setHasPolygon] = useState(!!initialPolygon);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    delete (containerRef.current as any)._leaflet_id;

    import('leaflet-draw').then(() => {
      if (!containerRef.current || mapRef.current) return;
      const defaultCenter: [number, number] = center ?? [13.7563, 100.5018];
      const map = L.map(containerRef.current!, { center: defaultCenter, zoom: 16 });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── "You are here" blue pulsing dot ──────────────────────────────────
      const youIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:20px;height:20px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:pulse-ring 1.5s ease-out infinite"></div>
          <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
        </div>
        <style>@keyframes pulse-ring{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.2);opacity:0}}</style>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const youMarker = L.marker(defaultCenter, { icon: youIcon, zIndexOffset: 1000 })
        .bindTooltip('📍 ตำแหน่งคุณ', { permanent: false, direction: 'top' })
        .addTo(map);
      markerRef.current = youMarker;

      // Watch GPS and move marker live
      if (navigator.geolocation) {
        watchRef.current = navigator.geolocation.watchPosition(
          ({ coords }) => {
            const ll: [number, number] = [coords.latitude, coords.longitude];
            youMarker.setLatLng(ll);
          },
          () => {},
          { enableHighAccuracy: true },
        );
      }

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnRef.current = drawnItems;

      if (initialPolygon) {
        const layer = L.geoJSON(initialPolygon as any);
        layer.eachLayer((l) => drawnItems.addLayer(l));
        map.fitBounds(drawnItems.getBounds(), { padding: [40, 40] });
      }

      const drawControl = new (L as any).Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
          polygon:      { allowIntersection: false, showArea: true },
          rectangle:    false,
          circle:       false,
          marker:       false,
          polyline:     false,
          circlemarker: false,
        },
      });
      map.addControl(drawControl);

      const emit = () => {
        const geoJson = drawnItems.toGeoJSON();
        const features = (geoJson as any).features ?? [];
        onPolygonChange(features.length > 0 ? features[0].geometry : null);
        setHasPolygon(features.length > 0);
      };

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        emit();
      });
      map.on((L as any).Draw.Event.EDITED, emit);
      map.on((L as any).Draw.Event.DELETED, () => {
        onPolygonChange(null);
        setHasPolygon(false);
      });

      mapRef.current = map;
    });

    return () => {
      if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      if (containerRef.current) delete (containerRef.current as any)._leaflet_id;
    };
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const ll: [number, number] = [coords.latitude, coords.longitude];
        markerRef.current?.setLatLng(ll);
        mapRef.current?.setView(ll, 17);
      },
      () => alert('ไม่สามารถดึงตำแหน่งได้'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height: '400px', width: '100%' }} className="rounded-xl overflow-hidden border" />
      <button
        type="button"
        onClick={locateMe}
        title="ตำแหน่งปัจจุบัน"
        className="absolute bottom-4 right-4 z-[1000] bg-white border border-slate-300 shadow-md
                   rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50
                   flex items-center gap-1.5"
      >
        📍 ตำแหน่งฉัน
      </button>
      {!hasPolygon && (
        <div className="absolute inset-0 flex items-end justify-center pb-14 pointer-events-none">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-sm text-slate-600 shadow">
            🖊️ กดปุ่ม polygon ซ้ายบนแผนที่เพื่อวาดขอบเขต Area
          </div>
        </div>
      )}
    </div>
  );
}
