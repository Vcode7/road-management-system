import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Wrench, Users, TrendingUp, Map, Activity } from 'lucide-react';
import api from '../api.js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const severityData = stats ? [
    { name: 'Critical', value: stats.severity_breakdown.critical },
    { name: 'High', value: stats.severity_breakdown.high },
    { name: 'Medium', value: stats.severity_breakdown.medium },
    { name: 'Low', value: stats.severity_breakdown.low },
  ] : [];

  const statusData = stats ? [
    { name: 'Open', count: stats.open_reports },
    { name: 'In Progress', count: stats.in_progress },
    { name: 'Completed', count: stats.completed },
  ] : [];

  return (
    <>
      <div className="page-header">
        <h2>Command Dashboard</h2>
        <p>Real-time overview of road infrastructure status across the city</p>
      </div>
      <div className="page-content">
        {/* Stats grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(239,68,68,0.15)'}}>
              <AlertTriangle size={22} color="#ef4444" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#ef4444'}}>{stats?.total_reports ?? '-'}</div>
              <div className="stat-label">Total Reports</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(245,158,11,0.15)'}}>
              <Clock size={22} color="#f59e0b" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#f59e0b'}}>{stats?.open_reports ?? '-'}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(16,185,129,0.15)'}}>
              <CheckCircle size={22} color="#10b981" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#10b981'}}>{stats?.completed ?? '-'}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(99,102,241,0.15)'}}>
              <Wrench size={22} color="#6366f1" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#6366f1'}}>{stats?.total_jobs ?? '-'}</div>
              <div className="stat-label">Repair Jobs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(6,182,212,0.15)'}}>
              <Users size={22} color="#06b6d4" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#06b6d4'}}>{stats?.total_contractors ?? '-'}</div>
              <div className="stat-label">Contractors</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background:'rgba(16,185,129,0.2)'}}>
              <Activity size={22} color="#10b981" />
            </div>
            <div>
              <div className="stat-value" style={{color:'#10b981'}}>{stats?.road_health_score ?? '-'}%</div>
              <div className="stat-label">Road Health Score</div>
            </div>
          </div>
        </div>

        {/* Road health progress bar */}
        {stats && (
          <div className="card" style={{marginBottom:20}}>
            <div className="card-header">
              <span className="card-title">🏙️ City Road Health Index</span>
              <span style={{color:'var(--text2)', fontSize:'0.85rem'}}>{stats.road_health_score}/100</span>
            </div>
            <div style={{background:'var(--bg3)', borderRadius:'8px', height:'16px', overflow:'hidden'}}>
              <div style={{
                width:`${stats.road_health_score}%`,
                height:'100%',
                background: stats.road_health_score > 70
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : stats.road_health_score > 40
                  ? 'linear-gradient(90deg,#f59e0b,#fcd34d)'
                  : 'linear-gradient(90deg,#ef4444,#f87171)',
                transition: 'width 1s ease',
                borderRadius:'8px'
              }} />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Severity Breakdown</span></div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={4}>
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'8px'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Report Status</span></div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" stroke="var(--text3)" fontSize={12} />
                <YAxis stroke="var(--text3)" fontSize={12} />
                <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'8px'}} />
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
