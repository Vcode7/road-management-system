import React, { useEffect, useState } from 'react';
import { Users, Star, Award, TrendingUp } from 'lucide-react';
import api from '../api.js';

export default function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/contractors').then(setContractors).catch(console.error).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h2>Contractor Management</h2>
        <p>View registered contractors, their ratings, and past performance</p>
      </div>
      <div className="page-content">
        {contractors.length === 0 ? (
          <div className="card"><div className="empty-state"><Users size={40}/><p>No contractors registered yet</p></div></div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
            {contractors.map(c => (
              <div key={c.id} className="card" style={{display:'flex',flexDirection:'column',gap:14}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,var(--primary),var(--secondary))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1.1rem',flexShrink:0}}>
                    {c.company_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{fontSize:'1rem',fontWeight:600}}>{c.company_name}</h3>
                    <p style={{fontSize:'0.8rem',color:'var(--text3)'}}>License: {c.license_number || 'N/A'}</p>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,color:'#fbbf24'}}>
                      <Star size={14}/> <span style={{fontWeight:700,fontSize:'1.1rem'}}>{c.rating?.toFixed(1)}</span>
                    </div>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>Rating</div>
                  </div>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontWeight:700,fontSize:'1.1rem',color:'#10b981'}}>{c.completed_jobs}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>Completed</div>
                  </div>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontWeight:700,fontSize:'1.1rem',color:'#6366f1'}}>{(c.completion_rate*100).toFixed(0)}%</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>Completion Rate</div>
                  </div>
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontWeight:700,fontSize:'1.1rem',color:'#06b6d4'}}>{c.average_quality_score?.toFixed(0)}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:2}}>Quality Score</div>
                  </div>
                </div>
                {c.specialization?.length > 0 && (
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {c.specialization.map(s => (
                      <span key={s} className="badge badge-medium" style={{textTransform:'capitalize'}}>{s.replace('_',' ')}</span>
                    ))}
                  </div>
                )}
                <div style={{fontSize:'0.8rem',color: c.is_available==='true' ? '#10b981':'#ef4444'}}>
                  ● {c.is_available==='true' ? 'Available' : 'Busy'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
