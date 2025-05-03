import React, { useEffect, useState } from 'react';
import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Custom hook for performance monitoring
function usePerformanceMonitor() {
  const [entries, setEntries] = useState<PerformanceEntryWithHeaders[]>([]);
  const [monitor, setMonitor] = useState<PerformanceMonitor | null>(null);

  useEffect(() => {
    // Create monitor instance
    const performanceMonitor = new PerformanceMonitor({
      transform: (entry) => {
        // Add any custom transformations here
        return entry;
      }
    });

    // Subscribe to entries
    const subscription = performanceMonitor.subscribe((entry) => {
      setEntries(prev => [...prev, entry]);
    });

    setMonitor(performanceMonitor);

    // Cleanup
    return () => {
      subscription.unsubscribe();
      performanceMonitor.disconnect();
    };
  }, []);

  return { entries, monitor };
}

// Performance data visualization component
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
              {entry.timing && (
                <>
                  <div>DNS Lookup: {entry.timing.domainLookupEnd - entry.timing.domainLookupStart}ms</div>
                  <div>TCP Connection: {entry.timing.connectEnd - entry.timing.connectStart}ms</div>
                  <div>Request Time: {entry.timing.responseStart - entry.timing.requestStart}ms</div>
                  <div>Response Time: {entry.timing.responseEnd - entry.timing.responseStart}ms</div>
                </>
              )}
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

// Example usage in a React component
const App: React.FC = () => {
  return (
    <div className="app">
      <h1>Performance Monitor Demo</h1>
      <PerformanceData />
    </div>
  );
};

export default App; 