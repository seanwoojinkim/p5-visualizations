/**
 * Polar H10 HRV Monitor WebSocket Client
 * Connects to the HRV Monitor service and maps coherence scores to visualization levels
 *
 * Usage:
 *   import { PolarH10Client } from './integrations/polar-h10-client.js';
 *
 *   const polar = new PolarH10Client({
 *     wsUrl: 'ws://localhost:8765',
 *     onCoherenceUpdate: (data) => {
 *       params.coherenceLevel = data.level;
 *     }
 *   });
 *
 *   polar.connect();
 */

export class PolarH10Client {
    constructor(config = {}) {
        // Configuration
        this.wsUrl = config.wsUrl || 'ws://localhost:8765';
        this.onCoherenceUpdate = config.onCoherenceUpdate || (() => {});
        this.onStatusUpdate = config.onStatusUpdate || (() => {});
        this.onBufferStatus = config.onBufferStatus || (() => {});
        this.onHeartbeat = config.onHeartbeat || (() => {});
        this.onError = config.onError || (() => {});

        // Connection state
        this.ws = null;
        this.isConnected = false;
        this.reconnectDelay = 3000; // 3 seconds
        this.shouldReconnect = true;
        this.reconnectTimeout = null;

        // Coherence state
        this.currentLevel = 0.0;      // Current smoothed level
        this.targetLevel = 0.0;       // Target level from HRV data
        this.currentScore = 0;        // Raw coherence score (0-100)

        // Smoothing configuration
        this.smoothingFactor = 0.08;  // Lower = smoother transitions

        // Adaptive scaling based on historical peak
        this.historicalPeakScore = 0;  // Peak coherence score from all sessions
        this.peakBoost = 10;           // Points above historical peak for max attraction
        this.enableAdaptiveScaling = true; // Can be toggled
        this.onPeakUpdate = config.onPeakUpdate || (() => {}); // Callback when new peak reached

        // Statistics
        this.latestData = null;
        this.connectionAttempts = 0;
        this.lastUpdateTime = null;
    }

    /**
     * Connect to HRV Monitor WebSocket server
     */
    connect() {
        if (this.isConnected || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('[Polar H10] Already connected or connecting...');
            return;
        }

        this.connectionAttempts++;
        console.log(`[Polar H10] Connecting to ${this.wsUrl}... (attempt ${this.connectionAttempts})`);

        try {
            this.ws = new WebSocket(this.wsUrl);
            this._setupEventHandlers();
        } catch (error) {
            console.error('[Polar H10] Connection error:', error);
            this.onError({ type: 'connection_error', error });
            this._scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.shouldReconnect = false;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
        console.log('[Polar H10] Disconnected');
    }

    /**
     * Setup WebSocket event handlers
     */
    _setupEventHandlers() {
        this.ws.onopen = () => {
            this.isConnected = true;
            this.connectionAttempts = 0;
            console.log('[Polar H10] ✓ Connected to HRV Monitor');

            this.onStatusUpdate({
                connected: true,
                wsUrl: this.wsUrl
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._handleMessage(message);
            } catch (error) {
                console.error('[Polar H10] Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Polar H10] WebSocket error:', error);
            this.onError({ type: 'websocket_error', error });
        };

        this.ws.onclose = (event) => {
            this.isConnected = false;
            console.log('[Polar H10] Connection closed');

            this.onStatusUpdate({
                connected: false,
                code: event.code,
                reason: event.reason
            });

            if (this.shouldReconnect) {
                this._scheduleReconnect();
            }
        };
    }

    /**
     * Handle incoming WebSocket messages
     */
    _handleMessage(message) {
        switch (message.type) {
            case 'initial_state':
                console.log('[Polar H10] Received initial state');
                if (message.connection_status) {
                    this._handleConnectionStatus({ data: message.connection_status });
                }
                if (message.latest_coherence) {
                    this._handleCoherenceUpdate({ data: message.latest_coherence });
                }
                break;

            case 'coherence_update':
                this._handleCoherenceUpdate(message);
                break;

            case 'buffer_status':
                this._handleBufferStatus(message);
                break;

            case 'connection_status':
                this._handleConnectionStatus(message);
                break;

            case 'heartbeat':
                this._handleHeartbeat(message);
                break;

            default:
                console.log('[Polar H10] Unknown message type:', message.type);
        }
    }

    /**
     * Handle heartbeat messages
     */
    _handleHeartbeat(message) {
        const data = message.data;

        this.onHeartbeat({
            rrInterval: data.rr_interval,
            heartRate: data.heart_rate,
            timestamp: message.timestamp
        });
    }

    /**
     * Handle coherence update messages
     */
    _handleCoherenceUpdate(message) {
        const data = message.data;

        if (data.status === 'valid') {
            this.currentScore = data.coherence;
            this.targetLevel = this.scoreToLevel(data.coherence);
            this.lastUpdateTime = Date.now();
            this.latestData = data;

            // Notify callback
            this.onCoherenceUpdate({
                score: data.coherence,           // 0-100
                level: this.targetLevel,         // -1.0 to +1.0
                smoothedLevel: this.currentLevel, // Current smoothed value
                ratio: data.ratio,
                peakFrequency: data.peak_frequency,
                beatsUsed: data.beats_used,
                timestamp: message.timestamp
            });

            console.log(
                `[Polar H10] Coherence: ${data.coherence}/100 ` +
                `(level=${this.targetLevel.toFixed(2)}, ` +
                `ratio=${data.ratio.toFixed(2)}, ` +
                `peak=${data.peak_frequency.toFixed(3)} Hz)`
            );
        } else {
            console.log(`[Polar H10] Status: ${data.status}`);
        }
    }

    /**
     * Handle buffer status messages
     */
    _handleBufferStatus(message) {
        const data = message.data;

        this.onBufferStatus({
            beatsInBuffer: data.beats_in_buffer,
            minBeatsRequired: data.min_beats_required,
            bufferReady: data.buffer_ready,
            meanHeartRate: data.mean_heart_rate,
            bufferDuration: data.buffer_duration_seconds
        });

        if (!data.buffer_ready) {
            console.log(
                `[Polar H10] Buffering... ${data.beats_in_buffer}/${data.min_beats_required} beats`
            );
        }
    }

    /**
     * Handle connection status messages
     */
    _handleConnectionStatus(message) {
        const data = message.data;
        const polarConnected = data.polar_h10_connected;

        if (polarConnected) {
            console.log(`[Polar H10] ✓ ${data.device_name} connected`);
        } else {
            console.log('[Polar H10] ⚠ Polar H10 disconnected');
        }

        this.onStatusUpdate({
            polarConnected,
            deviceName: data.device_name,
            deviceAddress: data.device_address
        });
    }

    /**
     * Schedule reconnection attempt
     */
    _scheduleReconnect() {
        if (this.reconnectTimeout) {
            return; // Already scheduled
        }

        console.log(`[Polar H10] Reconnecting in ${this.reconnectDelay / 1000}s...`);

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * Set historical peak score from database
     * This allows the visualization to adapt to the user's personal best
     */
    setHistoricalPeak(peakScore) {
        this.historicalPeakScore = Math.max(0, Math.min(100, peakScore));
        console.log(`[Polar H10] Historical peak set to ${this.historicalPeakScore}/100`);
    }

    /**
     * Map coherence score (0-100) to coherence level (-1.0 to +1.0)
     *
     * Two modes:
     * 1. Adaptive mode (enableAdaptiveScaling = true):
     *    Uses historical peak to create a "stretch goal" - achieving slightly
     *    above your personal best gives maximum attraction (+1.0)
     *
     * 2. Fixed mode (enableAdaptiveScaling = false):
     *    Uses standard mapping based on typical HeartMath ranges:
     *      0-25:   Very low coherence  → -1.0 to -0.5  (strong repulsion)
     *      25-40:  Low coherence       → -0.5 to 0.0   (weak repulsion)
     *      40-60:  Medium coherence    → 0.0 to +0.5   (weak attraction)
     *      60-100: High coherence      → +0.5 to +1.0  (strong attraction)
     */
    scoreToLevel(score) {
        // Use adaptive scaling if enabled and we have a historical peak
        if (this.enableAdaptiveScaling && this.historicalPeakScore > 0) {
            return this._adaptiveScoreToLevel(score);
        } else {
            return this._fixedScoreToLevel(score);
        }
    }

    /**
     * Adaptive mapping that scales based on historical peak
     * The target is (historicalPeak + peakBoost), which maps to +1.0
     */
    _adaptiveScoreToLevel(score) {
        const target = this.historicalPeakScore + this.peakBoost;
        let level;

        // Below 40% of target: strong repulsion (-1.0 to -0.5)
        if (score <= target * 0.4) {
            const normalized = score / (target * 0.4);
            level = -1.0 + normalized * 0.5;
        }
        // 40-60% of target: weak repulsion (-0.5 to 0.0)
        else if (score <= target * 0.6) {
            const normalized = (score - target * 0.4) / (target * 0.2);
            level = -0.5 + normalized * 0.5;
        }
        // 60-90% of target: weak attraction (0.0 to +0.5)
        else if (score <= target * 0.9) {
            const normalized = (score - target * 0.6) / (target * 0.3);
            level = 0.0 + normalized * 0.5;
        }
        // 90-100%+ of target: strong attraction (+0.5 to +1.0)
        else {
            const normalized = Math.min((score - target * 0.9) / (target * 0.1), 1.0);
            level = 0.5 + normalized * 0.5;
        }

        // Log adaptive scaling info occasionally (every ~5 seconds at 60fps = every 300 frames)
        if (Math.random() < 0.003) {
            console.log(
                `[Adaptive] Peak: ${this.historicalPeakScore}, Target: ${target.toFixed(0)}, ` +
                `Score: ${score.toFixed(0)}, Level: ${level.toFixed(2)}`
            );
        }

        return level;
    }

    /**
     * Fixed mapping based on typical HeartMath coherence ranges
     */
    _fixedScoreToLevel(score) {
        if (score <= 25) {
            return -1.0 + (score / 25) * 0.5;
        } else if (score <= 40) {
            return -0.5 + ((score - 25) / 15) * 0.5;
        } else if (score <= 60) {
            return 0.0 + ((score - 40) / 20) * 0.5;
        } else {
            return 0.5 + Math.min((score - 60) / 40, 1.0) * 0.5;
        }
    }

    /**
     * Get smoothed coherence level (call in draw loop)
     * Uses exponential smoothing for natural visual transitions
     */
    getSmoothedLevel() {
        // Exponential smoothing: value += (target - value) * smoothingFactor
        this.currentLevel += (this.targetLevel - this.currentLevel) * this.smoothingFactor;
        return this.currentLevel;
    }

    /**
     * Set smoothing factor (0.0 to 1.0)
     * Lower = smoother, Higher = more responsive
     */
    setSmoothingFactor(factor) {
        this.smoothingFactor = Math.max(0.0, Math.min(1.0, factor));
    }

    /**
     * Get current connection and coherence status
     */
    getStatus() {
        return {
            wsConnected: this.isConnected,
            currentLevel: this.currentLevel,
            targetLevel: this.targetLevel,
            currentScore: this.currentScore,
            latestData: this.latestData,
            lastUpdateTime: this.lastUpdateTime,
            secondsSinceUpdate: this.lastUpdateTime
                ? (Date.now() - this.lastUpdateTime) / 1000
                : null
        };
    }

    /**
     * Reset to neutral state
     */
    reset() {
        this.currentLevel = 0.0;
        this.targetLevel = 0.0;
        this.currentScore = 0;
        this.latestData = null;
        this.lastUpdateTime = null;
    }
}
