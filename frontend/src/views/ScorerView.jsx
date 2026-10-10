import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, RotateCcw, Play, Pause, Square, Shuffle, 
  Timer, Users, Radio, Activity, CheckCircle2, ChevronRight, Eye, Shield, Volume2, ExternalLink
} from 'lucide-react';
import { apiRequest, createMatchWebSocket } from '../api';

export default function ScorerView({ matchId, onBack, onOpenPinModal }) {
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [swapEnds, setSwapEnds] = useState(false);
  const [timeoutTimer, setTimeoutTimer] = useState(null); // seconds left in timeout
  const [activeTimeoutTeam, setActiveTimeoutTeam] = useState('');
  const [subModal, setSubModal] = useState(false);
  const [subTeam, setSubTeam] = useState('team_a');
  const [subDetail, setSubDetail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadMatch();
    loadEvents();

    // Setup WebSocket
    const ws = createMatchWebSocket(
      matchId,
      (data) => {
        if (data.type === 'MATCH_UPDATE' && data.match) {
          setMatch(data.match);
          loadEvents();
        }
      },
      (status) => setWsStatus(status)
    );

    // Keyboard shortcuts
    function handleKeyDown(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'a' || e.key === 'A') handleScoringAction('point_team_a');
      if (e.key === 'b' || e.key === 'B') handleScoringAction('point_team_b');
      if (e.key === 'u' || e.key === 'U') handleScoringAction('undo');
      if (e.key === 'e' || e.key === 'E') setSwapEnds(prev => !prev);
      if (e.key === ' ') {
        e.preventDefault();
        if (match?.status === 'live') handleScoringAction('pause');
        else if (match?.status === 'paused' || match?.status === 'scheduled') handleScoringAction('start');
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      ws.close();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [matchId]);

  // Timeout countdown interval
  useEffect(() => {
    if (timeoutTimer === null) return;
    if (timeoutTimer <= 0) {
      setTimeoutTimer(null);
      return;
    }
    const timer = setInterval(() => {
      setTimeoutTimer(prev => (prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeoutTimer]);

  async function loadMatch() {
    setLoading(true);
    try {
      const data = await apiRequest(`/matches/${matchId}`);
      setMatch(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    try {
      const data = await apiRequest(`/matches/${matchId}/events`);
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleScoringAction(action, extraPayload = {}) {
    setErrorMsg('');
    try {
      const updated = await apiRequest(`/matches/${matchId}/action`, 'POST', {
        action,
        ...extraPayload
      });
      setMatch(updated);
      loadEvents();

      if (action === 'timeout_team_a') {
        setActiveTimeoutTeam(match.team_a?.name || 'Team A');
        setTimeoutTimer(30);
      } else if (action === 'timeout_team_b') {
        setActiveTimeoutTeam(match.team_b?.name || 'Team B');
        setTimeoutTimer(30);
      }
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        setErrorMsg(err.message);
      }
    }
  }

  if (loading || !match) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <Activity size={36} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px' }}>Connecting to Scorer Console...</p>
      </div>
    );
  }

  // Get current active set
  const currentSet = match.sets?.find(s => s.set_number === match.current_set_number) || { team_a_score: 0, team_b_score: 0 };
  const teamA = match.team_a || { name: 'Team A', short_name: 'TMA', primary_color: '#00e5ff' };
  const teamB = match.team_b || { name: 'Team B', short_name: 'TMB', primary_color: '#ff9100' };

  // Determine left and right team based on Swap Ends
  const leftTeam = swapEnds ? teamB : teamA;
  const rightTeam = swapEnds ? teamA : teamB;
  const leftTeamKey = swapEnds ? 'team_b' : 'team_a';
  const rightTeamKey = swapEnds ? 'team_a' : 'team_b';
  const leftScore = swapEnds ? currentSet.team_b_score : currentSet.team_a_score;
  const rightScore = swapEnds ? currentSet.team_a_score : currentSet.team_b_score;
  const leftSetsWon = swapEnds ? match.team_b_sets_won : match.team_a_sets_won;
  const rightSetsWon = swapEnds ? match.team_a_sets_won : match.team_b_sets_won;
  const leftTimeouts = swapEnds ? match.team_b_timeouts_remaining : match.team_a_timeouts_remaining;
  const rightTimeouts = swapEnds ? match.team_a_timeouts_remaining : match.team_b_timeouts_remaining;
  const leftRotation = swapEnds ? match.team_b_rotation : match.team_a_rotation;
  const rightRotation = swapEnds ? match.team_a_rotation : match.team_b_rotation;
  const isLeftServing = match.current_serving_team === leftTeamKey;
  const isRightServing = match.current_serving_team === rightTeamKey;

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '20px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
            <span>Matches</span>
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {match.tournament?.name || 'Exhibition Match'} • {match.court} • {match.stage}
            </div>
            <h1 style={{ fontSize: '1.4rem' }}>Official Scorer Console</h1>
          </div>
        </div>

        {/* Live status badge & switch to spectator view in new tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="badge" style={{
            background: wsStatus === 'connected' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 145, 0, 0.15)',
            color: wsStatus === 'connected' ? 'var(--color-emerald)' : 'var(--color-amber)',
            border: '1px solid currentColor'
          }}>
            <Radio size={12} style={{ animation: 'pulse-dot 1.5s infinite' }} />
            <span>{wsStatus === 'connected' ? 'LIVE SYNC' : 'CONNECTING...'}</span>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => window.open(`/live/${match.id}`, '_blank')}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Open Live Spectator Scoreboard in a new tab"
          >
            <ExternalLink size={16} />
            <span>Open Spectator View ↗</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div style={{
          background: 'rgba(255, 23, 68, 0.15)',
          border: '1px solid rgba(255, 23, 68, 0.3)',
          color: '#ff5252',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Set Summary Chips Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Set Tracker ({match.format.replace('_', ' ')}):
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {match.sets?.map((s) => (
              <span
                key={s.id}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: s.set_number === match.current_set_number ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.06)',
                  border: s.set_number === match.current_set_number ? '1px solid var(--color-cyan)' : '1px solid var(--border-subtle)',
                  color: s.set_number === match.current_set_number ? 'var(--color-cyan)' : 'var(--text-secondary)'
                }}
              >
                Set {s.set_number}: {s.team_a_score} - {s.team_b_score} {s.status === 'completed' ? '✓' : ''}
              </span>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Shortcuts: <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>A</kbd> (+1 Left) • <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>B</kbd> (+1 Right) • <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>U</kbd> (Undo)
        </div>
      </div>

      {/* Main Dual-Court Scoring Stadium UI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* LEFT COURT TEAM */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderTop: `4px solid ${leftTeam.primary_color || '#00e5ff'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Team Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center' }}>{leftTeam.name}</h2>
            {isLeftServing && (
              <span className="badge" style={{ background: 'rgba(0, 229, 255, 0.2)', color: 'var(--color-cyan)', border: '1px solid var(--color-cyan)' }}>
                ● SERVING
              </span>
            )}
          </div>

          {/* Sets Won Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sets Won:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-cyan)', background: 'rgba(0, 229, 255, 0.15)', padding: '2px 10px', borderRadius: 'var(--radius-sm)' }}>
              {leftSetsWon}
            </span>
          </div>

          {/* Giant Touch Score Button */}
          <div 
            className="score-touch-btn"
            onClick={() => handleScoringAction(`point_${leftTeamKey}`)}
            style={{
              width: '100%',
              maxWidth: '320px',
              height: '200px',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 153, 255, 0.05))',
              borderColor: isLeftServing ? 'var(--color-cyan)' : 'var(--border-subtle)',
              boxShadow: isLeftServing ? 'var(--shadow-glow-cyan)' : 'none',
              marginBottom: '20px'
            }}
          >
            <span className="digit-score" style={{ fontSize: '6.5rem', color: '#fff' }}>
              {leftScore}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-cyan)', fontWeight: 700, letterSpacing: '0.05em' }}>
              +1 POINT ({leftTeam.short_name || 'LEFT'})
            </span>
          </div>

          {/* Court Positions & Timeouts */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            {/* Timeouts */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Timeouts Left:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: idx <= leftTimeouts ? 'var(--color-cyan)' : 'rgba(255,255,255,0.1)',
                      boxShadow: idx <= leftTimeouts ? '0 0 8px var(--color-cyan)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Server Rotation</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                Pos #{leftRotation} {isLeftServing ? '🏐' : ''}
              </div>
            </div>

            {/* Timeout Button */}
            <button
              className="btn btn-secondary"
              onClick={() => handleScoringAction(`timeout_${leftTeamKey}`)}
              disabled={leftTimeouts <= 0 || match.status !== 'live'}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Timer size={14} />
              <span>Timeout (30s)</span>
            </button>
          </div>
        </div>

        {/* RIGHT COURT TEAM */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderTop: `4px solid ${rightTeam.primary_color || '#ff9100'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Team Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center' }}>{rightTeam.name}</h2>
            {isRightServing && (
              <span className="badge" style={{ background: 'rgba(255, 145, 0, 0.2)', color: 'var(--color-amber)', border: '1px solid var(--color-amber)' }}>
                ● SERVING
              </span>
            )}
          </div>

          {/* Sets Won Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sets Won:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-amber)', background: 'rgba(255, 145, 0, 0.15)', padding: '2px 10px', borderRadius: 'var(--radius-sm)' }}>
              {rightSetsWon}
            </span>
          </div>

          {/* Giant Touch Score Button */}
          <div 
            className="score-touch-btn"
            onClick={() => handleScoringAction(`point_${rightTeamKey}`)}
            style={{
              width: '100%',
              maxWidth: '320px',
              height: '200px',
              background: 'linear-gradient(135deg, rgba(255, 145, 0, 0.15), rgba(255, 94, 0, 0.05))',
              borderColor: isRightServing ? 'var(--color-amber)' : 'var(--border-subtle)',
              boxShadow: isRightServing ? 'var(--shadow-glow-amber)' : 'none',
              marginBottom: '20px'
            }}
          >
            <span className="digit-score" style={{ fontSize: '6.5rem', color: '#fff' }}>
              {rightScore}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-amber)', fontWeight: 700, letterSpacing: '0.05em' }}>
              +1 POINT ({rightTeam.short_name || 'RIGHT'})
            </span>
          </div>

          {/* Court Positions & Timeouts */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            {/* Timeouts */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Timeouts Left:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: idx <= rightTimeouts ? 'var(--color-amber)' : 'rgba(255,255,255,0.1)',
                      boxShadow: idx <= rightTimeouts ? '0 0 8px var(--color-amber)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Server Rotation</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                Pos #{rightRotation} {isRightServing ? '🏐' : ''}
              </div>
            </div>

            {/* Timeout Button */}
            <button
              className="btn btn-secondary"
              onClick={() => handleScoringAction(`timeout_${rightTeamKey}`)}
              disabled={rightTimeouts <= 0 || match.status !== 'live'}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Timer size={14} />
              <span>Timeout (30s)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Console Bar (Undo, Change Ends, Substitutions, Match Controls) */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleScoringAction('undo')}
            style={{ padding: '10px 18px' }}
          >
            <RotateCcw size={16} />
            <span>Undo Last Rally</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setSwapEnds(prev => !prev)}
            style={{ padding: '10px 18px' }}
          >
            <Shuffle size={16} />
            <span>Change Ends (Sides)</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSubTeam('team_a');
              setSubModal(true);
            }}
            style={{ padding: '10px 18px' }}
          >
            <Users size={16} />
            <span>Substitutions</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => handleScoringAction('set_serving_team', { serving_team: match.current_serving_team === 'team_a' ? 'team_b' : 'team_a' })}
            style={{ padding: '10px 18px' }}
          >
            <span>Switch Server 🏐</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {match.status === 'scheduled' || match.status === 'paused' ? (
            <button
              className="btn btn-primary"
              onClick={() => handleScoringAction('start')}
              style={{ padding: '10px 22px' }}
            >
              <Play size={16} />
              <span>{match.status === 'paused' ? 'Resume Match' : 'Start Match'}</span>
            </button>
          ) : match.status === 'live' ? (
            <button
              className="btn btn-secondary"
              onClick={() => handleScoringAction('pause')}
              style={{ padding: '10px 22px' }}
            >
              <Pause size={16} />
              <span>Pause Match</span>
            </button>
          ) : null}

          {match.status !== 'completed' && (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Finish this match and declare winner?')) {
                  handleScoringAction('finish');
                }
              }}
              style={{ padding: '10px 18px' }}
            >
              <Square size={16} />
              <span>Finish Match</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Event Feed Drawer */}
      <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} style={{ color: 'var(--color-cyan)' }} />
          <span>Match Event History (Live Feed)</span>
        </h3>

        {events.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No events recorded yet for this match.</p>
        ) : (
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {events.slice(0, 15).map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.7rem' }}>
                    S{ev.set_number}
                  </span>
                  <span>{ev.details}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-cyan)' }}>
                  {ev.team_a_score_after} - {ev.team_b_score_after}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeout Countdown Overlay Modal */}
      {timeoutTimer !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel-glow" style={{ padding: '40px', textAlign: 'center', maxWidth: '380px', width: '100%' }}>
            <Timer size={48} style={{ color: 'var(--color-amber)', margin: '0 auto 12px', animation: 'pulse-dot 1s infinite' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>TIMEOUT CALLED</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{activeTimeoutTeam}</p>
            <div className="digit-score" style={{ fontSize: '5rem', color: 'var(--color-amber)', marginBottom: '20px' }}>
              {timeoutTimer}s
            </div>
            <button className="btn btn-primary" onClick={() => setTimeoutTimer(null)} style={{ width: '100%' }}>
              Dismiss & Resume Rally
            </button>
          </div>
        </div>
      )}

      {/* Substitution Modal */}
      {subModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '28px', background: '#0e172a' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Record Substitution</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                className={`btn ${subTeam === 'team_a' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSubTeam('team_a')}
                style={{ flex: 1 }}
              >
                {match.team_a?.name || 'Team A'}
              </button>
              <button
                className={`btn ${subTeam === 'team_b' ? 'btn-amber' : 'btn-secondary'}`}
                onClick={() => setSubTeam('team_b')}
                style={{ flex: 1 }}
              >
                {match.team_b?.name || 'Team B'}
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Substitution Notes (e.g. #7 Out, #12 In)
              </label>
              <input
                type="text"
                value={subDetail}
                onChange={(e) => setSubDetail(e.target.value)}
                placeholder="Jersey numbers or player names"
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSubModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleScoringAction(`sub_${subTeam}`, { details: subDetail || `Substitution for ${subTeam === 'team_a' ? match.team_a?.name : match.team_b?.name}` });
                  setSubModal(false);
                  setSubDetail('');
                }}
                style={{ flex: 1 }}
              >
                Save Substitution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
