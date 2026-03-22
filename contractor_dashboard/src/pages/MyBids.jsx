import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import api from '../api.js';

export default function MyBidsPage() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/my-bids').then(setBids).catch(console.error).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h2>My Bids</h2>
        <p>Track the status of all your submitted bids</p>
      </div>
      <div className="page-content">
        {bids.length === 0 ? (
          <div className="card"><div className="empty-state"><DollarSign size={40}/><p>You haven't placed any bids yet. Check the marketplace!</p></div></div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Job ID</th><th>Price</th><th>Time</th><th>Materials</th><th>AI Score</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {bids.map(b => (
                    <tr key={b.id}>
                      <td style={{fontFamily:'monospace',fontSize:'0.8rem',color:'var(--text3)'}}>{b.job_id?.slice(0,8)}</td>
                      <td style={{fontWeight:700,color:'#f59e0b'}}>₹{b.price?.toLocaleString()}</td>
                      <td>{b.repair_time_days} day{b.repair_time_days!==1?'s':''}</td>
                      <td style={{fontSize:'0.8rem',color:'var(--text2)'}}>{b.materials?.join(', ') || '—'}</td>
                      <td>
                        {b.ai_score != null ? (
                          <span style={{fontWeight:700,color:b.ai_score>70?'#10b981':b.ai_score>40?'#f59e0b':'#ef4444'}}>{b.ai_score}</span>
                        ) : '—'}
                      </td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td style={{fontSize:'0.8rem',color:'var(--text2)'}}>{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
