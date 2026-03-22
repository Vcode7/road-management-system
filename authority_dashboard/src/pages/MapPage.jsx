import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker, MarkerClusterer, InfoWindow, HeatmapLayer } from '@react-google-maps/api';
import api from '../api.js';

/* ─────────────────── Constants ─────────────────── */
const SOLAPUR_CENTER = { lat: 17.6599, lng: 75.9064 };
const MAP_LIBRARIES = ['visualization'];

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const STATUS_LIST    = ['all', 'submitted', 'verified', 'scheduled', 'repairing', 'completed'];
const SEVERITY_LIST  = ['critical', 'high', 'medium', 'low'];

/* ─────────────────── Helpers ─────────────────── */
function severityRank(s) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] ?? 0;
}

function polylineWeight(seg) {
  if (!seg.severity) return 4;
  if (seg.severity === 'critical') return 8;
  if (seg.severity === 'high')     return 6;
  return 4;
}

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [ // Light theme with clear road visibility
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  ],
};

/* ─────────────────── Main Component ─────────────────── */
export default function MapPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: MAP_LIBRARIES,
  });

  const [roads, setRoads]         = useState([]);
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);   // clicked road segment
  const [activeReport, setActiveReport] = useState(null); // clicked marker for info window

  // Filters
  const [severities, setSeverities] = useState(new Set(SEVERITY_LIST));
  const [statusFilter, setStatus]   = useState('all');
  const [showHeatmap, setHeatmap]   = useState(false);
  const [showPins, setPins]         = useState(true);

  /* ── Fetch data ── */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/roads'),
      api.get('/reports'),
    ])
      .then(([roadsData, reportsData]) => {
        if (cancelled) return;
        setRoads(roadsData);
        setReports(reportsData);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── Filtered roads ── */
  const filteredRoads = useMemo(() => {
    return roads.filter(seg => {
      if (seg.severity && !severities.has(seg.severity)) return false;
      if (statusFilter !== 'all') {
        if (!seg.statuses?.includes(statusFilter)) return false;
      }
      return true;
    });
  }, [roads, severities, statusFilter]);

  /* ── Filtered marker reports ── */
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (!severities.has(r.severity)) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, severities, statusFilter]);

  /* ── Heatmap points ── */
  const heatPoints = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    const intensity = { critical: 1.0, high: 0.72, medium: 0.45, low: 0.2 };
    return filteredReports.map(r => ({
      location: new window.google.maps.LatLng(r.latitude, r.longitude),
      weight: intensity[r.severity] ?? 0.3,
    }));
  }, [filteredReports, isLoaded]);

  const toggleSeverity = useCallback((s) => {
    setSeverities(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  /* ── Panel data: get reports for selected segment ── */
  const panelReports = useMemo(() => {
    if (!selected) return [];
    return reports.filter(r => selected.report_ids?.includes(r.id));
  }, [selected, reports]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', padding: '0 28px 16px' }}>

      {/* ── Page header ── */}
      <div className="page-header" style={{ padding: '20px 0 16px', border: 'none' }}>
        <h2>Live City Road Map</h2>
        <p>Precomputed road damage polylines — Solapur Municipal Corporation (Powered by Google Maps)</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="card" style={{ marginBottom: 12, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Severity chips */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Severity</span>
            {SEVERITY_LIST.map(s => (
              <button key={s} onClick={() => toggleSeverity(s)} style={{
                padding: '4px 12px', borderRadius: 20, border: '1px solid',
                borderColor: severities.has(s) ? SEVERITY_COLORS[s] : 'var(--border)',
                background: severities.has(s) ? `${SEVERITY_COLORS[s]}22` : 'transparent',
                color: severities.has(s) ? SEVERITY_COLORS[s] : 'var(--text3)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
              }}>{s}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          {/* Status dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Status</span>
            <select className="form-control" style={{ width: 'auto', height: 32, padding: '0 10px', fontSize: '0.82rem' }}
              value={statusFilter} onChange={e => setStatus(e.target.value)}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          {/* Layer toggles */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[
              { label: '📌 Pins', val: showPins, set: setPins, color: '#6366f1' },
              { label: '🔥 Heatmap', val: showHeatmap, set: setHeatmap, color: '#f97316' },
            ].map(({ label, val, set, color }) => (
              <button key={label} onClick={() => set(v => !v)} style={{
                padding: '4px 12px', borderRadius: 20, border: '1px solid',
                borderColor: val ? color : 'var(--border)',
                background: val ? `${color}22` : 'transparent',
                color: val ? color : 'var(--text3)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}>{label}</button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text2)' }}>
            {filteredRoads.length} road segment{filteredRoads.length !== 1 ? 's' : ''} · {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>

          {selected && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕ Close panel</button>
          )}
        </div>
      </div>

      {/* ── Map + side panel ── */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0, position: 'relative' }}>

        {/* Map */}
        <div style={{
          flex: 1, borderRadius: 'var(--radius)', overflow: 'hidden',
          border: '1px solid var(--border)', position: 'relative',
        }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, borderRadius: 'var(--radius)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Loading road data…</p>
              </div>
            </div>
          )}

          {loadError && (
            <div style={{ padding: 20, color: '#ef4444' }}>Error loading Google Maps API</div>
          )}

          {!isLoaded ? (
            <div style={{ padding: 20 }}>Loading Google Maps...</div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%' }}
              center={SOLAPUR_CENTER}
              zoom={14}
              options={mapOptions}
            >
              {/* Heatmap Layer */}
              {showHeatmap && heatPoints.length > 0 && (
                <HeatmapLayer
                  data={heatPoints}
                  options={{
                    radius: 35,
                    opacity: 0.8,
                    gradient: [
                      'rgba(0, 255, 255, 0)',
                      'rgba(0, 255, 255, 1)',
                      'rgba(0, 191, 255, 1)',
                      'rgba(0, 127, 255, 1)',
                      'rgba(0, 63, 255, 1)',
                      'rgba(0, 0, 255, 1)',
                      'rgba(0, 0, 223, 1)',
                      'rgba(0, 0, 191, 1)',
                      'rgba(0, 0, 159, 1)',
                      'rgba(0, 0, 127, 1)',
                      'rgba(63, 0, 91, 1)',
                      'rgba(127, 0, 63, 1)',
                      'rgba(191, 0, 31, 1)',
                      'rgba(255, 0, 0, 1)'
                    ]
                  }}
                />
              )}

              {/* Road polylines */}
              {!showHeatmap && filteredRoads.map(seg => {
                if (!seg.polyline || seg.polyline.length < 2) return null;
                const coords = seg.polyline.map(p => ({ lat: p.lat, lng: p.lng }));
                const color  = SEVERITY_COLORS[seg.severity] || '#64748b';
                const weight = polylineWeight(seg);
                const isSelected = selected?.id === seg.id;

                return (
                  <Polyline
                    key={seg.id}
                    path={coords}
                    options={{
                      strokeColor: color,
                      strokeOpacity: isSelected ? 1 : 0.82,
                      strokeWeight: isSelected ? weight + 3 : weight,
                      zIndex: isSelected ? 10 : 1,
                    }}
                    onClick={() => setSelected(seg)}
                    onMouseOver={(e) => {
                      // Optional: modify stroke weight slightly if we want hover effect
                      // But requires state management per polyline, left simple for now.
                    }}
                  />
                );
              })}

              {/* Clustered markers */}
              {showPins && !showHeatmap && (
                <MarkerClusterer>
                  {(clusterer) =>
                    filteredReports.map(r => (
                      <Marker
                        key={r.id}
                        position={{ lat: r.latitude, lng: r.longitude }}
                        clusterer={clusterer}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          fillColor: SEVERITY_COLORS[r.severity] || '#94a3b8',
                          fillOpacity: 0.9,
                          strokeColor: '#000',
                          strokeWeight: 1,
                          scale: r.severity === 'critical' ? 7 : r.severity === 'high' ? 5.5 : 4,
                        }}
                        onClick={() => setActiveReport(r)}
                      />
                    ))
                  }
                </MarkerClusterer>
              )}

              {/* InfoWindow for marker */}
              {activeReport && (
                <InfoWindow
                  position={{ lat: activeReport.latitude, lng: activeReport.longitude }}
                  onCloseClick={() => setActiveReport(null)}
                >
                  <div style={{ fontFamily: 'Inter,sans-serif', minWidth: 180, color: '#333' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{activeReport.damage_type?.replace('_', ' ')}</strong>
                    <p style={{ fontSize: '0.8em', color: '#64748b', margin: '3px 0 0' }}>📍 {activeReport.road_name || 'Unknown road'}</p>
                    <p style={{ fontSize: '0.8em', margin: '2px 0' }}>⚠️ {activeReport.severity} &nbsp; 📋 {activeReport.status}</p>
                    <p style={{ fontSize: '0.8em', margin: '2px 0' }}>🎯 Priority {activeReport.priority_score?.toFixed(1)}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* ── Slide-in side panel ── */}
        {selected && (
          <div style={{
            width: 340,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slidePanel 0.25s ease',
          }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    background: `${SEVERITY_COLORS[selected.severity] || '#64748b'}22`,
                    color: SEVERITY_COLORS[selected.severity] || '#94a3b8',
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 1, marginBottom: 6,
                  }}>{selected.severity || 'unknown'}</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Road Segment</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 2 }}>
                    {selected.report_count} report{selected.report_count !== 1 ? 's' : ''} linked
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelected(null)}
                  style={{ padding: 6 }}>✕</button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                {[
                  { label: 'Priority Score', val: selected.priority_score?.toFixed(1), color: selected.priority_score > 7 ? '#ef4444' : '#f97316' },
                  { label: 'Report Count', val: selected.report_count, color: '#6366f1' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg)', borderRadius: 8, padding: '10px 12px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Status tags */}
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[...new Set(selected.statuses || [])].map(st => (
                  <span key={st} className={`badge badge-${st}`}>{st}</span>
                ))}
              </div>
            </div>

            {/* Linked reports list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Linked Reports
              </div>
              {panelReports.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p>No report details found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {panelReports.map(r => (
                    <div key={r.id} style={{
                      background: 'var(--bg)', borderRadius: 8, padding: '10px 12px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {r.damage_type?.replace('_', ' ')}
                        </span>
                        <span className={`badge badge-${r.severity}`}>{r.severity}</span>
                      </div>
                      <div style={{ fontSize: '0.77rem', color: 'var(--text3)' }}>
                        📍 {r.road_name || 'Unknown road'} · 📋 {r.status}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text3)', marginTop: 2 }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center',
        padding: '10px 0 0',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>LEGEND</span>
        {SEVERITY_LIST.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 4, borderRadius: 2, background: SEVERITY_COLORS[s] }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text2)', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text3)' }}>
          Road polylines sourced from pre-computed backend data
        </span>
      </div>

      <style>{`
        @keyframes slidePanel {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
