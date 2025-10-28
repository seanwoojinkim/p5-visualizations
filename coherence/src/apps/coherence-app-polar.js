/**
 * Coherence Visualization with Polar H10 Integration
 * Two groups of boids driven by real heart rate coherence data
 */

import { DEFAULT_PARAMS, validateParams } from '../core/boid-params.js';
import { GroupManager } from '../physics/group-manager.js';
import { BoidRenderer } from '../core/boid-renderer.js';
import { ControlPanel } from '../ui/control-panel.js';
import { SequencePlayer } from '../core/biometric-simulator.js';
import { PolarH10Client } from '../integrations/polar-h10-client.js';
import { SessionRecorder } from '../session/session-recorder.js';
import { SessionHistory } from '../ui/session-history.js';

// Global state
let params;
let groupManager;
let renderer;
let controlPanel;
let sequencePlayer;
let polarClient;
let sessionRecorder;
let sessionHistory;

// Polar H10 state
let polarMode = false;  // Toggle between Polar H10 and simulation/manual modes
let polarStatus = {
    wsConnected: false,
    polarConnected: false,
    deviceName: null,
    bufferReady: false,
    currentScore: 0,
    heartRate: 0
};

// Heartbeat visualization state
let heartbeatPulse = 0;  // 0-1, animates on each heartbeat
let lastHeartbeatTime = 0;

// Breathing guide state
let breathGuideEnabled = true;  // Toggle breathing guide
let breathCycleStart = 0;       // Timestamp when breathing cycle started
let breathCycleDuration = 10000; // 10 seconds per full cycle (5s in, 5s out)

// Breathing pace options (breaths per minute → ms per cycle)
const breathingPaces = {
    '3.0': 20000,  // 3.0 bpm = 20s cycle (10s in, 10s out) - very slow
    '4.0': 15000,  // 4.0 bpm = 15s cycle (7.5s in, 7.5s out)
    '4.5': 13333,  // 4.5 bpm = 13.3s cycle (6.7s in, 6.7s out)
    '5.0': 12000,  // 5.0 bpm = 12s cycle (6s in, 6s out)
    '5.5': 10909,  // 5.5 bpm = ~11s cycle (5.5s in, 5.5s out)
    '6.0': 10000,  // 6.0 bpm = 10s cycle (5s in, 5s out) ← typical resonance
    '6.5': 9231,   // 6.5 bpm = ~9.2s cycle (4.6s in, 4.6s out)
    '7.0': 8571    // 7.0 bpm = ~8.6s cycle (4.3s in, 4.3s out)
};
let currentBreathingRate = '6.0'; // Default to 6 breaths per minute

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

    // Initialize breathing guide
    breathCycleStart = millis();

    // Initialize session recorder
    sessionRecorder = new SessionRecorder();
    sessionRecorder.init().then((unfinishedSessions) => {
        if (unfinishedSessions.length > 0) {
            handleCrashRecovery(unfinishedSessions);
        }
    }).catch((error) => {
        console.error('[Setup] Failed to initialize session recorder:', error);
    });

    // Initialize session history panel
    sessionHistory = new SessionHistory(
        sessionRecorder.db,
        () => {
            console.log('[Setup] Session history refreshed');
        }
    );

    // Initialize Polar H10 client
    // The browser runs on the Mac, so always use localhost
    // (host.docker.internal is for containers, not browser clients)
    const hostname = window.location.hostname;
    console.log(`[Setup] Detected hostname: ${hostname}`);

    // Browser always connects to localhost (HRV service runs on Mac host)
    const wsUrl = 'ws://localhost:8765';

    console.log(`[Setup] Using WebSocket URL: ${wsUrl}`);

    polarClient = new PolarH10Client({
        wsUrl: wsUrl,

        onCoherenceUpdate: (data) => {
            if (polarMode) {
                params.coherenceLevel = data.level;
                polarStatus.currentScore = data.score;

                console.log(
                    `[Coherence] Score: ${data.score}/100, ` +
                    `Level: ${data.level.toFixed(2)}, ` +
                    `Peak: ${data.peakFrequency.toFixed(3)} Hz`
                );

                // Add sample to session recorder if recording
                if (sessionRecorder && sessionRecorder.isRecording) {
                    sessionRecorder.addSample({
                        coherence: data.score,
                        ratio: data.ratio,
                        peakFrequency: data.peakFrequency,
                        heartRate: polarStatus.heartRate,
                        level: data.level,
                        timestamp: data.timestamp
                    });
                }
            }
        },

        onStatusUpdate: (status) => {
            polarStatus.wsConnected = status.connected;
            if (status.polarConnected !== undefined) {
                polarStatus.polarConnected = status.polarConnected;
                polarStatus.deviceName = status.deviceName;
            }

            if (status.connected) {
                console.log('[Coherence] ✓ Connected to HRV Monitor service');
            }
        },

        onBufferStatus: (status) => {
            polarStatus.bufferReady = status.bufferReady;
            polarStatus.heartRate = status.meanHeartRate;
        },

        onHeartbeat: (data) => {
            // Trigger pulse animation on each heartbeat
            heartbeatPulse = 1.0;
            lastHeartbeatTime = millis();
            polarStatus.heartRate = data.heartRate;
            console.log(`[Heartbeat] RR: ${data.rrInterval.toFixed(1)}ms, HR: ${data.heartRate.toFixed(0)} bpm, Pulse: ${heartbeatPulse}`);
        },

        onError: (error) => {
            console.error('[Coherence] Polar H10 error:', error);
        }
    });

    // Create control panel with callbacks (minimized by default)
    controlPanel = new ControlPanel(params, {
        onCoherenceLevelChange: (value) => {
            if (!params.simulationMode && !polarMode) {
                params.coherenceLevel = value;
            }
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
            params.simulationMode = value;
            if (value) {
                polarMode = false; // Disable Polar mode when simulation enabled
                sequencePlayer.play();
            } else {
                sequencePlayer.pause();
            }
        },
        onSequenceChange: (value) => {
            sequencePlayer.setSequence(value);
            sequencePlayer.play();
        },
        onSessionToggle: () => {
            toggleSessionRecording();
        },
        onViewHistory: () => {
            if (sessionHistory) {
                sessionHistory.toggle();
            }
        },
    }, {
        startMinimized: true  // Start with control panel minimized
    });

    printInstructions();
};

/**
 * P5.js draw function
 */
window.draw = function() {
    // Update coherence source based on active mode
    if (polarMode) {
        // Polar H10 mode - use smoothed real-time HRV data
        const smoothedLevel = polarClient.getSmoothedLevel();
        params.coherenceLevel = smoothedLevel;

        // Update slider to show current value
        controlPanel.updateControl('coherenceLevel', smoothedLevel);

    } else if (params.simulationMode) {
        // Simulation mode - use biometric simulator
        params.coherenceLevel = sequencePlayer.update();
        controlPanel.updateControl('coherenceLevel', params.coherenceLevel);
    }
    // Else: manual mode - controlled by slider

    // Decay heartbeat pulse animation
    if (heartbeatPulse > 0) {
        // Decay over ~400ms for smooth pulse effect
        heartbeatPulse = Math.max(0, heartbeatPulse - 0.08);
    }

    // Clear background
    background(params.backgroundColor);

    // Update physics
    groupManager.update(params);

    // Render boids
    renderer.renderGroups(groupManager.group1, groupManager.group2, params);

    // Render coherence indicator
    renderer.renderCoherenceIndicator(params.coherenceLevel);

    // Render breathing guide (in all modes)
    if (breathGuideEnabled) {
        renderBreathingGuide();
    }

    // Render mode-specific info
    if (polarMode) {
        renderPolarInfo();
        renderHeartbeatPulse();
    } else if (params.simulationMode) {
        const stepInfo = sequencePlayer.getCurrentStepInfo();
        renderer.renderSimulationInfo(stepInfo, params);
    }

    // Render recording indicator if recording
    if (sessionRecorder && sessionRecorder.isRecording) {
        renderRecordingIndicator();
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
 * Render breathing guide visualization
 * Coherent breathing: 5 seconds inhale, 5 seconds exhale (0.1 Hz resonance)
 */
function renderBreathingGuide() {
    push();

    // Calculate position (center of screen)
    const x = width / 2;
    const y = height / 2;

    // Calculate breathing cycle progress (0-1)
    const elapsed = millis() - breathCycleStart;
    const cycleProgress = (elapsed % breathCycleDuration) / breathCycleDuration;

    // Determine if inhaling or exhaling
    const isInhaling = cycleProgress < 0.5;
    const phaseProgress = isInhaling ? (cycleProgress * 2) : ((cycleProgress - 0.5) * 2);

    // Calculate radius with smooth easing
    const minRadius = 40;
    const maxRadius = 120;

    // Use sine wave for smooth breathing motion
    const breathPhase = isInhaling ? phaseProgress : (1 - phaseProgress);
    const easedProgress = (1 - Math.cos(breathPhase * Math.PI)) / 2; // Smooth ease in/out
    const radius = minRadius + (maxRadius - minRadius) * easedProgress;

    // Color based on breathing phase
    const inhaleColor = [100, 200, 255]; // Light blue
    const exhaleColor = [150, 100, 255]; // Purple
    const currentColor = isInhaling ? inhaleColor : exhaleColor;

    // Draw outer glow rings
    noFill();
    for (let i = 3; i > 0; i--) {
        const glowRadius = radius + (i * 10);
        const alpha = 50 - (i * 15);
        stroke(...currentColor, alpha);
        strokeWeight(3);
        circle(x, y, glowRadius * 2);
    }

    // Draw main breathing circle
    fill(...currentColor, 30);
    stroke(...currentColor, 150);
    strokeWeight(3);
    circle(x, y, radius * 2);

    // Draw inner guide circle
    fill(...currentColor, 60);
    noStroke();
    circle(x, y, radius * 1.2);

    // Draw center dot
    fill(...currentColor, 200);
    noStroke();
    circle(x, y, 8);

    // Draw breathing instruction text
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255, 255, 255, 200);
    noStroke();
    const instruction = isInhaling ? 'BREATHE IN' : 'BREATHE OUT';
    text(instruction, x, y - radius - 40);

    // Draw countdown
    const halfCycleDuration = breathCycleDuration / 2000; // Convert to seconds
    const secondsRemaining = Math.ceil(halfCycleDuration - (phaseProgress * halfCycleDuration));
    textSize(18);
    fill(255, 255, 255, 150);
    text(secondsRemaining, x, y);

    // Draw breathing rate at bottom
    textSize(14);
    fill(255, 255, 255, 120);
    text(`${currentBreathingRate} breaths/min (↑/↓ to adjust)`, x, y + radius + 50);

    pop();
}

/**
 * Render heartbeat pulse visualization
 */
function renderHeartbeatPulse() {
    if (!polarStatus.polarConnected) {
        return;
    }

    push();

    // Position in top-right corner
    const x = width - 80;
    const y = 80;

    // Pulsing circle that expands with each heartbeat
    const baseRadius = 20;
    const pulseRadius = baseRadius + (heartbeatPulse * 15);

    if (heartbeatPulse > 0) {
        // Outer glow effect (only when pulsing)
        noFill();
        for (let i = 3; i > 0; i--) {
            const alpha = heartbeatPulse * 80 * (i / 3);
            stroke(255, 100, 100, alpha);
            strokeWeight(2);
            circle(x, y, pulseRadius + (i * 5));
        }

        // Main pulse circle
        fill(255, 100, 100, heartbeatPulse * 200);
        stroke(255, 100, 100, 255);
        strokeWeight(2);
        circle(x, y, pulseRadius);
    } else {
        // Static circle when not pulsing
        fill(255, 100, 100, 100);
        stroke(255, 100, 100, 180);
        strokeWeight(2);
        circle(x, y, baseRadius);
    }

    // Heart rate text below
    noStroke();
    fill(255, 255, 255, 180);
    textSize(12);
    textAlign(CENTER, TOP);
    if (polarStatus.heartRate > 0) {
        text(`${Math.round(polarStatus.heartRate)} BPM`, x, y + 35);
    } else {
        text('Waiting for data...', x, y + 35);
    }

    pop();
}

/**
 * Render Polar H10 connection and coherence info
 */
function renderPolarInfo() {
    push();

    const x = 20;
    const y = 80;
    const lineHeight = 22;
    let currentY = y;

    // Title
    fill(255, 255, 255, 200);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text('POLAR H10 MODE', x, currentY);
    currentY += lineHeight + 5;

    // Connection status
    textSize(13);
    fill(255, 255, 255, 180);

    // WebSocket connection
    const wsColor = polarStatus.wsConnected ? [100, 255, 100] : [255, 100, 100];
    fill(...wsColor, 200);
    text(polarStatus.wsConnected ? '● WS Connected' : '○ WS Disconnected', x, currentY);
    currentY += lineHeight;

    // Polar H10 connection
    const polarColor = polarStatus.polarConnected ? [100, 255, 100] : [255, 100, 100];
    fill(...polarColor, 200);
    const polarText = polarStatus.polarConnected
        ? `● ${polarStatus.deviceName}`
        : '○ Polar H10 Disconnected';
    text(polarText, x, currentY);
    currentY += lineHeight + 5;

    // Coherence data (if available)
    if (polarStatus.polarConnected && polarStatus.bufferReady) {
        fill(255, 255, 255, 180);
        textSize(12);
        text(`Coherence Score: ${polarStatus.currentScore}/100`, x, currentY);
        currentY += lineHeight;

        if (polarStatus.heartRate > 0) {
            text(`Heart Rate: ${polarStatus.heartRate.toFixed(0)} bpm`, x, currentY);
            currentY += lineHeight;
        }

        const status = polarClient.getStatus();
        if (status.latestData) {
            text(`Peak Freq: ${status.latestData.peak_frequency.toFixed(3)} Hz`, x, currentY);
            currentY += lineHeight;
            text(`Ratio: ${status.latestData.ratio.toFixed(2)}`, x, currentY);
            currentY += lineHeight;

            // Add ratio interpretation
            const ratio = status.latestData.ratio;
            let interpretation = '';
            if (ratio < 0.9) {
                interpretation = '(Low - ratio < 0.9)';
            } else if (ratio < 7.0) {
                interpretation = `(Medium - need 7.0 for high)`;
            } else {
                interpretation = '(High coherence!)';
            }
            fill(255, 200, 100, 180);
            textSize(11);
            text(interpretation, x, currentY);
        }
    } else if (polarStatus.wsConnected && !polarStatus.bufferReady) {
        fill(255, 200, 100, 180);
        textSize(12);
        text('Buffering data...', x, currentY);
    }

    pop();
}

/**
 * Render recording indicator (pulsing red dot + elapsed time)
 */
function renderRecordingIndicator() {
    push();

    // Position in top-right corner (below heartbeat pulse if in Polar mode)
    const x = width - 80;
    const y = polarMode ? 140 : 80;

    // Pulsing effect using sine wave
    const pulsePhase = (millis() % 1000) / 1000; // 0-1 over 1 second
    const pulseAlpha = 150 + Math.sin(pulsePhase * Math.PI * 2) * 105; // 45-255

    // Outer glow rings
    noFill();
    for (let i = 3; i > 0; i--) {
        const alpha = pulseAlpha * 0.3 * (i / 3);
        stroke(255, 50, 50, alpha);
        strokeWeight(2);
        circle(x, y, 20 + (i * 8));
    }

    // Main recording dot
    fill(255, 50, 50, pulseAlpha);
    stroke(255, 50, 50, 255);
    strokeWeight(2);
    circle(x, y, 16);

    // "REC" text
    noStroke();
    fill(255, 255, 255, 200);
    textSize(11);
    textAlign(CENTER, TOP);
    text('REC', x, y + 20);

    // Elapsed time
    const elapsedTime = sessionRecorder.getElapsedTime();
    textSize(13);
    textAlign(CENTER, TOP);
    fill(255, 255, 255, 180);
    text(elapsedTime, x, y + 35);

    pop();
}

/**
 * Handle crash recovery for unfinished sessions
 */
function handleCrashRecovery(unfinishedSessions) {
    console.warn('[Crash Recovery] Found unfinished sessions:', unfinishedSessions);

    // For now, just discard unfinished sessions
    // In Phase 2, we can add a UI prompt to resume or discard
    for (const session of unfinishedSessions) {
        sessionRecorder.discardSession(session.sessionId).then(() => {
            console.log(`[Crash Recovery] Discarded session ${session.sessionId}`);
        }).catch((error) => {
            console.error(`[Crash Recovery] Failed to discard session:`, error);
        });
    }
}

/**
 * Show session summary modal
 */
function showSessionSummary(session) {
    console.log('[Session Summary]', session);

    // Create modal overlay
    const overlay = createDiv();
    overlay.style('position', 'fixed');
    overlay.style('top', '0');
    overlay.style('left', '0');
    overlay.style('width', '100%');
    overlay.style('height', '100%');
    overlay.style('background', 'rgba(0, 0, 0, 0.8)');
    overlay.style('z-index', '2000');
    overlay.style('display', 'flex');
    overlay.style('justify-content', 'center');
    overlay.style('align-items', 'center');

    // Create modal content
    const modal = createDiv();
    modal.style('background', 'rgba(20, 20, 20, 0.95)');
    modal.style('padding', '30px');
    modal.style('border-radius', '15px');
    modal.style('color', 'white');
    modal.style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    modal.style('max-width', '500px');
    modal.style('box-shadow', '0 20px 60px rgba(0, 0, 0, 0.8)');
    modal.parent(overlay);

    // Title
    const title = createDiv('Session Complete!');
    title.style('font-size', '24px');
    title.style('font-weight', 'bold');
    title.style('margin-bottom', '20px');
    title.style('text-align', 'center');
    title.parent(modal);

    // Stats
    const stats = createDiv();
    stats.style('margin-bottom', '20px');
    stats.style('line-height', '1.8');
    stats.parent(modal);

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
    };

    stats.html(`
        <div style="font-size: 16px; margin-bottom: 10px;">
            <strong>Duration:</strong> ${formatDuration(session.durationSeconds)}
        </div>
        <div style="font-size: 16px; margin-bottom: 10px;">
            <strong>Mean Coherence:</strong> ${session.meanCoherence.toFixed(1)}/100
        </div>
        <div style="font-size: 16px; margin-bottom: 10px;">
            <strong>Max Coherence:</strong> ${session.maxCoherence.toFixed(1)}/100
        </div>
        <div style="font-size: 16px; margin-bottom: 10px;">
            <strong>Time in High Zone:</strong> ${Math.round(session.timeInZones.high.seconds / 60)}m (${session.timeInZones.high.percentage.toFixed(0)}%)
        </div>
        <div style="font-size: 16px; margin-bottom: 10px;">
            <strong>Achievement Score:</strong> ${session.achievementScore.toLocaleString()}
        </div>
        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin-top: 15px;">
            Samples collected: ${session.samplesCollected}
        </div>
    `);

    // OK button
    const okBtn = createButton('OK');
    okBtn.style('background', '#4ade80');
    okBtn.style('color', 'black');
    okBtn.style('border', 'none');
    okBtn.style('padding', '12px 30px');
    okBtn.style('border-radius', '8px');
    okBtn.style('cursor', 'pointer');
    okBtn.style('font-size', '16px');
    okBtn.style('font-weight', 'bold');
    okBtn.style('width', '100%');
    okBtn.mousePressed(() => {
        overlay.remove();
    });
    okBtn.parent(modal);
}

/**
 * Toggle session recording
 */
async function toggleSessionRecording() {
    if (!sessionRecorder) {
        console.error('[Session] Session recorder not initialized');
        return;
    }

    if (sessionRecorder.isRecording) {
        // Stop recording
        try {
            const session = await sessionRecorder.stopRecording();
            console.log('[Session] Recording stopped');
            showSessionSummary(session);

            // Update control panel button if it exists
            if (controlPanel && controlPanel.updateSessionButton) {
                controlPanel.updateSessionButton(false);
            }

            // Refresh session history if visible
            if (sessionHistory && sessionHistory.isVisible) {
                await sessionHistory.refresh();
            }
        } catch (error) {
            console.error('[Session] Failed to stop recording:', error);
            alert('Failed to stop recording: ' + error.message);
        }
    } else {
        // Check if in Polar H10 mode
        if (!polarMode) {
            alert('Please enable Polar H10 mode (press P) before starting a session recording.');
            return;
        }

        // Start recording
        try {
            await sessionRecorder.startRecording();
            console.log('[Session] Recording started');

            // Update control panel button if it exists
            if (controlPanel && controlPanel.updateSessionButton) {
                controlPanel.updateSessionButton(true);
            }
        } catch (error) {
            console.error('[Session] Failed to start recording:', error);
            alert('Failed to start recording: ' + error.message);
        }
    }
}

/**
 * Reset simulation
 */
function resetSimulation() {
    groupManager.initializeGroups(params.numBoidsPerGroup);
    sequencePlayer.stop();
    polarClient.reset();

    if (params.simulationMode) {
        sequencePlayer.play();
    }

    console.log('Simulation reset');
}

/**
 * Toggle Polar H10 mode
 */
function togglePolarMode() {
    polarMode = !polarMode;

    if (polarMode) {
        // Disable simulation mode
        params.simulationMode = false;
        controlPanel.updateControl('simulationMode', false);
        sequencePlayer.pause();

        // Connect to Polar H10 service
        polarClient.connect();

        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('POLAR H10 MODE ENABLED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('The visualization is now controlled by real-time');
        console.log('heart rate coherence data from your Polar H10.');
        console.log('');
        console.log('Make sure the HRV Monitor service is running:');
        console.log('  cd /workspace/hrv-monitor');
        console.log('  ./run.sh');
        console.log('');
        console.log('Press P again to return to manual mode.');
        console.log('');
    } else {
        // Disconnect from Polar H10
        polarClient.disconnect();

        console.log('');
        console.log('Polar H10 mode disabled - returning to manual control');
    }
}

/**
 * Print instructions
 */
function printInstructions() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('COHERENCE VISUALIZATION - POLAR H10 EDITION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Keyboard Controls:');
    console.log('  P = Toggle Polar H10 mode (real HRV data)');
    console.log('  X = Start/Stop session recording (Polar H10 mode only)');
    console.log('  H = Toggle session history panel');
    console.log('  S = Toggle simulation mode');
    console.log('  B = Toggle breathing guide (coherent breathing)');
    console.log('  ↑ ↓ = Adjust breathing rate (find your resonance frequency)');
    console.log('  C = Toggle control panel');
    console.log('  Space = Pause/unpause');
    console.log('  R = Reset simulation');
    console.log('  D = Toggle debug info');
    console.log('  T = Toggle trails');
    console.log('  ← → = Adjust coherence (manual mode only)');
    console.log('');
    console.log('Modes:');
    console.log('  Manual Mode:');
    console.log('    Use the slider to control coherence level');
    console.log('    -1.0 = Full repulsion');
    console.log('     0.0 = Neutral');
    console.log('    +1.0 = Full coherence');
    console.log('');
    console.log('  Simulation Mode (S):');
    console.log('    Automated biometric simulation');
    console.log('');
    console.log('  Polar H10 Mode (P):');
    console.log('    Real-time heart rate coherence from Polar H10');
    console.log('    Requires HRV Monitor service running');
    console.log('');
    console.log('Finding Your Resonance Frequency:');
    console.log('  1. Enable Polar H10 mode (P) and breathing guide (B)');
    console.log('  2. Start with default 6.0 breaths/min');
    console.log('  3. Practice for 2-3 minutes, note your coherence score');
    console.log('  4. Press ↑ to try slower breathing (4.5-5.5 bpm)');
    console.log('  5. Press ↓ to try faster breathing (6.5-7.0 bpm)');
    console.log('  6. The rate that gives highest coherence is YOUR resonance!');
    console.log('');
    console.log('To start Polar H10 mode:');
    console.log('  1. Start HRV service: cd /workspace/hrv-monitor && ./run.sh');
    console.log('  2. Wear Polar H10 with moistened electrodes');
    console.log('  3. Press P in this visualization');
    console.log('');
}

/**
 * P5.js window resized handler
 */
window.windowResized = function() {
    resizeCanvas(windowWidth, windowHeight);
};

/**
 * Keyboard controls
 */
window.keyPressed = function() {
    // P = toggle Polar H10 mode
    if (key === 'p' || key === 'P') {
        togglePolarMode();
        return;
    }

    // X = toggle session recording
    if (key === 'x' || key === 'X') {
        toggleSessionRecording();
        return;
    }

    // H = toggle session history
    if (key === 'h' || key === 'H') {
        if (sessionHistory) {
            sessionHistory.toggle();
        }
        return;
    }

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
    if (!params.simulationMode && !polarMode) {
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
        controlPanel.updateControl('simulationMode', params.simulationMode);

        if (params.simulationMode) {
            polarMode = false; // Disable Polar mode
            sequencePlayer.play();
        } else {
            sequencePlayer.pause();
        }
    }

    // C = toggle control panel
    if (key === 'c' || key === 'C') {
        controlPanel.toggleMinimize();
    }

    // B = toggle breathing guide
    if (key === 'b' || key === 'B') {
        breathGuideEnabled = !breathGuideEnabled;
        if (breathGuideEnabled) {
            breathCycleStart = millis(); // Reset cycle when re-enabling
            console.log('Breathing guide enabled');
        } else {
            console.log('Breathing guide disabled');
        }
    }

    // Up/Down arrows = adjust breathing rate (when guide is visible)
    if (breathGuideEnabled) {
        if (keyCode === UP_ARROW) {
            // Decrease breaths per minute (slower breathing)
            const rates = Object.keys(breathingPaces);
            const currentIndex = rates.indexOf(currentBreathingRate);
            if (currentIndex > 0) {
                currentBreathingRate = rates[currentIndex - 1];
                breathCycleDuration = breathingPaces[currentBreathingRate];
                breathCycleStart = millis(); // Reset cycle
                console.log(`Breathing rate: ${currentBreathingRate} breaths/min (slower)`);
            }
        }
        if (keyCode === DOWN_ARROW) {
            // Increase breaths per minute (faster breathing)
            const rates = Object.keys(breathingPaces);
            const currentIndex = rates.indexOf(currentBreathingRate);
            if (currentIndex < rates.length - 1) {
                currentBreathingRate = rates[currentIndex + 1];
                breathCycleDuration = breathingPaces[currentBreathingRate];
                breathCycleStart = millis(); // Reset cycle
                console.log(`Breathing rate: ${currentBreathingRate} breaths/min (faster)`);
            }
        }
    }
};
