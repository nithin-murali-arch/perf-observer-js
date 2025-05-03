"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor(config = {}) {
        this.observer = null;
        this.subscribers = new Set();
        this.transform = null;
        this.originalXHROpen = null;
        this.originalXHRSend = null;
        this.originalFetch = null;
        this.transform = config.transform || null;
        this.initializeObserver(config);
        if (config.xhrTiming)
            this.interceptXHR();
        if (config.fetchTiming)
            this.interceptFetch();
    }
    initializeObserver(config) {
        // Default all config values to false
        const { resourceTiming = false, navigationTiming = false, xhrTiming = false, fetchTiming = false } = config;
        // Skip initialization if all observers are disabled
        if (!resourceTiming && !navigationTiming && !xhrTiming && !fetchTiming) {
            return;
        }
        if (resourceTiming) {
            this.observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => this.processEntry(entry));
            });
            this.observer.observe({ entryTypes: ['resource'], buffered: true });
        }
        if (navigationTiming) {
            const navObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => this.processEntry(entry));
            });
            navObserver.observe({ entryTypes: ['navigation'], buffered: true });
        }
        if (xhrTiming) {
            const xhrObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => this.processEntry(entry));
            });
            xhrObserver.observe({ entryTypes: ['resource'], buffered: true });
        }
        if (fetchTiming) {
            const fetchObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => this.processEntry(entry));
            });
            fetchObserver.observe({ entryTypes: ['resource'], buffered: true });
        }
    }
    processEntry(entry) {
        try {
            if (!this.isValidEntry(entry)) {
                console.error('Invalid performance entry:', entry);
                return;
            }
            let processedEntry = entry;
            if (this.transform) {
                try {
                    processedEntry = this.transform(entry);
                }
                catch (error) {
                    console.error('Error in transform function:', error);
                    return;
                }
            }
            this.subscribers.forEach(subscriber => {
                try {
                    subscriber(processedEntry);
                }
                catch (error) {
                    console.error('Error in subscriber callback:', error);
                }
            });
        }
        catch (error) {
            console.error('Error processing performance entry:', error);
        }
    }
    isValidEntry(entry) {
        try {
            return (entry &&
                typeof entry === 'object' &&
                typeof entry.name === 'string' &&
                typeof entry.entryType === 'string' &&
                typeof entry.startTime === 'number' &&
                typeof entry.duration === 'number' &&
                !isNaN(entry.startTime) &&
                !isNaN(entry.duration) &&
                typeof entry.toJSON === 'function');
        }
        catch (error) {
            return false;
        }
    }
    emitEntry(entry) {
        this.subscribers.forEach(callback => {
            try {
                callback(entry);
            }
            catch (error) {
                console.error('Error in performance entry subscriber:', error);
            }
        });
    }
    interceptXHR() {
        const self = this;
        this.originalXHROpen = XMLHttpRequest.prototype.open;
        this.originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url.toString();
            this._method = method;
            return self.originalXHROpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function () {
            const startTime = performance.now();
            const xhr = this;
            xhr.addEventListener('load', function () {
                const endTime = performance.now();
                const duration = endTime - startTime;
                const entry = {
                    name: xhr._url || '',
                    entryType: 'resource',
                    startTime,
                    duration,
                    responseHeaders: this.getAllResponseHeaders().split('\r\n').reduce((acc, line) => {
                        const [key, value] = line.split(': ');
                        if (key && value)
                            acc[key] = value;
                        return acc;
                    }, {}),
                    toJSON: function () {
                        return {
                            name: this.name,
                            entryType: this.entryType,
                            startTime: this.startTime,
                            duration: this.duration,
                            responseHeaders: this.responseHeaders
                        };
                    }
                };
                self.processEntry(entry);
            });
            return self.originalXHRSend.apply(this, arguments);
        };
    }
    interceptFetch() {
        const self = this;
        this.originalFetch = window.fetch;
        window.fetch = async function (input, init) {
            const startTime = performance.now();
            const url = input instanceof Request ? input.url : input.toString();
            try {
                const response = await self.originalFetch.apply(this, arguments);
                const endTime = performance.now();
                const duration = endTime - startTime;
                const responseHeaders = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                const entry = {
                    name: url,
                    entryType: 'resource',
                    startTime,
                    duration,
                    responseHeaders,
                    toJSON: function () {
                        return {
                            name: this.name,
                            entryType: this.entryType,
                            startTime: this.startTime,
                            duration: this.duration,
                            responseHeaders: this.responseHeaders
                        };
                    }
                };
                self.processEntry(entry);
                return response;
            }
            catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                const entry = {
                    name: url,
                    entryType: 'resource',
                    startTime,
                    duration,
                    error: error instanceof Error ? error.message : String(error),
                    toJSON: function () {
                        return {
                            name: this.name,
                            entryType: this.entryType,
                            startTime: this.startTime,
                            duration: this.duration,
                            error: this.error
                        };
                    }
                };
                self.processEntry(entry);
                throw error;
            }
        };
    }
    subscribe(callback) {
        if (!callback || typeof callback !== 'function') {
            throw new Error('Subscriber callback must be a function');
        }
        this.subscribers.add(callback);
        return {
            unsubscribe: () => {
                this.subscribers.delete(callback);
            }
        };
    }
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
        // Restore original XHR methods
        if (this.originalXHROpen) {
            XMLHttpRequest.prototype.open = this.originalXHROpen;
            XMLHttpRequest.prototype.send = this.originalXHRSend;
        }
        // Restore original fetch
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
        // Clear all subscribers
        this.subscribers.clear();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
