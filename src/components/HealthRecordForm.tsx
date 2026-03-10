/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HealthRecord, Location } from '../types';
import { Plus, MapPin, Activity } from 'lucide-react';

interface HealthRecordFormProps {
  onAddRecord: (record: Omit<HealthRecord, 'id' | 'timestamp' | 'authorUid'>) => void;
  currentLocation: Location;
  isDarkMode?: boolean;
}

export default function HealthRecordForm({ onAddRecord, currentLocation, isDarkMode }: HealthRecordFormProps) {
  const [patientName, setPatientName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [lat, setLat] = useState(currentLocation.lat.toString());
  const [lng, setLng] = useState(currentLocation.lng.toString());

  // Update local state when prop changes (e.g. geolocation updates)
  React.useEffect(() => {
    setLat(currentLocation.lat.toString());
    setLng(currentLocation.lng.toString());
  }, [currentLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRecord({
      patientName,
      symptoms: symptoms.split(',').map(s => s.trim()),
      diagnosis,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      severity,
    });
    setPatientName('');
    setSymptoms('');
    setDiagnosis('');
    setSeverity('LOW');
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Add New Health Record</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Patient Name</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
            }`}
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Symptoms (comma separated)</label>
          <input
            type="text"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
            }`}
            placeholder="Fever, Cough, Fatigue"
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Diagnosis</label>
          <input
            type="text"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
            }`}
            placeholder="Viral Fever"
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Latitude</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                required
              />
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Longitude</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
                required
              />
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Record
        </button>
      </form>
    </div>
  );
}
