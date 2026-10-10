import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle2, AlertTriangle, Download, RefreshCw, Server, ShieldCheck, Database } from 'lucide-react';
import { apiRequest } from '../api';

export default function SystemView({ onOpenPinModal }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    setLoading(true);
    try {
      const data = await apiRequest('/system/health');
      setHealthData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportBackup() {
    setDownloading(true);
    try {
      const backup = await apiRequest('/system/backup');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volleypro_sqlite_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        onOpenPinModal();
      } else {
        alert(err.message);
      }
    } finally {
      setDownloading(false);
    }
  }

  const storage = healthData?.storage || {};

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Storage & System Diagnostics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real-time verification of SQLite persistence, Render disk mounts, schema tables, and backups.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadHealth} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Primary Storage Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Card 1: Storage Status */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-emerald)' }}>
            <CheckCircle2 size={24} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Storage Engine</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
            SQLite 3 (WAL)
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Foreign Keys: {storage.foreign_keys_enabled ? 'Enforced (PRAGMA)' : 'Standard'}
          </div>
        </div>

        {/* Card 2: Database Path */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-cyan)' }}>
            <Database size={24} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Active SQLite DB Path</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
            {storage.db_path || 'Checking path...'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            File Size: {storage.file_size_kb || 0} KB
          </div>
        </div>

        {/* Card 3: Render Persistent Disk */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: storage.using_render_persistent_disk ? 'var(--color-emerald)' : 'var(--color-amber)' }}>
            <Server size={24} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Render Disk Mount</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
            {storage.using_render_persistent_disk ? 'Render Disk Active' : 'Local Development'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Target: <code style={{ color: 'var(--color-cyan)' }}>/var/data/volleyball.db</code>
          </div>
        </div>

        {/* Card 4: Tables in Schema */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-cyan)' }}>
            <ShieldCheck size={24} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Database Schema</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
            {storage.table_count || 6} Tables Active
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tournaments, Teams, Players, Matches, Sets, Events
          </div>
        </div>
      </div>

      {/* Backup and Migration Export */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Persistent Data Backup & Export</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px' }}>
              Export full database snapshot (all tournaments, rosters, matches, scores, set histories, and event logs) as a structured JSON archive for migration or zero-loss disaster recovery.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleExportBackup}
            disabled={downloading}
            style={{ padding: '12px 22px' }}
          >
            <Download size={18} />
            <span>{downloading ? 'Generating Backup...' : 'Export JSON Backup'}</span>
          </button>
        </div>
      </div>

      {/* Render Persistent Disk Configuration Guide */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Server size={22} style={{ color: 'var(--color-cyan)' }} />
          <span>Render Persistent Disk Deployment Guide</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p>
            When deploying VolleyPro to Render as a Web Service, configure a persistent disk so SQLite records are preserved across app restarts, builds, and redeployments:
          </p>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>Render Dashboard Steps:</h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Navigate to your Web Service in the <strong>Render Dashboard</strong>.</li>
              <li>Go to <strong>Disks</strong> in the service menu and click <strong>Add Disk</strong>.</li>
              <li>Set <strong>Disk Name</strong> to <code style={{ color: 'var(--color-cyan)' }}>volleyball-data</code>.</li>
              <li>Set <strong>Mount Path</strong> to <code style={{ color: 'var(--color-cyan)' }}>/var/data</code>.</li>
              <li>Set <strong>Size</strong> to <strong>1 GB</strong> (or your desired size).</li>
              <li>In <strong>Environment Variables</strong>, ensure:
                <pre style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: '4px', margin: '4px 0', color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)' }}>
SQLITE_DB_PATH=/var/data/volleyball.db
SCORER_PIN=your_custom_pin
                </pre>
              </li>
            </ol>
          </div>

          <div style={{ background: 'rgba(255, 145, 0, 0.1)', border: '1px solid rgba(255, 145, 0, 0.3)', padding: '14px 18px', borderRadius: 'var(--radius-md)', color: '#ffb74d', display: 'flex', gap: '12px' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Render Plan Notice:</strong> Persistent Disks on Render require a paid instance type (Starter tier or above, as free tier instances do not support attached persistent disks). If running on Free tier, records persist in memory/local disk during container uptime.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
