/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OutbreakAlert } from '../types';
import { AlertTriangle, Info, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { getPrecautionaryMeasures, PrecautionaryData } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ExternalLink, HeartPulse, Map as MapIcon } from 'lucide-react';

interface AlertsPanelProps {
  alerts: OutbreakAlert[];
  isDarkMode?: boolean;
}

export default function AlertsPanel({ alerts, isDarkMode }: AlertsPanelProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, PrecautionaryData>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const handleExpand = async (alert: OutbreakAlert) => {
    if (expandedAlert === alert.id) {
      setExpandedAlert(null);
      return;
    }

    setExpandedAlert(alert.id);

    if (!recommendations[alert.id]) {
      setLoading(alert.id);
      try {
        const measures = await getPrecautionaryMeasures(alert);
        setRecommendations(prev => ({ ...prev, [alert.id]: measures }));
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(null);
      }
    }
  };

  const handleTestAlert = async () => {
    if (!auth.currentUser) return;
    const testAlert: Omit<OutbreakAlert, 'id'> = {
      disease: 'Test Virus',
      location: 'Simulated Outbreak Area',
      riskLevel: 'HIGH',
      description: 'This is a simulated high-risk alert to test the notification system.',
      timestamp: new Date().toISOString(),
      coordinates: { lat: 0, lng: 0 }
    };
    
    try {
      await addDoc(collection(db, 'alerts'), testAlert);
    } catch (error) {
      console.error("Failed to create test alert:", error);
    }
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Outbreak Alerts & Notifications</h3>
        </div>
        <button 
          onClick={handleTestAlert}
          className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
            isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Test Notification
        </button>
      </div>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">No active outbreak alerts identified.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                alert.riskLevel === 'HIGH'
                  ? (isDarkMode ? 'border-rose-900/50 bg-rose-950/20' : 'border-rose-100 bg-rose-50/30')
                  : alert.riskLevel === 'MEDIUM'
                  ? (isDarkMode ? 'border-amber-900/50 bg-amber-950/20' : 'border-amber-100 bg-amber-50/30')
                  : (isDarkMode ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-emerald-100 bg-emerald-50/30')
              }`}
            >
              <button
                onClick={() => handleExpand(alert)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      alert.riskLevel === 'HIGH'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                        : alert.riskLevel === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-medium transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{alert.disease} in {alert.location}</h4>
                    <p className="text-xs text-zinc-500">
                      Risk Level: <span className="font-semibold">{alert.riskLevel}</span> • {new Date(alert.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {expandedAlert === alert.id ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </button>
              {expandedAlert === alert.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className={`h-px mb-4 transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200/50'}`}></div>
                  <p className={`text-sm mb-4 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>{alert.description}</p>
                    <div className={`rounded-lg p-4 border transition-colors ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-white/80 border-zinc-100'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <HeartPulse className="w-4 h-4 text-rose-500" />
                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Remedies, Tips & Facilities (AI + Maps)
                        </h5>
                      </div>
                      
                      {loading === alert.id ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDarkMode ? 'border-zinc-700 border-t-zinc-500' : 'border-zinc-200 border-t-zinc-400'}`}></div>
                          <span>Analyzing data & finding nearby facilities...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className={`markdown-body text-sm leading-relaxed transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
                            <ReactMarkdown>{recommendations[alert.id]?.content || "No recommendations available."}</ReactMarkdown>
                          </div>

                          {recommendations[alert.id]?.sources && recommendations[alert.id].sources.length > 0 && (
                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-700">
                              <div className="flex items-center gap-2 mb-3">
                                <MapIcon className="w-3 h-3 text-indigo-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nearby Facilities on Google Maps</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recommendations[alert.id].sources.map((source, idx) => (
                                  <a 
                                    key={idx}
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                                      isDarkMode 
                                        ? 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-white' 
                                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}
                                  >
                                    <span className="truncate font-medium">{source.title}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
