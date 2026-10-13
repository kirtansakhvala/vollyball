import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiRequest, createMatchWebSocket } from '../api';

const DEFAULT_SCORE_COLOR = '#ffffff'; // Hex: #FFFFFF (Pure White)
const POINT_COLOR = 'rgba(216, 226, 146, 1)'; // Hex: #D8E292 (Active Point/Click Color)

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
        padding: 'clamp(12px, 2vh, 22px) 16px 8px',
        boxSizing: 'border-box'
      }}
    >
      {/* Synchronized 2x2 Stadium Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'minmax(clamp(6.2rem, 16vh, 10.8rem), auto) 1fr',
        width: '100%',
        margin: '0 auto',
        padding: '0',
        boxSizing: 'border-box',
        minHeight: 0
      }}>
        {/* ROW 1, COL 1: Team A Name (Slightly increased to ideal size) */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_a')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            height: '100%',
            padding: 'clamp(8px, 1.5vh, 16px) 16px clamp(6px, 1.2vh, 14px)',
            boxSizing: 'border-box',
            cursor: 'pointer',
            overflow: 'visible'
          }}
        >
          <h1 style={{
            fontSize: 'clamp(3.1rem, 7.8vw, 7.8rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            margin: '0',
            padding: '0',
            color: '#FAFF00',
            textDecoration: 'underline',
            textDecorationColor: '#FAFF00',
            textDecorationThickness: 'clamp(4px, 0.6vw, 7px)',
            textUnderlineOffset: 'clamp(8px, 1.4vh, 14px)',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 35px rgba(250, 255, 0, 0.4)',
            lineHeight: 1.08,
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}>
            {teamA.name}
          </h1>
        </div>

        {/* ROW 1, COL 2: Team B Name (Slightly increased to ideal size, only yellow underline below) */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_b')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            height: '100%',
            padding: 'clamp(8px, 1.5vh, 16px) 16px clamp(6px, 1.2vh, 14px)',
            boxSizing: 'border-box',
            cursor: 'pointer',
            overflow: 'visible'
          }}
        >
          <h1 style={{
            fontSize: 'clamp(3.1rem, 7.8vw, 7.8rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            margin: '0',
            padding: '0',
            color: '#FAFF00',
            textDecoration: 'underline',
            textDecorationColor: '#FAFF00',
            textDecorationThickness: 'clamp(4px, 0.6vw, 7px)',
            textUnderlineOffset: 'clamp(8px, 1.4vh, 14px)',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 35px rgba(250, 255, 0, 0.4)',
            lineHeight: 1.08,
            wordBreak: 'break-word',
            maxWidth: '100%'
          }}>
            {teamB.name}
          </h1>
        </div>

        {/* ROW 2, COL 1: Team A Score (Exact Same Vertical Level as Team B) */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_a')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: 0,
            cursor: 'pointer',
            padding: '0 16px clamp(6px, 1.5vh, 16px)',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className={`digit-score ${pointAnimTeam === 'team_a' ? 'point-pop-active' : ''}`}
            style={{
              fontSize: 'min(57vh, 35vw)',
              fontWeight: 900,
              color: (activePointTeam === 'team_a' || pointAnimTeam === 'team_a')
                ? POINT_COLOR
                : DEFAULT_SCORE_COLOR,
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

        {/* ROW 2, COL 2: Team B Score (Solid White Center Line situated between scores with clearance from team name) */}
        <div 
          onClick={(e) => handleTeamScoreClick(e, 'team_b')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: 0,
            cursor: 'pointer',
            padding: '0 16px clamp(6px, 1.5vh, 16px)',
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          {/* Solid White Center Line between scores */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: '8%',
            bottom: '8%',
            width: '4px',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            pointerEvents: 'none'
          }} />

          <div 
            className={`digit-score ${pointAnimTeam === 'team_b' ? 'point-pop-active' : ''}`}
            style={{
              fontSize: 'min(57vh, 35vw)',
              fontWeight: 900,
              color: (activePointTeam === 'team_b' || pointAnimTeam === 'team_b')
                ? POINT_COLOR
                : DEFAULT_SCORE_COLOR,
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
