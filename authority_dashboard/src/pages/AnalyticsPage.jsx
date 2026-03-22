import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, CartesianGrid } from 'recharts';

const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/contractors'),
      api.get('/analytics/heatmap'),
    ]).then(([s,c,h]) => { setStats(s); setContractors(c); setHeatmap(h); })
      .catch(console.error).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const severityData = stats ? [
    { name: 'Critical', value: stats.severity_breakdown.critical, fill:'#ef4444' },
    { name: 'High', value: stats.severity_breakdown.high, fill:'#f59e0b' },
    { name: 'Medium', value: stats.severity_breakdown.medium, fill:'#6366f1' },
    { name: 'Low', value: stats.severity_breakdown.low, fill:'#10b981' },
  ].filter(d=>d.value>0) : [];

  const contractorData = contractors.map(c => ({
    name: c.company_name?.slice(0,15),
    rating: c.rating * 20,
    quality: c.avg_quality_score,
    completion: c.completion_rate * 100,
    jobs: c.completed_jobs,
  }));

  const statusData = heatmap.reduce((acc, r) => {
    const s = r.severity || 'unknown';
    acc[s] = (acc[s]||0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h2>Analytics & Insights</h2>
        <p>City road health metrics, contractor performance, and damage trends</p>
      </div>
      <div className="page-content">
        {/* Summary cards */}
        <div className="stats-grid" style={{marginBottom:24}}>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(16,185,129,0.15)'}}>🏙️</div>
            <div>
              <div className="stat-value" style={{color:'#10b981'}}>{stats?.road_health_score}%</div>
              <div className="stat-label">Road Health</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(99,102,241,0.15)'}}>📊</div>
            <div>
              <div className="stat-value" style={{color:'#6366f1'}}>{stats?.avg_priority_score}</div>
              <div className="stat-label">Avg Priority</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(239,68,68,0.15)'}}>⚠️</div>
            <div>
              <div className="stat-value" style={{color:'#ef4444'}}>{stats?.severity_breakdown?.critical}</div>
              <div className="stat-label">Critical Issues</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{marginBottom:20}}>
          {/* Severity */}
          <div className="card">
            <div className="card-header"><span className="card-title">Damage Severity Distribution</span></div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" nameKey="name" paddingAngle={3}>
                  {severityData.map((d,i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Contractor performance bars */}
          <div className="card">
            <div className="card-header"><span className="card-title">Contractor Performance</span></div>
            {contractorData.length === 0 ? (
              <div className="empty-state"><p>No contractor data yet</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contractorData}>
                  <XAxis dataKey="name" stroke="var(--text3)" fontSize={11} />
                  <YAxis stroke="var(--text3)" fontSize={11} />
                  <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8}} />
                  <Bar dataKey="quality" name="Quality Score" fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="completion" name="Completion %" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Heatmap summary */}
        <div className="card">
          <div className="card-header"><span className="card-title">Damage Hotspots ({heatmap.length} total points)</span></div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:8}}>
            {Object.entries(statusData).map(([sev,count]) => (
              <div key={sev} style={{background:'var(--bg)',borderRadius:8,padding:'12px 20px',textAlign:'center'}}>
                <div style={{fontSize:'1.4rem',fontWeight:700}}>{count}</div>
                <div style={{fontSize:'0.75rem',color:'var(--text3)',textTransform:'capitalize'}}>{sev}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
