import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowLeft, Radio, Trophy, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiRequest, createMatchWebSocket } from '../api';

export default function LiveView({ matchId, onBack }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  useEffect(() => {
    loadMatch();

    const ws = createMatchWebSocket(
      matchId,
      (data) => {
        if (data.type === 'MATCH_UPDATE' && data.match) {
          setMatch(data.match);
          if (data.match.status === 'completed' && !hasCelebrated) {
            triggerConfetti();
            setHasCelebrated(true);
          }
        }
      },
      (status) => setWsStatus(status)
    );

    return () => ws.close();
  }, [matchId]);

  async function loadMatch() {
    setLoading(true);
    try {
      const data = await apiRequest(`/matches/${matchId}`);
      setMatch(data);
      if (data.status === 'completed' && !hasCelebrated) {
        triggerConfetti();
        setHasCelebrated(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function triggerConfetti() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  if (loading || !match) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <Activity size={36} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px' }}>Connecting to Live Spectator Scoreboard...</p>
      </div>
    );
  }

  const teamA = match.team_a || { name: 'Team A', short_name: 'TMA', primary_color: '#00e5ff' };
  const teamB = match.team_b || { name: 'Team B', short_name: 'TMB', primary_color: '#ff9100' };
  const currentSet = match.sets?.find(s => s.set_number === match.current_set_number) || { team_a_score: 0, team_b_score: 0 };
  const isTeamAServing = match.current_serving_team === 'team_a';
  const isTeamBServing = match.current_serving_team === 'team_b';
  const winnerTeam = match.winner_team_id === teamA.id ? teamA : match.winner_team_id === teamB.id ? teamB : null;

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      width: '100vw',
      maxWidth: '100vw',
      overflow: 'hidden',
      backgroundColor: '#040711',
      backgroundImage: `
        radial-gradient(circle at 20% 25%, ${teamA.primary_color || '#00e5ff'}25 0%, transparent 50%),
        radial-gradient(circle at 80% 25%, ${teamB.primary_color || '#ff9100'}25 0%, transparent 50%),
        linear-gradient(to bottom, #040711, #080e1e)
      `,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '8px 16px 0px',
      boxSizing: 'border-box'
    }}>
      {/* Minimal Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '38px', flexShrink: 0, padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button className="btn btn-secondary" onClick={onBack} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(0.9rem, 1.4vw, 1.3rem)', color: 'var(--color-cyan)', letterSpacing: '0.05em' }}>
              {match.tournament?.name ? match.tournament.name.toUpperCase() : 'VOLLEYPRO LIVE'}
            </span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', padding: '2px 10px' }}>
              SET {match.current_set_number}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="badge" style={{
            background: wsStatus === 'connected' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 145, 0, 0.15)',
            color: wsStatus === 'connected' ? 'var(--color-emerald)' : 'var(--color-amber)',
            border: '1px solid currentColor',
            padding: '3px 10px',
            fontSize: '0.75rem'
          }}>
            <Radio size={12} style={{ animation: 'pulse-dot 1.5s infinite' }} />
            <span>{wsStatus === 'connected' ? 'LIVE' : 'CONNECTING...'}</span>
          </div>

          <button
            className="btn btn-secondary"
            onClick={toggleFullscreen}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'TV Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Side Big Stadium Display with White Center Divider Line */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        margin: '0 auto',
        padding: '4px 0 0',
        boxSizing: 'border-box',
        minHeight: 0
      }}>
        {/* Left Side: Team A (Topmost Name + Centered Score) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'center',
          height: '100%',
          padding: '0 16px',
          boxSizing: 'border-box',
          minHeight: 0
        }}>
          {/* Synchronized Header Area: Team A Name (Further Increased Size) */}
          <div style={{
            height: 'clamp(5.2rem, 12vh, 9.5rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexShrink: 0,
            marginTop: 'clamp(4px, 1vh, 12px)'
          }}>
            <h1 style={{
              fontSize: 'clamp(3.2rem, 8vw, 8.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0',
              padding: '0',
              color: teamA.primary_color || '#00e5ff',
              textShadow: `0 0 45px ${teamA.primary_color || '#00e5ff'}88`,
              lineHeight: 0.95,
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              {teamA.name}
            </h1>
          </div>

          {/* Exactly Centered Team A Score on Same Level */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 0
          }}>
            <div className="digit-score" style={{
              fontSize: 'min(58vh, 35vw)',
              fontWeight: 900,
              color: '#d1d5db',
              lineHeight: 0.78,
              letterSpacing: '-0.04em',
              textShadow: isTeamAServing
                ? `0 0 28px ${teamA.primary_color || '#00e5ff'}55`
                : '0 4px 16px rgba(0,0,0,0.6)',
              userSelect: 'none'
            }}>
              {currentSet.team_a_score}
            </div>
          </div>
        </div>

        {/* Right Side: Team B (Topmost Name + Centered Score) with Solid White Center Line */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'center',
          height: '100%',
          padding: '0 16px',
          boxSizing: 'border-box',
          minHeight: 0,
          borderLeft: '4px solid #ffffff',
          boxShadow: '-2px 0 15px rgba(255, 255, 255, 0.25)'
        }}>
          {/* Synchronized Header Area: Team B Name (Further Increased Size) */}
          <div style={{
            height: 'clamp(5.2rem, 12vh, 9.5rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexShrink: 0,
            marginTop: 'clamp(4px, 1vh, 12px)'
          }}>
            <h1 style={{
              fontSize: 'clamp(3.2rem, 8vw, 8.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0',
              padding: '0',
              color: teamB.primary_color || '#ff9100',
              textShadow: `0 0 45px ${teamB.primary_color || '#ff9100'}88`,
              lineHeight: 0.95,
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              {teamB.name}
            </h1>
          </div>

          {/* Exactly Centered Team B Score on Same Level */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 0
          }}>
            <div className="digit-score" style={{
              fontSize: 'min(62vh, 37vw)',
              fontWeight: 900,
              color: '#d1d5db',
              lineHeight: 0.78,
              letterSpacing: '-0.04em',
              textShadow: isTeamBServing
                ? `0 0 28px ${teamB.primary_color || '#ff9100'}55`
                : '0 4px 16px rgba(0,0,0,0.6)',
              userSelect: 'none'
            }}>
              {currentSet.team_b_score}
            </div>
          </div>
        </div>
      </div>

      {/* Match Completed Banner (if finished) */}
      {winnerTeam && (
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          background: 'rgba(255, 145, 0, 0.15)',
          border: '1px solid var(--color-amber)',
          borderRadius: 'var(--radius-md)',
          margin: '4px auto 0',
          maxWidth: '500px',
          width: '100%',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-amber)' }}>
            🏆 VICTORY: {winnerTeam.name.toUpperCase()} ({match.team_a_sets_won} - {match.team_b_sets_won})
          </span>
        </div>
      )}
    </div>
  );
}
