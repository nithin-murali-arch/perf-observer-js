import React, { useEffect, useState } from 'react';
import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

function usePerformanceMonitor() {
  const [entries, setEntries] = useState<PerformanceEntryWithHeaders[]>([]);
  const [monitor, setMonitor] = useState<PerformanceMonitor | null>(null);

  useEffect(() => {
    const performanceMonitor = new PerformanceMonitor({
      workerUrl: '/worker.js',
    });

    const subscription = performanceMonitor.subscribe((entry) => {
      setEntries(prev => [...prev, entry]);
    });

    setMonitor(performanceMonitor);

    return () => {
      subscription.unsubscribe();
      performanceMonitor.disconnect();
    };
  }, []);

  return { entries, monitor };
}

const PerformanceData: React.FC = () => {
  const { entries } = usePerformanceMonitor();

  return (
    <div className="performance-data">
      <h2>Performance Data</h2>
      <div className="entries">
        {entries.map((entry, index) => (
          <div key={index} className="entry">
            <h3>{entry.name}</h3>
            <div className="metrics">
              <div>Duration: {entry.duration}ms</div>
              <div>Status: {entry.status}</div>
            </div>
            <div className="headers">
              <h4>Response Headers:</h4>
              <pre>{JSON.stringify(entry.responseHeaders, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="app">
      <h1>Performance Monitor Demo</h1>
      <PerformanceData />
    </div>
  );
};

export default App;
