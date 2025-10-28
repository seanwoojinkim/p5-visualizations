/**
 * HRV Database - IndexedDB wrapper for session tracking
 * Manages sessions and coherence samples with crash recovery
 */

import { mean, median, standardDeviation, min, max, calculateTimeInZones, calculateAchievementScore } from '../utils/statistics.js';

export class HRVDatabase {
    constructor() {
        this.dbName = 'hrv-coherence';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize the database and create object stores
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('[HRVDatabase] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[HRVDatabase] Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[HRVDatabase] Upgrading database schema...');

                // Create sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                    sessionsStore.createIndex('startTime', 'startTime', { unique: false });
                    sessionsStore.createIndex('endTime', 'endTime', { unique: false });
                    console.log('[HRVDatabase] Created "sessions" object store');
                }

                // Create coherence_samples store
                if (!db.objectStoreNames.contains('coherence_samples')) {
                    const samplesStore = db.createObjectStore('coherence_samples', { keyPath: 'sampleId' });
                    samplesStore.createIndex('sessionId', 'sessionId', { unique: false });
                    samplesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[HRVDatabase] Created "coherence_samples" object store');
                }
            };
        });
    }

    /**
     * Create a new session
     * @returns {Promise<string>} Session ID
     */
    async createSession() {
        const sessionId = crypto.randomUUID();
        const now = Date.now();

        const session = {
            sessionId,
            startTime: now,
            endTime: null,  // null indicates session is still in progress
            durationSeconds: 0,
            meanCoherence: 0,
            medianCoherence: 0,
            maxCoherence: 0,
            minCoherence: 0,
            stdCoherence: 0,
            timeInZones: {
                low: { seconds: 0, percentage: 0 },
                medium: { seconds: 0, percentage: 0 },
                high: { seconds: 0, percentage: 0 }
            },
            achievementScore: 0,
            meanHeartRate: 0,
            samplesCollected: 0,
            createdAt: now,
            updatedAt: now
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.add(session);

            request.onsuccess = () => {
                console.log(`[HRVDatabase] Created session: ${sessionId}`);
                resolve(sessionId);
            };

            request.onerror = () => {
                console.error('[HRVDatabase] Failed to create session:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Add coherence samples to a session
     * @param {string} sessionId - Session ID
     * @param {Object[]} samples - Array of sample objects {coherence, ratio, peakFrequency, heartRate, level}
     * @returns {Promise<void>}
     */
    async addSamples(sessionId, samples) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['coherence_samples'], 'readwrite');
            const store = transaction.objectStore('coherence_samples');

            const timestamp = Date.now();

            // Add each sample
            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                const sampleData = {
                    sampleId: crypto.randomUUID(),
                    sessionId,
                    timestamp: sample.timestamp || timestamp + (i * 3000), // 3s intervals if no timestamp
                    coherence: sample.coherence,
                    ratio: sample.ratio,
                    peakFrequency: sample.peakFrequency,
                    heartRate: sample.heartRate,
                    level: sample.level
                };

                store.add(sampleData);
            }

            transaction.oncomplete = () => {
                console.log(`[HRVDatabase] Added ${samples.length} samples to session ${sessionId}`);
                resolve();
            };

            transaction.onerror = () => {
                console.error('[HRVDatabase] Failed to add samples:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Get all samples for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object[]>} Array of samples
     */
    async getSamples(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['coherence_samples'], 'readonly');
            const store = transaction.objectStore('coherence_samples');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => {
                const samples = request.result;
                // Sort by timestamp
                samples.sort((a, b) => a.timestamp - b.timestamp);
                resolve(samples);
            };

            request.onerror = () => {
                console.error('[HRVDatabase] Failed to get samples:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * End a session and calculate statistics
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Updated session object with statistics
     */
    async endSession(sessionId) {
        // Get all samples for the session
        const samples = await this.getSamples(sessionId);

        if (samples.length === 0) {
            console.warn(`[HRVDatabase] No samples found for session ${sessionId}`);
            throw new Error('Cannot end session with no samples');
        }

        // Extract coherence and heart rate values
        const coherenceValues = samples.map(s => s.coherence);
        const heartRateValues = samples.map(s => s.heartRate).filter(hr => hr > 0);

        // Calculate statistics
        const stats = {
            meanCoherence: mean(coherenceValues),
            medianCoherence: median(coherenceValues),
            maxCoherence: max(coherenceValues),
            minCoherence: min(coherenceValues),
            stdCoherence: standardDeviation(coherenceValues),
            meanHeartRate: heartRateValues.length > 0 ? mean(heartRateValues) : 0,
            samplesCollected: samples.length
        };

        // Calculate time in zones
        stats.timeInZones = calculateTimeInZones(samples);

        // Calculate duration
        const firstTimestamp = samples[0].timestamp;
        const lastTimestamp = samples[samples.length - 1].timestamp;
        stats.durationSeconds = (lastTimestamp - firstTimestamp) / 1000;

        // Calculate achievement score
        stats.achievementScore = calculateAchievementScore(
            stats.meanCoherence,
            stats.durationSeconds,
            stats.timeInZones.high.percentage
        );

        // Update session record
        const now = Date.now();
        const updates = {
            ...stats,
            endTime: now,
            updatedAt: now
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const getRequest = store.get(sessionId);

            getRequest.onsuccess = () => {
                const session = getRequest.result;
                if (!session) {
                    reject(new Error(`Session ${sessionId} not found`));
                    return;
                }

                // Merge updates
                const updatedSession = { ...session, ...updates };
                const putRequest = store.put(updatedSession);

                putRequest.onsuccess = () => {
                    console.log(`[HRVDatabase] Session ${sessionId} ended. Stats:`, stats);
                    resolve(updatedSession);
                };

                putRequest.onerror = () => {
                    reject(putRequest.error);
                };
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    /**
     * Get a session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object|null>} Session object or null if not found
     */
    async getSession(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.get(sessionId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('[HRVDatabase] Failed to get session:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all sessions, sorted by start time (newest first)
     * @param {number} limit - Maximum number of sessions to return (default: all)
     * @returns {Promise<Object[]>} Array of sessions
     */
    async getAllSessions(limit = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.getAll();

            request.onsuccess = () => {
                let sessions = request.result;
                // Sort by start time (newest first)
                sessions.sort((a, b) => b.startTime - a.startTime);

                if (limit && limit > 0) {
                    sessions = sessions.slice(0, limit);
                }

                resolve(sessions);
            };

            request.onerror = () => {
                console.error('[HRVDatabase] Failed to get sessions:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Find unfinished sessions (crash recovery)
     * @returns {Promise<Object[]>} Array of unfinished sessions (endTime === null)
     */
    async getUnfinishedSessions() {
        const allSessions = await this.getAllSessions();
        return allSessions.filter(session => session.endTime === null);
    }

    /**
     * Get recent sessions with pagination
     * @param {number} limit - Maximum number of sessions to return
     * @param {number} offset - Number of sessions to skip (for pagination)
     * @returns {Promise<Object[]>} Array of sessions
     */
    async getRecentSessions(limit = 50, offset = 0) {
        const allSessions = await this.getAllSessions();
        return allSessions.slice(offset, offset + limit);
    }

    /**
     * Get a session with all its samples
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Object with session and samples: {session, samples}
     */
    async getSessionWithSamples(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const samples = await this.getSamples(sessionId);

        return {
            session,
            samples
        };
    }

    /**
     * Delete a session and all its samples
     * @param {string} sessionId - Session ID
     * @returns {Promise<void>}
     */
    async deleteSession(sessionId) {
        // First delete all samples
        const samples = await this.getSamples(sessionId);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions', 'coherence_samples'], 'readwrite');
            const sessionsStore = transaction.objectStore('sessions');
            const samplesStore = transaction.objectStore('coherence_samples');

            // Delete all samples
            for (const sample of samples) {
                samplesStore.delete(sample.sampleId);
            }

            // Delete session
            sessionsStore.delete(sessionId);

            transaction.oncomplete = () => {
                console.log(`[HRVDatabase] Deleted session ${sessionId} and ${samples.length} samples`);
                resolve();
            };

            transaction.onerror = () => {
                console.error('[HRVDatabase] Failed to delete session:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Delete all sessions and samples
     * @returns {Promise<void>}
     */
    async deleteAllSessions() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions', 'coherence_samples'], 'readwrite');
            const sessionsStore = transaction.objectStore('sessions');
            const samplesStore = transaction.objectStore('coherence_samples');

            // Clear both stores
            const clearSessions = sessionsStore.clear();
            const clearSamples = samplesStore.clear();

            transaction.oncomplete = () => {
                console.log('[HRVDatabase] Deleted all sessions and samples');
                resolve();
            };

            transaction.onerror = () => {
                console.error('[HRVDatabase] Failed to delete all sessions:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[HRVDatabase] Database closed');
        }
    }
}
