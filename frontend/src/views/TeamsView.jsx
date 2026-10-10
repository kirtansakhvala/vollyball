import React, { useState, useEffect } from 'react';
import { Shield, Plus, UserPlus, Star, Edit, Trash2, Mail, Users, Check } from 'lucide-react';
import { apiRequest } from '../api';

const VOLLEYBALL_POSITIONS = [
  { code: 'OH', label: 'Outside Hitter' },
  { code: 'MB', label: 'Middle Blocker' },
  { code: 'OPP', label: 'Opposite Hitter' },
  { code: 'S', label: 'Setter' },
  { code: 'L', label: 'Libero' },
  { code: 'DS', label: 'Defensive Specialist' }
];

export default function TeamsView({ onOpenPinModal }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Team Form Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00e5ff');
  const [secondaryColor, setSecondaryColor] = useState('#0a192f');
  const [contactEmail, setContactEmail] = useState('');
  const [teamFormError, setTeamFormError] = useState('');

  // Player Form Modal
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('OH');
  const [isCaptain, setIsCaptain] = useState(false);
  const [playerFormError, setPlayerFormError] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setLoading(true);
    try {
      const data = await apiRequest('/teams');
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      } else if (selectedTeam) {
        const refreshed = data.find(t => t.id === selectedTeam.id);
        if (refreshed) setSelectedTeam(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) {
      setTeamFormError('Team name is required');
      return;
    }
    setTeamFormError('');

    try {
      const created = await apiRequest('/teams', 'POST', {
        name: teamName.trim(),
        short_name: teamShortName.trim() || undefined,
        logo_url: teamLogoUrl.trim() || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        contact_email: contactEmail.trim() || undefined
      });
      setShowTeamModal(false);
      resetTeamForm();
      await loadTeams();
      setSelectedTeam(created);
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        setTeamFormError(err.message);
      }
    }
  }

  async function handleDeleteTeam(tId) {
    if (!window.confirm('Delete this team and all roster players?')) return;
    try {
      await apiRequest(`/teams/${tId}`, 'DELETE');
      if (selectedTeam?.id === tId) setSelectedTeam(null);
      loadTeams();
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        alert(err.message);
      }
    }
  }

  async function handleAddPlayer(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !jerseyNumber) {
      setPlayerFormError('First name, last name, and jersey number are required');
      return;
    }
    setPlayerFormError('');

    try {
      await apiRequest('/players', 'POST', {
        team_id: selectedTeam.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        jersey_number: parseInt(jerseyNumber, 10),
        position,
        is_captain: isCaptain,
        is_active: true
      });
      setShowPlayerModal(false);
      resetPlayerForm();
      loadTeams();
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        setPlayerFormError(err.message);
      }
    }
  }

  async function handleDeletePlayer(playerId) {
    if (!window.confirm('Remove player from roster?')) return;
    try {
      await apiRequest(`/players/${playerId}`, 'DELETE');
      loadTeams();
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        alert(err.message);
      }
    }
  }

  function resetTeamForm() {
    setTeamName('');
    setTeamShortName('');
    setTeamLogoUrl('');
    setPrimaryColor('#00e5ff');
    setSecondaryColor('#0a192f');
    setContactEmail('');
    setTeamFormError('');
  }

  function resetPlayerForm() {
    setFirstName('');
    setLastName('');
    setJerseyNumber('');
    setPosition('OH');
    setIsCaptain(false);
    setPlayerFormError('');
  }

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Teams & Rosters</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage team rosters, jersey numbers, tactical positions, and team branding.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTeamModal(true)}>
          <Plus size={18} />
          <span>New Team</span>
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading teams...</p>
      ) : teams.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--color-cyan)', margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No Teams Created</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Add teams and players to begin scheduling matches.
          </p>
          <button className="btn btn-primary" onClick={() => setShowTeamModal(true)}>
            <Plus size={18} />
            <span>Create First Team</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Teams Selector Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teams.map((t) => {
              const isSelected = selectedTeam?.id === t.id;
              return (
                <div
                  key={t.id}
                  className={isSelected ? 'glass-panel-glow' : 'glass-panel'}
                  onClick={() => setSelectedTeam(t)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      borderRadius: '10px',
                      background: t.primary_color || '#00e5ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: '#050b14', fontSize: '0.9rem'
                    }}>
                      {t.short_name || t.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {t.players?.length || 0} Players
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                    style={{ background: 'none', border: 'none', color: '#ff5252', opacity: 0.6, cursor: 'pointer' }}
                    title="Delete Team"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Team Roster View */}
          {selectedTeam && (
            <div className="glass-panel" style={{ padding: '28px' }}>
              {/* Team Branding Banner */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px', height: '64px',
                    borderRadius: '16px',
                    background: selectedTeam.primary_color || '#00e5ff',
                    boxShadow: `0 0 20px ${selectedTeam.primary_color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, color: '#050b14', fontSize: '1.4rem'
                  }}>
                    {selectedTeam.short_name || selectedTeam.name.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', lineHeight: 1.1 }}>{selectedTeam.name}</h2>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Code: <strong>{selectedTeam.short_name || 'N/A'}</strong></span>
                      {selectedTeam.contact_email && <span>Email: {selectedTeam.contact_email}</span>}
                    </div>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => setShowPlayerModal(true)}>
                  <UserPlus size={18} />
                  <span>Add Player</span>
                </button>
              </div>

              {/* Roster Table */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--color-cyan)' }} />
                  <span>Team Roster ({selectedTeam.players?.length || 0} Athletes)</span>
                </h3>

                {(!selectedTeam.players || selectedTeam.players.length === 0) ? (
                  <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      No players added to this team roster yet.
                    </p>
                    <button className="btn btn-secondary" onClick={() => setShowPlayerModal(true)}>
                      <UserPlus size={16} />
                      <span>Add First Player</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}># Jersey</th>
                          <th style={{ padding: '10px 14px' }}>Player Name</th>
                          <th style={{ padding: '10px 14px' }}>Position</th>
                          <th style={{ padding: '10px 14px' }}>Role</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeam.players.map((p) => {
                          const posObj = VOLLEYBALL_POSITIONS.find(pos => pos.code === p.position);
                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--color-cyan)', fontSize: '1.1rem' }}>
                                #{p.jersey_number}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                                {p.first_name} {p.last_name}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                                  {p.position} — {posObj ? posObj.label : p.position}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {p.is_captain ? (
                                  <span className="badge" style={{ background: 'rgba(255, 145, 0, 0.2)', color: 'var(--color-amber)', border: '1px solid rgba(255, 145, 0, 0.4)' }}>
                                    <Star size={12} fill="var(--color-amber)" />
                                    <span>Captain</span>
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Player</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeletePlayer(p.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', opacity: 0.7 }}
                                  title="Remove player"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Form Modal */}
      {showTeamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#0e172a' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Create New Team</h2>
            
            {teamFormError && (
              <div style={{ background: 'rgba(255, 23, 68, 0.15)', color: '#ff5252', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem' }}>
                {teamFormError}
              </div>
            )}

            <form onSubmit={handleSaveTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Seattle Thunder"
                  required
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Short Code (3-4 chars)
                  </label>
                  <input
                    type="text"
                    value={teamShortName}
                    onChange={(e) => setTeamShortName(e.target.value.toUpperCase())}
                    maxLength={4}
                    placeholder="e.g. THU"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Primary Jersey Color
                  </label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: '100%', height: '42px', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="coach@volleyballteam.com"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Form Modal */}
      {showPlayerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 9, 18, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#0e172a' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Add Player to {selectedTeam?.name}</h2>
            
            {playerFormError && (
              <div style={{ background: 'rgba(255, 23, 68, 0.15)', color: '#ff5252', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem' }}>
                {playerFormError}
              </div>
            )}

            <form onSubmit={handleAddPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Jersey Number (1-99) *
                  </label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    min={1}
                    max={99}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  >
                    {VOLLEYBALL_POSITIONS.map(pos => (
                      <option key={pos.code} value={pos.code} style={{ background: '#0e172a' }}>
                        {pos.code} - {pos.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  checked={isCaptain}
                  onChange={(e) => setIsCaptain(e.target.checked)}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Designate as Team Captain ⭐</span>
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPlayerModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
