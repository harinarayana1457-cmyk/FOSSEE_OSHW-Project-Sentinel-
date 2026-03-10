/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { HealthRecord, Location } from '../types';
import { X, Clock, User, Activity, MapPin } from 'lucide-react';

interface HeatMapProps {
  records: HealthRecord[];
  center: Location;
  isDarkMode?: boolean;
  onFilterChange?: (center: Location | null, radius: number | null) => void;
}

interface TooltipData {
  x: number;
  y: number;
  records: HealthRecord[];
}

export default function HeatMap({ records, center, isDarkMode, onFilterChange }: HeatMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<HealthRecord[] | null>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [filterMode, setFilterMode] = useState(false);
  const [filterCenter, setFilterCenter] = useState<Location | null>(null);
  const [filterRadius, setFilterRadius] = useState(500); // km

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(response => response.json())
      .then(data => setWorldData(data))
      .catch(err => console.error("Error loading map data:", err));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !worldData) return;

    const width = 800;
    const height = 450;
    
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    // Create a group for the map content to allow zooming
    const g = svg.append('g');

    const projection = d3.geoMercator()
      .scale(120)
      .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Draw the world map
    g.append('g')
      .selectAll('path')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', isDarkMode ? '#1e293b' : '#f1f5f9')
      .attr('stroke', isDarkMode ? '#334155' : '#cbd5e1')
      .attr('stroke-width', 0.5)
      .on('click', (event) => {
        if (filterMode) {
          const [mx, my] = d3.pointer(event, g.node());
          const coords = projection.invert!([mx, my]);
          if (coords) {
            const newCenter = { lat: coords[1], lng: coords[0] };
            setFilterCenter(newCenter);
            onFilterChange?.(newCenter, filterRadius);
          }
        }
      });

    // Draw filter circle if active
    if (filterMode && filterCenter) {
      const [fx, fy] = projection([filterCenter.lng, filterCenter.lat]) || [0, 0];
      
      // Approximate radius in pixels (this is rough for Mercator but okay for visualization)
      // 1 degree lat is ~111km. 
      const pixelsPerDegree = projection([filterCenter.lng, filterCenter.lat + 1]!)![1] - projection([filterCenter.lng, filterCenter.lat]!)![1];
      const radiusInPixels = Math.abs((filterRadius / 111) * pixelsPerDegree);

      g.append('circle')
        .attr('cx', fx)
        .attr('cy', fy)
        .attr('r', radiusInPixels)
        .attr('fill', 'rgba(99, 102, 241, 0.1)')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('pointer-events', 'none');

      g.append('circle')
        .attr('cx', fx)
        .attr('cy', fy)
        .attr('r', 4)
        .attr('fill', '#6366f1')
        .attr('pointer-events', 'none');
    }

    // Group records by location
    const groupedRecords = d3.group(
      records,
      d => `${d.location.lat.toFixed(4)},${d.location.lng.toFixed(4)}`
    );

    const colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
      .domain([0, d3.max(Array.from(groupedRecords.values()), v => v.length) || 1]);

    // Draw heat points
    groupedRecords.forEach((locationRecords, key) => {
      const count = locationRecords.length;
      const firstRecord = locationRecords[0];
      const [x, y] = projection([firstRecord.location.lng, firstRecord.location.lat]) || [0, 0];
      
      const circle = g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4 + count * 1.5)
        .attr('fill', colorScale(count))
        .attr('opacity', 0.6)
        .attr('filter', 'blur(2px)')
        .attr('cursor', 'pointer')
        .style('transition', 'all 0.2s ease');

      // Add invisible larger circle for better hover target
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 8 + count * 1.5)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseover', (event) => {
          const [px, py] = d3.pointer(event, svgRef.current);
          setTooltip({ x: px, y: py, records: locationRecords });
          circle.attr('opacity', 0.9).attr('filter', 'none');
        })
        .on('mousemove', (event) => {
          const [px, py] = d3.pointer(event, svgRef.current);
          setTooltip(prev => prev ? { ...prev, x: px, y: py } : null);
        })
        .on('mouseout', () => {
          setTooltip(null);
          circle.attr('opacity', 0.6).attr('filter', 'blur(2px)');
        })
        .on('click', () => {
          setSelectedCluster(locationRecords);
          setTooltip(null);
        });
    });

    // Draw center point (User Location)
    const [cx, cy] = projection([center.lng, center.lat]) || [0, 0];
    
    const userMarker = g.append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    userMarker.append('circle')
      .attr('r', 4)
      .attr('fill', '#6366f1')
      .attr('stroke', isDarkMode ? '#1e293b' : 'white')
      .attr('stroke-width', 1.5);

    userMarker.append('text')
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', '#6366f1')
      .text('You');

    // Zoom functionality
    const zoomToLocation = () => {
      const zoomScale = 4;
      const tx = width / 2 - zoomScale * cx;
      const ty = height / 2 - zoomScale * cy;

      svg.transition()
        .duration(1500)
        .call(
          d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
          }).transform as any,
          d3.zoomIdentity.translate(tx, ty).scale(zoomScale)
        );
    };

    // Trigger zoom when center changes and map is loaded
    if (center.lat !== 37.7749 || center.lng !== -122.4194) {
      zoomToLocation();
    }

  }, [records, center, worldData, isDarkMode, filterMode, filterCenter, filterRadius]);

  return (
    <div className={`w-full rounded-2xl p-6 shadow-sm border relative transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Outbreak Heatmap</h3>
          <button 
            onClick={() => {
              const newMode = !filterMode;
              setFilterMode(newMode);
              if (!newMode) {
                setFilterCenter(null);
                onFilterChange?.(null, null);
              }
            }}
            className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              filterMode 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900')
            }`}
          >
            <MapPin className="w-3 h-3" />
            {filterMode ? 'Radius Filter Active' : 'Filter by Radius'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-3 h-3 rounded-full bg-emerald-400 opacity-60"></span>
          <span>Low Risk</span>
          <span className="w-3 h-3 rounded-full bg-indigo-400 opacity-60"></span>
          <span>Medium Risk</span>
          <span className="w-3 h-3 rounded-full bg-indigo-900 opacity-60"></span>
          <span>High Risk</span>
        </div>
      </div>

      {filterMode && (
        <div className={`mb-6 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filter Radius: {filterRadius}km</label>
                <span className="text-xs text-indigo-500 font-medium">{filterCenter ? 'Center Set' : 'Click map to set center'}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100"
                value={filterRadius}
                onChange={(e) => {
                  const r = parseInt(e.target.value);
                  setFilterRadius(r);
                  if (filterCenter) onFilterChange?.(filterCenter, r);
                }}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
            <button 
              onClick={() => {
                setFilterCenter(null);
                onFilterChange?.(null, null);
              }}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
            >
              Reset Center
            </button>
          </div>
        </div>
      )}
      
      <div className="relative">
        <svg ref={svgRef} className="w-full h-auto rounded-lg overflow-hidden"></svg>
        
        {tooltip && (
          <div 
            className={`absolute z-10 backdrop-blur-sm border rounded-xl p-3 shadow-xl pointer-events-none min-w-[200px] transition-colors ${
              isDarkMode ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200'
            }`}
            style={{ 
              left: `${(tooltip.x / 800) * 100}%`, 
              top: `${(tooltip.y / 450) * 100}%`,
              transform: 'translate(10px, 10px)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                {tooltip.records.length} {tooltip.records.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {tooltip.records.map((record, i) => (
                <div key={i} className={`border-t first:border-0 pt-2 first:pt-0 ${isDarkMode ? 'border-zinc-700' : 'border-zinc-100'}`}>
                  <p className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{record.patientName}</p>
                  <p className="text-xs text-zinc-500 mb-1">{record.diagnosis}</p>
                  <div className="flex flex-wrap gap-1">
                    {record.symptoms.map((s, si) => (
                      <span key={si} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-zinc-500 italic">
        * Hover over clusters to view patient details and click for full records.
      </p>

      {/* Detail Modal */}
      {selectedCluster && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Cluster Details</h3>
                  <p className="text-sm text-zinc-500">{selectedCluster.length} reported cases at this location</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCluster(null)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedCluster.map((record) => (
                <div key={record.id} className={`rounded-2xl p-5 border transition-all ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800 hover:border-indigo-500/50' : 'bg-zinc-50 border-zinc-100 hover:border-indigo-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                        <User className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <h4 className={`font-bold transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{record.patientName}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(record.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      record.severity === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      record.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {record.severity}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Diagnosis</p>
                      <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{record.diagnosis}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Symptoms</p>
                      <div className="flex flex-wrap gap-1">
                        {record.symptoms.map((s, i) => (
                          <span key={i} className={`text-[10px] border px-2 py-0.5 rounded-md transition-colors ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`p-6 border-t transition-colors ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'} flex justify-end`}>
              <button 
                onClick={() => setSelectedCluster(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
