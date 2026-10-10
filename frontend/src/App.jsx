import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PinModal from './components/PinModal';
import TournamentsView from './views/TournamentsView';
import TeamsView from './views/TeamsView';
import MatchesView from './views/MatchesView';
import ScorerView from './views/ScorerView';
import LiveView from './views/LiveView';
import SystemView from './views/SystemView';

export default function App() {
  const [currentView, setCurrentView] = useState('tournaments');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Sync with browser URL / hash for direct linking to /scorer/1 or /live/1
  useEffect(() => {
    function parseRoute() {
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);

      if (path.startsWith('/scorer/') || search.get('view') === 'scorer') {
        const id = path.split('/scorer/')[1] || search.get('matchId');
        if (id) {
          setSelectedMatchId(parseInt(id, 10));
          setCurrentView('scorer');
          return;
        }
      }

      if (path.startsWith('/live/') || search.get('view') === 'live') {
        const id = path.split('/live/')[1] || search.get('matchId');
        if (id) {
          setSelectedMatchId(parseInt(id, 10));
          setCurrentView('live');
          return;
        }
      }

      if (path.startsWith('/teams') || search.get('view') === 'teams') {
        setCurrentView('teams');
      } else if (path.startsWith('/matches') || search.get('view') === 'matches') {
        setCurrentView('matches');
      } else if (path.startsWith('/system') || search.get('view') === 'system') {
        setCurrentView('system');
      } else {
        setCurrentView('tournaments');
      }
    }

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  function handleSelectMatch(matchId, mode = 'live') {
    setSelectedMatchId(matchId);
    setCurrentView(mode);
    window.history.pushState({}, '', `/${mode}/${matchId}`);
  }

  function handleNavigate(view) {
    setCurrentView(view);
    setSelectedMatchId(null);
    window.history.pushState({}, '', `/${view}`);
  }

  // If in Live Spectator View mode, render pure distraction-free broadcast display
  if (currentView === 'live' && selectedMatchId) {
    return (
      <LiveView 
        matchId={selectedMatchId}
        onBack={() => handleNavigate('matches')}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        currentView={currentView}
        setCurrentView={handleNavigate}
        onOpenPinModal={() => setIsPinModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        {currentView === 'tournaments' && (
          <TournamentsView 
            onSelectMatch={handleSelectMatch}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {currentView === 'teams' && (
          <TeamsView 
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {currentView === 'matches' && (
          <MatchesView 
            onSelectMatch={handleSelectMatch}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {currentView === 'scorer' && selectedMatchId && (
          <ScorerView 
            matchId={selectedMatchId}
            onBack={() => handleNavigate('matches')}
            onOpenLiveView={(mId) => handleSelectMatch(mId, 'live')}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {currentView === 'system' && (
          <SystemView 
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}
      </main>

      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
