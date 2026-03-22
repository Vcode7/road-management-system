import React, { useEffect, useState } from 'react';
import { MapPin, Clock, AlertTriangle, DollarSign, Send } from 'lucide-react';
import api from '../api.js';

export default function MarketplacePage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidJobId, setBidJobId] = useState(null);
  const [bidForm, setBidForm] = useState({ price:'', repair_time_days:'', materials:'', notes:'' });

  useEffect(() => {
    api.get('/jobs').then(data => setJobs(data.filter(j=>j.status==='open'||j.status==='bidding')))
      .catch(console.error).finally(()=>setLoading(false));
  }, []);

  const submitBid = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/bid`, {
        price: parseFloat(bidForm.price),
        repair_time_days: parseFloat(bidForm.repair_time_days),
        materials: bidForm.materials.split(',').map(m=>m.trim()).filter(Boolean),
        notes: bidForm.notes,
      });
      setBidJobId(null);
      setBidForm({ price:'', repair_time_days:'', materials:'', notes:'' });
      alert('Bid submitted successfully!');
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h2>Job Marketplace</h2>
        <p>Browse available repair jobs and submit competitive bids</p>
      </div>
      <div className="page-content">
        {jobs.length === 0 ? (
          <div className="card"><div className="empty-state"><p>No open jobs available at the moment.</p></div></div>
        ) : (
          <div style={{display:'grid',gap:16}}>
            {jobs.map(job => (
              <div key={job.id} className="job-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <h3 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:4}}>{job.title}</h3>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:'0.85rem',color:'var(--text2)'}}>
                      <span style={{display:'flex',alignItems:'center',gap:4}}><MapPin size={14}/> {job.address || `${job.latitude?.toFixed(3)}, ${job.longitude?.toFixed(3)}`}</span>
                      {job.deadline && <span style={{display:'flex',alignItems:'center',gap:4}}><Clock size={14}/> Due: {new Date(job.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={`badge badge-${job.status}`}>{job.status}</span>
                </div>
                {job.description && <p style={{fontSize:'0.875rem',color:'var(--text2)',marginBottom:12}}>{job.description}</p>}
                <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:12}}>
                  {job.estimated_cost && (
                    <div style={{background:'var(--bg)',borderRadius:8,padding:'8px 14px'}}>
                      <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>Est. Cost</div>
                      <div style={{fontWeight:700,color:'#f59e0b'}}>₹{job.estimated_cost?.toLocaleString()}</div>
                    </div>
                  )}
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'8px 14px'}}>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>Priority</div>
                    <div style={{fontWeight:700,color:job.priority_score>7?'#ef4444':'#f59e0b'}}>{job.priority_score?.toFixed(1)}</div>
                  </div>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'8px 14px'}}>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>Bids</div>
                    <div style={{fontWeight:700,color:'var(--primary)'}}>{job.bid_count}</div>
                  </div>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'8px 14px'}}>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>Reports</div>
                    <div style={{fontWeight:700}}>{job.report_count}</div>
                  </div>
                </div>

                {bidJobId === job.id ? (
                  <div className="bid-form">
                    <h4 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:12}}>Submit Your Bid</h4>
                    <div className="grid-2">
                      <div className="form-group">
                        <label>Bid Price (₹)</label>
                        <input className="form-control" type="number" placeholder="42000" value={bidForm.price} onChange={e=>setBidForm({...bidForm,price:e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Repair Time (days)</label>
                        <input className="form-control" type="number" placeholder="3" value={bidForm.repair_time_days} onChange={e=>setBidForm({...bidForm,repair_time_days:e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Materials (comma separated)</label>
                      <input className="form-control" placeholder="asphalt, bitumen, aggregate" value={bidForm.materials} onChange={e=>setBidForm({...bidForm,materials:e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea className="form-control" rows={2} placeholder="Additional details..." value={bidForm.notes} onChange={e=>setBidForm({...bidForm,notes:e.target.value})} />
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-primary" onClick={()=>submitBid(job.id)}><Send size={14}/> Submit Bid</button>
                      <button className="btn btn-secondary" onClick={()=>setBidJobId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={()=>setBidJobId(job.id)}><DollarSign size={14}/> Place Bid</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
