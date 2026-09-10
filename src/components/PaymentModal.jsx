import React, { useState } from 'react';
import { depositEscrow, sendPaymentOTP } from '../api/payments';
import './PaymentModal.css';

const PaymentModal = ({ isOpen, onClose, contract, milestoneId, onSuccess, token }) => {
  const [method, setMethod] = useState('easypaisa');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Details, 2: OTP Verification

  if (!isOpen) return null;

  const amount = milestoneId 
    ? contract.milestones.find(m => m._id === milestoneId)?.amount 
    : contract.value;

  const handlePay = async () => {
    if (step === 1) {
      if (!phone || phone.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }
      
      setLoading(true);
      setError('');
      try {
        await sendPaymentOTP(token, amount, contract.currency);
        setStep(2);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP sent to your email');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload = {
        contractId: contract._id,
        milestoneId: milestoneId || null,
        amount,
        method,
        senderPhone: phone,
        transactionId: `TXN-${Math.floor(Math.random() * 1000000000)}`,
        otp: otp,
      };

      const data = await depositEscrow(token, payload);
      onSuccess(data.contract);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-box">
        <button className="close-modal" onClick={onClose}>&times;</button>
        
        <div className="payment-modal-header">
          <h2>Secure Escrow Payment</h2>
          <p>The system will hold your funds until work is approved.</p>
        </div>

        {step === 1 ? (
          <>
            <div className="method-selector">
              <div 
                className={`method-card ${method === 'easypaisa' ? 'active' : ''}`}
                onClick={() => setMethod('easypaisa')}
              >
                <div style={{ background: '#22c55e', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>EP</div>
                <span className="method-name">EasyPaisa</span>
              </div>
              <div 
                className={`method-card ${method === 'jazzcash' ? 'active' : ''}`}
                onClick={() => setMethod('jazzcash')}
              >
                <div style={{ background: '#ef4444', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>JC</div>
                <span className="method-name">JazzCash</span>
              </div>
            </div>

            <div className="payment-form">
              <div className="input-group">
                <label>{method.toUpperCase()} Mobile Number</label>
                <input 
                  type="text" 
                  placeholder="03xx xxxxxxx" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="payment-form" style={{ textAlign: 'center' }}>
            <div className="input-group">
              <label>Enter 6-Digit Verification Code</label>
              <input 
                type="text" 
                placeholder="******" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                A verification code has been sent to your registered email address.
              </p>
            </div>
          </div>
        )}

        {error && <div className="error-banner" style={{ marginTop: '1rem' }}>{error}</div>}

        <div className="payment-summary">
          <span className="summary-label">Total to deposit:</span>
          <span className="summary-value">{amount} {contract.currency}</span>
        </div>

        <button 
          className="pay-btn" 
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? 'Processing...' : step === 1 ? 'Continue to Pay' : 'Confirm Escrow'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '1.5rem' }}>
          By continuing, you agree to our Escrow Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default PaymentModal;
