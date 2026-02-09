import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@glazki_availability_cache';
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const MAX_POOL_SIZE = 30;

class AvailabilityService {
    constructor() {
        this.cache = new Map(); // url -> { status: 'unknown' | 'online', timestamp: number }
        this.pool = []; // Array of URLs to check
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

    updateViewableChannels(channels) {
        if (!channels || channels.length === 0) return;

        const newUrls = channels.map(c => c.url).filter(url => !!url);
        if (newUrls.length === 0) return;

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

        if (this.pool.length > 0) {
            this.processPool();
        }
    }

    async processPool() {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            while (this.pool.length > 0) {
                const url = this.pool.shift();

                // Double check cache validity before network call
                const cached = this.cache.get(url);
                if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
                    continue;
                }

                await this.checkUrl(url);
                this.notify();
            }
        } finally {
            this.isChecking = false;
            this.saveCache();
        }
    }

    async checkUrl(url) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000); // 5s timeout for check

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(id);

            if (response.ok) {
                this.cache.set(url, { status: 'online', timestamp: Date.now() });
            } else {
                // If HEAD fails, we could try GET with range, but for now mark as unknown/offline
                this.cache.set(url, { status: 'unknown', timestamp: Date.now() });
            }
        } catch (e) {
            this.cache.set(url, { status: 'unknown', timestamp: Date.now() });
        }
    }
}

export default new AvailabilityService();
