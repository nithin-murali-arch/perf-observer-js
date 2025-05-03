import React, { useEffect, useRef } from 'react';
import { PerformanceMonitor } from '../src';

// Create a custom hook for performance monitoring
function usePerformanceMonitor(config = {
  resourceTiming: true,
  navigationTiming: true,
  xhrTiming: true,
  fetchTiming: true
}) {
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Initialize monitor
    monitorRef.current = new PerformanceMonitor({
      ...config,
      transform: (entry) => {
        // Add React-specific fields
        return {
          ...entry,
          component: 'App', // You can make this dynamic based on your needs
          timestamp: Date.now()
        };
      }
    });

    // Subscribe to performance entries
    subscriptionRef.current = monitorRef.current.subscribe((entry) => {
      // You could send this to your analytics service
      console.log('Performance entry:', entry);
    });

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (monitorRef.current) {
        monitorRef.current.disconnect();
      }
    };
  }, [config]);

  return monitorRef.current;
}

// Example React component
const App: React.FC = () => {
  // Initialize performance monitor
  usePerformanceMonitor();

  // Example API call
  const fetchData = async () => {
    try {
      const response = await fetch('https://api.example.com/data');
      const data = await response.json();
      console.log('Data:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h1>Performance Monitoring Example</h1>
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
};

// Example of a component that tracks its own performance
const TrackedComponent: React.FC<{ id: string }> = ({ id }) => {
  const monitorRef = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    // Create a monitor specific to this component
    monitorRef.current = new PerformanceMonitor({
      resourceTiming: true,
      xhrTiming: true,
      fetchTiming: true,
      transform: (entry) => ({
        ...entry,
        component: 'TrackedComponent',
        componentId: id,
        timestamp: Date.now()
      })
    });

    // Subscribe to entries
    const subscription = monitorRef.current.subscribe((entry) => {
      console.log(`Component ${id} performance:`, entry);
    });

    return () => {
      subscription.unsubscribe();
      monitorRef.current?.disconnect();
    };
  }, [id]);

  return (
    <div>
      <h2>Tracked Component {id}</h2>
      <button onClick={() => fetch(`https://api.example.com/component/${id}`)}>
        Load Component Data
      </button>
    </div>
  );
};

// Example usage
const ExampleApp: React.FC = () => {
  return (
    <div>
      <App />
      <TrackedComponent id="1" />
      <TrackedComponent id="2" />
    </div>
  );
};

export default ExampleApp; 