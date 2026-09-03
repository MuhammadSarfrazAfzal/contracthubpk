import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getContract, submitContract, deleteContract, requestApproval, respondToContract, approveContractWork, submitMilestoneWork, approveMilestone, requestCancellation } from '../api/contracts';
import { 
  Briefcase, FileText, Calendar, Clock, CheckCircle, 
  Trophy, AlertTriangle, Zap, Trash2, Pencil, 
  Download, Send, Check, XCircle, Ban, 
  Scale, Paperclip, CreditCard, ExternalLink,
  ChevronRight, LogOut
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import PaymentModal from '../components/PaymentModal';
import './Contracts.css';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

const formatCurrency = (v, cur = 'USD') =>
  v
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v)
    : '—';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ── Status Timeline ──────────────────────────────────────────────────────────
const StatusTimeline = ({ status, createdAt, updatedAt }) => {
  const steps = [
    { key: 'draft', label: 'Created', icon: <Pencil size={14} /> },
    { key: 'pending_approval', label: 'Pending', icon: <Clock size={14} /> },
    { key: 'active', label: 'Activated', icon: <Zap size={14} /> },
    { key: 'submitted', label: 'Submitted', icon: <CheckCircle size={14} /> },
    { key: 'completed', label: 'Completed', icon: <Trophy size={14} /> },
  ];

  const ORDER = { draft: 0, pending_approval: 1, active: 2, submitted: 3, completed: 4, rejected: -1 };
  const currentIdx = ORDER[status] ?? 0;

  if (status === 'rejected' || status === 'cancelled' || status === 'cancellation_pending') {
    const isPending = status === 'cancellation_pending';
    const isCancelled = status === 'cancelled';
    return (
      <div className="status-timeline">
        <div className="timeline-item">
          <div className="timeline-dot current" style={{ 
            background: isPending ? '#fbbf24' : '#ef4444', 
            borderColor: isPending ? '#fbbf24' : '#ef4444' 
          }}>
            {isPending ? <Scale size={14} /> : <Ban size={14} />}
          </div>
          <div className="timeline-info">
            <div className="timeline-label" style={{ color: isPending ? '#fbbf24' : '#ef4444' }}>
              {status === 'rejected' ? 'Rejected' : isCancelled ? 'Cancelled' : 'Cancellation Pending'}
            </div>
            <div className="timeline-date">{new Date(updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="status-timeline">
      {steps.map((step, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future';
        return (
          <div key={step.key} className="timeline-item">
            <div className={`timeline-dot ${state}`}>{step.icon}</div>
            <div className="timeline-info">
              <div className="timeline-label">{step.label}</div>
              <div className="timeline-date">
                {state !== 'future'
                  ? i === 0
                    ? new Date(createdAt).toLocaleString()
                    : new Date(updatedAt).toLocaleString()
                  : 'Pending'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── File Drop Zone ────────────────────────────────────────────────────────────
const FileDropZone = ({ file, onFileChange }) => (
  <div className={`file-drop-zone ${file ? 'has-file' : ''}`}>
    <input
      id="work-file-input"
      type="file"
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
      onChange={(e) => onFileChange(e.target.files[0] || null)}
    />
    {file ? (
      <>
        <div className="file-drop-icon"><Paperclip size={32} /></div>
        <div className="file-drop-text">
          <strong>{file.name}</strong>
        </div>
      </>
    ) : (
      <>
        <div className="file-drop-icon"><Download size={32} /></div>
        <div className="file-drop-text">
          <strong>Click to upload</strong> your work file
          <br />PDF, DOC, DOCX, JPG, PNG, ZIP · Max 20 MB
        </div>
      </>
    )}
  </div>
);

// ── Main Contract Detail Page ─────────────────────────────────────────────────
const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, logoutUser } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workFile, setWorkFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  
  const [milestoneFiles, setMilestoneFiles] = useState({});
  const [milestoneActioning, setMilestoneActioning] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMilestoneId, setPaymentMilestoneId] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getContract(token, id);
        setContract(data.contract);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setSubmitError('');
      const data = await submitContract(token, id, workFile);
      setContract(data.contract);
      setWorkFile(null);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContract(token, id);
      navigate('/contracts');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRequestApproval = async () => {
    try {
      setActioning(true);
      setActionError('');
      const data = await requestApproval(token, id);
      setContract(data.contract);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActioning(false);
    }
  };

  const handleRespond = async (action) => {
    try {
      setActioning(true);
      setActionError('');
      const data = await respondToContract(token, id, action);
      setContract(data.contract);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActioning(false);
    }
  };

  const handleApproveContract = async () => {
    try {
      setActioning(true);
      setActionError('');
      const data = await approveContractWork(token, id);
      setContract(data.contract);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActioning(false);
    }
  };

  const handleMilestoneFileChange = (milestoneId, file) => {
    setMilestoneFiles(prev => ({ ...prev, [milestoneId]: file }));
  };

  const handleMilestoneSubmit = async (milestoneId) => {
    try {
      setMilestoneActioning(milestoneId);
      setActionError('');
      const file = milestoneFiles[milestoneId];
      if (!file) throw new Error("Please select a file to submit for this milestone.");
      const data = await submitMilestoneWork(token, id, milestoneId, file);
      setContract(data.contract);
      setMilestoneFiles(prev => ({...prev, [milestoneId]: null}));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMilestoneActioning(null);
    }
  };

  const handleMilestoneApprove = async (milestoneId) => {
    try {
      setMilestoneActioning(milestoneId);
      setActionError('');
      const data = await approveMilestone(token, id, milestoneId);
      setContract(data.contract);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMilestoneActioning(null);
    }
  };

  const handleRequestCancellation = async () => {
    try {
      if (!cancelReason.trim()) throw new Error("Please provide a reason for cancellation.");
      setActioning(true);
      setActionError('');
      const data = await requestCancellation(token, id, cancelReason);
      setContract(data.contract);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="contracts-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-ring" />
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="contracts-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}><AlertTriangle size={64} color="#f87171" /></div>
        <p style={{ color: '#f87171' }}>{error}</p>
        <button className="btn-ghost" onClick={() => navigate('/contracts')}>← Back to Contracts</button>
      </div>
    );
  }

  const c = contract;
  const isSubmitted = c.status === 'submitted' || c.status === 'completed';
  const isCreator = c.user === user._id || (c.user && c.user._id && c.user._id === user._id) || user.role === 'client';
  const isFreelancer = user.role === 'freelancer' && c.freelancer;

  return (
    <div className="contracts-wrapper">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Navbar */}
      <nav className="c-nav">
        <div className="c-nav-left">
          <div className="c-nav-brand">
            <span className="brand-icon"><Briefcase size={20} /></span>
            <span>ContracthubPK</span>
          </div>
          <div className="c-nav-breadcrumb">
            <span>›</span>
            <Link to="/dashboard">Dashboard</Link>
            <span>›</span>
            <Link to="/contracts">Contracts</Link>
            <span>›</span>
            <strong style={{ color: 'var(--primary-blue)' }}>{c.title}</strong>
          </div>
        </div>
        <div className="c-nav-right">
          <NotificationBell />
          {!isSubmitted && (
            <button
              id="edit-contract-btn"
              className="btn-primary"
              onClick={() => navigate(`/contracts/${id}/edit`)}
            >
              ✏️ Edit Contract
            </button>
          )}
          <button
            className="btn-ghost"
            onClick={() => { logoutUser(); navigate('/login'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Sign Out <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="contracts-main">
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{c.title}</h1>
              <span className={`status-badge ${c.status}`}>{c.status.replace('_', ' ')}</span>
            </div>
            <p className="page-subtitle">
              Created {new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isSubmitted && (
              <button
                id="edit-btn-header"
                className="btn-ghost"
                onClick={() => navigate(`/contracts/${id}/edit`)}
              >
                ✏️ Edit
              </button>
            )}
            <button
              id="delete-contract-btn"
              className="btn-danger"
              onClick={() => setDeleteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        {error && <div className="error-banner"><AlertTriangle size={16} /> {error}</div>}

        <div className="detail-layout">
          {/* ── Document Preview ──────────────────────────────────── */}
          <div className="doc-preview">
            <div className="doc-preview-header">
              <div className="doc-preview-dots">
                <div className="doc-preview-dot" />
                <div className="doc-preview-dot" />
                <div className="doc-preview-dot" />
              </div>
              <div className="doc-preview-title-label">CONTRACT DOCUMENT</div>
              <span className={`status-badge ${c.status}`}>{c.status}</span>
            </div>

            <div className="doc-preview-body">
              {/* Title */}
              <div className="doc-type-label" style={{ textAlign: 'center', color: 'var(--primary-blue)', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: '0.6rem' }}>
                CONTRACT AGREEMENT
              </div>
              <h2 className="preview-contract-title">{c.title}</h2>
              <p className="preview-contract-meta">
                {c.startDate && `Start: ${formatDate(c.startDate)}`}
                {c.startDate && c.endDate && ' · '}
                {c.endDate && `End: ${formatDate(c.endDate)}`}
                {(c.startDate || c.endDate) && c.value && ' · '}
                {c.value && `Value: ${formatCurrency(c.value, c.currency)}`}
              </p>

              {/* Parties */}
              {(c.partyA?.name || c.partyB?.name) && (
                <div className="preview-parties">
                  <div className="preview-party-box">
                    <div className="preview-party-label">Party A</div>
                    <div className="preview-party-name">{c.partyA?.name || '—'}</div>
                    {c.partyA?.role && <div className="preview-party-role">{c.partyA.role}</div>}
                  </div>
                  <div className="vs-circle">AND</div>
                  <div className="preview-party-box">
                    <div className="preview-party-label">Party B</div>
                    <div className="preview-party-name">{c.partyB?.name || '—'}</div>
                    {c.partyB?.role && <div className="preview-party-role">{c.partyB.role}</div>}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {c.milestones && c.milestones.length > 0 && (
                <div className="preview-section">
                  <div className="preview-section-title">Milestones</div>
                  <div className="milestones-table" style={{ background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', padding: '0.75rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <div style={{ flex: 2 }}>Description</div>
                      <div style={{ flex: 1, textAlign: 'right' }}>Amount</div>
                      <div style={{ flex: 1, textAlign: 'right' }}>Due Date</div>
                    </div>
                    {c.milestones.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', fontSize: '0.85rem', borderBottom: i < c.milestones.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex' }}>
                          <div style={{ flex: 2, color: 'var(--text-main)' }}>{m.description}</div>
                          <div style={{ flex: 1, textAlign: 'right' }}>{formatCurrency(m.amount, c.currency)}</div>
                          <div style={{ flex: 1, textAlign: 'right', color: 'var(--text-muted)' }}>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '—'}</div>
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`status-badge ${m.status}`}>{m.status}</span>
                            <span className={`status-badge ${m.paymentStatus || 'unpaid'}`} style={{ opacity: 0.8 }}>
                              {m.paymentStatus === 'escrowed' ? '🛡️ Escrowed' : m.paymentStatus === 'released' ? '💰 Released' : '⏳ Unpaid'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {m.submittedFile && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Paperclip size={12} /> {m.submittedFile.originalName}
                                </div>
                                <a 
                                  href={`/uploads/${m.submittedFile.filename}`} 
                                  download={m.submittedFile.originalName}
                                  className="btn-ghost"
                                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                  title="Download Work"
                                >
                                  <Download size={12} /> Download
                                </a>
                              </div>
                            )}
                            
                            {/* Client deposits escrow for milestone */}
                            {isCreator && (m.paymentStatus === 'unpaid' || !m.paymentStatus) && c.status === 'active' && (
                              <button 
                                className="btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                onClick={() => { setPaymentMilestoneId(m._id); setIsPaymentModalOpen(true); }}
                              >
                                <CreditCard size={14} /> Deposit Escrow
                              </button>
                            )}

                            {/* Freelancer submits work */}
                            {isFreelancer && m.status === 'pending' && c.status === 'active' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                  type="file" 
                                  style={{ fontSize: '0.75rem', maxWidth: '180px' }}
                                  onChange={(e) => handleMilestoneFileChange(m._id, e.target.files[0])}
                                />
                                <button 
                                  className="btn-success" 
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => handleMilestoneSubmit(m._id)}
                                  disabled={milestoneActioning === m._id}
                                >
                                  {milestoneActioning === m._id ? '⏳' : 'Submit'}
                                </button>
                              </div>
                            )}
                            
                            {/* Client approves work */}
                            {isCreator && m.status === 'submitted' && (
                              <button 
                                className="btn-success" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleMilestoneApprove(m._id)}
                                disabled={milestoneActioning === m._id}
                              >
                                {milestoneActioning === m._id ? '⏳' : 'Approve'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract body */}
              <div className="preview-section">
                <div className="preview-section-title">Terms & Conditions</div>
                {c.content ? (
                  <div
                    className="preview-content"
                    dangerouslySetInnerHTML={{ __html: c.content }}
                  />
                ) : (
                  <div className="preview-content" data-empty="true">
                    No content added yet.
                  </div>
                )}
              </div>

              {/* Submitted file notice */}
              {isSubmitted && c.submittedFile && (
                <div className="preview-section">
                  <div className="preview-section-title">Submitted Work</div>
                  <div className="already-submitted">
                    <span className="already-submitted-icon"><Paperclip size={24} /></span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: 'var(--text-main)' }}>{c.submittedFile.originalName}</strong>
                      <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                        {formatFileSize(c.submittedFile.size)} ·{' '}
                        {new Date(c.submittedFile.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <a 
                      href={`/uploads/${c.submittedFile.filename}`} 
                      download={c.submittedFile.originalName}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Download size={16} /> Download Submitted Work
                    </a>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="preview-sigs">
                <div>
                  <div className="preview-sig-line" />
                  <div className="preview-sig-label">{c.partyA?.name || 'Party A'} — Signature</div>
                </div>
                <div>
                  <div className="preview-sig-line" />
                  <div className="preview-sig-label">{c.partyB?.name || 'Party B'} — Signature</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Detail Sidebar ────────────────────────────────────── */}
          <div className="detail-sidebar">
            {/* Status Timeline */}
            <div className="sidebar-card">
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 1rem', fontWeight: 600 }}>
                Status Timeline
              </h3>
              <StatusTimeline
                status={c.status}
                createdAt={c.createdAt}
                updatedAt={c.updatedAt}
              />
            </div>

            {/* Contract Info */}
            <div className="sidebar-card">
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 1rem', fontWeight: 600 }}>
                Contract Info
              </h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-key">Value</span>
                  <span className="info-val purple">{formatCurrency(c.value, c.currency)}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Start Date</span>
                  <span className="info-val">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">End Date</span>
                  <span className="info-val">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Status</span>
                  <span className={`status-badge ${c.status}`}>{c.status}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Payment</span>
                  <span className={`status-badge ${c.paymentStatus || 'unpaid'}`} style={{ 
                    background: c.paymentStatus === 'released' ? '#f0fdf4' : c.paymentStatus === 'escrowed' ? '#eff6ff' : '#f1f5f9',
                    color: c.paymentStatus === 'released' ? '#15803d' : c.paymentStatus === 'escrowed' ? '#1d4ed8' : 'var(--text-muted)'
                  }}>
                    {c.paymentStatus === 'escrowed' ? '🛡️ Escrowed' : c.paymentStatus === 'released' ? '💰 Released' : '⏳ Unpaid'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Escrowed</span>
                  <span className="info-val">{formatCurrency(c.escrowedAmount || 0, c.currency)}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Last Updated</span>
                  <span className="info-val" style={{ fontSize: '0.78rem' }}>
                    {new Date(c.updatedAt).toLocaleString()}
                  </span>
                </div>
                {c.freelancerEmail && (
                  <div className="info-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <span className="info-key">Assigned To</span>
                    <span className="info-val" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{c.freelancerEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Work — only visible if not submitted */}
            {!isSubmitted ? (
              <div className="submit-work-card">
                <h3>Submit Work</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
                  {!isFreelancer && c.status === 'active' 
                    ? 'Awaiting freelancer to submit their contract work.'
                    : c.status === 'active'
                      ? 'Upload your completed work file and submit this contract.'
                      : 'Set this contract to Active before submitting.'}
                </p>

                {c.status === 'active' && isFreelancer && (
                  <>
                    <FileDropZone file={workFile} onFileChange={setWorkFile} />
                    {workFile && (
                      <div className="file-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Paperclip size={14} /> {workFile.name} ({formatFileSize(workFile.size)})
                      </div>
                    )}
                    {submitError && (
                      <div className="error-banner" style={{ marginBottom: '0.75rem' }}>
                        <AlertTriangle size={16} /> {submitError}
                      </div>
                    )}
                    <button
                      id="submit-contract-btn"
                      className="btn-success"
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {submitting ? '⏳ Submitting…' : '🚀 Submit Contract'}
                    </button>
                  </>
                )}

                {c.status === 'draft' && isCreator && (
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', textAlign: 'center' }}
                    onClick={() => navigate(`/contracts/${id}/edit`)}
                  >
                    ✏️ Edit & Activate
                  </button>
                )}
              </div>
            ) : (
              <div className="submit-work-card">
                <h3>Work Submitted</h3>
                <div className="already-submitted">
                  <span className="already-submitted-icon"><CheckCircle size={24} color="#10b981" /></span>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Contract submitted!</strong>
                    {c.submittedFile && (
                      <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Paperclip size={12} /> {c.submittedFile.originalName}
                      </div>
                    )}
                  </div>
                </div>
                
                {isCreator && c.status === 'submitted' && (
                   <button 
                     className="btn-success" 
                     onClick={handleApproveContract} 
                     disabled={actioning} 
                     style={{marginTop: '1rem', width: '100%', justifyContent: 'center'}}
                   >
                     {actioning ? '⏳ Approving...' : '🏆 Approve Delivery'}
                   </button>
                )}
                
                {c.status === 'completed' && (
                   <div className="already-submitted" style={{marginTop: '1rem', background: 'rgba(34,197,94,0.1)'}}>
                     <span className="already-submitted-icon"><Trophy size={24} color="#10b981" /></span>
                     <div>
                        <strong style={{ color: '#22c55e' }}>Approved & Completed!</strong>
                     </div>
                   </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="sidebar-card">
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 1rem', fontWeight: 600 }}>
                Actions
              </h3>
              <div className="sidebar-actions">
                {actionError && (
                  <div className="error-banner" style={{ marginBottom: '0.75rem' }}>
                    <AlertTriangle size={16} /> {actionError}
                  </div>
                )}
                
                {/* Client Approval Request Button */}
                {isCreator && c.status === 'draft' && c.freelancerEmail && (
                  <button
                    className="btn-success"
                    onClick={handleRequestApproval}
                    disabled={actioning}
                    style={{ justifyContent: 'center', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {actioning ? '⏳ Sending…' : <><Send size={16} /> Send Approval Request</>}
                  </button>
                )}

                {/* Freelancer Approval Response Buttons */}
                {!isCreator && c.status === 'pending_approval' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                      className="btn-success"
                      onClick={() => handleRespond('approve')}
                      disabled={actioning}
                      style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {actioning ? '⏳…' : <><CheckCircle size={14} /> Approve</>}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleRespond('reject')}
                      disabled={actioning}
                      style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {actioning ? '⏳…' : <><XCircle size={14} /> Reject</>}
                    </button>
                  </div>
                )}

                {isCreator && c.status === 'active' && c.paymentStatus !== 'released' && c.paymentStatus !== 'escrowed' && (
                  <button
                    className="btn-primary"
                    onClick={() => { setPaymentMilestoneId(null); setIsPaymentModalOpen(true); }}
                    style={{ justifyContent: 'center', marginBottom: '0.5rem', background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <CreditCard size={16} /> Deposit Full Escrow
                  </button>
                )}

                {!isSubmitted && isCreator && (
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/contracts/${id}/edit`)}
                    style={{ justifyContent: 'center', marginBottom: '0.5rem' }}
                  >
                    ✏️ Edit Contract
                  </button>
                )}

                {/* Cancel Project Request */}
                {(c.status === 'active' || c.status === 'pending_approval') && (
                  <button
                    className="btn-danger"
                    onClick={() => setShowCancelModal(true)}
                    style={{ justifyContent: 'center', marginBottom: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                  >
                    🚫 Request Cancellation
                  </button>
                )}

                <button
                  className="btn-ghost"
                  onClick={() => navigate('/contracts')}
                  style={{ textAlign: 'center' }}
                >
                  ← All Contracts
                </button>
                <button
                  className="btn-danger"
                  onClick={() => setDeleteModal(true)}
                  style={{ textAlign: 'center' }}
                >
                  🗑️ Delete Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        contract={c}
        token={token}
        milestoneId={paymentMilestoneId}
        onSuccess={(updatedContract) => setContract(updatedContract)}
      />

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '450px' }}>
            <div className="modal-icon"><Ban size={48} color="#ef4444" /></div>
            <h3>Request Cancellation</h3>
            <p>Please provide a reason why you want to cancel this project. An administrator will review your request.</p>
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason here..."
              style={{ width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', marginTop: '1rem', fontFamily: 'inherit' }}
            />
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-ghost" onClick={() => setShowCancelModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleRequestCancellation} disabled={actioning}>
                {actioning ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">🗑️</div>
            <h3>Delete Contract?</h3>
            <p>
              Are you sure you want to delete{' '}
              <strong style={{ color: '#fff' }}>"{c.title}"</strong>? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
              <button id="confirm-delete-btn" className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
