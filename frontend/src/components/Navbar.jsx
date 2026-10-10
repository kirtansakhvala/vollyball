import React from 'react';
import { Trophy, Shield, Swords, HardDrive, Lock, Unlock, Radio } from 'lucide-react';
import { getScorerPin, clearScorerPin } from '../api';

export default function Navbar({ currentView, setCurrentView, onOpenPinModal }) {
  const isUnlocked = Boolean(getScorerPin());

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'rgba(7, 11, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1350px',
        margin: '0 auto',
        padding: '0 20px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setCurrentView('tournaments')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px', height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
            color: '#050b14'
          }}>
            <Radio size={22} style={{ animation: 'pulse-dot 2s infinite' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                VOLLEY<span style={{ color: 'var(--color-cyan)' }}>PRO</span>
              </span>
              <span className="badge" style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-cyan)', fontSize: '0.65rem' }}>
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${currentView === 'tournaments' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('tournaments')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Trophy size={16} />
            <span>Tournaments</span>
          </button>

          <button
            className={`btn ${currentView === 'teams' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('teams')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Shield size={16} />
            <span>Teams & Rosters</span>
          </button>

          <button
            className={`btn ${currentView === 'matches' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('matches')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <Swords size={16} />
            <span>Matches</span>
          </button>

          <button
            className={`btn ${currentView === 'system' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentView('system')}
            style={{ padding: '8px 14px', fontSize: '0.9rem' }}
          >
            <HardDrive size={16} />
            <span>Storage & Health</span>
          </button>
        </nav>

        {/* PIN Auth indicator */}
        <div>
          {isUnlocked ? (
            <button
              className="btn"
              onClick={() => {
                clearScorerPin();
                window.location.reload();
              }}
              style={{
                background: 'rgba(0, 230, 118, 0.1)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                color: 'var(--color-emerald)',
                padding: '6px 12px',
                fontSize: '0.8rem'
              }}
              title="Click to lock scorer mode"
            >
              <Unlock size={14} />
              <span>Scorer Unlocked</span>
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={onOpenPinModal}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Lock size={14} />
              <span>Unlock Scorer</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
