import React from 'react';

function Dashboard({ user, onLogout }) {
  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2>Dashboard - CarGo Operations</h2>
        <div>
          <span>Welcome, <strong>{user}</strong>! </span>
          <button onClick={onLogout} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ marginTop: '20px' }}>
        <p>Dito mo na ilalagay ang mga card blocks, tracking maps, at tables para sa mga kargamento mo mamaya.</p>
      </main>
    </div>
  );
}

export default Dashboard;