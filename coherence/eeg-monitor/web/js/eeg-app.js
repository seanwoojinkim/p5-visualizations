/**
 * EEG Neurofeedback Monitor - Main Application
 *
 * Coordinates WebSocket connection, data handling, UI updates,
 * and visualizations for real-time EEG neurofeedback.
 */

import { createWebSocketClient } from './websocket-client.js';
import { ScoreGauge, BandPowerBars, WaveformDisplay, AnimationLoop } from './visualizations.js';
import {
    getProtocolInfo,
    formatScore,
    formatPower,
    getScoreClass,
    getDirectionSymbol
} from './protocol-info.js';

/**
 * Main Application Class
 */
class EEGVisualizationApp {
    constructor() {
        // WebSocket client
        this.ws = null;

        // Visualizations
        this.scoreGauge = null;
        this.bandPowerBars = null;
        this.waveformDisplay = null;
        this.animationLoop = null;

        // Application state
        this.currentProtocol = 'alpha_enhancement';
        this.connectionStatus = {
            muse: false,
            websocket: false,
            deviceName: null
        };
        this.baselineStatus = {
            state: 'idle', // 'idle', 'calibrating', 'complete'
            progress: 0
        };
        this.sessionStartTime = null;
        this.sessionTimer = null;

        // Data statistics
        this.dataRate = 0;
        this.lastDataTime = null;
        this.dataCount = 0;

        // Debug mode
        window.EEG_DEBUG = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing EEG Visualization App...');

        // Initialize visualizations
        this._initVisualizations();

        // Initialize UI event handlers
        this._initUIHandlers();

        // Initialize protocol selector
        this._initProtocolSelector();

        // Connect to WebSocket server
        this._connectWebSocket();

        // Start animation loop
        this.animationLoop.start();

        // Start session timer
        this._startSessionTimer();

        console.log('EEG Visualization App initialized');
    }

    /**
     * Initialize visualizations
     * @private
     */
    _initVisualizations() {
        // Score gauge
        this.scoreGauge = new ScoreGauge('score-gauge');

        // Band power bars
        this.bandPowerBars = new BandPowerBars();

        // Waveform display
        this.waveformDisplay = new WaveformDisplay('waveform-canvas');

        // Animation loop
        this.animationLoop = new AnimationLoop();
        this.animationLoop.addRenderer(this.scoreGauge);
        this.animationLoop.addRenderer(this.bandPowerBars);
        this.animationLoop.addRenderer(this.waveformDisplay);
    }

    /**
     * Initialize UI event handlers
     * @private
     */
    _initUIHandlers() {
        // Protocol selector
        const protocolSelector = document.getElementById('protocol-selector');
        if (protocolSelector) {
            protocolSelector.addEventListener('change', (e) => {
                this._switchProtocol(e.target.value);
            });
        }

        // Baseline calibration buttons
        const startBaselineBtn = document.getElementById('start-baseline-btn');
        const finishBaselineBtn = document.getElementById('finish-baseline-btn');
        const baselineDuration = document.getElementById('baseline-duration');

        if (startBaselineBtn) {
            startBaselineBtn.addEventListener('click', () => {
                const duration = parseInt(baselineDuration.value) || 60;
                this._startBaseline(duration);
            });
        }

        if (finishBaselineBtn) {
            finishBaselineBtn.addEventListener('click', () => {
                this._finishBaseline();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // 'D' key toggles debug mode
            if (e.key === 'd' || e.key === 'D') {
                window.EEG_DEBUG = !window.EEG_DEBUG;
                console.log('Debug mode:', window.EEG_DEBUG ? 'ON' : 'OFF');
            }
        });
    }

    /**
     * Initialize protocol selector with current protocol
     * @private
     */
    _initProtocolSelector() {
        this._updateProtocolInfo(this.currentProtocol);
    }

    /**
     * Connect to WebSocket server
     * @private
     */
    _connectWebSocket() {
        const handlers = {
            onOpen: () => this._onWebSocketOpen(),
            onClose: () => this._onWebSocketClose(),
            onError: (error) => this._onWebSocketError(error),
            onInitialState: (data) => this._handleInitialState(data),
            onCoherenceUpdate: (data) => this._handleCoherenceUpdate(data),
            onEEGUpdate: (data) => this._handleEEGUpdate(data),
            onConnectionStatus: (data) => this._handleConnectionStatus(data),
            onBaselineProgress: (data) => this._handleBaselineProgress(data),
            onProtocolSwitched: (data) => this._handleProtocolSwitched(data),
            onBufferStatus: (data) => this._handleBufferStatus(data)
        };

        this.ws = createWebSocketClient(handlers);
        this.ws.connect();
    }

    /**
     * Handle WebSocket open event
     * @private
     */
    _onWebSocketOpen() {
        this.connectionStatus.websocket = true;
        this._updateConnectionStatus();
        console.log('Connected to EEG backend');

        // Update footer
        const connectionInfo = document.getElementById('connection-info');
        if (connectionInfo) {
            connectionInfo.textContent = 'Connected to ws://localhost:8766';
        }
    }

    /**
     * Handle WebSocket close event
     * @private
     */
    _onWebSocketClose() {
        this.connectionStatus.websocket = false;
        this._updateConnectionStatus();
        console.log('Disconnected from EEG backend');

        // Update footer
        const connectionInfo = document.getElementById('connection-info');
        if (connectionInfo) {
            connectionInfo.textContent = 'Reconnecting to ws://localhost:8766...';
        }
    }

    /**
     * Handle WebSocket error
     * @private
     */
    _onWebSocketError(error) {
        console.error('WebSocket error:', error);
    }

    /**
     * Handle initial state from server
     * @private
     */
    _handleInitialState(data) {
        console.log('Received initial state:', data);

        // Update connection status
        if (data.connection_status) {
            this._handleConnectionStatus(data.connection_status);
        }

        // Update latest data
        if (data.latest_coherence) {
            this._handleCoherenceUpdate(data.latest_coherence);
        }

        if (data.latest_eeg_update) {
            this._handleEEGUpdate(data.latest_eeg_update);
        }

        if (data.baseline_progress) {
            this._handleBaselineProgress(data.baseline_progress);
        }
    }

    /**
     * Handle coherence/score update
     * @private
     */
    _handleCoherenceUpdate(data) {
        this._updateDataRate();

        // Update score gauge
        this.scoreGauge.update(data.score, data.feedback_level);

        // Update score display
        const scoreValue = document.getElementById('score-value');
        const scoreLevel = document.getElementById('score-level');
        const scoreDirection = document.getElementById('score-direction');

        if (scoreValue) {
            scoreValue.textContent = formatScore(data.score, 1);
            scoreValue.className = `score-value ${getScoreClass(data.feedback_level)}`;
        }

        if (scoreLevel) {
            scoreLevel.textContent = data.feedback_level.toUpperCase();
            scoreLevel.className = `score-level ${getScoreClass(data.feedback_level)}`;
        }

        if (scoreDirection) {
            const symbol = getDirectionSymbol(data.direction);
            scoreDirection.textContent = symbol ? `${symbol}` : '';
        }

        // Update protocol metrics
        this._updateProtocolMetrics(data);
    }

    /**
     * Handle EEG band power update
     * @private
     */
    _handleEEGUpdate(data) {
        this._updateDataRate();

        // Update band power bars
        const powers = {
            delta: data.delta || 0,
            theta: data.theta || 0,
            alpha: data.alpha || 0,
            beta: data.beta || 0,
            gamma: data.gamma || 0
        };

        this.bandPowerBars.update(powers);

        // Update signal quality indicators
        if (data.artifacts) {
            this._updateSignalQuality(data.artifacts);
        }

        // Update waveform if we have channel data
        // Note: Actual waveform data would need to be added to backend
        // For now, this is a placeholder for future enhancement
    }

    /**
     * Handle connection status update
     * @private
     */
    _handleConnectionStatus(data) {
        this.connectionStatus.muse = data.muse_connected || false;
        this.connectionStatus.deviceName = data.device_name || null;

        if (data.current_protocol) {
            this.currentProtocol = data.current_protocol;
            this._updateProtocolInfo(this.currentProtocol);

            // Update selector
            const selector = document.getElementById('protocol-selector');
            if (selector) {
                selector.value = this.currentProtocol;
            }
        }

        if (data.baseline_calibrated !== undefined) {
            if (data.baseline_calibrated) {
                this.baselineStatus.state = 'complete';
                this._updateBaselineUI();
            }
        }

        this._updateConnectionStatus();
        this._updateSessionInfo();
    }

    /**
     * Handle baseline progress update
     * @private
     */
    _handleBaselineProgress(data) {
        this.baselineStatus.state = data.state || 'idle';
        this.baselineStatus.progress = data.percent_complete || 0;

        this._updateBaselineUI();
    }

    /**
     * Handle protocol switched notification
     * @private
     */
    _handleProtocolSwitched(data) {
        console.log('Protocol switched:', data);

        if (data.success && data.protocol) {
            this.currentProtocol = data.protocol;
            this._updateProtocolInfo(data.protocol);

            // Reset baseline status
            this.baselineStatus.state = 'idle';
            this.baselineStatus.progress = 0;
            this._updateBaselineUI();
        }
    }

    /**
     * Handle buffer status update
     * @private
     */
    _handleBufferStatus(data) {
        const bufferStatus = document.getElementById('buffer-status');
        if (bufferStatus) {
            const status = data.ready ? 'Ready' : 'Filling...';
            bufferStatus.textContent = status;
        }
    }

    /**
     * Switch to different protocol
     * @private
     */
    _switchProtocol(protocolName) {
        console.log('Switching to protocol:', protocolName);
        this.ws.switchProtocol(protocolName);
    }

    /**
     * Start baseline calibration
     * @private
     */
    _startBaseline(duration) {
        console.log('Starting baseline calibration:', duration, 'seconds');
        this.ws.startBaseline(duration);

        // Update UI immediately
        this.baselineStatus.state = 'calibrating';
        this.baselineStatus.progress = 0;
        this._updateBaselineUI();
    }

    /**
     * Finish baseline calibration
     * @private
     */
    _finishBaseline() {
        console.log('Finishing baseline calibration');
        this.ws.finishBaseline();
    }

    /**
     * Update connection status indicators
     * @private
     */
    _updateConnectionStatus() {
        // Muse status
        const museIndicator = document.getElementById('muse-indicator');
        const museStatusText = document.getElementById('muse-status-text');

        if (museIndicator && museStatusText) {
            if (this.connectionStatus.muse) {
                museIndicator.className = 'status-indicator connected';
                museStatusText.textContent = 'Muse: Connected';
            } else {
                museIndicator.className = 'status-indicator disconnected';
                museStatusText.textContent = 'Muse: Disconnected';
            }
        }

        // WebSocket status
        const wsIndicator = document.getElementById('websocket-indicator');
        const wsStatusText = document.getElementById('websocket-status-text');

        if (wsIndicator && wsStatusText) {
            if (this.connectionStatus.websocket) {
                wsIndicator.className = 'status-indicator connected';
                wsStatusText.textContent = 'WebSocket: Connected';
            } else {
                wsIndicator.className = 'status-indicator disconnected';
                wsStatusText.textContent = 'WebSocket: Disconnected';
            }
        }

        // System status
        const wsStatus = document.getElementById('ws-status');
        if (wsStatus) {
            wsStatus.textContent = this.connectionStatus.websocket ? 'Connected' : 'Disconnected';
        }
    }

    /**
     * Update protocol information display
     * @private
     */
    _updateProtocolInfo(protocolName) {
        const info = getProtocolInfo(protocolName);
        if (!info) return;

        // Update protocol info card
        const nameEl = document.getElementById('protocol-name');
        const descEl = document.getElementById('protocol-description');
        const directionEl = document.getElementById('protocol-direction');
        const instructionsEl = document.getElementById('protocol-instructions');

        if (nameEl) nameEl.textContent = info.name;
        if (descEl) descEl.textContent = info.description;
        if (directionEl) directionEl.textContent = info.directionText;
        if (instructionsEl) instructionsEl.textContent = info.instructions;
    }

    /**
     * Update protocol-specific metrics display
     * @private
     */
    _updateProtocolMetrics(data) {
        const detailScore = document.getElementById('detail-score');
        const detailLevel = document.getElementById('detail-level');
        const detailDirection = document.getElementById('detail-direction');

        if (detailScore) {
            detailScore.textContent = formatScore(data.score);
        }

        if (detailLevel) {
            detailLevel.textContent = data.feedback_level;
            detailLevel.className = `metric-value ${getScoreClass(data.feedback_level)}`;
        }

        if (detailDirection) {
            detailDirection.textContent = data.direction;
        }

        // Update additional protocol-specific details
        this._updateAdditionalDetails(data.details);
    }

    /**
     * Update additional protocol details
     * @private
     */
    _updateAdditionalDetails(details) {
        const container = document.getElementById('additional-details');
        if (!container || !details) return;

        // Clear existing details
        container.innerHTML = '';

        // Add each detail as a metric item
        Object.entries(details).forEach(([key, value]) => {
            // Skip channel_powers (too verbose)
            if (key === 'channel_powers') return;

            const item = document.createElement('div');
            item.className = 'metric-item';

            const label = document.createElement('span');
            label.className = 'metric-label';
            label.textContent = this._formatDetailLabel(key);

            const valueEl = document.createElement('span');
            valueEl.className = 'metric-value';
            valueEl.textContent = this._formatDetailValue(value);

            item.appendChild(label);
            item.appendChild(valueEl);
            container.appendChild(item);
        });
    }

    /**
     * Format detail label for display
     * @private
     */
    _formatDetailLabel(key) {
        // Convert snake_case to Title Case
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') + ':';
    }

    /**
     * Format detail value for display
     * @private
     */
    _formatDetailValue(value) {
        if (typeof value === 'number') {
            return formatPower(value);
        }
        return String(value);
    }

    /**
     * Update baseline UI
     * @private
     */
    _updateBaselineUI() {
        const indicator = document.getElementById('baseline-indicator');
        const statusText = document.getElementById('baseline-status-text');
        const progressContainer = document.getElementById('baseline-progress-container');
        const progressFill = document.getElementById('baseline-progress-fill');
        const progressText = document.getElementById('baseline-progress-text');
        const startBtn = document.getElementById('start-baseline-btn');
        const finishBtn = document.getElementById('finish-baseline-btn');
        const baselineInfo = document.getElementById('baseline-info');

        if (this.baselineStatus.state === 'idle') {
            if (indicator) {
                indicator.className = 'baseline-indicator';
            }
            if (statusText) statusText.textContent = 'Not calibrated';
            if (progressContainer) progressContainer.style.display = 'none';
            if (startBtn) startBtn.disabled = false;
            if (finishBtn) finishBtn.disabled = true;
            if (baselineInfo) baselineInfo.textContent = 'Not calibrated';

        } else if (this.baselineStatus.state === 'calibrating') {
            if (indicator) {
                indicator.className = 'baseline-indicator calibrating';
            }
            if (statusText) statusText.textContent = 'Calibrating...';
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressFill) {
                progressFill.style.width = `${this.baselineStatus.progress}%`;
            }
            if (progressText) {
                progressText.textContent = `${Math.round(this.baselineStatus.progress)}%`;
            }
            if (startBtn) startBtn.disabled = true;
            if (finishBtn) finishBtn.disabled = false;
            if (baselineInfo) baselineInfo.textContent = 'Calibrating...';

        } else if (this.baselineStatus.state === 'complete') {
            if (indicator) {
                indicator.className = 'baseline-indicator calibrated';
            }
            if (statusText) statusText.textContent = 'Calibrated';
            if (progressContainer) progressContainer.style.display = 'none';
            if (startBtn) startBtn.disabled = false;
            if (finishBtn) finishBtn.disabled = true;
            if (baselineInfo) baselineInfo.textContent = 'Calibrated';
        }
    }

    /**
     * Update session information display
     * @private
     */
    _updateSessionInfo() {
        const deviceName = document.getElementById('device-name');
        const activeProtocol = document.getElementById('active-protocol');

        if (deviceName) {
            deviceName.textContent = this.connectionStatus.deviceName || 'Not connected';
        }

        if (activeProtocol) {
            const info = getProtocolInfo(this.currentProtocol);
            activeProtocol.textContent = info ? info.name : 'None';
        }
    }

    /**
     * Update signal quality indicators
     * @private
     */
    _updateSignalQuality(artifacts) {
        const channels = ['TP9', 'AF7', 'AF8', 'TP10'];

        channels.forEach(channel => {
            const indicator = document.getElementById(`quality-${channel}`);
            const text = document.getElementById(`quality-text-${channel}`);

            if (!indicator || !text) return;

            // Determine quality based on artifacts
            // This is a simplified heuristic - adjust based on actual artifact data
            let quality = 'good';
            let qualityText = 'Good';

            if (artifacts.movement || artifacts.jaw_clench) {
                quality = 'poor';
                qualityText = 'Poor';
            } else if (artifacts.eye_blink) {
                quality = 'fair';
                qualityText = 'Fair';
            }

            indicator.className = `quality-indicator ${quality}`;
            text.textContent = qualityText;
        });
    }

    /**
     * Update data rate display
     * @private
     */
    _updateDataRate() {
        const now = Date.now();
        this.dataCount++;

        if (this.lastDataTime) {
            const elapsed = (now - this.lastDataTime) / 1000; // seconds
            if (elapsed >= 1.0) {
                this.dataRate = this.dataCount / elapsed;
                this.dataCount = 0;
                this.lastDataTime = now;

                // Update display
                const dataRateEl = document.getElementById('data-rate');
                if (dataRateEl) {
                    dataRateEl.textContent = `${this.dataRate.toFixed(1)} Hz`;
                }
            }
        } else {
            this.lastDataTime = now;
        }
    }

    /**
     * Start session timer
     * @private
     */
    _startSessionTimer() {
        this.sessionStartTime = Date.now();

        this.sessionTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            const durationEl = document.getElementById('session-duration');
            if (durationEl) {
                durationEl.textContent =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new EEGVisualizationApp();
    app.init();

    // Make app available globally for debugging
    window.eegApp = app;
});
