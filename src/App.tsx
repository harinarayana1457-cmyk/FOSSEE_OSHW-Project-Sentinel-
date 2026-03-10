/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { HealthRecord, Location, OutbreakAlert } from './types';
import HeatMap from './components/HeatMap';
import HealthRecordForm from './components/HealthRecordForm';
import AlertsPanel from './components/AlertsPanel';
import PredictiveInsights from './components/PredictiveInsights';
import NearbyFacilities from './components/NearbyFacilities';
import HomeRemedies from './components/HomeRemedies';
import { analyzeOutbreakRisk, predictFutureOutbreaks, PredictiveInsight, searchNearbyFacilities, Facility, generateHomeRemedies, HomeRemedy } from './services/geminiService';
import { Activity, Shield, Map, Bell, Plus, Users, Hospital, Stethoscope, Brain, ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus, Moon, Sun, LogOut } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, orderBy, limit, getDocFromServer, doc } from 'firebase/firestore';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-rose-100">
            <h2 className="text-2xl font-bold text-rose-600 mb-4">Something went wrong</h2>
            <p className="text-zinc-600 mb-6">The application encountered an error. Please try refreshing the page.</p>
            <pre className="bg-zinc-50 p-4 rounded-xl text-xs text-rose-500 overflow-auto max-h-40 mb-6">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Login({ onLogin, isDarkMode }: { onLogin: () => void, isDarkMode: boolean }) {
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [predictiveInsight, setPredictiveInsight] = useState<PredictiveInsight | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [homeRemedies, setHomeRemedies] = useState<HomeRemedy[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [remediesLoading, setRemediesLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location>({ lat: 37.7749, lng: -122.4194 });
  const [loading, setLoading] = useState(false);
  const [predictiveLoading, setPredictiveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'alerts'>('dashboard');
  const [sortConfig, setSortConfig] = useState<{ key: keyof HealthRecord; direction: 'asc' | 'desc' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<OutbreakAlert[]>([]);
  const [lastSeenAlertId, setLastSeenAlertId] = useState<string | null>(null);
  const lastSeenAlertIdRef = useRef<string | null>(null);
  const [geoFilter, setGeoFilter] = useState<{ center: Location; radius: number } | null>(null);

  const getDistance = (loc1: Location, loc2: Location) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredRecords = React.useMemo(() => {
    if (!geoFilter) return records;
    return records.filter(record => getDistance(record.location, geoFilter.center) <= geoFilter.radius);
  }, [records, geoFilter]);

  const filteredAlerts = React.useMemo(() => {
    if (!geoFilter) return alerts;
    return alerts.filter(alert => {
      if (!alert.coordinates) return true; // Show global alerts
      return getDistance(alert.coordinates, geoFilter.center) <= geoFilter.radius;
    });
  }, [alerts, geoFilter]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const q = query(collection(db, 'health_records'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeRecords = onSnapshot(q, (snapshot) => {
      const newRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HealthRecord[];
      setRecords(newRecords);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'health_records');
    });

    const alertsQuery = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const newAlerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OutbreakAlert[];
      
      // Check for new high-risk alerts to notify
      // Use ref to avoid stale closure issues
      const currentLastSeenId = lastSeenAlertIdRef.current;
      
      if (currentLastSeenId !== null) {
        const latestAlert = newAlerts[0];
        if (latestAlert && latestAlert.id !== currentLastSeenId && latestAlert.riskLevel === 'HIGH') {
          setActiveNotifications(prev => [latestAlert, ...prev]);
          
          // Play a subtle notification sound if possible (optional, but good for UX)
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Ignore if blocked by browser
          } catch (e) {}
        }
      }
      
      if (newAlerts.length > 0) {
        const newId = newAlerts[0].id;
        setLastSeenAlertId(newId);
        lastSeenAlertIdRef.current = newId;
      }
      
      setAlerts(newAlerts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts');
    });

    return () => {
      unsubscribeRecords();
      unsubscribeAlerts();
    };
  }, []);

  useEffect(() => {
    console.log("App is ready");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const updateAnalysis = async () => {
      if (filteredRecords.length > 0) {
        setLoading(true);
        setPredictiveLoading(true);
        setFacilitiesLoading(true);
        setRemediesLoading(true);
        try {
          // Use geoFilter center if active, otherwise use the most recent record's location
          const searchLocation = geoFilter ? geoFilter.center : (filteredRecords.length > 0 ? filteredRecords[0].location : currentLocation);
          
          const [newAlerts, insight, facilities, remedies] = await Promise.all([
            analyzeOutbreakRisk(filteredRecords),
            predictFutureOutbreaks(filteredRecords),
            searchNearbyFacilities(filteredRecords, searchLocation),
            generateHomeRemedies(filteredRecords)
          ]);
          
          setPredictiveInsight(insight);
          setNearbyFacilities(facilities);
          setHomeRemedies(remedies);

          // Optionally sync alerts to Firestore if user is an admin or we want shared alerts
          // For now, we'll just update local state, but we could add a "Publish Alerts" feature
          // To satisfy the "fetch from real-time database" requirement, we already have the listener above.
          // If we want the AI to populate the database:
          /*
          for (const alert of newAlerts) {
            const { id, ...alertData } = alert;
            await addDoc(collection(db, 'alerts'), alertData);
          }
          */
        } catch (error) {
          console.error("Failed to update analysis:", error);
        } finally {
          setLoading(false);
          setPredictiveLoading(false);
          setFacilitiesLoading(false);
          setRemediesLoading(false);
        }
      }
    };
    
    const timer = setTimeout(updateAnalysis, 2000);
    return () => clearTimeout(timer);
  }, [records, geoFilter]);

  const handleSort = (key: keyof HealthRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const dismissNotification = (id: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  const sortedRecords = React.useMemo(() => {
    let sortableItems = [...filteredRecords];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRecords, sortConfig]);

  const handleAddRecord = async (newRecord: Omit<HealthRecord, 'id' | 'timestamp' | 'authorUid'>) => {
    const recordData = {
      ...newRecord,
      timestamp: new Date().toISOString(),
      authorUid: 'anonymous',
    };

    try {
      await addDoc(collection(db, 'health_records'), recordData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'health_records');
    }
  };

  const handleSyncAlerts = async () => {
    if (records.length === 0) return;
    setLoading(true);
    try {
      const newAlerts = await analyzeOutbreakRisk(records);
      
      // Deduplication logic
      for (const alert of newAlerts) {
        const isDuplicate = alerts.some(existing => 
          existing.disease === alert.disease && 
          existing.location === alert.location &&
          existing.riskLevel === alert.riskLevel
        );

        if (!isDuplicate) {
          const { id, ...alertData } = alert;
          await addDoc(collection(db, 'alerts'), {
            ...alertData,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'alerts');
    } finally {
      setLoading(false);
    }
  };

  const SortIcon = ({ column }: { column: keyof HealthRecord }) => {
    if (sortConfig?.key !== column) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return <TrendingUp className="w-5 h-5" />;
      case 'DECREASING': return <TrendingDown className="w-5 h-5" />;
      default: return <Minus className="w-5 h-5" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return 'text-rose-600 bg-rose-50';
      case 'DECREASING': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-zinc-600 bg-zinc-50';
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Notifications Overlay */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-4 pointer-events-none">
        {activeNotifications.map((notification) => (
          <div 
            key={notification.id}
            className={`pointer-events-auto w-80 p-4 rounded-2xl shadow-2xl border-l-4 border-rose-600 animate-in slide-in-from-right duration-300 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 text-rose-600">
                <Bell className="w-4 h-4 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider">High Risk Alert</span>
              </div>
              <button 
                onClick={() => dismissNotification(notification.id)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <h4 className="font-bold text-sm mb-1">{notification.disease} Outbreak</h4>
            <p className="text-xs text-zinc-500 mb-3">{notification.location}</p>
            <p className="text-xs leading-relaxed opacity-80">{notification.description}</p>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <nav className={`border-b sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex flex-col leading-none">
                <span className={`text-xl font-bold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Sentinel</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600">Health Outbreak Tracker</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSyncAlerts}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                } disabled:opacity-50`}
              >
                <Brain className={`w-4 h-4 ${loading ? 'animate-pulse text-indigo-500' : ''}`} />
                <span className="hidden md:inline">{loading ? 'Analyzing...' : 'Sync AI Alerts'}</span>
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-xl transition-all ${
                  isDarkMode ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'records' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                Records
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'alerts' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                Alerts
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Top Section: Stats & Nearby Facilities */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Records', value: filteredRecords.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Alerts', value: filteredAlerts.length, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'High Risk Areas', value: filteredAlerts.filter(a => a.riskLevel === 'HIGH').length, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { 
                      label: 'Predicted Trend', 
                      value: predictiveInsight?.trend || 'STABLE', 
                      icon: predictiveInsight ? (predictiveInsight.trend === 'INCREASING' ? TrendingUp : predictiveInsight.trend === 'DECREASING' ? TrendingDown : Minus) : Minus, 
                      color: predictiveInsight?.trend === 'INCREASING' ? 'text-rose-600' : predictiveInsight?.trend === 'DECREASING' ? 'text-emerald-600' : 'text-zinc-600', 
                      bg: predictiveInsight?.trend === 'INCREASING' ? 'bg-rose-50' : predictiveInsight?.trend === 'DECREASING' ? 'bg-emerald-50' : 'bg-zinc-50' 
                    },
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl shadow-sm border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'} flex items-center gap-4`}>
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 font-medium">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.label === 'Predicted Trend' ? 'text-sm uppercase tracking-wider' : (isDarkMode ? 'text-white' : 'text-zinc-900')}`}>{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-1 h-[500px]">
                  <NearbyFacilities facilities={nearbyFacilities} loading={facilitiesLoading} isDarkMode={isDarkMode} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <HeatMap 
                    records={records} 
                    center={currentLocation} 
                    isDarkMode={isDarkMode} 
                    onFilterChange={(center, radius) => setGeoFilter(center && radius ? { center, radius } : null)}
                  />
                  <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Recent Health Records</h3>
                      <button onClick={() => setActiveTab('records')} className="text-sm text-indigo-600 hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className={`text-xs uppercase tracking-wider border-b transition-colors ${isDarkMode ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-100'}`}>
                            <th 
                              className="pb-3 font-medium cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                              onClick={() => handleSort('patientName')}
                            >
                              <div className="flex items-center gap-1">
                                Patient <SortIcon column="patientName" />
                              </div>
                            </th>
                            <th 
                              className="pb-3 font-medium cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                              onClick={() => handleSort('diagnosis')}
                            >
                              <div className="flex items-center gap-1">
                                Diagnosis <SortIcon column="diagnosis" />
                              </div>
                            </th>
                            <th 
                              className="pb-3 font-medium cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                              onClick={() => handleSort('severity')}
                            >
                              <div className="flex items-center gap-1">
                                Severity <SortIcon column="severity" />
                              </div>
                            </th>
                            <th className="pb-3 font-medium">Location</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-50'}`}>
                          {sortedRecords.slice(0, 5).map((record) => (
                            <tr key={record.id} className="text-sm">
                              <td className={`py-4 font-medium transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{record.patientName}</td>
                              <td className={`py-4 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{record.diagnosis}</td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.severity === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                  record.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                }`}>
                                  {record.severity}
                                </span>
                              </td>
                              <td className="py-4 text-zinc-500 text-xs">
                                {record.location.lat.toFixed(2)}, {record.location.lng.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <HealthRecordForm onAddRecord={handleAddRecord} currentLocation={currentLocation} isDarkMode={isDarkMode} />
                  <PredictiveInsights insight={predictiveInsight} loading={predictiveLoading} isDarkMode={isDarkMode} />
                  <AlertsPanel alerts={filteredAlerts} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Home Remedies Section at the bottom */}
              <div className="mt-8">
                <HomeRemedies remedies={homeRemedies} loading={remediesLoading} isDarkMode={isDarkMode} />
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Patient Health Records</h2>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Add New Record
                </button>
              </div>
              <div className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                <table className="w-full text-left">
                  <thead className={`border-b transition-colors ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                    <tr className="text-xs text-zinc-400 uppercase tracking-wider">
                      <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleSort('patientName')}
                      >
                        <div className="flex items-center gap-1">
                          Patient <SortIcon column="patientName" />
                        </div>
                      </th>
                      <th className="px-6 py-4 font-medium">Symptoms</th>
                      <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleSort('diagnosis')}
                      >
                        <div className="flex items-center gap-1">
                          Diagnosis <SortIcon column="diagnosis" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleSort('severity')}
                      >
                        <div className="flex items-center gap-1">
                          Severity <SortIcon column="severity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-1">
                          Timestamp <SortIcon column="timestamp" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-50'}`}>
                    {sortedRecords.map((record) => (
                      <tr key={record.id} className={`text-sm transition-all ${isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}>
                        <td className={`px-6 py-4 font-medium transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{record.patientName}</td>
                        <td className={`px-6 py-4 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{record.symptoms.join(', ')}</td>
                        <td className={`px-6 py-4 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{record.diagnosis}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.severity === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            record.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {record.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-xs">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Outbreak Alerts</h2>
              <AlertsPanel alerts={alerts} isDarkMode={isDarkMode} />
            </div>
          )}
        </div>
      </main>

      <footer className={`border-t py-12 mt-12 transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className={`font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Health Outbreak Tracker</span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500">
              <a href="#" className="hover:text-indigo-600 transition-all">Privacy Policy</a>
              <a href="#" className="hover:text-indigo-600 transition-all">Terms of Service</a>
              <a href="#" className="hover:text-indigo-600 transition-all">Contact Support</a>
            </div>
            <p className="text-sm text-zinc-400">© 2026 Health Outbreak Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Attribution */}
      <div className="fixed bottom-4 left-4 z-[60] pointer-events-none select-none">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400' 
            : 'bg-white/40 border-zinc-200/50 text-zinc-500'
        }`}>
          <span className="text-[10px] uppercase tracking-widest font-medium opacity-70">Project made by</span>
          <span className={`font-signature text-xl leading-none pt-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Hari Narayana
          </span>
        </div>
      </div>
    </div>
  );
}
