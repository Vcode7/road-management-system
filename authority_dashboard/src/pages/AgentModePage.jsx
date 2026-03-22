import React, { useEffect, useState } from 'react';
import { Bot, Play, Zap, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../api.js';

export default function AgentModePage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const fetchPlans = () => {
    api.get('/agent/plans').then(setPlans).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(fetchPlans, []);

  const triggerAgent = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await api.post('/agent/run', {});
      setRunResult(result);
      fetchPlans();
    } catch (e) {
      setRunResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  };

  const statusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle size={16} color="#10b981" />;
      case 'failed': return <AlertTriangle size={16} color="#ef4444" />;
      default: return <Clock size={16} color="#f59e0b" />;
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><h2>AI Agent Mode</h2><p>Autonomous repair planning, contractor selection, and quality verification</p></div>
          <button className="btn btn-primary" onClick={triggerAgent} disabled={running}>
            {running ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/> Running...</> : <><Play size={16}/> Run Agent Cycle</>}
          </button>
        </div>
      </div>
      <div className="page-content">
        {/* Agent capabilities */}
        <div className="agent-banner">
          <div className="agent-indicator" />
          <div>
            <strong>Autonomous Agent System</strong>
            <p style={{fontSize:'0.85rem',color:'var(--text2)',marginTop:4}}>
              The AI agent automatically prioritizes reports, creates repair batches, optimizes bids, and verifies completed repairs.
            </p>
          </div>
        </div>

        {/* Capabilities grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:24}}>
          {[
            { icon: '🎯', title: 'Prioritization', desc: 'Score reports by severity × traffic × road importance' },
            { icon: '📦', title: 'Batch Planning', desc: 'Group nearby potholes to minimize travel cost' },
            { icon: '🏗️', title: 'Contractor Selection', desc: 'Multi-criteria rating, distance, quality scoring' },
            { icon: '💰', title: 'Bid Optimization', desc: 'IQR outlier rejection for fair pricing' },
            { icon: '🔍', title: 'Quality Verification', desc: 'AI before/after image comparison' },
            { icon: '🔄', title: 'Monitoring', desc: 'Track deadlines, progress, and reassign if needed' },
          ].map((c,i) => (
            <div key={i} className="card" style={{padding:16}}>
              <div style={{fontSize:'1.5rem',marginBottom:8}}>{c.icon}</div>
              <h4 style={{fontSize:'0.9rem',fontWeight:600,marginBottom:4}}>{c.title}</h4>
              <p style={{fontSize:'0.78rem',color:'var(--text3)'}}>{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Run result */}
        {runResult && (
          <div className="card" style={{marginBottom:20, borderColor: runResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}}>
            <div className="card-header">
              <span className="card-title">{runResult.error ? '❌ Agent Cycle Failed' : '✅ Agent Cycle Complete'}</span>
            </div>
            {runResult.error ? (
              <p style={{color:'#f87171'}}>{runResult.error}</p>
            ) : (
              <>
                <p style={{fontSize:'0.9rem',marginBottom:12}}>{runResult.summary}</p>
                {runResult.actions?.length > 0 && (
                  <div style={{background:'var(--bg)',borderRadius:8,padding:12,maxHeight:200,overflow:'auto'}}>
                    {runResult.actions.map((a,i) => (
                      <div key={i} style={{fontSize:'0.82rem',padding:'4px 0',color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>
                        <Zap size={12} style={{marginRight:6,color:'#f59e0b'}} />{a}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Plans history */}
        <div className="card">
          <div className="card-header"><span className="card-title">Agent Plan History</span></div>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : plans.length === 0 ? (
            <div className="empty-state"><Bot size={40}/><p>No agent plans yet. Run the agent to generate plans.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Status</th><th>Type</th><th>Summary</th><th>Jobs Created</th><th>Reports</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id}>
                      <td>{statusIcon(p.status)} <span style={{marginLeft:4,textTransform:'capitalize'}}>{p.status}</span></td>
                      <td style={{textTransform:'capitalize'}}>{p.plan_type?.replace('_',' ')}</td>
                      <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.summary || '—'}</td>
                      <td>{p.jobs_created?.length || 0}</td>
                      <td>{p.reports_processed?.length || 0}</td>
                      <td style={{fontSize:'0.8rem',color:'var(--text2)'}}>{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
