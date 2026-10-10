import React, { useState, useEffect } from 'react';
import { Swords, Plus, Calendar, MapPin, ExternalLink, Play, Trash2, Filter, Radio } from 'lucide-react';
import { apiRequest } from '../api';

export default function MatchesView({ onSelectMatch, onOpenPinModal }) {
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Match Form Modal
  const [showModal, setShowModal] = useState(false);
  const [tournamentId, setTournamentId] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [format, setFormat] = useState('best_of_3');
  const [stage, setStage] = useState('Championship Match');
  const [court, setCourt] = useState('Court 1');
  const [scheduledTime, setScheduledTime] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mList, tList, tmList] = await Promise.all([
        apiRequest('/matches'),
        apiRequest('/tournaments'),
        apiRequest('/teams')
      ]);
      setMatches(mList);
      setTournaments(tList);
      setTeams(tmList);
      if (tList.length > 0 && !tournamentId) setTournamentId(tList[0].id);
      if (tmList.length >= 2 && !teamAId) {
        setTeamAId(tmList[0].id);
        setTeamBId(tmList[1].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMatch(e) {
    e.preventDefault();
    if (!teamAId || !teamBId) {
      setFormError('Please select two teams');
      return;
    }
    if (teamAId === teamBId) {
      setFormError('Team A and Team B must be different teams');
      return;
    }
    setFormError('');

    try {
      const created = await apiRequest('/matches', 'POST', {
        tournament_id: tournamentId ? parseInt(tournamentId, 10) : undefined,
        team_a_id: parseInt(teamAId, 10),
        team_b_id: parseInt(teamBId, 10),
        format,
        stage,
        court,
        scheduled_time: scheduledTime || undefined
      });
      setShowModal(false);
      loadData();
      onSelectMatch(created.id, 'scorer');
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        setFormError(err.message);
      }
    }
  }

  async function handleDeleteMatch(mId) {
    if (!window.confirm('Delete this match?')) return;
    try {
      await apiRequest(`/matches/${mId}`, 'DELETE');
      loadData();
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        alert(err.message);
      }
    }
  }

  const filteredMatches = matches.filter((m) => {
    if (statusFilter === 'all') return true;
    return m.status === statusFilter;
  });

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Matches & Scorecards</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Launch court-side live scorer console or view real-time spectator scoreboard.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Schedule New Match</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'live', 'scheduled', 'completed'].map((tab) => (
          <button
            key={tab}
            className={`btn ${statusFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(tab)}
            style={{ textTransform: 'capitalize', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {tab === 'live' && <Radio size={14} style={{ animation: 'pulse-dot 1.5s infinite' }} />}
            <span>{tab} ({tab === 'all' ? matches.length : matches.filter(m => m.status === tab).length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading matches...</p>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Swords size={48} style={{ color: 'var(--color-cyan)', margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No Matches Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Schedule matches between teams to start live scoring.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>Schedule Match</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredMatches.map((m) => {
            const isCompleted = m.status === 'completed';
            const isLive = m.status === 'live';
            return (
              <div
                key={m.id}
                className={isLive ? 'glass-panel-glow' : 'glass-panel'}
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative'
                }}
              >
                {/* Meta Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} style={{ color: 'var(--color-cyan)' }} />
                    <span>{m.court} • {m.stage}</span>
                  </div>
                  <span className={`badge ${isLive ? 'badge-live' : isCompleted ? 'badge-completed' : 'badge-scheduled'}`}>
                    {m.status}
                  </span>
                </div>

                {/* Match Score Display */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {/* Team A */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      backgroundColor: m.team_a?.primary_color || '#00e5ff'
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: m.winner_team_id === m.team_a_id ? 'var(--color-amber)' : '#fff' }}>
                        {m.team_a?.name || 'Team A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {m.team_a?.short_name}
                      </div>
                    </div>
                  </div>

                  {/* Scoreboard Sets Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-cyan)', fontFamily: 'var(--font-display)' }}>
                      {m.team_a_sets_won}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>:</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-amber)', fontFamily: 'var(--font-display)' }}>
                      {m.team_b_sets_won}
                    </span>
                  </div>

                  {/* Team B */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: m.winner_team_id === m.team_b_id ? 'var(--color-amber)' : '#fff' }}>
                        {m.team_b?.name || 'Team B'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {m.team_b?.short_name}
                      </div>
                    </div>
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      backgroundColor: m.team_b?.primary_color || '#ff9100'
                    }} />
                  </div>
                </div>

                {/* Set Scores breakdown */}
                {m.sets && m.sets.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {m.sets.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          fontSize: '0.75rem',
                          background: s.status === 'completed' ? 'rgba(255,255,255,0.08)' : 'rgba(0, 229, 255, 0.15)',
                          border: s.status === 'completed' ? '1px solid var(--border-subtle)' : '1px solid var(--border-glow)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '3px 8px',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        S{s.set_number}: {s.team_a_score}-{s.team_b_score}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.open(`/live/${m.id}`, '_blank')}
                    style={{ flex: 1, padding: '10px' }}
                    title="Open Live Spectator Scoreboard in a new tab"
                  >
                    <ExternalLink size={16} />
                    <span>Spectator View ↗</span>
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => onSelectMatch(m.id, 'scorer')}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    <Play size={16} />
                    <span>Scorer Console</span>
                  </button>

                  <button
                    onClick={() => handleDeleteMatch(m.id)}
                    style={{ background: 'none', border: 'none', color: '#ff5252', padding: '0 8px', cursor: 'pointer', opacity: 0.6 }}
                    title="Delete Match"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Match Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '28px', background: '#0e172a' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Schedule Match</h2>

            {formError && (
              <div style={{ background: 'rgba(255, 23, 68, 0.15)', color: '#ff5252', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Tournament (Optional)
                </label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                >
                  <option value="" style={{ background: '#0e172a' }}>-- Independent Exhibition Match --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#0e172a' }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Team A *
                  </label>
                  <select
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id} style={{ background: '#0e172a' }}>{tm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Team B *
                  </label>
                  <select
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  >
                    {teams.map(tm => (
                      <option key={tm.id} value={tm.id} style={{ background: '#0e172a' }}>{tm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Match Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  >
                    <option value="best_of_3" style={{ background: '#0e172a' }}>Best of 3 Sets (Deciding 15 pts)</option>
                    <option value="best_of_5" style={{ background: '#0e172a' }}>Best of 5 Sets (Deciding 15 pts)</option>
                    <option value="single_set" style={{ background: '#0e172a' }}>Single Set (25 pts)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Court / Location
                  </label>
                  <input
                    type="text"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    placeholder="e.g. Center Court"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Stage / Round
                </label>
                <input
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Semi-Final / Group Stage"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Schedule Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
