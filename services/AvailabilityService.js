import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

const CACHE_KEY = '@glazki_availability_cache_v5'; // Bump version
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const MAX_POOL_SIZE = 10;

const CONCURRENCY = 5;

class AvailabilityService {
    constructor() {
        this.cache = new Map(); // url -> { status: 'unknown' | 'online' | 'offline', timestamp: number, snapshotUri: string | null }
        this.pool = []; // Array of URLs to check
        this.activeChecks = new Map(); // url -> cancelFunction
        this.listeners = new Set();
        this.isChecking = false;
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

        const newUrls = channels.map(c => c.url).filter(url => !!url);
        if (newUrls.length === 0) return;

        // Cancel active checks that are no longer viewable
        const newUrlSet = new Set(newUrls);
        for (const [url, cancel] of this.activeChecks) {
            if (!newUrlSet.has(url)) {
                console.log('[AvailabilityService] Cancelling active check for:', url);
                cancel();
                this.activeChecks.delete(url);
            }
        }

        const uniqueNew = [...new Set(newUrls)];
        const now = Date.now();

        // Filter out URLs that are recently cached
        const toCheck = uniqueNew.filter(url => {
            const cached = this.cache.get(url);
            if (!cached) return true;
            if (now - cached.timestamp > CACHE_TIMEOUT) return true;
            return false;
        });

        // Update pool: replace with new viewable items that need checking
        this.pool = toCheck.slice(0, MAX_POOL_SIZE);

        if (this.pool.length > 0 && !this.isChecking) {
            console.log('[AvailabilityService] Triggering pool process. Size:', this.pool.length);
            this.processPool();
        }
    }

    async processPool() {
        if (this.isChecking) return;
        this.isChecking = true;

        const worker = async (id) => {
            console.log(`[AvailabilityService] Worker ${id} started`);
            while (this.pool.length > 0) {
                const url = this.pool.shift();

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
                    try {
                        const controller = new AbortController();
                        const signal = controller.signal;

                        // We use GET with no-store to force a fresh check and bypass cache.
                        // We abort immediately after the promise resolves (headers received)
                        // This tests if the server allows the request (CORS) and if the resource exists.
                        const response = await fetch(url, {
                            method: 'GET',
                            cache: 'no-store',
                            signal: signal
                        });

                        // If we got here, CORS is likely okay for GET.
                        // Abort the body download
                        controller.abort();

                        if (response.ok || response.status === 200) {
                            finish('online', null);
                        } else {
                            finish('offline', null);
                        }
                    } catch (e) {
                        // AbortError is expected if we abort, but fetch usually throws it only if aborted *before* completion.
                        // But here we await fetch, so if it throws, it's a network/CORS error.
                        // However, if we abort *after* await fetch returns, that doesn't throw.
                        // So this catch block catches actual fetch failures (network, CORS).
                        if (e.name !== 'AbortError') {
                            console.warn('[AvailabilityService] Web check failed for:', url, e);
                        }
                        finish('offline', null);
                    }
                    return;
                }

                // Use expo-video-thumbnails
                // Note: time is in milliseconds
                const { uri } = await VideoThumbnails.getThumbnailAsync(url, {
                    time: 2000,
                });

                if (uri) {
                    finish('online', uri);
                } else {
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
