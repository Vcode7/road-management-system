import React, { useState } from 'react';
import { X, MapPin, AlertTriangle, Clock, Eye, CheckCircle, XCircle, Copy, ZoomIn } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const severityColors = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' };

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const relative = path.replace(/\\/g, '/').split('/uploads/').pop();
  return relative ? `${API_BASE}/uploads/${relative}` : null;
}

/* ── Zoom lightbox ─────────────────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 24,
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
          color: '#fff', padding: '6px 14px', cursor: 'pointer', fontSize: '1rem',
        }}
      >✕ Close</button>
      <img
        src={src}
        alt="Zoomed"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain' }}
      />
    </div>
  );
}

/* ── Image card with hover zoom button ─────────────────────────────────── */
function ImageCard({ title, src, fallbackIcon, fallbackLabel, onZoom }) {
  const [err, setErr] = useState(false);
  return (
    <div className="card" style={{ padding: 16 }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>{title}</h4>
      <div style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', background: 'var(--bg)', border: '1px solid var(--border)' }}>
        {src && !err ? (
          <>
            <img
              src={src}
              alt={title}
              style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
              onError={() => setErr(true)}
            />
            {onZoom && (
              <button
                onClick={onZoom}
                title="Zoom"
                style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6,
                  color: '#fff', padding: '4px 8px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 4, fontSize: '0.75rem',
                }}
              >
                <ZoomIn size={13} /> Zoom
              </button>
            )}
          </>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text3)' }}>
            <span style={{ fontSize: '2rem' }}>{fallbackIcon}</span>
            <span style={{ fontSize: '0.8rem' }}>{fallbackLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main modal ────────────────────────────────────────────────────────── */
export default function ReportDetailModal({ report, onClose, onStatusUpdate }) {
  const [imageTab, setImageTab]   = useState('original'); // 'original' | 'ai'
  const [lightboxSrc, setLightbox] = useState(null);

  if (!report) return null;
  const r = report;

  const originalUrl  = getImageUrl((r.image_urls || [])[0]);
  const processedUrl = getImageUrl((r.processed_image_urls || [])[0])
    || getImageUrl(r.ai_detection_result?.annotated_image);

  const hasAiResult = r.ai_detection_result?.success;
  const detections  = r.damages || [];

  const shownImageUrl = imageTab === 'original' ? originalUrl : processedUrl;

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightbox(null)} />}

      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="modal-header">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color={severityColors[r.severity] || '#94a3b8'} />
                Report Detail
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text3)', fontFamily: 'monospace', marginTop: 4 }}>ID: {r.id}</p>
            </div>
            <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

            {/* Status bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge badge-${r.severity}`} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>⚠️ {r.severity?.toUpperCase()}</span>
              <span className={`badge badge-${r.status}`} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>📋 {r.status?.toUpperCase()}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: '0.8rem' }}>
                <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>

            {/* ── Image section ──────────────────────────────────────────────── */}
            <div className="card" style={{ padding: 16, marginBottom: 24 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>
                📸 Damage Images
              </h4>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { key: 'original', label: '📷 Original' },
                  { key: 'ai',       label: '🤖 AI Detection' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setImageTab(key)}
                    style={{
                      padding: '6px 18px', borderRadius: 20, border: '1px solid',
                      borderColor: imageTab === key ? '#6366f1' : 'var(--border)',
                      background: imageTab === key ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: imageTab === key ? '#a5b4fc' : 'var(--text3)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Image display */}
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {shownImageUrl ? (
                  <>
                    <img
                      src={shownImageUrl}
                      alt={imageTab === 'original' ? 'Submitted' : 'AI Detection'}
                      style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                    <div style={{ display: 'none', height: 280, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text3)' }}>
                      <Eye size={32} /><span style={{ fontSize: '0.8rem' }}>Image not accessible</span>
                    </div>
                    <button
                      onClick={() => setLightbox(shownImageUrl)}
                      style={{
                        position: 'absolute', bottom: 10, right: 10,
                        background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 8,
                        color: '#fff', padding: '5px 12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem',
                      }}
                    ><ZoomIn size={14} /> Zoom</button>
                  </>
                ) : (
                  <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text3)' }}>
                    {imageTab === 'ai'
                      ? <><span style={{ fontSize: '2rem' }}>🤖</span><span style={{ fontSize: '0.8rem' }}>AI annotated image not available</span></>
                      : <><Eye size={32} /><span style={{ fontSize: '0.8rem' }}>No image submitted</span></>}
                  </div>
                )}
              </div>

              {/* AI label */}
              {imageTab === 'ai' && processedUrl && (
                <p style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700, marginTop: 8, textAlign: 'center', letterSpacing: 0.5 }}>
                  🧠 AI Verified Damage Detection — bounding boxes drawn by the model
                </p>
              )}

              {/* Detection badges under AI tab */}
              {imageTab === 'ai' && detections.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {detections.map((d, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: `${severityColors[d.severity] || '#64748b'}22`,
                      color: severityColors[d.severity] || '#94a3b8',
                      border: `1px solid ${severityColors[d.severity] || '#64748b'}55`,
                      borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {d.damage_type?.replace('_', ' ')} · {(d.confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Report Details */}
            <div className="grid-2" style={{ gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>📍 Location Details</h4>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Road Name</span><span className="detail-value">{r.road_name || 'Unknown'}</span></div>
                  <div className="detail-item"><span className="detail-label">Road Type</span><span className="detail-value" style={{ textTransform: 'capitalize' }}>{r.road_type || 'local'}</span></div>
                  <div className="detail-item"><span className="detail-label">Coordinates</span><span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.latitude?.toFixed(5)}, {r.longitude?.toFixed(5)}</span></div>
                  <div className="detail-item"><span className="detail-label">Traffic Density</span><span className="detail-value">{r.traffic_density?.toFixed(1)} / 5.0</span></div>
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>🔬 Damage Analysis</h4>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Damage Type</span><span className="detail-value" style={{ textTransform: 'capitalize' }}>{r.damage_type?.replace('_', ' ')}</span></div>
                  <div className="detail-item"><span className="detail-label">Severity</span><span className="detail-value" style={{ color: severityColors[r.severity], fontWeight: 700 }}>{r.severity?.toUpperCase()}</span></div>
                  <div className="detail-item"><span className="detail-label">Priority Score</span><span className="detail-value" style={{ color: r.priority_score > 7 ? '#ef4444' : r.priority_score > 4 ? '#f59e0b' : '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{r.priority_score?.toFixed(1)}</span></div>
                  <div className="detail-item"><span className="detail-label">Duplicate</span><span className="detail-value">{r.is_duplicate ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            </div>

            {/* Description */}
            {r.description && (
              <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>📝 Description</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{r.description}</p>
              </div>
            )}

            {/* AI Detections Table */}
            {detections.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>🧠 AI Detected Damages ({detections.length})</h4>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Type</th><th>Confidence</th><th>Width (cm)</th><th>Area (cm²)</th><th>Severity</th></tr></thead>
                    <tbody>
                      {detections.map((d, i) => (
                        <tr key={i}>
                          <td style={{ textTransform: 'capitalize' }}>{d.damage_type?.replace('_', ' ')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${d.confidence * 100}%`, height: '100%', background: d.confidence > 0.8 ? '#10b981' : d.confidence > 0.5 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{(d.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td>{d.width_cm?.toFixed(1) || '—'}</td>
                          <td>{d.area_cm2?.toFixed(0) || '—'}</td>
                          <td><span className={`badge badge-${d.severity}`}>{d.severity}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            {r.status === 'submitted' && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-success" onClick={() => { onStatusUpdate(r.id, 'verified'); onClose(); }}><CheckCircle size={16} /> Verify Report</button>
                <button className="btn btn-danger" onClick={() => { onStatusUpdate(r.id, 'rejected'); onClose(); }}><XCircle size={16} /> Reject</button>
                <button className="btn btn-secondary" onClick={() => { onStatusUpdate(r.id, 'duplicate'); onClose(); }}><Copy size={16} /> Mark Duplicate</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
