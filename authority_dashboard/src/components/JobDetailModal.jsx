import React, { useEffect, useState } from 'react';
import { X, DollarSign, Clock, Wrench, CheckCircle, XCircle, MessageSquare, User } from 'lucide-react';
import api from '../api.js';

export default function JobDetailModal({ job, onClose, onRefresh }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRepropose, setShowRepropose] = useState(null);
  const [reproForm, setReproForm] = useState({ suggested_price: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (job) {
      api.get(`/jobs/${job.id}/bids`)
        .then(setBids)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [job]);

  if (!job) return null;
  const j = job;

  const handleAccept = async (bidId) => {
    setActionLoading(true);
    try {
      await api.post(`/bids/${bidId}/accept`);
      onRefresh?.();
      onClose();
    } catch (e) { alert(e.message); }
    setActionLoading(false);
  };

  const handleReject = async (bidId) => {
    setActionLoading(true);
    try {
      await api.post(`/bids/${bidId}/reject`);
      const updated = await api.get(`/jobs/${job.id}/bids`);
      setBids(updated);
    } catch (e) { alert(e.message); }
    setActionLoading(false);
  };

  const handleRepropose = async (bidId) => {
    if (!reproForm.suggested_price) return alert('Enter a suggested price');
    setActionLoading(true);
    try {
      await api.post(`/bids/${bidId}/repropose`, {
        suggested_price: parseFloat(reproForm.suggested_price),
        notes: reproForm.notes,
      });
      setShowRepropose(null);
      setReproForm({ suggested_price: '', notes: '' });
      const updated = await api.get(`/jobs/${job.id}/bids`);
      setBids(updated);
    } catch (e) { alert(e.message); }
    setActionLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={20} color="var(--primary)" />
              {j.title}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 4 }}>{j.address || `${j.latitude?.toFixed(4)}, ${j.longitude?.toFixed(4)}`}</p>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Job Stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
            <div className="stat-card" style={{ padding: 14 }}>
              <div>
                <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                  <span className={`badge badge-${j.status}`}>{j.status?.replace('_', ' ')}</span>
                </div>
                <div className="stat-label">Status</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div>
                <div className="stat-value" style={{ fontSize: '1.25rem', color: '#f59e0b' }}>₹{j.estimated_cost?.toLocaleString() || '—'}</div>
                <div className="stat-label">Est. Cost</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div>
                <div className="stat-value" style={{ fontSize: '1.25rem', color: j.priority_score > 7 ? '#ef4444' : '#f59e0b' }}>{j.priority_score?.toFixed(1)}</div>
                <div className="stat-label">Priority</div>
              </div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div>
                <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--secondary)' }}>{j.report_count}</div>
                <div className="stat-label">Reports</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {j.description && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>📝 Description</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{j.description}</p>
            </div>
          )}

          {/* Progress Timeline */}
          {j.progress && j.progress.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>📊 Progress Timeline</h4>
              <div className="timeline">
                {j.progress.map((p, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{p.stage?.replace('_', ' ')}</span>
                      {p.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 2 }}>{p.notes}</p>}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{new Date(p.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bids Section */}
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 16, color: 'var(--text2)' }}>
              💰 Bids ({bids.length})
            </h4>

            {loading ? (
              <div className="loading" style={{ padding: 30 }}><div className="spinner" /></div>
            ) : bids.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <DollarSign size={32} />
                <p>No bids received yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bids.map(b => (
                  <div key={b.id} className="bid-card">
                    <div className="bid-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} color="#fff" />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Contractor</span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text3)', fontFamily: 'monospace' }}>{b.contractor_id?.slice(0, 8)}</span>
                        </div>
                      </div>
                      <span className={`badge badge-${b.status}`}>{b.status}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '12px 0' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bid Price</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>₹{b.price?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timeline</span>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{b.repair_time_days} days</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Score</span>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: b.ai_score > 70 ? '#10b981' : '#f59e0b' }}>{b.ai_score?.toFixed(0) || '—'}</div>
                      </div>
                    </div>

                    {b.materials && b.materials.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Materials</span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {b.materials.map((m, i) => (
                            <span key={i} style={{ padding: '2px 8px', background: 'var(--bg3)', borderRadius: 4, fontSize: '0.75rem', color: 'var(--text2)' }}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {b.notes && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 10, background: 'var(--bg)', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                        {b.notes}
                      </p>
                    )}

                    {/* Bid Actions */}
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleAccept(b.id)} disabled={actionLoading}>
                          <CheckCircle size={14} /> Accept
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(b.id)} disabled={actionLoading}>
                          <XCircle size={14} /> Reject
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowRepropose(showRepropose === b.id ? null : b.id)} disabled={actionLoading}>
                          <MessageSquare size={14} /> Repropose
                        </button>
                      </div>
                    )}

                    {/* Repropose Form */}
                    {showRepropose === b.id && (
                      <div style={{ marginTop: 12, padding: 14, background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--primary)' }}>💬 Counter-Offer</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Suggested Price (₹)</label>
                            <input className="form-control" type="number" placeholder="35000"
                              value={reproForm.suggested_price} onChange={e => setReproForm({ ...reproForm, suggested_price: e.target.value })} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Notes</label>
                            <input className="form-control" placeholder="Budget constraint, alternative materials..."
                              value={reproForm.notes} onChange={e => setReproForm({ ...reproForm, notes: e.target.value })} />
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => handleRepropose(b.id)} disabled={actionLoading}>
                          Send Counter-Offer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
