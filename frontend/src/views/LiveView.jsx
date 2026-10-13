import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiRequest, createMatchWebSocket } from '../api';

const POINT_COLOR = 'rgba(133, 175, 228, 1)'; // Hex: #85AFE4

export default function LiveView({ matchId, onBack }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [activePointTeam, setActivePointTeam] = useState(null); // 'team_a' or 'team_b'
  const [pointAnimTeam, setPointAnimTeam] = useState(null); // 'team_a' or 'team_b'

  const prevScoresRef = useRef({ a: null, b: null });
  const pointTimeoutRef = useRef(null);

  function triggerPointEffect(teamKey) {
    setActivePointTeam(teamKey);
    setPointAnimTeam(teamKey);

    if (pointTimeoutRef.current) {
      clearTimeout(pointTimeoutRef.current);
    }
    pointTimeoutRef.current = setTimeout(() => {
      setPointAnimTeam(null);
    }, 3500);
  }

  useEffect(() => {
    loadMatch();

    const ws = createMatchWebSocket(
      matchId,
      (data) => {
        if (data.type === 'MATCH_UPDATE' && data.match) {
          const newMatch = data.match;
          const currentSet = newMatch.sets?.find(s => s.set_number === newMatch.current_set_number);
          const scoreA = currentSet?.team_a_score ?? 0;
          const scoreB = currentSet?.team_b_score ?? 0;

          if (data.action === 'point_team_a') {
            triggerPointEffect('team_a');
          } else if (data.action === 'point_team_b') {
            triggerPointEffect('team_b');
          } else if (prevScoresRef.current.a !== null) {
            if (scoreA > prevScoresRef.current.a) {
              triggerPointEffect('team_a');
            } else if (scoreB > prevScoresRef.current.b) {
              triggerPointEffect('team_b');
            }
          }

          prevScoresRef.current = { a: scoreA, b: scoreB };
          setMatch(newMatch);

          if (newMatch.status === 'completed' && !hasCelebrated) {
            triggerConfetti();
            setHasCelebrated(true);
          }
        }
      },
      (status) => setWsStatus(status)
    );

    return () => {
      ws.close();
      if (pointTimeoutRef.current) clearTimeout(pointTimeoutRef.current);
    };
  }, [matchId]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && onBack && !document.fullscreenElement) {
        onBack();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  async function loadMatch() {
    setLoading(true);
    try {
      const data = await apiRequest(`/matches/${matchId}`);
      setMatch(data);

      const currentSet = data.sets?.find(s => s.set_number === data.current_set_number);
      if (currentSet) {
        prevScoresRef.current = {
          a: currentSet.team_a_score,
          b: currentSet.team_b_score
        };
      }

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

  async function handleTeamScoreClick(e, teamKey) {
    if (e.detail > 1) return;

    triggerPointEffect(teamKey);

    try {
      await apiRequest(`/matches/${matchId}/action`, 'POST', {
        action: `point_${teamKey}`
      });
    } catch (err) {
      // Ignored if purely in spectator view without scorer PIN
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
  const winnerTeam = match.winner_team_id === teamA.id ? teamA : match.winner_team_id === teamB.id ? teamB : null;

  return (
    <div
      onDoubleClick={toggleFullscreen}
      style={{
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
        padding: '10px 16px 8px',
        boxSizing: 'border-box'
      }}
    >
      {/* Main Two-Side Big Stadium Display with White Center Divider Line */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        margin: '0 auto',
        padding: '0',
        boxSizing: 'border-box',
        minHeight: 0
      }}>
        {/* Left Side: Team A (Topmost Name + Score Down Slightly) */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_a')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            textAlign: 'center',
            height: '100%',
            padding: '0 16px',
            boxSizing: 'border-box',
            minHeight: 0,
            cursor: 'pointer'
          }}
        >
          {/* Synchronized Header Area: Team A Name (Enlarged with safe line-height to prevent clipping) */}
          <div style={{
            minHeight: 'clamp(6rem, 15vh, 11rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexShrink: 0,
            marginTop: 'clamp(2px, 0.8vh, 10px)',
            padding: '0 10px clamp(6px, 1.2vh, 14px)',
            boxSizing: 'border-box',
            overflow: 'visible'
          }}>
            <h1 style={{
              fontSize: 'clamp(3.6rem, 9.2vw, 9.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0',
              padding: '0',
              color: '#FAFF00',
              textDecoration: 'underline',
              textDecorationColor: '#FAFF00',
              textDecorationThickness: 'clamp(4px, 0.7vw, 8px)',
              textUnderlineOffset: 'clamp(8px, 1.5vh, 16px)',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 35px rgba(250, 255, 0, 0.4)',
              lineHeight: 1.05,
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              {teamA.name}
            </h1>
          </div>

          {/* Team A Score - Shifted Down Slightly */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 0,
            marginTop: 'clamp(10px, 2.5vh, 28px)',
            marginBottom: 'clamp(6px, 1.5vh, 16px)'
          }}>
            <div 
              className={`digit-score ${pointAnimTeam === 'team_a' ? 'point-pop-active' : ''}`}
              style={{
                fontSize: 'min(56vh, 35vw)',
                fontWeight: 900,
                color: (activePointTeam === 'team_a' || pointAnimTeam === 'team_a')
                  ? POINT_COLOR
                  : '#d1d5db',
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                textShadow: '0 4px 16px rgba(0,0,0,0.6)',
                transition: 'color 0.4s ease',
                userSelect: 'none'
              }}
            >
              {currentSet.team_a_score}
            </div>
          </div>
        </div>

        {/* Right Side: Team B (Topmost Name + Score Down Slightly) with Solid White Center Line */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_b')}
          style={{
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
            boxShadow: '-2px 0 15px rgba(255, 255, 255, 0.25)',
            cursor: 'pointer'
          }}
        >
          {/* Synchronized Header Area: Team B Name (Enlarged with safe line-height to prevent clipping) */}
          <div style={{
            minHeight: 'clamp(6rem, 15vh, 11rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexShrink: 0,
            marginTop: 'clamp(2px, 0.8vh, 10px)',
            padding: '0 10px clamp(6px, 1.2vh, 14px)',
            boxSizing: 'border-box',
            overflow: 'visible'
          }}>
            <h1 style={{
              fontSize: 'clamp(3.6rem, 9.2vw, 9.2rem)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0',
              padding: '0',
              color: '#FAFF00',
              textDecoration: 'underline',
              textDecorationColor: '#FAFF00',
              textDecorationThickness: 'clamp(4px, 0.7vw, 8px)',
              textUnderlineOffset: 'clamp(8px, 1.5vh, 16px)',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 35px rgba(250, 255, 0, 0.4)',
              lineHeight: 1.05,
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              {teamB.name}
            </h1>
          </div>

          {/* Team B Score - Shifted Down Slightly */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 0,
            marginTop: 'clamp(10px, 2.5vh, 28px)',
            marginBottom: 'clamp(6px, 1.5vh, 16px)'
          }}>
            <div 
              className={`digit-score ${pointAnimTeam === 'team_b' ? 'point-pop-active' : ''}`}
              style={{
                fontSize: 'min(56vh, 35vw)',
                fontWeight: 900,
                color: (activePointTeam === 'team_b' || pointAnimTeam === 'team_b')
                  ? POINT_COLOR
                  : '#d1d5db',
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                textShadow: '0 4px 16px rgba(0,0,0,0.6)',
                transition: 'color 0.4s ease',
                userSelect: 'none'
              }}
            >
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
