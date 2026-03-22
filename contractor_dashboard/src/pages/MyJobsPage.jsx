import React, { useEffect, useState } from 'react';
import {
  Briefcase, MapPin, Upload, CheckCircle, Clock, AlertTriangle,
  BarChart2, ChevronRight, X, Loader2, Star
} from 'lucide-react';
import api from '../api.js';

// Ordered stages for the progress timeline
const STAGE_CONFIG = [
  { key: 'assigned',           label: 'Assigned',            icon: '📋' },
  { key: 'materials_ready',    label: 'Materials Ready',     icon: '📦' },
  { key: 'repair_started',     label: 'Repair Started',      icon: '🔨' },
  { key: 'repair_completed',   label: 'Repair Completed',    icon: '✅' },
  { key: 'inspection_pending', label: 'Inspection Pending',  icon: '🔍' },
  { key: 'verified',           label: 'Verified',            icon: '🏁' },
];

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
  high:     { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
  medium:   { bg: 'rgba(234,179, 8,0.15)', text: '#fbbf24' },
  low:      { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80' },
};

function SeverityBadge({ severity }) {
  const col = SEVERITY_COLORS[severity] || { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20,
      background: col.bg, color: col.text,
      fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5,
    }}>{severity || 'unknown'}</span>
  );
}

function ProgressTimeline({ job, onStageUpdate, onUpload, uploading }) {
  const completedKeys = new Set((job.progress || []).map(p => p.stage));

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
        Progress Timeline
      </h4>
      <div style={{ position:'relative', paddingLeft:28 }}>
        {/* Vertical line */}
        <div style={{ position:'absolute', left:9, top:6, bottom:6, width:2, background:'var(--border)' }} />

        {STAGE_CONFIG.map((stage, i) => {
          const completed = completedKeys.has(stage.key);
          const prevCompleted = i === 0 || completedKeys.has(STAGE_CONFIG[i-1].key);
          const isCurrent = !completed && prevCompleted;

          return (
            <div key={stage.key} style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, position:'relative' }}>
              {/* Dot */}
              <div style={{
                position:'absolute', left:-28, top:'50%', transform:'translateY(-50%)',
                width:20, height:20, borderRadius:'50%', border:'2px solid',
                borderColor: completed ? '#10b981' : isCurrent ? '#6366f1' : 'var(--border)',
                background: completed ? '#10b981' : isCurrent ? 'rgba(99,102,241,0.2)' : 'var(--bg)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 9, zIndex: 1,
                boxShadow: isCurrent ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                transition:'all 0.3s',
              }}>
                {completed ? '✓' : stage.icon}
              </div>

              <div style={{ flex:1, background:'var(--bg)', borderRadius:8, padding:'8px 12px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{
                    fontSize:'0.83rem', fontWeight: isCurrent ? 700 : 500,
                    color: completed ? '#10b981' : isCurrent ? '#a5b4fc' : 'var(--text3)',
                  }}>{stage.label}</span>
                  {completed && (
                    <span style={{ fontSize:'0.75rem', color:'var(--text3)' }}>
                      {job.progress?.find(p => p.stage === stage.key)?.updated_at
                        ? new Date(job.progress.find(p=>p.stage===stage.key).updated_at).toLocaleDateString('en-IN')
                        : ''}
                    </span>
                  )}
                </div>

                {/* Action buttons for current stage */}
                {isCurrent && (
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onStageUpdate(job.id, stage.key)}
                      style={{ fontSize:'0.78rem' }}>
                      <CheckCircle size={12} /> Mark Done
                    </button>

                    {/* Upload proof only on repair_completed */}
                    {stage.key === 'repair_completed' && (
                      <label style={{
                        display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
                        padding:'5px 10px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                        background:'rgba(16,185,129,0.12)', color:'#34d399',
                        border:'1px solid rgba(16,185,129,0.3)',
                      }}>
                        {uploading ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }} /> : <Upload size={12} />}
                        {uploading ? 'Uploading…' : 'Upload Proof'}
                        <input type="file" accept="image/*,video/*" style={{ display:'none' }}
                          onChange={e => onUpload(job.id, stage.key, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyJobsPage() {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(null);  // jobId being uploaded
  const [toast, setToast]       = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [assigned, inProgress] = await Promise.all([
        api.get('/jobs?status=assigned').catch(() => []),
        api.get('/jobs?status=in_progress').catch(() => []),
      ]);
      const all = [...assigned, ...inProgress];
      // Fetch progress for each job
      const withProgress = await Promise.all(
        all.map(async job => {
          try {
            const progress = await api.get(`/jobs/${job.id}/progress`).catch(() => []);
            return { ...job, progress };
          } catch {
            return { ...job, progress: [] };
          }
        })
      );
      setJobs(withProgress);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleStageUpdate = async (jobId, stage) => {
    try {
      const formData = new FormData();
      formData.append('stage', stage);
      formData.append('notes', `Marked ${stage} as complete`);
      await api.postForm(`/jobs/${jobId}/progress`, formData);
      showToast(`✅ Stage "${stage.replace('_', ' ')}" marked complete!`);
      await loadJobs();
    } catch (e) {
      showToast(`❌ Error: ${e.message}`, false);
    }
  };

  const handleUpload = async (jobId, stage, file) => {
    if (!file) return;
    setUploading(jobId);
    try {
      const formData = new FormData();
      formData.append('stage', stage);
      formData.append('notes', 'Proof of completion uploaded');
      formData.append('proof_image', file);
      await api.postForm(`/jobs/${jobId}/progress`, formData);
      showToast('📸 Proof uploaded successfully!');
      await loadJobs();
    } catch (e) {
      showToast(`❌ Upload failed: ${e.message}`, false);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h2>My Jobs</h2>
        <p>Manage assigned repair jobs and update progress stages</p>
      </div>

      <div className="page-content">
        {jobs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Briefcase size={48} style={{ marginBottom:12, opacity:0.4 }} />
              <p>No assigned jobs yet. Win bids from the marketplace to get started!</p>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gap:16 }}>
            {jobs.map(job => {
              const completedCount = (job.progress || []).length;
              const totalStages    = STAGE_CONFIG.length;
              const pct            = Math.round((completedCount / totalStages) * 100);
              const sevCols        = SEVERITY_COLORS[job.severity] || { bg:'rgba(100,116,139,0.2)', text:'#94a3b8' };

              return (
                <div key={job.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                  {/* Header strip */}
                  <div style={{ background:'var(--bg)', padding:'18px 20px 14px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <h3 style={{ fontSize:'1.05rem', fontWeight:700, marginBottom:4 }}>{job.title}</h3>
                        <p style={{ fontSize:'0.82rem', color:'var(--text2)', display:'flex', alignItems:'center', gap:4 }}>
                          <MapPin size={13} /> {job.address || `${job.latitude?.toFixed(3)}, ${job.longitude?.toFixed(3)}`}
                        </p>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                        <span className={`badge badge-${job.status}`}>{job.status?.replace('_',' ')}</span>
                        {job.severity && <SeverityBadge severity={job.severity} />}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                      {[
                        { icon:<BarChart2 size={13}/>, label:'Priority', val: job.priority_score?.toFixed(1), col: job.priority_score > 7 ? '#ef4444' : '#f97316' },
                        { icon:<AlertTriangle size={13}/>, label:'Reports', val: job.report_count ?? '—', col:'#6366f1' },
                        { icon:<Clock size={13}/>, label:'Est. Days', val: job.estimated_days ?? job.repair_time_days ?? '—', col:'var(--secondary)' },
                        { icon:<Star size={13}/>, label:'Est. Cost', val: job.estimated_cost ? `₹${Number(job.estimated_cost).toLocaleString('en-IN')}` : '—', col:'#f59e0b' },
                      ].map(({ icon, label, val, col }) => (
                        <div key={label} style={{
                          background:'var(--bg2)', border:'1px solid var(--border)',
                          borderRadius:8, padding:'7px 12px', minWidth:90,
                        }}>
                          <div style={{ fontSize:'0.68rem', color:'var(--text3)', display:'flex', alignItems:'center', gap:4 }}>{icon}{label}</div>
                          <div style={{ fontSize:'1rem', fontWeight:800, color:col, marginTop:1 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text3)', marginBottom:5 }}>
                        <span>Overall Progress</span>
                        <span style={{ fontWeight:700, color: pct === 100 ? '#10b981' : 'var(--text2)' }}>{pct}%</span>
                      </div>
                      <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', width:`${pct}%`, borderRadius:3, transition:'width 0.5s ease',
                          background: pct === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#06b6d4)',
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Timeline body */}
                  <div style={{ padding:'16px 20px 20px' }}>
                    <ProgressTimeline
                      job={job}
                      onStageUpdate={handleStageUpdate}
                      onUpload={handleUpload}
                      uploading={uploading === job.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{
          borderLeft: `3px solid ${toast.ok ? '#10b981' : '#ef4444'}`,
          color: toast.ok ? '#f1f5f9' : '#f87171',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
