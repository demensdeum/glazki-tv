import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';



const CACHE_KEY = '@glazki_availability_cache_v5'; // Bump version
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const MAX_POOL_SIZE = 10;

const CONCURRENCY = 5;

class AvailabilityService {
    constructor() {
        this.cache = new Map(); // url -> { status: 'unknown' | 'online' | 'offline', timestamp: number, snapshotUri: string | null }

        this.highPriority = []; // Viewable channels (Queue)
        this.activeChecks = new Map(); // url -> cancelFunction OR { id, worker } logic
        this.listeners = new Set();
        this.isChecking = false;

        // Initialize Web Worker if on Web
        if (Platform.OS === 'web') {
            try {
                // Inline worker to avoid MIME type issues with Metro/Expo Web
                const workerCode = `
/* eslint-disable no-restricted-globals */
const activeRequests = new Map();

self.onmessage = async (e) => {
    const { id, url, type } = e.data;

    if (type === 'cancel') {
        const controller = activeRequests.get(id);
        if (controller) {
            controller.abort();
            activeRequests.delete(id);
        }
        return;
    }

    if (type === 'check') {
        const controller = new AbortController();
        activeRequests.set(id, controller);
        const signal = controller.signal;

        try {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                signal: signal
            });

            controller.abort();
            activeRequests.delete(id);

            if (response.ok || response.status === 200) {
                self.postMessage({ id, status: 'online', url });
            } else {
                self.postMessage({ id, status: 'offline', url });
            }
        } catch (error) {
            activeRequests.delete(id);
            self.postMessage({ id, status: 'offline', url });
        }
    }
};
`;
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                console.log('[AvailabilityService] Loading inline worker');

                this.worker = new Worker(workerUrl);

                this.workerIds = new Map(); // id -> { resolve, url }
                this.nextWorkerId = 1;

                this.worker.onmessage = (e) => {
                    const { id, status, snapshotUri } = e.data;
                    const request = this.workerIds.get(id);
                    if (request) {
                        request.resolve({ status, snapshotUri });
                        this.workerIds.delete(id);
                    }
                };
            } catch (e) {
                console.error('[AvailabilityService] Failed to initialize Web Worker', e);
            }
        }

        this.loadCache();
    }

    async loadCache() {
        try {
            const stored = await AsyncStorage.getItem(CACHE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Filter out expired items
                const now = Date.now();
                Object.entries(parsed).forEach(([url, data]) => {
                    if (now - data.timestamp < CACHE_TIMEOUT) {
                        this.cache.set(url, data);
                    }
                });
                this.notify();
            }
        } catch (e) {
            console.error('Failed to load availability cache', e);
        }
    }

    async saveCache() {
        try {
            const obj = Object.fromEntries(this.cache);
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(obj));
        } catch (e) {
            // Ignore storage errors
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        // Immediately notify with current state if needed, or just let them pull
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb());
    }

    getStatus(url) {
        return this.cache.get(url)?.status || 'unknown';
    }

    getDetails(url) {
        return this.cache.get(url);
    }

    getSnapshot(url) {
        return this.cache.get(url)?.snapshotUri || null;
    }

    updateViewableChannels(channels) {
        if (!channels || channels.length === 0) return;

        let newUrls = channels.map(c => c.url).filter(url => !!url);
        if (newUrls.length === 0) return;

        // Limit to MAX_POOL_SIZE (most recent/visible ones)
        // Usually viewableItems are in order, so slice the first N
        if (newUrls.length > MAX_POOL_SIZE) {
            newUrls = newUrls.slice(0, MAX_POOL_SIZE);
        }

        const newUrlSet = new Set(newUrls);

        // Cancel active checks that are NOT in the new viewable list
        // This includes background scans (low priority) or old viewable items
        for (const [url, cancel] of this.activeChecks) {
            if (!newUrlSet.has(url)) {
                // console.log('[AvailabilityService] Cancelling irrelevant check:', url);
                cancel();
                this.activeChecks.delete(url);
            }
        }

        const now = Date.now();

        // Filter out URLs that are recently cached
        const toCheck = newUrls.filter(url => {
            const cached = this.cache.get(url);
            if (!cached) return true;
            if (now - cached.timestamp > CACHE_TIMEOUT) return true;
            return false;
        });

        // Add to high priority queue
        // We replace highPriority to ensure it only matches current view
        this.highPriority = [];
        const uniqueToCheck = [...new Set(toCheck)];

        for (const url of uniqueToCheck) {
            this.highPriority.push(url);
        }

        if (this.highPriority.length > 0 && !this.isChecking) {
            console.log('[AvailabilityService] Triggering high priority process. Size:', this.highPriority.length);
            this.processPool();
        }
    }



    async processPool() {
        if (this.isChecking) return;
        this.isChecking = true;

        const worker = async (id) => {
            console.log(`[AvailabilityService] Worker ${id} started`);

            while (true) {
                let url = null;

                if (this.highPriority.length > 0) {
                    url = this.highPriority.shift();
                } else {
                    break;
                }

                if (!url) break;

                // Double check cache validity
                const cached = this.cache.get(url);
                if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
                    continue;
                }

                // Wait for check to complete
                await this.performCheck(url);
                this.notify();
            }
            console.log(`[AvailabilityService] Worker ${id} finished`);
        };

        try {
            const workers = [];
            for (let i = 0; i < CONCURRENCY; i++) {
                workers.push(worker(i));
            }
            await Promise.all(workers);
        } finally {
            this.isChecking = false;
            this.saveCache();
        }
    }

    performCheck(url) {
        return new Promise(async (resolve) => {
            console.log('[AvailabilityService] performing check for:', url);
            let cancelled = false;

            const finish = (status, snapshotUri) => {
                if (cancelled) return;
                console.log(`[AvailabilityService] Finished ${url}: ${status} `);
                this.cache.set(url, {
                    status: status,
                    snapshotUri: snapshotUri,
                    timestamp: Date.now()
                });
                this.activeChecks.delete(url);
                resolve();
            };

            // Register cancellation
            this.activeChecks.set(url, () => {
                console.log(`[AvailabilityService] Aborting check for ${url}`);
                cancelled = true;
                resolve(); // Free the worker without saving result
            });

            try {
                if (Platform.OS === 'web') {
                    if (this.worker) {
                        const id = this.nextWorkerId++;

                        // Store resolver to be called by onmessage
                        this.workerIds.set(id, {
                            resolve: (res) => {
                                finish(res.status, res.snapshotUri);
                            }, url
                        });

                        // Update cancel logic to send cancel message to worker
                        this.activeChecks.set(url, () => {
                            console.log(`[AvailabilityService] Aborting check for ${url} (Worker ID: ${id})`);
                            this.worker.postMessage({ type: 'cancel', id, url });
                            cancelled = true;
                            this.workerIds.delete(id);
                            resolve();
                        });

                        this.worker.postMessage({ type: 'check', id, url });
                    } else {
                        // Fallback if worker failed to init (or use main thread logic if preferred, 
                        // but for now let's assume worker is required or just fail)
                        console.warn('[AvailabilityService] Web Worker not available, skipping check');
                        finish('offline', null);
                    }
                    return;
                }

                // Native check using fetch (simulated worker or direct async)
                try {
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), 5000); // 5s timeout

                    const response = await fetch(url, {
                        method: 'GET',
                        cache: 'no-store',
                        signal: controller.signal
                    });

                    clearTimeout(id);
                    // Just check status, don't download body
                    // (On native fetch, we might not be able to abort body download easily without a stream, 
                    // but we can just ignore it)

                    if (response.ok || response.status === 200) {
                        finish('online', null);
                    } else {
                        finish('offline', null);
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        // console.warn('[AvailabilityService] Native check failed:', url, e);
                    }
                    finish('offline', null);
                }

            } catch (e) {
                console.warn('[AvailabilityService] Thumbnail generation failed for:', url, e);
                // If thumbnail failed, it might be offline or just not supported.
                finish('offline', null);
            }
        });
    }
}

export default new AvailabilityService();
