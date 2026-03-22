import React, { useEffect, useState } from 'react';
import { User, Star, Award, Save } from 'lucide-react';
import api from '../api.js';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ company_name:'', license_number:'', specialization:'', latitude:'', longitude:'', service_radius_km:50 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/contractors/profile/me')
      .then(p => { setProfile(p); setForm({ company_name: p.company_name||'', license_number: p.license_number||'', specialization: p.specialization?.join(', ')||'', latitude: p.latitude||'', longitude: p.longitude||'', service_radius_km: p.service_radius_km||50 }); })
      .catch(() => {})
      .finally(()=>setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        company_name: form.company_name,
        license_number: form.license_number,
        specialization: form.specialization.split(',').map(s=>s.trim()).filter(Boolean),
        latitude: parseFloat(form.latitude) || null,
        longitude: parseFloat(form.longitude) || null,
        service_radius_km: parseFloat(form.service_radius_km) || 50,
      };
      const result = await api.post('/contractors/profile', data);
      setProfile(result);
      alert('Profile saved!');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header"><h2>Contractor Profile</h2><p>Manage your company profile and settings</p></div>
      <div className="page-content">
        {/* Stats */}
        {profile && (
          <div className="stats-grid" style={{marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'rgba(251,191,36,0.15)'}}><Star size={22} color="#fbbf24"/></div>
              <div><div className="stat-value" style={{color:'#fbbf24'}}>{profile.rating?.toFixed(1)}</div><div className="stat-label">Rating</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'rgba(16,185,129,0.15)'}}><Award size={22} color="#10b981"/></div>
              <div><div className="stat-value" style={{color:'#10b981'}}>{profile.completed_jobs}</div><div className="stat-label">Completed</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'rgba(139,92,246,0.15)'}}>📊</div>
              <div><div className="stat-value" style={{color:'var(--primary)'}}>{(profile.completion_rate*100).toFixed(0)}%</div><div className="stat-label">Completion Rate</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'rgba(6,182,212,0.15)'}}>⭐</div>
              <div><div className="stat-value" style={{color:'#06b6d4'}}>{profile.average_quality_score?.toFixed(0)}</div><div className="stat-label">Quality Score</div></div>
            </div>
          </div>
        )}

        {/* Profile form */}
        <div className="card">
          <div className="card-header"><span className="card-title"><User size={18} style={{marginRight:8}}/>Company Information</span></div>
          <form onSubmit={saveProfile}>
            <div className="grid-2">
              <div className="form-group"><label>Company Name</label><input className="form-control" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})} required/></div>
              <div className="form-group"><label>License Number</label><input className="form-control" value={form.license_number} onChange={e=>setForm({...form,license_number:e.target.value})}/></div>
            </div>
            <div className="form-group"><label>Specializations (comma separated)</label><input className="form-control" placeholder="pothole, crack, road_collapse" value={form.specialization} onChange={e=>setForm({...form,specialization:e.target.value})}/></div>
            <div className="grid-2">
              <div className="form-group"><label>Base Latitude</label><input className="form-control" type="number" step="any" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></div>
              <div className="form-group"><label>Base Longitude</label><input className="form-control" type="number" step="any" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></div>
            </div>
            <div className="form-group"><label>Service Radius (km)</label><input className="form-control" type="number" value={form.service_radius_km} onChange={e=>setForm({...form,service_radius_km:e.target.value})}/></div>
            <button className="btn btn-primary" disabled={saving}><Save size={14}/> {saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
