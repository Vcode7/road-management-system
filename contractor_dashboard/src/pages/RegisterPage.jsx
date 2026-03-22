import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', company_name: '', license_number: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.company_name) { setError('Company name is required'); return; }

    setLoading(true);
    try {
      // Step 1: Register user
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'contractor',
        phone: form.phone || null,
      });

      // Step 2: Set token and create contractor profile
      const token = res.access_token;
      api.token = token;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(res.user));

      await api.post('/contractors/profile', {
        company_name: form.company_name,
        license_number: form.license_number || null,
        specialization: ['pothole', 'crack'],
      });

      // Step 3: Login via context
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{width: 480}}>
        <div className="login-logo">
          <h1>🛣️ Sadak Kadak</h1>
          <p>Create Contractor Account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" value={form.name} onChange={set('name')} placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input className="form-control" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input className="form-control" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" required />
            </div>
          </div>

          <div style={{borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16}}>
            <p style={{fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600, marginBottom: 12}}>COMPANY DETAILS</p>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Company Name</label>
              <input className="form-control" value={form.company_name} onChange={set('company_name')} placeholder="YourCompany Pvt Ltd" required />
            </div>
            <div className="form-group">
              <label>License Number</label>
              <input className="form-control" value={form.license_number} onChange={set('license_number')} placeholder="DL-CON-2024-XXX" />
            </div>
          </div>

          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'12px', marginTop: 8}} disabled={loading}>
            {loading ? 'Creating Account...' : '🚀 Create Contractor Account'}
          </button>
        </form>

        <div style={{textAlign: 'center', marginTop: 20}}>
          <span style={{color: 'var(--text3)', fontSize: '0.85rem'}}>Already have an account? </span>
          <Link to="/login" style={{color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none'}}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
