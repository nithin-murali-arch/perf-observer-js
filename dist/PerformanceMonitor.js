"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
const worker_1 = require("./worker");
class PerformanceMonitor {
    constructor(config = {}) {
        this.subscribers = new Set();
        this.transform = null;
        this.worker = null;
        this.transform = config.transform || null;
        this.registerServiceWorker();
    }
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Create a blob URL for the service worker
                const blob = new Blob([worker_1.workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                // Register the service worker
                const registration = await navigator.serviceWorker.register(workerUrl);
                this.worker = registration.active;
                // Set up message listener
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'PERFORMANCE_ENTRY') {
                        const entry = event.data.entry;
                        this.notifySubscribers(entry);
                    }
                });
                // Clean up the blob URL
                URL.revokeObjectURL(workerUrl);
            }
            catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    notifySubscribers(entry) {
        try {
            const processedEntry = this.transform ? this.transform(entry) : entry;
            this.subscribers.forEach(callback => callback(processedEntry));
        }
        catch (error) {
            console.error('Error processing performance entry:', error);
        }
    }
    subscribe(callback) {
        if (!callback || typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        this.subscribers.add(callback);
        return {
            unsubscribe: () => this.subscribers.delete(callback)
        };
    }
    disconnect() {
        if (this.worker) {
            this.worker.postMessage({ type: 'DISCONNECT' });
        }
        this.subscribers.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
