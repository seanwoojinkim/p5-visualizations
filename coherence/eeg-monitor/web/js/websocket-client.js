/**
 * WebSocket Client for EEG Monitor
 *
 * Manages WebSocket connection to the EEG backend server,
 * handles auto-reconnection, and provides message handling.
 */

export class WebSocketClient {
    constructor(url, handlers = {}) {
        this.url = url;
        this.handlers = handlers;
        this.ws = null;
        this.reconnectTimer = null;
        this.reconnectDelay = 5000; // 5 seconds
        this.maxReconnectDelay = 30000; // 30 seconds
        this.currentReconnectDelay = this.reconnectDelay;
        this.isIntentionallyClosed = false;
        this.connectionAttempts = 0;
        this.connected = false;
        this.lastMessageTime = null;
        this.messageCount = 0;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        this.isIntentionallyClosed = false;
        this.connectionAttempts++;

        console.log(`Connecting to WebSocket: ${this.url} (attempt ${this.connectionAttempts})`);

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => this._onOpen();
            this.ws.onmessage = (event) => this._onMessage(event);
            this.ws.onerror = (error) => this._onError(error);
            this.ws.onclose = (event) => this._onClose(event);

        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this._scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.isIntentionallyClosed = true;
        this._cancelReconnect();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connected = false;
        console.log('WebSocket disconnected');
    }

    /**
     * Send message to server
     *
     * @param {Object} data - Data to send (will be JSON stringified)
     * @returns {boolean} True if sent successfully
     */
    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send message: WebSocket not connected');
            return false;
        }

        try {
            const message = JSON.stringify(data);
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    /**
     * Send ping to keep connection alive
     */
    ping() {
        this.send({ type: 'ping' });
    }

    /**
     * Request current status from server
     */
    requestStatus() {
        this.send({ type: 'request_status' });
    }

    /**
     * Switch to a different protocol
     *
     * @param {string} protocolName - Name of protocol to switch to
     */
    switchProtocol(protocolName) {
        this.send({
            type: 'switch_protocol',
            protocol: protocolName
        });
    }

    /**
     * Start baseline calibration
     *
     * @param {number} duration - Duration in seconds (default 60)
     */
    startBaseline(duration = 60) {
        this.send({
            type: 'start_baseline',
            duration: duration
        });
    }

    /**
     * Finish baseline calibration early
     */
    finishBaseline() {
        this.send({
            type: 'finish_baseline'
        });
    }

    /**
     * Get connection statistics
     *
     * @returns {Object} Connection stats
     */
    getStats() {
        return {
            connected: this.connected,
            connectionAttempts: this.connectionAttempts,
            messageCount: this.messageCount,
            lastMessageTime: this.lastMessageTime,
            url: this.url
        };
    }

    /**
     * Handle WebSocket open event
     * @private
     */
    _onOpen() {
        this.connected = true;
        this.connectionAttempts = 0;
        this.currentReconnectDelay = this.reconnectDelay;

        console.log('WebSocket connected');

        // Call handler if provided
        if (this.handlers.onOpen) {
            this.handlers.onOpen();
        }

        // Cancel any pending reconnection
        this._cancelReconnect();
    }

    /**
     * Handle WebSocket message event
     * @private
     */
    _onMessage(event) {
        this.messageCount++;
        this.lastMessageTime = Date.now();

        try {
            const data = JSON.parse(event.data);
            this._routeMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket error event
     * @private
     */
    _onError(error) {
        console.error('WebSocket error:', error);

        if (this.handlers.onError) {
            this.handlers.onError(error);
        }
    }

    /**
     * Handle WebSocket close event
     * @private
     */
    _onClose(event) {
        this.connected = false;
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);

        if (this.handlers.onClose) {
            this.handlers.onClose(event);
        }

        // Auto-reconnect unless intentionally closed
        if (!this.isIntentionallyClosed) {
            this._scheduleReconnect();
        }
    }

    /**
     * Route incoming message to appropriate handler
     * @private
     */
    _routeMessage(data) {
        const type = data.type;

        // Log all messages in debug mode
        if (window.EEG_DEBUG) {
            console.log('WebSocket message:', type, data);
        }

        // Route to specific handler based on message type
        switch (type) {
            case 'initial_state':
                if (this.handlers.onInitialState) {
                    this.handlers.onInitialState(data);
                }
                break;

            case 'coherence_update':
                if (this.handlers.onCoherenceUpdate) {
                    this.handlers.onCoherenceUpdate(data.data);
                }
                break;

            case 'eeg_update':
                if (this.handlers.onEEGUpdate) {
                    this.handlers.onEEGUpdate(data.data);
                }
                break;

            case 'buffer_status':
                if (this.handlers.onBufferStatus) {
                    this.handlers.onBufferStatus(data.data);
                }
                break;

            case 'connection_status':
                if (this.handlers.onConnectionStatus) {
                    this.handlers.onConnectionStatus(data.data);
                }
                break;

            case 'baseline_progress':
                if (this.handlers.onBaselineProgress) {
                    this.handlers.onBaselineProgress(data.data);
                }
                break;

            case 'protocol_switched':
                if (this.handlers.onProtocolSwitched) {
                    this.handlers.onProtocolSwitched(data.data);
                }
                break;

            case 'pong':
                // Ping response - connection alive
                break;

            case 'status':
                if (this.handlers.onStatus) {
                    this.handlers.onStatus(data);
                }
                break;

            default:
                console.warn('Unknown message type:', type);
        }

        // Call generic message handler if provided
        if (this.handlers.onMessage) {
            this.handlers.onMessage(data);
        }
    }

    /**
     * Schedule reconnection attempt
     * @private
     */
    _scheduleReconnect() {
        if (this.reconnectTimer) {
            return; // Already scheduled
        }

        console.log(`Reconnecting in ${this.currentReconnectDelay / 1000} seconds...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();

            // Exponential backoff
            this.currentReconnectDelay = Math.min(
                this.currentReconnectDelay * 1.5,
                this.maxReconnectDelay
            );
        }, this.currentReconnectDelay);
    }

    /**
     * Cancel scheduled reconnection
     * @private
     */
    _cancelReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

/**
 * Create WebSocket client with default configuration
 *
 * @param {Object} handlers - Event handlers
 * @param {string} [host='localhost'] - WebSocket host
 * @param {number} [port=8766] - WebSocket port
 * @returns {WebSocketClient} Client instance
 */
export function createWebSocketClient(handlers = {}, host = 'localhost', port = 8766) {
    // Check for URL parameters to override defaults
    const urlParams = new URLSearchParams(window.location.search);
    const wsHost = urlParams.get('ws_host') || host;
    const wsPort = urlParams.get('ws_port') || port;

    const url = `ws://${wsHost}:${wsPort}`;
    return new WebSocketClient(url, handlers);
}
