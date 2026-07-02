import { create } from 'zustand';

export interface Incident {
  id: string;
  areaId: string;
  type: string;
  status: 'active' | 'resolved' | 'closed' | 'false';
  severity: string;
  location_geojson?: { coordinates: [number, number] };
  description: string | null;
  createdById: string;
  creatorName?: string;
  responderCount: number;
  createdAt: string;
  resolvedAt: string | null;
}

interface IncidentState {
  incidents: Record<string, Incident[]>; // keyed by areaId
  activeIncident: Incident | null;

  setIncidents: (areaId: string, incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (incidentId: string, updates: Partial<Incident>) => void;
  removeIncident: (areaId: string, incidentId: string) => void;
  setActiveIncident: (incident: Incident | null) => void;
  getAreaIncidents: (areaId: string) => Incident[];
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: {},
  activeIncident: null,

  setIncidents: (areaId, incidents) =>
    set((s) => ({ incidents: { ...s.incidents, [areaId]: incidents } })),

  addIncident: (incident) =>
    set((s) => ({
      incidents: {
        ...s.incidents,
        [incident.areaId]: [incident, ...(s.incidents[incident.areaId] ?? [])],
      },
    })),

  updateIncident: (incidentId, updates) =>
    set((s) => {
      const next = { ...s.incidents };
      for (const areaId in next) {
        next[areaId] = next[areaId].map((i) =>
          i.id === incidentId ? { ...i, ...updates } : i,
        );
      }
      return { incidents: next };
    }),

  removeIncident: (areaId, incidentId) =>
    set((s) => ({
      incidents: {
        ...s.incidents,
        [areaId]: (s.incidents[areaId] ?? []).filter((i) => i.id !== incidentId),
      },
    })),

  setActiveIncident: (incident) => set({ activeIncident: incident }),

  getAreaIncidents: (areaId) => get().incidents[areaId] ?? [],
}));
