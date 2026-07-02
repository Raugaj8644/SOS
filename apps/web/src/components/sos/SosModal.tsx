'use client';
import { useState } from 'react';
import { X, AlertTriangle, Flame, Siren, UserX, Eye, Stethoscope } from 'lucide-react';

const INCIDENT_TYPES = [
  { value: 'medical_emergency', label: 'Medical Emergency', icon: '🏥', color: 'border-red-500 bg-red-50' },
  { value: 'injury',           label: 'Injury',            icon: '🩹', color: 'border-orange-500 bg-orange-50' },
  { value: 'fire',             label: 'Fire',              icon: '🔥', color: 'border-red-600 bg-red-50' },
  { value: 'violence',         label: 'Violence',          icon: '⚠️',  color: 'border-purple-600 bg-purple-50' },
  { value: 'missing_person',   label: 'Missing Person',    icon: '🔍', color: 'border-yellow-600 bg-yellow-50' },
  { value: 'suspicious_activity', label: 'Suspicious Activity', icon: '👁️', color: 'border-slate-600 bg-slate-50' },
  { value: 'other',            label: 'Other',             icon: '📢', color: 'border-slate-400 bg-slate-50' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (type?: string, description?: string) => void;
  isSubmitting: boolean;
}

export function SosModal({ open, onClose, onSubmit, isSubmitting }: Props) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleSend = () => {
    onSubmit(selectedType ?? 'emergency', description || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">🚨 Send SOS Alert</p>
            <p className="text-red-200 text-sm">Select incident type (optional)</p>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type grid */}
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map(({ value, label, icon, color }) => (
              <button
                key={value}
                onClick={() => setSelectedType(value === selectedType ? null : value)}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all
                  ${selectedType === value
                    ? `${color} border-opacity-100 shadow-sm scale-[0.98]`
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'}
                `}
              >
                <span className="text-xl leading-none">{icon}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>

          {/* Optional description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details (optional)… e.g. 'Person collapsed near food court'"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm
                       text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2
                       focus:ring-red-500 resize-none"
          />

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-300
                         text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
            >
              {isSubmitting ? 'Sending…' : '🚨 SEND SOS'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            All area members and admins will be notified immediately
          </p>
        </div>
      </div>
    </div>
  );
}
