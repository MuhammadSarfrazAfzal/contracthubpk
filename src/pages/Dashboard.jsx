import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, FileText, Calendar, CheckCircle, Shield, Database, Rocket, LogOut, Hand } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const getInitials = (email) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="dashboard-wrapper">
      {/* Background orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* Navbar */}
      <nav className="dash-nav">
        <div className="dash-nav-brand">
          <span className="brand-icon"><Briefcase size={20} /></span>
          <span className="brand-name">ContracthubPK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="nav-contracts-btn"
            onClick={() => navigate('/contracts')}
            style={{
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-blue)',
              color: 'var(--primary-blue)',
              padding: '0.5rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.background = 'var(--primary-blue)'; 
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = 'var(--primary-light)'; 
              e.currentTarget.style.color = 'var(--primary-blue)';
            }}
          >
            <FileText size={16} /> Contracts
          </button>
          <button id="logout-btn" className="logout-btn" onClick={handleLogout}>
            <span>Sign Out</span>
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dash-main">
        {/* Welcome Card */}
        <div className="welcome-card">
          <div className="avatar">
            {getInitials(user?.email)}
          </div>
          <div className="welcome-text">
            <h1 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Welcome back! <Hand size={24} color="#f59e0b" />
            </h1>
            <p className="welcome-email">{user?.email}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={20} color="var(--primary-blue)" /></div>
            <div className="stat-info">
              <p className="stat-label">Member Since</p>
              <p className="stat-value">{formatDate(user?.createdAt)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><CheckCircle size={20} color="var(--success)" /></div>
            <div className="stat-info">
              <p className="stat-label">Account Status</p>
              <p className="stat-value" style={{ color: 'var(--success)' }}>Active</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Shield size={20} color="var(--primary-blue)" /></div>
            <div className="stat-info">
              <p className="stat-label">Authentication</p>
              <p className="stat-value">JWT Secured</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Database size={20} color="var(--warning)" /></div>
            <div className="stat-info">
              <p className="stat-label">Database</p>
              <p className="stat-value">MongoDB Atlas</p>
            </div>
          </div>
        </div>

        {/* Contracts Quick Access Card */}
        <div
          id="go-to-contracts"
          className="info-banner"
          onClick={() => navigate('/contracts')}
          style={{
            cursor: 'pointer',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'var(--shadow-md)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
            e.currentTarget.style.borderColor = 'var(--primary-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <div className="info-banner-icon"><FileText size={28} color="var(--primary-blue)" /></div>
          <div className="info-banner-content" style={{ flex: 1 }}>
            <h3 className="info-banner-title">Contract Management</h3>
            <p className="info-banner-text">
              Create, edit, and submit contracts with our professional in-app document editor.
            </p>
          </div>
          <div style={{
            background: 'var(--primary-blue)',
            color: '#fff',
            padding: '0.6rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.92rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          }}>
            Open →
          </div>
        </div>
        {/* Info Banner */}
        <div className="info-banner">
          <div className="info-banner-icon"><Rocket size={24} color="var(--success)" /></div>
          <div className="info-banner-content">
            <h3 className="info-banner-title">You're all set!</h3>
            <p className="info-banner-text">
              Your account is connected to ContracthubPK's secure infrastructure. You can now manage and sign contracts.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
