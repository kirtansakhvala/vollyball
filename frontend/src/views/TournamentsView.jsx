import React, { useState, useEffect } from 'react';
import { Trophy, Plus, MapPin, Calendar, Users, Eye, Trash2, Edit, ChevronRight, Activity, ExternalLink } from 'lucide-react';
import { apiRequest } from '../api';

export default function TournamentsView({ onSelectMatch, onOpenPinModal }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tList, teamsList] = await Promise.all([
        apiRequest('/tournaments'),
        apiRequest('/teams')
      ]);
      setTournaments(tList);
      setAllTeams(teamsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTournamentDetails(tId) {
    try {
      const [tDetails, standingsData] = await Promise.all([
        apiRequest(`/tournaments/${tId}`),
        apiRequest(`/tournaments/${tId}/standings`)
      ]);
      setSelectedTournament(tDetails);
      setStandings(standingsData.standings || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateTournament(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Tournament name is required');
      return;
    }
    setFormError('');

    try {
      const created = await apiRequest('/tournaments', 'POST', {
        name: name.trim(),
        location: location.trim() || undefined,
        venue: venue.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        team_ids: selectedTeamIds,
        status: 'active'
      });
      setShowCreateModal(false);
      resetForm();
      loadData();
      loadTournamentDetails(created.id);
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        setFormError(err.message);
      }
    }
  }

  async function handleDeleteTournament(tId) {
    if (!window.confirm('Are you sure you want to delete this tournament and its matches?')) return;
    try {
      await apiRequest(`/tournaments/${tId}`, 'DELETE');
      if (selectedTournament?.id === tId) setSelectedTournament(null);
      loadData();
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        alert(err.message);
      }
    }
  }

  function resetForm() {
    setName('');
    setLocation('');
    setVenue('');
    setStartDate('');
    setEndDate('');
    setSelectedTeamIds([]);
    setFormError('');
  }

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Volleyball Tournaments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage competitions, live standings, court scheduling, and championship brackets.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          <span>New Tournament</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <Activity size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Loading tournaments from persistent SQLite database...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Trophy size={48} style={{ color: 'var(--color-cyan)', margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No Tournaments Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '460px', margin: '0 auto 20px' }}>
            Get started by creating your first volleyball championship or invitational tournament.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Create First Tournament</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTournament ? '360px 1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Tournaments List Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tournaments.map((t) => {
              const isSelected = selectedTournament?.id === t.id;
              return (
                <div
                  key={t.id}
                  className={isSelected ? 'glass-panel-glow' : 'glass-panel'}
                  onClick={() => loadTournamentDetails(t.id)}
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.15rem' }}>{t.name}</h3>
                    <span className={`badge ${t.status === 'active' ? 'badge-live' : 'badge-scheduled'}`}>
                      {t.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    {t.venue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ color: 'var(--color-cyan)' }} />
                        <span>{t.venue} {t.location ? `• ${t.location}` : ''}</span>
                      </div>
                    )}
                    {t.start_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--color-amber)' }} />
                        <span>{t.start_date} {t.end_date ? `to ${t.end_date}` : ''}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} />
                      <span>{t.teams?.length || 0} Teams Enrolled</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {t.matches?.length || 0} Matches
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }}
                        style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', opacity: 0.7 }}
                        title="Delete Tournament"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} style={{ color: isSelected ? 'var(--color-cyan)' : 'var(--text-dim)' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tournament Details & Live Standings Table */}
          {selectedTournament && (
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h2 style={{ fontSize: '1.6rem' }}>{selectedTournament.name}</h2>
                    <span className="badge badge-live">{selectedTournament.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {selectedTournament.venue} {selectedTournament.location ? `— ${selectedTournament.location}` : ''}
                  </p>
                </div>
              </div>

              {/* Standings Table */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={18} style={{ color: 'var(--color-amber)' }} />
                  <span>Tournament Standings</span>
                </h3>

                {standings.length === 0 ? (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No completed matches yet. Standings will update automatically as matches finish.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '10px 12px' }}>Rank</th>
                          <th style={{ padding: '10px 12px' }}>Team</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>P</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>W</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>L</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Sets (W-L)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Points Diff</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, idx) => (
                          <tr key={team.team_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: idx === 0 ? 'var(--color-amber)' : 'var(--text-secondary)' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '12px', height: '12px', borderRadius: '50%',
                                  backgroundColor: team.primary_color || '#00e5ff'
                                }} />
                                <span style={{ fontWeight: 600 }}>{team.team_name}</span>
                                {team.short_name && (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>({team.short_name})</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.played}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--color-emerald)', fontWeight: 600 }}>{team.won}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#ff5252' }}>{team.lost}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>{team.sets_won} - {team.sets_lost}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: (team.points_won - team.points_lost) >= 0 ? 'var(--color-cyan)' : '#ff5252' }}>
                              {(team.points_won - team.points_lost) > 0 ? `+${team.points_won - team.points_lost}` : team.points_won - team.points_lost}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-cyan)', fontSize: '1.05rem' }}>
                              {team.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Matches in Tournament */}
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>Tournament Matches</h3>
                {selectedTournament.matches?.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No matches scheduled for this tournament yet.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {selectedTournament.matches?.map((m) => (
                      <div
                        key={m.id}
                        className="glass-panel"
                        style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>{m.stage} • {m.court}</span>
                          <span className={`badge ${m.status === 'live' ? 'badge-live' : m.status === 'completed' ? 'badge-completed' : 'badge-scheduled'}`}>
                            {m.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: m.winner_team_id === m.team_a_id ? 'var(--color-amber)' : '#fff' }}>
                              {m.team_a?.name || 'Team A'}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: m.winner_team_id === m.team_b_id ? 'var(--color-amber)' : '#fff' }}>
                              {m.team_b?.name || 'Team B'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>
                            <span style={{ color: 'var(--color-cyan)' }}>{m.team_a_sets_won}</span>
                            <span style={{ color: 'var(--color-amber)' }}>{m.team_b_sets_won}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => window.open(`/live/${m.id}`, '_blank')}
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                            title="Open Live Spectator Scoreboard in a new tab"
                          >
                            <ExternalLink size={14} />
                            <span>Live View ↗</span>
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => onSelectMatch(m.id, 'scorer')}
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                          >
                            <span>Scorer</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '28px', background: '#0e172a' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Create New Tournament</h2>
            
            {formError && (
              <div style={{ background: 'rgba(255, 23, 68, 0.15)', color: '#ff5252', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. State Volleyball Open 2026"
                  required
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Venue
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Center Arena Court"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Dallas, TX"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Select Teams */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Enrolled Teams ({selectedTeamIds.length} selected)
                </label>
                <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
                  {allTeams.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No teams created yet. Create teams first.</p>
                  ) : (
                    allTeams.map((team) => {
                      const isChecked = selectedTeamIds.includes(team.id);
                      return (
                        <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeamIds([...selectedTeamIds, team.id]);
                              } else {
                                setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                              }
                            }}
                          />
                          <span style={{ fontSize: '0.9rem' }}>{team.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
