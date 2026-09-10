import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP, resendOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import './auth.css';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      navigate('/signup');
    }
  }, [location, navigate]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await verifyOTP(email, otpCode);
      loginUser(data.user, data.token);
      setMessage('Email verified! Redirecting...');
      setTimeout(() => {
        navigate(`/${data.user.role}-dashboard`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    
    setResending(true);
    setError('');
    setMessage('');
    try {
      await resendOTP(email);
      setMessage('A new OTP has been sent to your email.');
      setTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Mail size={32} /></div>
          <h1 className="auth-title">Verify Email</h1>
          <p className="auth-subtitle">We've sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {error && <div className="alert-error"><AlertTriangle size={16} /> {error}</div>}
        {message && <div className="alert-success"><CheckCircle size={16} /> {message}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="otp-container" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                className="otp-input"
                style={{
                  width: '50px',
                  height: '64px',
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-blue)';
                  e.target.style.backgroundColor = '#fff';
                  e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
                  e.target.select();
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.backgroundColor = 'var(--bg-main)';
                  e.target.style.boxShadow = 'none';
                }}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))}
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="auth-switch">
          <p>Didn't receive the code?</p>
          <button 
            onClick={handleResend} 
            disabled={resending || timer > 0}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: (timer > 0) ? 'var(--text-light)' : 'var(--primary-blue)', 
              cursor: (timer > 0) ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              textDecoration: (timer > 0) ? 'none' : 'underline',
              marginTop: '0.75rem',
              fontSize: '0.95rem'
            }}
          >
            {resending ? 'Sending...' : timer > 0 ? `Resend code in ${timer}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
