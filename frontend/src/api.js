const API_BASE = '/api';

export function getScorerPin() {
  return sessionStorage.getItem('volleypro_scorer_pin') || '';
}

export function setScorerPin(pin) {
  sessionStorage.setItem('volleypro_scorer_pin', pin);
}

export function clearScorerPin() {
  sessionStorage.removeItem('volleypro_scorer_pin');
}

export async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const pin = getScorerPin();
  if (pin) {
    headers['X-Scorer-PIN'] = pin;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  
  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}: ${res.statusText}` }));
    throw new Error(errorData.detail || 'API request failed');
  }

  return res.json();
}

// WebSocket Helper with automatic reconnection
export function createMatchWebSocket(matchId, onMessage, onStatusChange) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws/volleyball/matches/${matchId}`;

  let ws = null;
  let isClosedManually = false;
  let retryCount = 0;

  function connect() {
    if (isClosedManually) return;
    
    if (onStatusChange) onStatusChange('connecting');
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      retryCount = 0;
      if (onStatusChange) onStatusChange('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      if (onStatusChange) onStatusChange('disconnected');
      if (!isClosedManually) {
        const backoff = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
        retryCount++;
        setTimeout(connect, backoff);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
      ws.close();
    };
  }

  connect();

  return {
    send: (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    },
    close: () => {
      isClosedManually = true;
      if (ws) ws.close();
    }
  };
}
