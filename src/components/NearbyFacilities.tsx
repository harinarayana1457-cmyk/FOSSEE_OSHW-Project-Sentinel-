/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Facility } from '../services/geminiService';
import { Hospital, MapPin, ExternalLink, Navigation, Info } from 'lucide-react';

interface NearbyFacilitiesProps {
  facilities: Facility[];
  loading: boolean;
  isDarkMode?: boolean;
}

export default function NearbyFacilities({ facilities, loading, isDarkMode }: NearbyFacilitiesProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors h-full flex flex-col ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Hospital className="w-5 h-5 text-indigo-600" />
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Nearby Healthcare Facilities</h3>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className={`w-3 h-3 border-2 rounded-full animate-spin ${isDarkMode ? 'border-zinc-700 border-t-zinc-500' : 'border-zinc-200 border-t-zinc-400'}`}></div>
            <span>Searching...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {facilities.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">No facilities found for current records.</p>
            <p className="text-xs mt-1">Try adding more health records to see recommendations.</p>
          </div>
        ) : (
          facilities.map((facility, index) => (
            <div 
              key={index}
              className={`p-4 rounded-xl border transition-all hover:shadow-md group ${
                isDarkMode ? 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className={`font-bold text-sm transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{facility.name}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    facility.type.toLowerCase().includes('hospital') 
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                      : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                  }`}>
                    {facility.type}
                  </span>
                </div>
                <a 
                  href={facility.mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5" />
                  <p className="text-xs text-zinc-500 leading-relaxed">{facility.address}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Landmark: <span className="font-normal opacity-80">{facility.landmark}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 mt-2">
                  <span className="text-[10px] text-zinc-400 font-medium">Distance: {facility.distance}</span>
                  <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{facility.diseaseSpecialty}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
