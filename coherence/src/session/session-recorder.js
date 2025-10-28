/**
 * SessionRecorder - Manages session recording lifecycle
 * Buffers coherence samples and auto-saves to IndexedDB
 */

import { HRVDatabase } from './hrv-database.js';
import { formatDuration } from '../utils/statistics.js';

export class SessionRecorder {
    constructor() {
        this.db = new HRVDatabase();
        this.isRecording = false;
        this.currentSessionId = null;
        this.sampleBuffer = [];
        this.sessionStartTime = null;
        this.sessionSampleCount = 0;

        // Buffer configuration
        this.bufferFlushInterval = 30000; // 30 seconds
        this.bufferFlushSize = 100; // Max samples before auto-flush
        this.lastFlushTime = null;
        this.autoFlushTimer = null;

        // Callbacks
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onSampleAdded = null;
        this.onError = null;
    }

    /**
     * Initialize the database
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await this.db.init();
            console.log('[SessionRecorder] Initialized successfully');

            // Check for unfinished sessions (crash recovery)
            const unfinishedSessions = await this.db.getUnfinishedSessions();
            if (unfinishedSessions.length > 0) {
                console.warn(`[SessionRecorder] Found ${unfinishedSessions.length} unfinished session(s)`);
                return unfinishedSessions;
            }
            return [];
        } catch (error) {
            console.error('[SessionRecorder] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start recording a new session
     * @returns {Promise<string>} Session ID
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('[SessionRecorder] Already recording');
            return this.currentSessionId;
        }

        try {
            // Create new session in database
            this.currentSessionId = await this.db.createSession();
            this.isRecording = true;
            this.sampleBuffer = [];
            this.sessionStartTime = Date.now();
            this.sessionSampleCount = 0;
            this.lastFlushTime = Date.now();

            // Start auto-flush timer
            this.startAutoFlush();

            console.log(`[SessionRecorder] Recording started: ${this.currentSessionId}`);

            if (this.onRecordingStart) {
                this.onRecordingStart(this.currentSessionId);
            }

            return this.currentSessionId;
        } catch (error) {
            console.error('[SessionRecorder] Failed to start recording:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Add a coherence sample to the current session
     * @param {Object} sample - Coherence sample {coherence, ratio, peakFrequency, heartRate, level}
     */
    addSample(sample) {
        if (!this.isRecording) {
            console.warn('[SessionRecorder] Not recording, sample ignored');
            return;
        }

        // Add timestamp if not provided
        if (!sample.timestamp) {
            sample.timestamp = Date.now();
        }

        // Add to buffer
        this.sampleBuffer.push(sample);
        this.sessionSampleCount++;

        console.log(
            `[SessionRecorder] Sample ${this.sessionSampleCount}: ` +
            `coherence=${sample.coherence}, buffer=${this.sampleBuffer.length}`
        );

        if (this.onSampleAdded) {
            this.onSampleAdded(sample, this.sessionSampleCount);
        }

        // Check if buffer needs flushing (size threshold)
        if (this.sampleBuffer.length >= this.bufferFlushSize) {
            console.log('[SessionRecorder] Buffer size threshold reached, flushing...');
            this.flushBuffer();
        }
    }

    /**
     * Stop recording and finalize the session
     * @returns {Promise<Object>} Final session object with statistics
     */
    async stopRecording() {
        if (!this.isRecording) {
            console.warn('[SessionRecorder] Not recording');
            return null;
        }

        try {
            // Stop auto-flush timer
            this.stopAutoFlush();

            // Flush any remaining samples
            if (this.sampleBuffer.length > 0) {
                console.log('[SessionRecorder] Flushing final samples...');
                await this.flushBuffer();
            }

            // End session and calculate statistics
            const session = await this.db.endSession(this.currentSessionId);

            console.log('[SessionRecorder] Recording stopped. Session summary:', {
                sessionId: session.sessionId,
                duration: formatDuration(session.durationSeconds),
                samples: session.samplesCollected,
                meanCoherence: session.meanCoherence.toFixed(1),
                maxCoherence: session.maxCoherence.toFixed(1),
                achievementScore: session.achievementScore
            });

            // Reset state
            const finalSessionId = this.currentSessionId;
            this.isRecording = false;
            this.currentSessionId = null;
            this.sampleBuffer = [];
            this.sessionStartTime = null;
            this.sessionSampleCount = 0;

            if (this.onRecordingStop) {
                this.onRecordingStop(session);
            }

            return session;
        } catch (error) {
            console.error('[SessionRecorder] Failed to stop recording:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Flush sample buffer to database
     * @returns {Promise<void>}
     */
    async flushBuffer() {
        if (this.sampleBuffer.length === 0) {
            return;
        }

        const samplesToFlush = [...this.sampleBuffer];
        this.sampleBuffer = [];

        try {
            await this.db.addSamples(this.currentSessionId, samplesToFlush);
            this.lastFlushTime = Date.now();
            console.log(`[SessionRecorder] Flushed ${samplesToFlush.length} samples to database`);
        } catch (error) {
            console.error('[SessionRecorder] Failed to flush buffer:', error);
            // Put samples back in buffer on error
            this.sampleBuffer = [...samplesToFlush, ...this.sampleBuffer];
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Start auto-flush timer
     */
    startAutoFlush() {
        this.stopAutoFlush(); // Clear any existing timer

        this.autoFlushTimer = setInterval(() => {
            if (this.isRecording && this.sampleBuffer.length > 0) {
                console.log('[SessionRecorder] Auto-flush triggered (30s interval)');
                this.flushBuffer();
            }
        }, this.bufferFlushInterval);
    }

    /**
     * Stop auto-flush timer
     */
    stopAutoFlush() {
        if (this.autoFlushTimer) {
            clearInterval(this.autoFlushTimer);
            this.autoFlushTimer = null;
        }
    }

    /**
     * Get current recording status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            sessionId: this.currentSessionId,
            elapsedSeconds: this.isRecording ? (Date.now() - this.sessionStartTime) / 1000 : 0,
            samplesCollected: this.sessionSampleCount,
            bufferedSamples: this.sampleBuffer.length
        };
    }

    /**
     * Get elapsed time since recording started
     * @returns {string} Formatted elapsed time (e.g., "5m 42s")
     */
    getElapsedTime() {
        if (!this.isRecording) {
            return '0s';
        }
        const elapsedSeconds = (Date.now() - this.sessionStartTime) / 1000;
        return formatDuration(elapsedSeconds);
    }

    /**
     * Resume an unfinished session (crash recovery)
     * @param {string} sessionId - Session ID to resume
     */
    async resumeSession(sessionId) {
        // Get existing samples to know the count
        const existingSamples = await this.db.getSamples(sessionId);

        this.isRecording = true;
        this.currentSessionId = sessionId;
        this.sampleBuffer = [];
        this.sessionSampleCount = existingSamples.length;

        // Set start time based on first sample or session record
        const session = await this.db.getSession(sessionId);
        this.sessionStartTime = session.startTime;
        this.lastFlushTime = Date.now();

        this.startAutoFlush();

        console.log(`[SessionRecorder] Resumed session ${sessionId} with ${existingSamples.length} existing samples`);

        if (this.onRecordingStart) {
            this.onRecordingStart(sessionId);
        }
    }

    /**
     * Discard an unfinished session (crash recovery)
     * @param {string} sessionId - Session ID to discard
     */
    async discardSession(sessionId) {
        await this.db.deleteSession(sessionId);
        console.log(`[SessionRecorder] Discarded unfinished session ${sessionId}`);
    }

    /**
     * Get recent sessions
     * @param {number} limit - Number of sessions to retrieve
     * @returns {Promise<Object[]>} Array of sessions
     */
    async getRecentSessions(limit = 10) {
        return this.db.getAllSessions(limit);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAutoFlush();
        if (this.db) {
            this.db.close();
        }
    }
}
