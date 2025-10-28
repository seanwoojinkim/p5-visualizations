/**
 * ControlPanel - UI controls for the coherence visualization
 * Uses p5.js DOM elements for interactive controls
 */

export class ControlPanel {
    constructor(params, callbacks = {}, options = {}) {
        this.params = params;
        this.callbacks = callbacks;
        this.controls = {};
        this.isMinimized = options.startMinimized !== undefined ? options.startMinimized : false;
        this.panel = null;
        this.content = null;

        this.createControls();
    }

    /**
     * Create all UI controls
     */
    createControls() {
        // Container for controls
        this.panel = createDiv();
        this.panel.style('position', 'fixed');
        this.panel.style('bottom', '20px');
        this.panel.style('left', '50%');
        this.panel.style('transform', 'translateX(-50%)');
        this.panel.style('background', 'rgba(20, 20, 20, 0.95)');
        this.panel.style('padding', '20px 30px');
        this.panel.style('border-radius', '15px');
        this.panel.style('color', 'white');
        this.panel.style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        this.panel.style('box-shadow', '0 10px 40px rgba(0, 0, 0, 0.5)');
        this.panel.style('backdrop-filter', 'blur(10px)');
        this.panel.style('z-index', '1000');

        // Title bar with minimize button
        const titleBar = createDiv();
        titleBar.style('display', 'flex');
        titleBar.style('justify-content', 'space-between');
        titleBar.style('align-items', 'center');
        titleBar.style('margin-bottom', '15px');
        titleBar.parent(this.panel);

        const title = createDiv('Coherence Control');
        title.style('font-size', '18px');
        title.style('font-weight', 'bold');
        title.style('flex-grow', '1');
        title.style('text-align', 'center');
        title.parent(titleBar);

        // Minimize/expand button
        const minimizeBtn = createButton('−');
        minimizeBtn.style('background', 'rgba(255, 255, 255, 0.1)');
        minimizeBtn.style('border', 'none');
        minimizeBtn.style('color', 'white');
        minimizeBtn.style('width', '24px');
        minimizeBtn.style('height', '24px');
        minimizeBtn.style('border-radius', '4px');
        minimizeBtn.style('cursor', 'pointer');
        minimizeBtn.style('font-size', '18px');
        minimizeBtn.style('line-height', '18px');
        minimizeBtn.style('padding', '0');
        minimizeBtn.mousePressed(() => this.toggleMinimize());
        minimizeBtn.parent(titleBar);
        this.controls.minimizeBtn = minimizeBtn;

        // Content container
        this.content = createDiv();
        this.content.parent(this.panel);

        // Simulation mode toggle
        this.createToggle(
            this.content,
            'simulationMode',
            'Biometric Simulation Mode',
            this.params.simulationMode,
            (value) => {
                this.params.simulationMode = value;
                if (this.callbacks.onSimulationModeChange) {
                    this.callbacks.onSimulationModeChange(value);
                }
                // Enable/disable coherence slider based on mode
                if (this.controls.coherenceLevel) {
                    if (value) {
                        this.controls.coherenceLevel.attribute('disabled', '');
                    } else {
                        this.controls.coherenceLevel.removeAttribute('disabled');
                    }
                }
                // Show/hide sequence selector
                if (this.controls.sequenceSelector) {
                    this.controls.sequenceSelector.style('display', value ? 'block' : 'none');
                }
            }
        );

        // Sequence selector (dropdown)
        this.createSequenceSelector(this.content, 'sequenceSelector');

        // Divider
        const divider = createDiv();
        divider.style('border-top', '1px solid rgba(255, 255, 255, 0.2)');
        divider.style('margin', '15px 0');
        divider.parent(this.content);

        // Coherence slider
        this.createSlider(
            this.content,
            'coherenceLevel',
            'Coherence Level (Manual)',
            this.params.coherenceLevel,
            -1.0,
            1.0,
            0.01,
            (value) => {
                this.params.coherenceLevel = value;
                if (this.callbacks.onCoherenceLevelChange) {
                    this.callbacks.onCoherenceLevelChange(value);
                }
            }
        );

        // Boid count slider
        this.createSlider(
            this.content,
            'numBoidsPerGroup',
            'Boids per Group',
            this.params.numBoidsPerGroup,
            10,
            100,
            5,
            (value) => {
                this.params.numBoidsPerGroup = value;
                if (this.callbacks.onBoidCountChange) {
                    this.callbacks.onBoidCountChange(value);
                }
            }
        );

        // Toggle buttons
        this.createToggle(
            this.content,
            'showTrails',
            'Show Trails',
            this.params.showTrails,
            (value) => {
                this.params.showTrails = value;
                if (this.callbacks.onShowTrailsChange) {
                    this.callbacks.onShowTrailsChange(value);
                }
            }
        );

        this.createToggle(
            this.content,
            'showDebugInfo',
            'Debug Info',
            this.params.showDebugInfo,
            (value) => {
                this.params.showDebugInfo = value;
                if (this.callbacks.onShowDebugChange) {
                    this.callbacks.onShowDebugChange(value);
                }
            }
        );

        this.createToggle(
            this.content,
            'pauseSimulation',
            'Pause',
            this.params.pauseSimulation,
            (value) => {
                this.params.pauseSimulation = value;
                if (this.callbacks.onPauseChange) {
                    this.callbacks.onPauseChange(value);
                }
            }
        );

        this.createToggle(
            this.content,
            'lowQualityMode',
            'Performance Mode',
            this.params.lowQualityMode,
            (value) => {
                this.params.lowQualityMode = value;
                if (this.callbacks.onLowQualityChange) {
                    this.callbacks.onLowQualityChange(value);
                }
            }
        );

        // Session recording button
        const sessionBtn = createButton('Start Session');
        sessionBtn.style('margin-top', '15px');
        sessionBtn.style('padding', '8px 20px');
        sessionBtn.style('background', '#ef4444');
        sessionBtn.style('color', 'white');
        sessionBtn.style('border', 'none');
        sessionBtn.style('border-radius', '8px');
        sessionBtn.style('cursor', 'pointer');
        sessionBtn.style('font-size', '14px');
        sessionBtn.style('width', '100%');
        sessionBtn.mousePressed(() => {
            if (this.callbacks.onSessionToggle) {
                this.callbacks.onSessionToggle();
            }
        });
        sessionBtn.parent(this.content);
        this.controls.sessionBtn = sessionBtn;

        // View History button
        const historyBtn = createButton('View History');
        historyBtn.style('margin-top', '10px');
        historyBtn.style('padding', '8px 20px');
        historyBtn.style('background', '#8b5cf6');
        historyBtn.style('color', 'white');
        historyBtn.style('border', 'none');
        historyBtn.style('border-radius', '8px');
        historyBtn.style('cursor', 'pointer');
        historyBtn.style('font-size', '14px');
        historyBtn.style('width', '100%');
        historyBtn.mousePressed(() => {
            if (this.callbacks.onViewHistory) {
                this.callbacks.onViewHistory();
            }
        });
        historyBtn.parent(this.content);

        // Reset button
        const resetBtn = createButton('Reset');
        resetBtn.style('margin-top', '10px');
        resetBtn.style('padding', '8px 20px');
        resetBtn.style('background', '#3b82f6');
        resetBtn.style('color', 'white');
        resetBtn.style('border', 'none');
        resetBtn.style('border-radius', '8px');
        resetBtn.style('cursor', 'pointer');
        resetBtn.style('font-size', '14px');
        resetBtn.style('width', '100%');
        resetBtn.mousePressed(() => {
            if (this.callbacks.onReset) {
                this.callbacks.onReset();
            }
        });
        resetBtn.parent(this.content);

        // Apply initial minimize state
        if (this.isMinimized) {
            this.content.style('display', 'none');
            this.controls.minimizeBtn.html('+');
        }
    }

    /**
     * Create a slider control
     */
    createSlider(parent, id, label, value, min, max, step, onChange) {
        const container = createDiv();
        container.style('margin-bottom', '15px');
        container.parent(parent);

        const labelDiv = createDiv(`${label}: <span id="${id}-value">${value.toFixed(2)}</span>`);
        labelDiv.style('font-size', '13px');
        labelDiv.style('margin-bottom', '5px');
        labelDiv.parent(container);

        const slider = createSlider(min, max, value, step);
        slider.style('width', '250px');
        slider.input(() => {
            const val = slider.value();
            select(`#${id}-value`).html(val.toFixed(2));
            onChange(val);
        });
        slider.parent(container);

        this.controls[id] = slider;
    }

    /**
     * Create a toggle button
     */
    createToggle(parent, id, label, value, onChange) {
        const container = createDiv();
        container.style('display', 'inline-block');
        container.style('margin-right', '10px');
        container.style('margin-top', '10px');
        container.parent(parent);

        const checkbox = createCheckbox(label, value);
        checkbox.style('color', 'white');
        checkbox.style('font-size', '13px');
        checkbox.changed(() => {
            onChange(checkbox.checked());
        });
        checkbox.parent(container);

        this.controls[id] = checkbox;
    }

    /**
     * Create sequence selector dropdown
     */
    createSequenceSelector(parent, id) {
        const container = createDiv();
        container.style('margin-bottom', '15px');
        container.style('display', this.params.simulationMode ? 'block' : 'none');
        container.parent(parent);

        const labelDiv = createDiv('Sequence:');
        labelDiv.style('font-size', '13px');
        labelDiv.style('margin-bottom', '5px');
        labelDiv.parent(container);

        const selector = createSelect();
        selector.style('width', '250px');
        selector.style('padding', '5px');
        selector.style('background', 'rgba(60, 60, 60, 0.8)');
        selector.style('color', 'white');
        selector.style('border', '1px solid rgba(255, 255, 255, 0.3)');
        selector.style('border-radius', '5px');
        selector.style('font-size', '13px');
        selector.parent(container);

        // Add sequence options
        const sequences = {
            'journey_to_coherence': 'Journey to Coherence',
            'cycle': 'Natural Cycle',
            'breakdown': 'Relationship Breakdown',
            'recovery': 'Recovery & Healing'
        };

        for (const [key, label] of Object.entries(sequences)) {
            selector.option(label, key);
        }

        selector.selected(this.params.selectedSequence);
        selector.changed(() => {
            const val = selector.value();
            this.params.selectedSequence = val;
            if (this.callbacks.onSequenceChange) {
                this.callbacks.onSequenceChange(val);
            }
        });

        this.controls[id] = container;
    }

    /**
     * Update control values programmatically
     */
    updateControl(id, value) {
        if (this.controls[id]) {
            this.controls[id].value(value);
        }
    }

    /**
     * Toggle minimize/expand state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            this.content.style('display', 'none');
            this.controls.minimizeBtn.html('+');
        } else {
            this.content.style('display', 'block');
            this.controls.minimizeBtn.html('−');
        }
    }

    /**
     * Update session recording button state
     * @param {boolean} isRecording - Whether recording is active
     */
    updateSessionButton(isRecording) {
        if (this.controls.sessionBtn) {
            if (isRecording) {
                this.controls.sessionBtn.html('Stop Session');
                this.controls.sessionBtn.style('background', '#22c55e');
            } else {
                this.controls.sessionBtn.html('Start Session');
                this.controls.sessionBtn.style('background', '#ef4444');
            }
        }
    }
}
