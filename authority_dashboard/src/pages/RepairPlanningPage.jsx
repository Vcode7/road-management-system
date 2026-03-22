import React, { useEffect, useState } from 'react';
import { Wrench, Plus, MapPin, Filter, Eye } from 'lucide-react';
import api from '../api.js';
import JobDetailModal from '../components/JobDetailModal';

// Solapur Municipal Corporation zones
const SOLAPUR_ZONES = [
  { id: 'south_solapur', name: 'South Solapur', latRange: [17.640, 17.655], lonRange: [75.890, 75.910] },
  { id: 'north_solapur', name: 'North Solapur', latRange: [17.670, 17.690], lonRange: [75.905, 75.930] },
  { id: 'old_city_fort', name: 'Old City / Fort Area', latRange: [17.655, 17.670], lonRange: [75.900, 75.920] },
  { id: 'akkalkot_road', name: 'Akkalkot Road Area', latRange: [17.665, 17.680], lonRange: [75.910, 75.925] },
  { id: 'hotgi_road', name: 'Hotgi Road Area', latRange: [17.640, 17.655], lonRange: [75.880, 75.900] },
  { id: 'vijapur_road', name: 'Vijapur Road / Jule Solapur', latRange: [17.670, 17.685], lonRange: [75.920, 75.940] },
  { id: 'industrial', name: 'Industrial Area (MIDC)', latRange: [17.685, 17.700], lonRange: [75.890, 75.910] },
  { id: 'railway_lines', name: 'Railway Lines', latRange: [17.658, 17.668], lonRange: [75.908, 75.920] },
];

function getZone(lat, lon) {
  for (const z of SOLAPUR_ZONES) {
    if (lat >= z.latRange[0] && lat <= z.latRange[1] && lon >= z.lonRange[0] && lon <= z.lonRange[1]) return z.id;
  }
  return 'other';
}

export default function RepairPlanningPage() {
  const [jobs, setJobs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedZones, setSelectedZones] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', estimated_cost: '', report_ids: [] });
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.get('/jobs'), api.get('/reports?status=verified')])
      .then(([j, r]) => { setJobs(j); setReports(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(fetchData, []);

  // Annotate reports with zone
  const annotatedReports = reports.map(r => ({ ...r, zone: getZone(r.latitude, r.longitude) }));

  // Filter reports by selected zones
  const filteredReports = selectedZones.length === 0
    ? annotatedReports
    : annotatedReports.filter(r => selectedZones.includes(r.zone));

  // Zone stats
  const zoneStats = SOLAPUR_ZONES.map(z => {
    const zoneReports = annotatedReports.filter(r => r.zone === z.id);
    return {
      ...z,
      count: zoneReports.length,
      critical: zoneReports.filter(r => r.severity === 'critical').length,
      high: zoneReports.filter(r => r.severity === 'high').length,
    };
  });

  const toggleZone = (zoneId) => {
    setSelectedZones(prev => prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]);
  };

  const createJob = async (e) => {
    e.preventDefault();
    if (!form.report_ids.length) return alert('Select at least one report');
    const rep = filteredReports.find(r => form.report_ids.includes(r.id));
    try {
      await api.post('/jobs', {
        title: form.title,
        description: form.description,
        latitude: rep?.latitude || 17.6599,
        longitude: rep?.longitude || 75.9064,
        address: rep?.road_name || '',
        estimated_cost: parseFloat(form.estimated_cost) || null,
        report_ids: form.report_ids,
        priority_score: rep?.priority_score || 0,
      });
      setShowCreate(false);
      setForm({ title: '', description: '', estimated_cost: '', report_ids: [] });
      fetchData();
    } catch (e) { alert(e.message); }
  };

  const toggleReport = (id) => {
    setForm(f => ({ ...f, report_ids: f.report_ids.includes(id) ? f.report_ids.filter(x => x !== id) : [...f.report_ids, id] }));
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h2>Repair Planning — Solapur Municipal Corporation</h2><p>Create and manage repair jobs from verified reports across city zones</p></div>
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}><Plus size={16} /> Create Job</button>
        </div>
      </div>
      <div className="page-content">
        {/* Region/Zone Selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><MapPin size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Select Zones — Solapur City</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              {selectedZones.length === 0 ? 'All zones' : `${selectedZones.length} zone(s) selected`}
            </span>
          </div>
          <div className="zone-grid">
            {zoneStats.map(z => (
              <button
                key={z.id}
                className={`zone-card ${selectedZones.includes(z.id) ? 'zone-selected' : ''}`}
                onClick={() => toggleZone(z.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{z.name}</span>
                  <span className="zone-count">{z.count}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {z.critical > 0 && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>🔴 {z.critical} critical</span>}
                  {z.high > 0 && <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>🟡 {z.high} high</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Create Repair Job</h3>
            <form onSubmit={createJob}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Job Title</label>
                  <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pothole Repair - Akkalkot Road" required />
                </div>
                <div className="form-group">
                  <label>Estimated Cost (₹)</label>
                  <input className="form-control" type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} placeholder="45000" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Job description..." />
              </div>
              <div className="form-group">
                <label><Filter size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Verified Reports in Selected Zones ({form.report_ids.length} selected)</label>
                <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--bg)', borderRadius: 8, padding: 8 }}>
                  {filteredReports.length === 0 ? (
                    <p style={{ color: 'var(--text3)', fontSize: '0.85rem', padding: 12 }}>No verified reports in selected zones</p>
                  ) : filteredReports.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: form.report_ids.includes(r.id) ? 'rgba(99,102,241,0.1)' : 'transparent' }}>
                      <input type="checkbox" checked={form.report_ids.includes(r.id)} onChange={() => toggleReport(r.id)} />
                      <span style={{ fontSize: '0.85rem' }}>{r.road_name || 'Unknown'} — {r.damage_type?.replace('_', ' ')} ({r.severity})</span>
                      <span className={`badge badge-${r.severity}`} style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>{r.severity}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" type="submit"><Wrench size={14} /> Create Repair Job</button>
            </form>
          </div>
        )}

        {/* Jobs table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Repair Jobs ({jobs.length})</span>
          </div>
          {jobs.length === 0 ? (
            <div className="empty-state"><Wrench size={40} /><p>No repair jobs yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Title</th><th>Location</th><th>Est. Cost</th><th>Status</th><th>Priority</th><th>Bids</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} onClick={() => setSelectedJob(j)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{j.title}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{j.address || `${j.latitude?.toFixed(3)}, ${j.longitude?.toFixed(3)}`}</td>
                      <td style={{ fontWeight: 600 }}>₹{j.estimated_cost?.toLocaleString() || '—'}</td>
                      <td><span className={`badge badge-${j.status}`}>{j.status?.replace('_', ' ')}</span></td>
                      <td style={{ color: j.priority_score > 7 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{j.priority_score?.toFixed(1)}</td>
                      <td>{j.bid_count}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{new Date(j.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedJob(j); }}>
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRefresh={fetchData}
        />
      )}
    </>
  );
}
