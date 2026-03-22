import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ShoppingBag, Briefcase, DollarSign, User, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Job Marketplace', icon: ShoppingBag, exact: true },
  { to: '/my-jobs', label: 'My Jobs', icon: Briefcase },
  { to: '/my-bids', label: 'My Bids', icon: DollarSign },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🛣️ Sadak Kadak</h1>
          <p>Contractor Portal</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-meta"><p>{user?.name}</p><span>Contractor</span></div>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
