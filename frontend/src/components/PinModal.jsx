import React, { useState } from 'react';
import { Lock, Key, CheckCircle, AlertCircle, X } from 'lucide-react';
import { apiRequest, setScorerPin, getScorerPin } from '../api';

export default function PinModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState(getScorerPin() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleVerify(e) {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your Scorer PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/auth/verify', 'POST', { pin: pin.trim() });
      if (res.authenticated) {
        setScorerPin(pin.trim());
        if (onSuccess) onSuccess(res);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(5, 9, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-panel-glow" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '30px',
        background: '#0d1527',
        position: 'relative',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px', right: '16px',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px',
            borderRadius: '50%',
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid var(--border-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--color-cyan)'
          }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Scorer Console Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter the tournament Scorer PIN or Admin Secret to record points and manage matches.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255, 23, 68, 0.15)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            color: '#ff5252',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Access PIN / Secret
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Default: 1234"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                  outline: 'none'
                }}
              />
              <Key size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              (Default local PIN: <code style={{ color: 'var(--color-cyan)' }}>1234</code>)
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
          >
            {loading ? 'Verifying...' : 'Unlock Scorer Controls'}
          </button>
        </form>
      </div>
    </div>
  );
}
