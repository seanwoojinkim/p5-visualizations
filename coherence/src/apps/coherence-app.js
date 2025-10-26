/**
 * Coherence Visualization - Main Application
 * Two groups of boids that transition from repulsion to coherence
 */

import { DEFAULT_PARAMS, validateParams } from '../core/boid-params.js';
import { GroupManager } from '../physics/group-manager.js';
import { BoidRenderer } from '../core/boid-renderer.js';
import { ControlPanel } from '../ui/control-panel.js';
import { SequencePlayer } from '../core/biometric-simulator.js';

// Global state
let params;
let groupManager;
let renderer;
let controlPanel;
let sequencePlayer;

/**
 * P5.js preload function
 */
window.preload = function() {
    // Load any assets here if needed
};

/**
 * P5.js setup function
 */
window.setup = function() {
    createCanvas(windowWidth, windowHeight);

    // Initialize parameters
    params = validateParams({ ...DEFAULT_PARAMS });

    // Initialize systems
    groupManager = new GroupManager(params.numBoidsPerGroup);
    renderer = new BoidRenderer();
    sequencePlayer = new SequencePlayer(params.selectedSequence);

    // Create control panel with callbacks
    controlPanel = new ControlPanel(params, {
        onCoherenceLevelChange: (value) => {
            console.log('Coherence level:', value);
        },
        onBoidCountChange: (value) => {
            groupManager.adjustBoidCount(value);
        },
        onShowTrailsChange: (value) => {
            console.log('Show trails:', value);
        },
        onShowDebugChange: (value) => {
            console.log('Debug info:', value);
        },
        onPauseChange: (value) => {
            console.log('Paused:', value);
        },
        onReset: () => {
            resetSimulation();
        },
        onSimulationModeChange: (value) => {
            console.log('Simulation mode:', value);
            if (value) {
                sequencePlayer.play();
            } else {
                sequencePlayer.pause();
            }
        },
        onSequenceChange: (value) => {
            console.log('Sequence changed:', value);
            sequencePlayer.setSequence(value);
            sequencePlayer.play();
        },
    });

    console.log('Coherence visualization initialized');
    console.log('');
    console.log('Manual Mode:');
    console.log('  Use the slider to control coherence level:');
    console.log('  -1.0 = Full repulsion (groups avoid each other)');
    console.log('   0.0 = Neutral (groups ignore each other)');
    console.log('  +1.0 = Full coherence (groups align together)');
    console.log('');
    console.log('Simulation Mode:');
    console.log('  Enable "Biometric Simulation Mode" to see');
    console.log('  automated transitions simulating two people\'s');
    console.log('  heart rate coherence over time.');
};

/**
 * P5.js draw function
 */
window.draw = function() {
    // Update coherence from simulation if in simulation mode
    if (params.simulationMode) {
        params.coherenceLevel = sequencePlayer.update();
        // Update the slider to show current value
        controlPanel.updateControl('coherenceLevel', params.coherenceLevel);
    }

    // Clear background
    background(params.backgroundColor);

    // Update physics
    groupManager.update(params);

    // Render boids
    renderer.renderGroups(groupManager.group1, groupManager.group2, params);

    // Render coherence indicator
    renderer.renderCoherenceIndicator(params.coherenceLevel);

    // Render simulation info if in simulation mode
    if (params.simulationMode) {
        const stepInfo = sequencePlayer.getCurrentStepInfo();
        renderer.renderSimulationInfo(stepInfo, params);
    }

    // Render debug info if enabled
    if (params.showDebugInfo) {
        const stats = groupManager.getStats();
        renderer.renderDebugInfo(stats, params);
    }

    // Always show FPS in bottom left
    push();
    fill(255, 255, 255, 150);
    noStroke();
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text(`FPS: ${Math.round(frameRate())}`, 10, height - 10);
    pop();
};

/**
 * P5.js window resized handler
 */
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
};

/**
 * Reset simulation
 */
function resetSimulation() {
    groupManager.initializeGroups(params.numBoidsPerGroup);
    sequencePlayer.stop();
    if (params.simulationMode) {
        sequencePlayer.play();
    }
    console.log('Simulation reset');
}

/**
 * Keyboard controls
 */
window.keyPressed = function() {
    // Space = pause/unpause
    if (key === ' ') {
        params.pauseSimulation = !params.pauseSimulation;
        controlPanel.updateControl('pauseSimulation', params.pauseSimulation);
    }

    // R = reset
    if (key === 'r' || key === 'R') {
        resetSimulation();
    }

    // D = toggle debug
    if (key === 'd' || key === 'D') {
        params.showDebugInfo = !params.showDebugInfo;
        controlPanel.updateControl('showDebugInfo', params.showDebugInfo);
    }

    // T = toggle trails
    if (key === 't' || key === 'T') {
        params.showTrails = !params.showTrails;
        controlPanel.updateControl('showTrails', params.showTrails);
    }

    // Arrow keys = adjust coherence level (only in manual mode)
    if (!params.simulationMode) {
        if (keyCode === LEFT_ARROW) {
            params.coherenceLevel = Math.max(-1.0, params.coherenceLevel - 0.05);
            controlPanel.updateControl('coherenceLevel', params.coherenceLevel);
        }
        if (keyCode === RIGHT_ARROW) {
            params.coherenceLevel = Math.min(1.0, params.coherenceLevel + 0.05);
            controlPanel.updateControl('coherenceLevel', params.coherenceLevel);
        }
    }

    // S = toggle simulation mode
    if (key === 's' || key === 'S') {
        params.simulationMode = !params.simulationMode;
        if (params.simulationMode) {
            sequencePlayer.play();
        } else {
            sequencePlayer.pause();
        }
    }
};
