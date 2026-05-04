import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Shell() {
  const [timeWindow, setTimeWindow] = useState('Last 24h');
  const [modelVersion, setModelVersion] = useState('v3.2.1 (prod)');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <Header
        timeWindow={timeWindow}
        setTimeWindow={setTimeWindow}
        modelVersion={modelVersion}
        setModelVersion={setModelVersion}
      />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">
          <Outlet context={{ timeWindow, modelVersion }} />
        </div>
      </main>
    </div>
  );
}
