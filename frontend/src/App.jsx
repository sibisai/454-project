import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setStatus('Connected to backend');
        } else {
          setStatus('Unexpected response');
        }
      })
      .catch(() => {
        setStatus('Failed to connect to backend');
      });
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '4rem' }}>
      <h1>SoundCloud Discussion Board</h1>
      <p>API Status: <strong>{status}</strong></p>
    </div>
  );
}

export default App;
