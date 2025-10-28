---
doc_type: research
date: 2025-10-28T04:15:15+00:00
title: "Session Recording Integration for Coherence Visualization"
research_question: "How to integrate session recording functionality into the existing coherence visualization (coherence-app-polar.js) including recording controls, real-time data capture, session lifecycle, integration points, and user experience considerations?"
researcher: Sean Kim

git_commit: 36b4f99dafec272233e1aa89b89a368a5ba0a8b3
branch: main
repository: workspace

created_by: Sean Kim
last_updated: 2025-10-28
last_updated_by: Sean Kim

tags:
  - session-recording
  - hrv
  - coherence
  - polar-h10
  - websocket
  - data-storage
  - biofeedback
  - breathing-guide
  - p5js
status: completed

related_docs:
  - thoughts/2025-10-25-biometric-coherence-research.md
  - thoughts/research/2025-10-28-heartmath-implementation-in-hrv-monitor-directory.md
---

# Research: Session Recording Integration for Coherence Visualization

**Date**: 2025-10-28T04:15:15+00:00
**Researcher**: Sean Kim
**Git Commit**: 36b4f99dafec272233e1aa89b89a368a5ba0a8b3
**Branch**: main
**Repository**: workspace

## Research Question

How to integrate session recording functionality into the existing coherence visualization (`coherence-app-polar.js`) including recording controls, real-time data capture, session lifecycle, integration points, and user experience considerations?

## Summary

The coherence visualization (`coherence-app-polar.js`) is a p5.js-based application that connects to a Polar H10 heart rate monitor via WebSocket to visualize real-time HRV coherence data as two groups of boids. Session recording functionality can be integrated through five key components: (1) UI recording controls added to the existing `ControlPanel`, (2) a `SessionRecorder` class that captures coherence updates, heartbeats, and buffer status via `PolarH10Client` callbacks, (3) a session lifecycle manager handling start/stop/save operations, (4) browser-based `localStorage` or `IndexedDB` for data persistence, and (5) breathing guide state tracking to record which breathing pace was used during the session.

The implementation requires careful integration to avoid performance impact on the visualization's draw loop (targeting 60fps). Data capture should occur in callback handlers rather than in the main draw function, using efficient buffering strategies and async save operations. The existing architecture already provides all necessary data streams through the `PolarH10Client` callbacks: `onCoherenceUpdate`, `onHeartbeat`, `onBufferStatus`, and `onStatusUpdate`.

## Detailed Findings

### 1. Recording Controls - UI Integration Points

#### Existing Control Panel Architecture

**File:** `/workspace/coherence/src/ui/control-panel.js`

The `ControlPanel` class creates p5.js DOM elements for the visualization controls. The panel already has:

**Structure** (lines 23-35):
- Fixed position at bottom center of screen
- Semi-transparent dark background with glassmorphism
- Minimize/expand functionality
- Title bar with toggle button

**Control Creation Methods**:
- `createSlider()` (lines 220-242) - Numeric value controls
- `createToggle()` (lines 244-263) - Boolean checkbox controls
- `createSequenceSelector()` (lines 265-311) - Dropdown menu

**Existing Controls**:
- Simulation mode toggle (lines 72-96)
- Sequence selector dropdown (lines 98-100)
- Coherence level slider (lines 108-122)
- Boid count slider (lines 124-139)
- Show trails toggle (lines 142-153)
- Debug info toggle (lines 155-166)
- Pause toggle (lines 168-179)
- Performance mode toggle (lines 181-192)
- Reset button (lines 195-210)

#### Recording Control Integration Design

**Recommended Location:** Add new recording section after the pause toggle and before the reset button.

**New Controls Needed:**

**1. Recording Toggle Button**

```javascript
// In ControlPanel.createControls() after line 192

// Recording section divider
const recordingDivider = createDiv();
recordingDivider.style('border-top', '1px solid rgba(255, 255, 255, 0.2)');
recordingDivider.style('margin', '15px 0');
recordingDivider.parent(this.content);

// Recording toggle
this.createToggle(
    this.content,
    'recordingActive',
    'Record Session',
    false,  // Start with recording OFF
    (value) => {
        if (value) {
            // Start recording
            if (this.callbacks.onRecordingStart) {
                this.callbacks.onRecordingStart();
            }
        } else {
            // Stop recording and save
            if (this.callbacks.onRecordingStop) {
                this.callbacks.onRecordingStop();
            }
        }
    }
);
```

**2. Recording Status Indicator**

```javascript
// Visual recording indicator (red dot when active)
const recordingIndicator = createDiv();
recordingIndicator.id('recording-indicator');
recordingIndicator.style('display', 'inline-block');
recordingIndicator.style('width', '10px');
recordingIndicator.style('height', '10px');
recordingIndicator.style('border-radius', '50%');
recordingIndicator.style('background-color', 'rgba(239, 68, 68, 0)');  // Transparent initially
recordingIndicator.style('margin-left', '10px');
recordingIndicator.style('transition', 'background-color 0.3s');
recordingIndicator.parent(this.content);
this.controls.recordingIndicator = recordingIndicator;
```

**3. Session Metadata Inputs (Optional)**

```javascript
// Session name input
const sessionNameContainer = createDiv();
sessionNameContainer.style('margin', '10px 0');
sessionNameContainer.style('display', 'none');  // Hidden by default
sessionNameContainer.parent(this.content);

const sessionNameLabel = createDiv('Session Name:');
sessionNameLabel.style('font-size', '12px');
sessionNameLabel.style('margin-bottom', '5px');
sessionNameLabel.parent(sessionNameContainer);

const sessionNameInput = createInput('');
sessionNameInput.style('width', '250px');
sessionNameInput.style('padding', '5px');
sessionNameInput.style('background', 'rgba(60, 60, 60, 0.8)');
sessionNameInput.style('color', 'white');
sessionNameInput.style('border', '1px solid rgba(255, 255, 255, 0.3)');
sessionNameInput.style('border-radius', '5px');
sessionNameInput.parent(sessionNameContainer);

this.controls.sessionNameContainer = sessionNameContainer;
this.controls.sessionNameInput = sessionNameInput;
```

**4. Session Notes/Tags Input (Optional)**

```javascript
// Tags input for categorizing sessions
const sessionTagsContainer = createDiv();
sessionTagsContainer.style('margin', '10px 0');
sessionTagsContainer.style('display', 'none');
sessionTagsContainer.parent(this.content);

const sessionTagsLabel = createDiv('Tags (comma-separated):');
sessionTagsLabel.style('font-size', '12px');
sessionTagsLabel.style('margin-bottom', '5px');
sessionTagsLabel.parent(sessionTagsContainer);

const sessionTagsInput = createInput('');
sessionTagsInput.attribute('placeholder', 'meditation, breathing, practice');
sessionTagsInput.style('width', '250px');
sessionTagsInput.style('padding', '5px');
sessionTagsInput.style('background', 'rgba(60, 60, 60, 0.8)');
sessionTagsInput.style('color', 'white');
sessionTagsInput.style('border', '1px solid rgba(255, 255, 255, 0.3)');
sessionTagsInput.style('border-radius', '5px');
sessionTagsInput.parent(sessionTagsContainer);

this.controls.sessionTagsContainer = sessionTagsContainer;
this.controls.sessionTagsInput = sessionTagsInput;
```

**5. Elapsed Time Display**

```javascript
// Elapsed time display (updated every second during recording)
const elapsedTimeDiv = createDiv('Time: 00:00');
elapsedTimeDiv.style('font-size', '12px');
elapsedTimeDiv.style('color', 'rgba(255, 255, 255, 0.7)');
elapsedTimeDiv.style('margin', '5px 0');
elapsedTimeDiv.style('display', 'none');  // Hidden when not recording
elapsedTimeDiv.parent(this.content);
this.controls.elapsedTime = elapsedTimeDiv;
```

#### Recording Indicator Visual Feedback

**Active Recording State:**

```javascript
// Update recording indicator - call this when recording starts
updateRecordingIndicator(isRecording) {
    const indicator = this.controls.recordingIndicator;
    if (isRecording) {
        indicator.style('background-color', 'rgba(239, 68, 68, 1)');  // Red
        indicator.style('animation', 'pulse 1.5s infinite');

        // Show elapsed time
        this.controls.elapsedTime.style('display', 'block');
    } else {
        indicator.style('background-color', 'rgba(239, 68, 68, 0)');  // Transparent
        indicator.style('animation', 'none');

        // Hide elapsed time
        this.controls.elapsedTime.style('display', 'none');
    }
}
```

**CSS Animation for Pulse Effect:**

```css
/* Add to HTML file or inject via JavaScript */
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
}
```

#### Integration with coherence-app-polar.js

**File:** `/workspace/coherence/src/apps/coherence-app-polar.js`

**Callback Registration** (lines 136-172):

The `ControlPanel` constructor accepts a callbacks object. Add recording callbacks:

```javascript
// In window.setup() function, around line 136
controlPanel = new ControlPanel(params, {
    // ... existing callbacks ...

    // NEW: Recording callbacks
    onRecordingStart: () => {
        startRecording();
    },
    onRecordingStop: () => {
        stopRecording();
    },
    onSessionNameChange: (name) => {
        if (sessionRecorder) {
            sessionRecorder.setSessionName(name);
        }
    },
    onSessionTagsChange: (tags) => {
        if (sessionRecorder) {
            sessionRecorder.setSessionTags(tags);
        }
    }
}, {
    startMinimized: true
});
```

### 2. Real-Time Data Capture from PolarH10Client

#### PolarH10Client Callback Architecture

**File:** `/workspace/coherence/src/integrations/polar-h10-client.js`

The `PolarH10Client` class provides four callback hooks for data capture:

**Callback 1: onCoherenceUpdate** (lines 92-102 in coherence-app-polar.js)

```javascript
onCoherenceUpdate: (data) => {
    if (polarMode) {
        params.coherenceLevel = data.level;
        polarStatus.currentScore = data.score;

        console.log(
            `[Coherence] Score: ${data.score}/100, ` +
            `Level: ${data.level.toFixed(2)}, ` +
            `Peak: ${data.peakFrequency.toFixed(3)} Hz`
        );
    }
}
```

**Data Structure:**
```javascript
{
    score: 67,                    // 0-100 coherence score
    level: 0.34,                  // -1.0 to +1.0 mapped level
    smoothedLevel: 0.32,          // Current smoothed value
    ratio: 3.45,                  // Raw coherence ratio
    peakFrequency: 0.098,         // Hz (typically ~0.1 Hz)
    beatsUsed: 48,                // Number of RR intervals used
    timestamp: 1698425630.123     // Unix timestamp
}
```

**Update Frequency:** Every 3 seconds (configurable in hrv-monitor service)

**Callback 2: onHeartbeat** (lines 122-128)

```javascript
onHeartbeat: (data) => {
    // Trigger pulse animation on each heartbeat
    heartbeatPulse = 1.0;
    lastHeartbeatTime = millis();
    polarStatus.heartRate = data.heartRate;
    console.log(`[Heartbeat] RR: ${data.rrInterval.toFixed(1)}ms, HR: ${data.heartRate.toFixed(0)} bpm, Pulse: ${heartbeatPulse}`);
}
```

**Data Structure:**
```javascript
{
    rrInterval: 856.3,            // Milliseconds between beats
    heartRate: 70.1,              // BPM calculated from RR interval
    timestamp: 1698425630.456     // Unix timestamp
}
```

**Update Frequency:** On every heartbeat (~60-100 times per minute)

**Callback 3: onBufferStatus** (lines 117-120)

```javascript
onBufferStatus: (status) => {
    polarStatus.bufferReady = status.bufferReady;
    polarStatus.heartRate = status.meanHeartRate;
}
```

**Data Structure:**
```javascript
{
    beatsInBuffer: 48,
    minBeatsRequired: 30,
    bufferReady: true,
    meanHeartRate: 68.5,
    bufferDuration: 59.2         // Seconds
}
```

**Update Frequency:** Every 3 seconds with coherence updates

**Callback 4: onStatusUpdate** (lines 105-115)

```javascript
onStatusUpdate: (status) => {
    polarStatus.wsConnected = status.connected;
    if (status.polarConnected !== undefined) {
        polarStatus.polarConnected = status.polarConnected;
        polarStatus.deviceName = status.deviceName;
    }

    if (status.connected) {
        console.log('[Coherence] ✓ Connected to HRV Monitor service');
    }
}
```

**Data Structure:**
```javascript
{
    connected: true,              // WebSocket connection status
    polarConnected: true,         // Polar H10 device status
    deviceName: "Polar H10",
    deviceAddress: "UUID-HERE"
}
```

**Update Frequency:** On connection changes + every 5 seconds

#### Data Capture Strategy

**SessionRecorder Class Design:**

```javascript
// New file: /workspace/coherence/src/core/session-recorder.js

export class SessionRecorder {
    constructor() {
        // Session metadata
        this.sessionId = null;
        this.sessionName = '';
        this.sessionTags = [];
        this.startTime = null;
        this.endTime = null;

        // Data buffers
        this.coherenceUpdates = [];
        this.heartbeats = [];
        this.bufferStatuses = [];
        this.statusUpdates = [];

        // Breathing guide tracking
        this.breathingRate = null;
        this.breathingGuideEnabled = false;

        // Recording state
        this.isRecording = false;

        // Performance tracking
        this.dataPoints = 0;
        this.lastSaveTime = 0;
    }

    /**
     * Start a new recording session
     */
    startSession(metadata = {}) {
        this.sessionId = this._generateSessionId();
        this.sessionName = metadata.name || `Session ${new Date().toLocaleString()}`;
        this.sessionTags = metadata.tags || [];
        this.breathingRate = metadata.breathingRate || null;
        this.breathingGuideEnabled = metadata.breathingGuideEnabled || false;

        this.startTime = Date.now();
        this.endTime = null;
        this.isRecording = true;

        // Clear buffers
        this.coherenceUpdates = [];
        this.heartbeats = [];
        this.bufferStatuses = [];
        this.statusUpdates = [];
        this.dataPoints = 0;

        console.log(`[SessionRecorder] Started session: ${this.sessionId}`);
    }

    /**
     * Record coherence update
     */
    recordCoherence(data) {
        if (!this.isRecording) return;

        this.coherenceUpdates.push({
            timestamp: Date.now(),
            score: data.score,
            level: data.level,
            ratio: data.ratio,
            peakFrequency: data.peakFrequency,
            beatsUsed: data.beatsUsed
        });

        this.dataPoints++;
    }

    /**
     * Record heartbeat event
     */
    recordHeartbeat(data) {
        if (!this.isRecording) return;

        this.heartbeats.push({
            timestamp: Date.now(),
            rrInterval: data.rrInterval,
            heartRate: data.heartRate
        });

        this.dataPoints++;
    }

    /**
     * Record buffer status
     */
    recordBufferStatus(data) {
        if (!this.isRecording) return;

        this.bufferStatuses.push({
            timestamp: Date.now(),
            beatsInBuffer: data.beatsInBuffer,
            bufferReady: data.bufferReady,
            meanHeartRate: data.meanHeartRate,
            bufferDuration: data.bufferDuration
        });
    }

    /**
     * Record connection status
     */
    recordStatus(data) {
        if (!this.isRecording) return;

        this.statusUpdates.push({
            timestamp: Date.now(),
            wsConnected: data.connected,
            polarConnected: data.polarConnected,
            deviceName: data.deviceName
        });
    }

    /**
     * Update breathing guide parameters
     */
    updateBreathingGuide(rate, enabled) {
        if (!this.isRecording) return;

        this.breathingRate = rate;
        this.breathingGuideEnabled = enabled;
    }

    /**
     * Stop recording and prepare session data
     */
    stopSession() {
        if (!this.isRecording) return null;

        this.endTime = Date.now();
        this.isRecording = false;

        const sessionData = this._compileSessionData();
        console.log(`[SessionRecorder] Stopped session: ${this.sessionId}`);
        console.log(`[SessionRecorder] Captured ${this.dataPoints} data points`);

        return sessionData;
    }

    /**
     * Compile complete session data
     */
    _compileSessionData() {
        const duration = this.endTime - this.startTime;

        // Calculate summary statistics
        const avgCoherence = this._calculateAverage(
            this.coherenceUpdates.map(u => u.score)
        );
        const avgHeartRate = this._calculateAverage(
            this.heartbeats.map(h => h.heartRate)
        );
        const minCoherence = Math.min(...this.coherenceUpdates.map(u => u.score));
        const maxCoherence = Math.max(...this.coherenceUpdates.map(u => u.score));

        return {
            // Metadata
            sessionId: this.sessionId,
            sessionName: this.sessionName,
            tags: this.sessionTags,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: duration,  // milliseconds

            // Breathing guide state
            breathingRate: this.breathingRate,
            breathingGuideEnabled: this.breathingGuideEnabled,

            // Raw data arrays
            coherenceUpdates: this.coherenceUpdates,
            heartbeats: this.heartbeats,
            bufferStatuses: this.bufferStatuses,
            statusUpdates: this.statusUpdates,

            // Summary statistics
            statistics: {
                totalDataPoints: this.dataPoints,
                avgCoherence: avgCoherence,
                minCoherence: minCoherence,
                maxCoherence: maxCoherence,
                avgHeartRate: avgHeartRate,
                totalHeartbeats: this.heartbeats.length,
                coherenceSamples: this.coherenceUpdates.length
            }
        };
    }

    /**
     * Calculate average of array
     */
    _calculateAverage(values) {
        if (values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    /**
     * Generate unique session ID
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set session name
     */
    setSessionName(name) {
        this.sessionName = name;
    }

    /**
     * Set session tags
     */
    setSessionTags(tagsString) {
        this.sessionTags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    /**
     * Get current session duration
     */
    getCurrentDuration() {
        if (!this.isRecording) return 0;
        return Date.now() - this.startTime;
    }

    /**
     * Get recording status
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            sessionId: this.sessionId,
            duration: this.getCurrentDuration(),
            dataPoints: this.dataPoints
        };
    }
}
```

#### Integration into coherence-app-polar.js

**Add SessionRecorder to Global State** (after line 19):

```javascript
// Session recording
let sessionRecorder;
let recordingActive = false;
```

**Initialize in setup()** (after line 173):

```javascript
// Initialize session recorder
sessionRecorder = new SessionRecorder();
```

**Hook into PolarH10Client Callbacks:**

```javascript
// Modify existing callbacks to include recording

onCoherenceUpdate: (data) => {
    if (polarMode) {
        params.coherenceLevel = data.level;
        polarStatus.currentScore = data.score;

        // Record coherence data
        if (recordingActive && sessionRecorder) {
            sessionRecorder.recordCoherence(data);
        }

        console.log(
            `[Coherence] Score: ${data.score}/100, ` +
            `Level: ${data.level.toFixed(2)}, ` +
            `Peak: ${data.peakFrequency.toFixed(3)} Hz`
        );
    }
},

onHeartbeat: (data) => {
    // Trigger pulse animation
    heartbeatPulse = 1.0;
    lastHeartbeatTime = millis();
    polarStatus.heartRate = data.heartRate;

    // Record heartbeat data
    if (recordingActive && sessionRecorder) {
        sessionRecorder.recordHeartbeat(data);
    }

    console.log(`[Heartbeat] RR: ${data.rrInterval.toFixed(1)}ms, HR: ${data.heartRate.toFixed(0)} bpm`);
},

onBufferStatus: (status) => {
    polarStatus.bufferReady = status.bufferReady;
    polarStatus.heartRate = status.meanHeartRate;

    // Record buffer status
    if (recordingActive && sessionRecorder) {
        sessionRecorder.recordBufferStatus(status);
    }
},

onStatusUpdate: (status) => {
    polarStatus.wsConnected = status.connected;
    if (status.polarConnected !== undefined) {
        polarStatus.polarConnected = status.polarConnected;
        polarStatus.deviceName = status.deviceName;
    }

    // Record status updates
    if (recordingActive && sessionRecorder) {
        sessionRecorder.recordStatus(status);
    }

    if (status.connected) {
        console.log('[Coherence] ✓ Connected to HRV Monitor service');
    }
}
```

### 3. Session Lifecycle and Storage Integration

#### Session Start Implementation

```javascript
/**
 * Start recording a new session
 */
function startRecording() {
    if (!polarMode || !polarStatus.wsConnected) {
        console.warn('[Recording] Cannot start: Polar mode not active or not connected');
        alert('Please connect to Polar H10 before starting recording');
        return;
    }

    // Gather metadata
    const metadata = {
        name: controlPanel.controls.sessionNameInput?.value() || `Session ${new Date().toLocaleString()}`,
        tags: controlPanel.controls.sessionTagsInput?.value()?.split(',').map(t => t.trim()) || [],
        breathingRate: currentBreathingRate,
        breathingGuideEnabled: breathGuideEnabled
    };

    // Start session
    sessionRecorder.startSession(metadata);
    recordingActive = true;

    // Update UI
    controlPanel.updateRecordingIndicator(true);
    controlPanel.controls.sessionNameContainer?.style('display', 'none');
    controlPanel.controls.sessionTagsContainer?.style('display', 'none');

    console.log('[Recording] Session started:', metadata);
}
```

#### Session Stop and Save Implementation

```javascript
/**
 * Stop recording and save session
 */
async function stopRecording() {
    if (!recordingActive) return;

    // Stop recording
    const sessionData = sessionRecorder.stopSession();
    recordingActive = false;

    // Update UI
    controlPanel.updateRecordingIndicator(false);
    controlPanel.controls.sessionNameContainer?.style('display', 'block');
    controlPanel.controls.sessionTagsContainer?.style('display', 'block');

    if (!sessionData) {
        console.warn('[Recording] No session data to save');
        return;
    }

    // Save session
    try {
        await saveSession(sessionData);
        console.log('[Recording] Session saved successfully:', sessionData.sessionId);

        // Show summary
        showSessionSummary(sessionData);
    } catch (error) {
        console.error('[Recording] Failed to save session:', error);
        alert('Failed to save session: ' + error.message);
    }
}
```

#### Auto-Save Mechanism

```javascript
/**
 * Auto-save session data periodically
 * Call this every 30 seconds during active recording
 */
async function autoSaveSession() {
    if (!recordingActive || !sessionRecorder.isRecording) return;

    const currentData = sessionRecorder._compileSessionData();
    currentData.isAutoSave = true;

    try {
        await saveSessionToLocalStorage(`autosave_${sessionRecorder.sessionId}`, currentData);
        console.log('[Recording] Auto-save completed');
    } catch (error) {
        console.error('[Recording] Auto-save failed:', error);
    }
}

// Schedule auto-save in setup()
setInterval(autoSaveSession, 30000);  // Every 30 seconds
```

#### Crash Recovery

```javascript
/**
 * Check for unsaved sessions on startup
 * Call this in setup() after initializing sessionRecorder
 */
function checkForUnsavedSessions() {
    const autoSaveKeys = Object.keys(localStorage).filter(key => key.startsWith('autosave_'));

    if (autoSaveKeys.length > 0) {
        console.log(`[Recording] Found ${autoSaveKeys.length} unsaved session(s)`);

        // Prompt user
        const recover = confirm(
            `Found ${autoSaveKeys.length} unsaved session(s) from previous crash. ` +
            `Would you like to recover them?`
        );

        if (recover) {
            autoSaveKeys.forEach(key => {
                try {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    sessionData.recovered = true;
                    sessionData.sessionName = sessionData.sessionName + ' (Recovered)';

                    // Save as permanent session
                    saveSession(sessionData);

                    // Remove autosave
                    localStorage.removeItem(key);

                    console.log('[Recording] Recovered session:', sessionData.sessionId);
                } catch (error) {
                    console.error('[Recording] Failed to recover session:', error);
                }
            });
        } else {
            // Clear autosaves
            autoSaveKeys.forEach(key => localStorage.removeItem(key));
        }
    }
}
```

#### Storage Implementation Options

**Option 1: localStorage (Simple, Recommended for MVP)**

```javascript
/**
 * Save session to localStorage
 */
async function saveSession(sessionData) {
    const storageKey = `hrv_session_${sessionData.sessionId}`;

    // Add to sessions index
    let sessionsIndex = JSON.parse(localStorage.getItem('hrv_sessions_index') || '[]');
    sessionsIndex.push({
        sessionId: sessionData.sessionId,
        sessionName: sessionData.sessionName,
        startTime: sessionData.startTime,
        duration: sessionData.duration,
        avgCoherence: sessionData.statistics.avgCoherence
    });

    // Save session data
    localStorage.setItem(storageKey, JSON.stringify(sessionData));
    localStorage.setItem('hrv_sessions_index', JSON.stringify(sessionsIndex));

    console.log('[Storage] Saved session to localStorage:', storageKey);
}

/**
 * Load session from localStorage
 */
function loadSession(sessionId) {
    const storageKey = `hrv_session_${sessionId}`;
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    return JSON.parse(sessionData);
}

/**
 * List all sessions
 */
function listSessions() {
    const sessionsIndex = JSON.parse(localStorage.getItem('hrv_sessions_index') || '[]');
    return sessionsIndex.sort((a, b) => b.startTime - a.startTime);  // Most recent first
}

/**
 * Delete session
 */
function deleteSession(sessionId) {
    const storageKey = `hrv_session_${sessionId}`;

    // Remove from index
    let sessionsIndex = JSON.parse(localStorage.getItem('hrv_sessions_index') || '[]');
    sessionsIndex = sessionsIndex.filter(s => s.sessionId !== sessionId);
    localStorage.setItem('hrv_sessions_index', JSON.stringify(sessionsIndex));

    // Remove session data
    localStorage.removeItem(storageKey);

    console.log('[Storage] Deleted session:', sessionId);
}
```

**Storage Limits:**
- localStorage typically has 5-10MB limit per domain
- One hour session with heartbeat data (~60 beats/min) = ~3600 data points
- Estimated size: ~500KB per hour-long session
- Can store ~10-20 hour-long sessions before hitting limits

**Option 2: IndexedDB (Better for Large Sessions)**

```javascript
/**
 * Initialize IndexedDB
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('HRVSessions', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create sessions object store
            if (!db.objectStoreNames.contains('sessions')) {
                const objectStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                objectStore.createIndex('startTime', 'startTime', { unique: false });
                objectStore.createIndex('sessionName', 'sessionName', { unique: false });
            }
        };
    });
}

/**
 * Save session to IndexedDB
 */
async function saveSessionToIndexedDB(sessionData) {
    const db = await initDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sessions'], 'readwrite');
        const objectStore = transaction.objectStore('sessions');
        const request = objectStore.put(sessionData);

        request.onsuccess = () => {
            console.log('[IndexedDB] Saved session:', sessionData.sessionId);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Load session from IndexedDB
 */
async function loadSessionFromIndexedDB(sessionId) {
    const db = await initDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sessions'], 'readonly');
        const objectStore = transaction.objectStore('sessions');
        const request = objectStore.get(sessionId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * List all sessions from IndexedDB
 */
async function listSessionsFromIndexedDB() {
    const db = await initDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sessions'], 'readonly');
        const objectStore = transaction.objectStore('sessions');
        const index = objectStore.index('startTime');
        const request = index.getAll();

        request.onsuccess = () => {
            const sessions = request.result;
            sessions.sort((a, b) => b.startTime - a.startTime);  // Most recent first
            resolve(sessions.map(s => ({
                sessionId: s.sessionId,
                sessionName: s.sessionName,
                startTime: s.startTime,
                duration: s.duration,
                avgCoherence: s.statistics.avgCoherence
            })));
        };
        request.onerror = () => reject(request.error);
    });
}
```

**Advantages of IndexedDB:**
- Much larger storage (hundreds of MB to GB)
- Better performance for large datasets
- Indexed queries
- Transactional safety

**Disadvantages:**
- More complex API
- Async operations required
- Browser compatibility considerations

#### Export Functionality

```javascript
/**
 * Export session data as JSON file
 */
function exportSession(sessionId) {
    const sessionData = loadSession(sessionId);

    if (!sessionData) {
        alert('Session not found');
        return;
    }

    // Create JSON blob
    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrv_session_${sessionData.sessionName.replace(/[^a-z0-9]/gi, '_')}_${sessionData.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[Export] Session exported:', sessionId);
}

/**
 * Export session data as CSV file
 */
function exportSessionAsCSV(sessionId) {
    const sessionData = loadSession(sessionId);

    if (!sessionData) {
        alert('Session not found');
        return;
    }

    // CSV header
    let csv = 'Timestamp,Type,Value1,Value2,Value3\n';

    // Coherence updates
    sessionData.coherenceUpdates.forEach(update => {
        csv += `${update.timestamp},coherence,${update.score},${update.level},${update.peakFrequency}\n`;
    });

    // Heartbeats
    sessionData.heartbeats.forEach(hb => {
        csv += `${hb.timestamp},heartbeat,${hb.rrInterval},${hb.heartRate},\n`;
    });

    // Create CSV blob
    const blob = new Blob([csv], { type: 'text/csv' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrv_session_${sessionData.sessionName.replace(/[^a-z0-9]/gi, '_')}_${sessionData.sessionId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[Export] Session exported as CSV:', sessionId);
}
```

### 4. Performance Impact and Memory Management

#### Performance Considerations

**Current Visualization Performance:**
- Target framerate: 60 FPS
- Main draw loop (`window.draw()`) executes 60 times per second
- GroupManager updates ~200 boids per frame (100 per group)
- BoidRenderer draws all boids each frame
- Additional rendering: coherence indicator, breathing guide, Polar info, heartbeat pulse

**Data Capture Frequency:**
- Coherence updates: ~0.33 Hz (every 3 seconds)
- Heartbeat events: ~1-1.5 Hz (60-100 bpm)
- Buffer status: ~0.33 Hz (every 3 seconds with coherence)
- Status updates: ~0.2 Hz (every 5 seconds)

**Total Data Capture Rate:**
- ~2-3 data points per second maximum
- Very low compared to 60fps draw loop

#### Critical Performance Rules

**❌ NEVER capture data in draw() loop:**

```javascript
// BAD - Don't do this!
window.draw = function() {
    // ... existing draw code ...

    // ❌ BAD: Capturing data in draw loop
    if (recordingActive) {
        sessionRecorder.recordSomething();  // Called 60 times per second!
    }
}
```

**✅ ALWAYS capture in callback handlers:**

```javascript
// GOOD - Capture in callbacks
onCoherenceUpdate: (data) => {
    if (polarMode) {
        params.coherenceLevel = data.level;

        // ✅ GOOD: Only called when data arrives (~every 3 seconds)
        if (recordingActive && sessionRecorder) {
            sessionRecorder.recordCoherence(data);
        }
    }
}
```

**Why this matters:**
- Callbacks are event-driven (only when data arrives)
- Draw loop runs 60x per second regardless of data
- Recording in draw loop would create 60x unnecessary overhead

#### Memory Management Strategies

**Strategy 1: Efficient Data Structures**

```javascript
// Store only essential data, not full objects
recordCoherence(data) {
    if (!this.isRecording) return;

    // ✅ Store minimal data
    this.coherenceUpdates.push({
        t: Date.now(),           // Shorter key names
        s: data.score,           // score
        l: data.level,           // level
        r: data.ratio,           // ratio
        f: data.peakFrequency,   // frequency
        b: data.beatsUsed        // beats
    });

    this.dataPoints++;
}
```

**Memory savings:**
- Long keys like `timestamp`, `peakFrequency` vs short `t`, `f`
- For 1000 data points: ~10KB saved

**Strategy 2: Circular Buffer for Long Sessions**

```javascript
export class SessionRecorder {
    constructor() {
        // ... existing properties ...

        // Memory limits
        this.maxHeartbeats = 10000;      // ~2.5 hours at 70 bpm
        this.maxCoherenceUpdates = 1200; // 1 hour at 3s intervals
    }

    recordHeartbeat(data) {
        if (!this.isRecording) return;

        this.heartbeats.push({
            timestamp: Date.now(),
            rrInterval: data.rrInterval,
            heartRate: data.heartRate
        });

        // ✅ Limit buffer size (FIFO)
        if (this.heartbeats.length > this.maxHeartbeats) {
            this.heartbeats.shift();  // Remove oldest
            console.warn('[SessionRecorder] Heartbeat buffer limit reached, removing oldest data');
        }

        this.dataPoints++;
    }
}
```

**Strategy 3: Periodic Flush to Storage**

```javascript
export class SessionRecorder {
    constructor() {
        // ... existing properties ...

        // Flush settings
        this.flushInterval = 60000;  // Flush every 60 seconds
        this.lastFlushTime = 0;
    }

    recordCoherence(data) {
        if (!this.isRecording) return;

        this.coherenceUpdates.push({
            timestamp: Date.now(),
            score: data.score,
            level: data.level,
            ratio: data.ratio,
            peakFrequency: data.peakFrequency,
            beatsUsed: data.beatsUsed
        });

        this.dataPoints++;

        // ✅ Periodic flush to storage
        const now = Date.now();
        if (now - this.lastFlushTime > this.flushInterval) {
            this._flushToStorage();
            this.lastFlushTime = now;
        }
    }

    async _flushToStorage() {
        // Save current buffers to IndexedDB
        const partialData = {
            sessionId: this.sessionId,
            coherenceUpdates: [...this.coherenceUpdates],
            heartbeats: [...this.heartbeats],
            lastFlush: Date.now()
        };

        await saveSessionToIndexedDB(`${this.sessionId}_partial`, partialData);

        // Clear buffers (data is now in storage)
        this.coherenceUpdates = [];
        this.heartbeats = [];

        console.log('[SessionRecorder] Flushed data to storage');
    }
}
```

**Strategy 4: Lazy Loading for Playback**

```javascript
/**
 * Load session in chunks for playback
 */
async function* loadSessionChunks(sessionId, chunkSize = 100) {
    const sessionData = await loadSessionFromIndexedDB(sessionId);

    // Yield coherence data in chunks
    for (let i = 0; i < sessionData.coherenceUpdates.length; i += chunkSize) {
        yield {
            type: 'coherence',
            data: sessionData.coherenceUpdates.slice(i, i + chunkSize)
        };
    }

    // Yield heartbeat data in chunks
    for (let i = 0; i < sessionData.heartbeats.length; i += chunkSize) {
        yield {
            type: 'heartbeat',
            data: sessionData.heartbeats.slice(i, i + chunkSize)
        };
    }
}

// Usage
async function replaySession(sessionId) {
    for await (const chunk of loadSessionChunks(sessionId)) {
        processChunk(chunk);
    }
}
```

#### Memory Estimates

**Typical Session (1 hour):**
- Coherence updates: 1200 samples @ ~100 bytes = 120 KB
- Heartbeats: 4200 samples @ ~50 bytes = 210 KB
- Buffer statuses: 1200 samples @ ~80 bytes = 96 KB
- Status updates: 720 samples @ ~60 bytes = 43 KB
- **Total: ~469 KB in memory**

**Long Session (3 hours):**
- Coherence updates: 3600 samples = 360 KB
- Heartbeats: 12600 samples = 630 KB
- Buffer statuses: 3600 samples = 288 KB
- Status updates: 2160 samples = 129 KB
- **Total: ~1.4 MB in memory**

**Impact on Browser:**
- Modern browsers handle 1-10 MB in JavaScript memory easily
- Recording adds <2% memory overhead for typical sessions
- Minimal impact on 60fps visualization

#### Performance Monitoring

```javascript
/**
 * Monitor recording performance
 */
export class SessionRecorder {
    constructor() {
        // ... existing properties ...

        // Performance tracking
        this.recordingMetrics = {
            totalRecords: 0,
            recordingTime: 0,
            avgRecordTime: 0,
            peakRecordTime: 0
        };
    }

    recordCoherence(data) {
        const startTime = performance.now();

        if (!this.isRecording) return;

        this.coherenceUpdates.push({
            timestamp: Date.now(),
            score: data.score,
            level: data.level,
            ratio: data.ratio,
            peakFrequency: data.peakFrequency,
            beatsUsed: data.beatsUsed
        });

        this.dataPoints++;

        // Track performance
        const recordTime = performance.now() - startTime;
        this.recordingMetrics.totalRecords++;
        this.recordingMetrics.recordingTime += recordTime;
        this.recordingMetrics.avgRecordTime =
            this.recordingMetrics.recordingTime / this.recordingMetrics.totalRecords;
        this.recordingMetrics.peakRecordTime =
            Math.max(this.recordingMetrics.peakRecordTime, recordTime);

        // Warn if recording is slow
        if (recordTime > 5) {  // More than 5ms
            console.warn(`[SessionRecorder] Slow recording operation: ${recordTime.toFixed(2)}ms`);
        }
    }

    getPerformanceMetrics() {
        return {
            ...this.recordingMetrics,
            memoryEstimate: this._estimateMemoryUsage()
        };
    }

    _estimateMemoryUsage() {
        // Rough estimate in KB
        const coherenceSize = this.coherenceUpdates.length * 0.1;  // ~100 bytes each
        const heartbeatSize = this.heartbeats.length * 0.05;        // ~50 bytes each
        const bufferSize = this.bufferStatuses.length * 0.08;       // ~80 bytes each
        const statusSize = this.statusUpdates.length * 0.06;        // ~60 bytes each

        return {
            totalKB: (coherenceSize + heartbeatSize + bufferSize + statusSize).toFixed(2),
            coherenceKB: coherenceSize.toFixed(2),
            heartbeatKB: heartbeatSize.toFixed(2),
            bufferKB: bufferSize.toFixed(2),
            statusKB: statusSize.toFixed(2)
        };
    }
}
```

### 5. Breathing Guide State Tracking

#### Current Breathing Guide Implementation

**File:** `/workspace/coherence/src/apps/coherence-app-polar.js`

**Global State** (lines 36-52):

```javascript
// Breathing guide state
let breathGuideEnabled = true;  // Toggle breathing guide
let breathCycleStart = 0;       // Timestamp when breathing cycle started
let breathCycleDuration = 10000; // 10 seconds per full cycle (5s in, 5s out)

// Breathing pace options (breaths per minute → ms per cycle)
const breathingPaces = {
    '3.0': 20000,  // 3.0 bpm = 20s cycle
    '4.0': 15000,  // 4.0 bpm = 15s cycle
    '4.5': 13333,  // 4.5 bpm = 13.3s cycle
    '5.0': 12000,  // 5.0 bpm = 12s cycle
    '5.5': 10909,  // 5.5 bpm = ~11s cycle
    '6.0': 10000,  // 6.0 bpm = 10s cycle (typical resonance)
    '6.5': 9231,   // 6.5 bpm = ~9.2s cycle
    '7.0': 8571    // 7.0 bpm = ~8.6s cycle
};
let currentBreathingRate = '6.0'; // Default
```

**Breathing Guide Rendering** (lines 249-325):

The breathing guide is a visual circle that expands/contracts in sync with a breathing pattern, displayed at the center of the screen.

**Breathing Rate Controls** (lines 646-670):

Up/Down arrow keys adjust the breathing rate:
- ↑ = Slower breathing (decrease BPM)
- ↓ = Faster breathing (increase BPM)

#### Tracking Requirements for Session Recording

**What to Capture:**

1. **Initial Breathing Rate** - What pace was selected when session started
2. **Breathing Guide Enabled Status** - Was the guide visible/active
3. **Breathing Rate Changes** - Track if user adjusted rate during session
4. **Breathing Adherence** - (Future) Compare actual breathing to target pace

#### Implementation

**Add Breathing Guide Tracking to SessionRecorder:**

```javascript
export class SessionRecorder {
    constructor() {
        // ... existing properties ...

        // Breathing guide tracking
        this.initialBreathingRate = null;
        this.initialBreathingGuideEnabled = false;
        this.breathingRateChanges = [];
    }

    startSession(metadata = {}) {
        // ... existing code ...

        // Capture breathing guide state
        this.initialBreathingRate = metadata.breathingRate || '6.0';
        this.initialBreathingGuideEnabled = metadata.breathingGuideEnabled || false;
        this.breathingRateChanges = [];

        console.log(`[SessionRecorder] Breathing guide: ${this.initialBreathingGuideEnabled ? 'enabled' : 'disabled'}, Rate: ${this.initialBreathingRate} bpm`);
    }

    /**
     * Record breathing rate change
     */
    recordBreathingRateChange(newRate, oldRate) {
        if (!this.isRecording) return;

        this.breathingRateChanges.push({
            timestamp: Date.now(),
            fromRate: oldRate,
            toRate: newRate
        });

        console.log(`[SessionRecorder] Breathing rate changed: ${oldRate} → ${newRate} bpm`);
    }

    /**
     * Toggle breathing guide
     */
    recordBreathingGuideToggle(enabled) {
        if (!this.isRecording) return;

        this.breathingRateChanges.push({
            timestamp: Date.now(),
            event: 'guide_toggle',
            enabled: enabled
        });
    }

    _compileSessionData() {
        // ... existing code ...

        return {
            // ... existing fields ...

            // Breathing guide data
            breathingGuide: {
                initialRate: this.initialBreathingRate,
                initialEnabled: this.initialBreathingGuideEnabled,
                rateChanges: this.breathingRateChanges,
                finalRate: this.currentBreathingRate,
                finalEnabled: this.breathingGuideEnabled
            },

            // ... rest of data ...
        };
    }
}
```

**Hook into Breathing Rate Changes:**

Modify the keyPressed() function in coherence-app-polar.js (around line 646):

```javascript
// Up/Down arrows = adjust breathing rate (when guide is visible)
if (breathGuideEnabled) {
    if (keyCode === UP_ARROW) {
        // Decrease breaths per minute (slower breathing)
        const rates = Object.keys(breathingPaces);
        const currentIndex = rates.indexOf(currentBreathingRate);
        if (currentIndex > 0) {
            const oldRate = currentBreathingRate;
            currentBreathingRate = rates[currentIndex - 1];
            breathCycleDuration = breathingPaces[currentBreathingRate];
            breathCycleStart = millis();

            // ✅ Record change
            if (recordingActive && sessionRecorder) {
                sessionRecorder.recordBreathingRateChange(currentBreathingRate, oldRate);
            }

            console.log(`Breathing rate: ${currentBreathingRate} breaths/min (slower)`);
        }
    }
    if (keyCode === DOWN_ARROW) {
        // Increase breaths per minute (faster breathing)
        const rates = Object.keys(breathingPaces);
        const currentIndex = rates.indexOf(currentBreathingRate);
        if (currentIndex < rates.length - 1) {
            const oldRate = currentBreathingRate;
            currentBreathingRate = rates[currentIndex + 1];
            breathCycleDuration = breathingPaces[currentBreathingRate];
            breathCycleStart = millis();

            // ✅ Record change
            if (recordingActive && sessionRecorder) {
                sessionRecorder.recordBreathingRateChange(currentBreathingRate, oldRate);
            }

            console.log(`Breathing rate: ${currentBreathingRate} breaths/min (faster)`);
        }
    }
}
```

**Hook into Breathing Guide Toggle:**

Modify the 'B' key handler (around line 636):

```javascript
// B = toggle breathing guide
if (key === 'b' || key === 'B') {
    breathGuideEnabled = !breathGuideEnabled;
    if (breathGuideEnabled) {
        breathCycleStart = millis();
        console.log('Breathing guide enabled');
    } else {
        console.log('Breathing guide disabled');
    }

    // ✅ Record toggle
    if (recordingActive && sessionRecorder) {
        sessionRecorder.recordBreathingGuideToggle(breathGuideEnabled);
    }
}
```

### 6. Integration Points - Where to Add Recording Logic

#### Summary of Integration Points

**File: `/workspace/coherence/src/apps/coherence-app-polar.js`**

| Line Range | Location | Integration | Purpose |
|-----------|----------|-------------|---------|
| 14-20 | Global state declarations | Add `sessionRecorder` and `recordingActive` | Session recording state |
| 173 | After ControlPanel setup | Initialize `sessionRecorder = new SessionRecorder()` | Create recorder instance |
| 136-172 | ControlPanel callbacks | Add `onRecordingStart`, `onRecordingStop` | Handle recording controls |
| 92-102 | `onCoherenceUpdate` callback | Add `sessionRecorder.recordCoherence(data)` | Capture coherence data |
| 122-128 | `onHeartbeat` callback | Add `sessionRecorder.recordHeartbeat(data)` | Capture heartbeat data |
| 117-120 | `onBufferStatus` callback | Add `sessionRecorder.recordBufferStatus(status)` | Capture buffer status |
| 105-115 | `onStatusUpdate` callback | Add `sessionRecorder.recordStatus(status)` | Capture connection status |
| 636-644 | 'B' key handler | Add `sessionRecorder.recordBreathingGuideToggle()` | Track breathing guide |
| 646-670 | Up/Down arrow handlers | Add `sessionRecorder.recordBreathingRateChange()` | Track breathing rate changes |
| 464-475 | `resetSimulation()` function | Stop recording if active | Prevent data loss on reset |

**File: `/workspace/coherence/src/ui/control-panel.js`**

| Line Range | Location | Integration | Purpose |
|-----------|----------|-------------|---------|
| 192 | After performance mode toggle | Add recording controls | UI for session recording |
| 314-320 | `updateControl()` method | Add recording indicator update | Visual feedback |

**New File: `/workspace/coherence/src/core/session-recorder.js`**

Complete new file implementing the `SessionRecorder` class (see Section 2).

**New File: `/workspace/coherence/src/storage/session-storage.js` (Optional)**

Abstraction layer for localStorage/IndexedDB operations (see Section 3).

#### Avoiding Performance Impact

**Critical Rules:**

1. **Never access sessionRecorder in draw() loop**
   - draw() runs 60 times per second
   - Only capture data in event callbacks (which fire 2-3 times per second)

2. **Use efficient data structures**
   - Store minimal data (no redundant fields)
   - Use short property names for large arrays

3. **Async save operations**
   - Don't block main thread when saving to storage
   - Use `async/await` for IndexedDB operations

4. **Limit buffer sizes**
   - Implement circular buffers or periodic flush
   - Prevent unbounded memory growth for very long sessions

5. **Performance monitoring**
   - Track recording operation times
   - Warn if operations exceed 5ms threshold

#### Polar H10 Mode vs Simulation Mode

**Recording Behavior:**

```javascript
/**
 * Recording should only work in Polar H10 mode
 */
function startRecording() {
    // ✅ Check that we're in Polar mode
    if (!polarMode || !polarStatus.wsConnected) {
        console.warn('[Recording] Cannot start: Polar mode not active or not connected');
        alert('Please connect to Polar H10 before starting recording');

        // Reset toggle
        controlPanel.updateControl('recordingActive', false);
        return;
    }

    // ... proceed with recording ...
}

/**
 * Automatically stop recording if Polar mode is disabled
 */
function togglePolarMode() {
    polarMode = !polarMode;

    if (polarMode) {
        // ... existing Polar mode activation code ...
    } else {
        // ✅ Stop recording when exiting Polar mode
        if (recordingActive) {
            console.log('[Recording] Stopping recording (exiting Polar mode)');
            stopRecording();
        }

        // ... existing Polar mode deactivation code ...
    }
}

/**
 * Handle mode changes
 */
// In onSimulationModeChange callback (line 157-165)
onSimulationModeChange: (value) => {
    params.simulationMode = value;
    if (value) {
        polarMode = false;

        // ✅ Stop recording when entering simulation mode
        if (recordingActive) {
            console.log('[Recording] Stopping recording (entering simulation mode)');
            stopRecording();
        }

        sequencePlayer.play();
    } else {
        sequencePlayer.pause();
    }
}
```

**Why Recording Only Works with Polar H10:**
- Simulation mode uses synthetic data (not real biometric data)
- Recording synthetic data is not meaningful for biofeedback analysis
- Only real HRV data from Polar H10 should be recorded

### 7. User Experience Considerations

#### Automatic vs Manual Recording

**Option 1: Manual Start/Stop (Recommended)**

**Advantages:**
- User has full control
- Clear session boundaries
- Can name sessions before starting
- No accidental recordings

**Implementation:**
- Toggle button in control panel
- Visual indicator when recording
- Elapsed time display
- Manual save on stop

**Example Flow:**
1. User clicks "Record Session" toggle → ON
2. Recording starts immediately
3. Red indicator appears
4. Elapsed time updates every second
5. User clicks toggle → OFF
6. Recording stops and saves
7. Summary displayed

**Option 2: Automatic Recording on Polar H10 Connect**

**Advantages:**
- No user action required
- Captures entire session automatically
- Good for research/data collection

**Disadvantages:**
- May record unwanted data
- Less control over session boundaries
- May capture setup/calibration time

**Implementation:**
```javascript
// In togglePolarMode() function
if (polarMode) {
    // ... connect to Polar H10 ...

    // ✅ Auto-start recording when connected
    if (polarStatus.wsConnected && polarStatus.bufferReady) {
        setTimeout(() => {
            if (!recordingActive) {
                console.log('[Recording] Auto-starting recording (Polar connected)');
                startRecording();
                controlPanel.updateControl('recordingActive', true);
            }
        }, 5000);  // Wait 5 seconds for calibration
    }
}
```

**Option 3: Hybrid Approach**

- Auto-start recording after Polar H10 connects AND buffer is ready
- But require manual confirmation first
- "Auto-record sessions?" checkbox in settings

**Recommended:** Start with **Manual Start/Stop** for clarity and user control.

#### Visual Feedback During Recording

**1. Recording Indicator**

**Pulsing Red Dot:**
```javascript
// In control panel
const indicator = createDiv();
indicator.style('width', '12px');
indicator.style('height', '12px');
indicator.style('border-radius', '50%');
indicator.style('background-color', '#ef4444');  // Red
indicator.style('animation', 'pulse 1.5s infinite');
indicator.style('margin-left', '8px');
indicator.style('display', 'inline-block');
```

**Alternative: Recording Icon**
```javascript
// Using Unicode character
const recordIcon = createDiv('●');  // U+25CF Black Circle
recordIcon.style('color', '#ef4444');
recordIcon.style('font-size', '16px');
recordIcon.style('animation', 'pulse 1.5s infinite');
```

**2. Elapsed Time Display**

```javascript
/**
 * Update elapsed time display
 * Call this every second during recording
 */
function updateElapsedTime() {
    if (!recordingActive || !sessionRecorder) return;

    const duration = sessionRecorder.getCurrentDuration();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (controlPanel.controls.elapsedTime) {
        controlPanel.controls.elapsedTime.html(`Recording: ${timeString}`);
    }
}

// Schedule update in setup()
setInterval(updateElapsedTime, 1000);  // Update every second
```

**3. Data Points Counter (Optional)**

```javascript
// Show how much data has been captured
function updateDataPointsDisplay() {
    if (!recordingActive || !sessionRecorder) return;

    const status = sessionRecorder.getStatus();

    if (controlPanel.controls.dataPointsDisplay) {
        controlPanel.controls.dataPointsDisplay.html(
            `${status.dataPoints} data points captured`
        );
    }
}
```

**4. On-Screen Recording Banner (Optional)**

```javascript
/**
 * Show recording banner at top of screen
 */
function renderRecordingBanner() {
    if (!recordingActive) return;

    push();

    // Semi-transparent banner
    fill(239, 68, 68, 180);  // Red with alpha
    noStroke();
    rect(0, 0, width, 40);

    // Text
    fill(255);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('● RECORDING SESSION', width / 2, 20);

    pop();
}

// Add to draw() function
window.draw = function() {
    // ... existing draw code ...

    // Render recording banner if active
    if (recordingActive) {
        renderRecordingBanner();
    }
}
```

#### Session Summary Display

**Show Summary After Recording Stops:**

```javascript
/**
 * Display session summary after recording
 */
function showSessionSummary(sessionData) {
    const stats = sessionData.statistics;
    const durationMin = Math.floor(sessionData.duration / 60000);
    const durationSec = Math.floor((sessionData.duration % 60000) / 1000);

    const summaryHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(20, 20, 20, 0.95);
            padding: 30px;
            border-radius: 15px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            min-width: 400px;
            z-index: 10000;
        ">
            <h2 style="margin-top: 0; text-align: center;">Session Complete</h2>

            <div style="margin: 20px 0;">
                <p><strong>Duration:</strong> ${durationMin}m ${durationSec}s</p>
                <p><strong>Average Coherence:</strong> ${stats.avgCoherence.toFixed(1)}/100</p>
                <p><strong>Peak Coherence:</strong> ${stats.maxCoherence.toFixed(1)}/100</p>
                <p><strong>Lowest Coherence:</strong> ${stats.minCoherence.toFixed(1)}/100</p>
                <p><strong>Average Heart Rate:</strong> ${stats.avgHeartRate.toFixed(0)} BPM</p>
                <p><strong>Total Heartbeats:</strong> ${stats.totalHeartbeats}</p>
                <p><strong>Breathing Rate:</strong> ${sessionData.breathingGuide.initialRate} breaths/min</p>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button onclick="closeSummary()" style="
                    padding: 10px 20px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-right: 10px;
                ">Close</button>

                <button onclick="exportSession('${sessionData.sessionId}')" style="
                    padding: 10px 20px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">Export Data</button>
            </div>
        </div>
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'session-summary-overlay';
    overlay.innerHTML = summaryHTML;
    document.body.appendChild(overlay);
}

/**
 * Close summary overlay
 */
function closeSummary() {
    const overlay = document.getElementById('session-summary-overlay');
    if (overlay) {
        overlay.remove();
    }
}
```

#### Coherence Level Interpretation

**Add interpretation to summary:**

```javascript
function getCoherenceLevelDescription(avgScore) {
    if (avgScore < 33) {
        return {
            level: 'Low Coherence',
            description: 'Heart rhythm pattern was irregular. Try focusing on slow, deep breathing.',
            color: '#ef4444'  // Red
        };
    } else if (avgScore < 67) {
        return {
            level: 'Medium Coherence',
            description: 'Some rhythmic patterns detected. Continue practicing coherent breathing.',
            color: '#f59e0b'  // Yellow
        };
    } else {
        return {
            level: 'High Coherence',
            description: 'Strong sine-wave pattern! Your physiological systems were in harmony.',
            color: '#10b981'  // Green
        };
    }
}

// Use in summary display
const interpretation = getCoherenceLevelDescription(stats.avgCoherence);
// Add to summaryHTML:
// <p style="color: ${interpretation.color}"><strong>${interpretation.level}</strong></p>
// <p>${interpretation.description}</p>
```

## Code References

### Primary Files Requiring Modification

- `/workspace/coherence/src/apps/coherence-app-polar.js` (672 lines)
  - Global state additions (after line 19)
  - SessionRecorder initialization (after line 173)
  - Callback modifications (lines 92-102, 122-128, 117-120, 105-115)
  - Recording control functions (new functions after line 513)
  - Breathing rate tracking (lines 646-670)
  - Keyboard handler updates (lines 636-644)

- `/workspace/coherence/src/ui/control-panel.js` (336 lines)
  - Recording controls addition (after line 192)
  - Recording indicator methods (new methods after line 335)

### New Files to Create

- `/workspace/coherence/src/core/session-recorder.js` (new file)
  - `SessionRecorder` class with all recording logic
  - Estimated: ~300 lines

- `/workspace/coherence/src/storage/session-storage.js` (new file, optional)
  - Storage abstraction layer (localStorage + IndexedDB)
  - Estimated: ~200 lines

### Related Integration Files

- `/workspace/coherence/src/integrations/polar-h10-client.js` (353 lines)
  - No modifications required
  - Existing callbacks already provide all necessary data

- `/workspace/hrv-monitor/src/websocket_server.py` (236 lines)
  - No modifications required
  - Server already broadcasts all needed message types

## Architecture Documentation

### Data Flow for Session Recording

```
[Polar H10] ──RR Intervals──> [hrv-monitor service]
                                        │
                                        ├── Coherence calculation (every 3s)
                                        ├── Buffer status tracking
                                        └── Connection monitoring
                                                │
                                                ▼
                                    [WebSocket ws://localhost:8765]
                                                │
                                    Message Types:
                                    ├── coherence_update
                                    ├── heartbeat
                                    ├── buffer_status
                                    └── connection_status
                                                │
                                                ▼
                            [PolarH10Client (polar-h10-client.js)]
                                                │
                                    Callbacks:
                                    ├── onCoherenceUpdate(data)
                                    ├── onHeartbeat(data)
                                    ├── onBufferStatus(status)
                                    └── onStatusUpdate(status)
                                                │
                                                ▼
                            [coherence-app-polar.js - Main App]
                                                │
                            ┌───────────────────┴───────────────────┐
                            ▼                                       ▼
                    [Visualization]                         [SessionRecorder]
                            │                                       │
                    ├── Update params                      ├── recordCoherence()
                    ├── Render boids                       ├── recordHeartbeat()
                    ├── Show coherence                     ├── recordBufferStatus()
                    └── Display breathing guide            └── recordStatus()
                                                                    │
                                                                    ▼
                                                        [In-Memory Buffers]
                                                                    │
                                            ┌───────────────────────┴───────────────────┐
                                            ▼                                           ▼
                                    [Auto-Save (30s)]                          [Manual Stop]
                                            │                                           │
                                            ▼                                           ▼
                                    [localStorage/IndexedDB]                    [Save + Summary]
                                                                                        │
                                                                                        ▼
                                                                            [Session Summary Display]
                                                                                        │
                                                                        ┌───────────────┴───────────────┐
                                                                        ▼                               ▼
                                                                [Export JSON]                   [Export CSV]
```

### Session Recording Lifecycle

```
User Action: Click "Record Session" toggle
    │
    ▼
startRecording()
    │
    ├── Validate Polar mode active
    ├── Gather metadata (name, tags, breathing rate)
    ├── sessionRecorder.startSession(metadata)
    │   ├── Generate session ID
    │   ├── Set start timestamp
    │   ├── Clear data buffers
    │   └── Set isRecording = true
    │
    ├── recordingActive = true
    └── Update UI (red indicator, elapsed time)
            │
            ▼
    [Recording Active - Data Capture Phase]
            │
    Events trigger callbacks:
    │
    ├── Coherence Update (every 3s)
    │   └── sessionRecorder.recordCoherence(data)
    │
    ├── Heartbeat (every ~1s)
    │   └── sessionRecorder.recordHeartbeat(data)
    │
    ├── Buffer Status (every 3s)
    │   └── sessionRecorder.recordBufferStatus(status)
    │
    ├── Connection Status (every 5s)
    │   └── sessionRecorder.recordStatus(status)
    │
    ├── Breathing Rate Change (on user input)
    │   └── sessionRecorder.recordBreathingRateChange()
    │
    └── Auto-Save (every 30s)
        └── saveSessionToLocalStorage (partial data)
            │
            ▼
User Action: Click "Record Session" toggle again (OFF)
    │
    ▼
stopRecording()
    │
    ├── sessionData = sessionRecorder.stopSession()
    │   ├── Set end timestamp
    │   ├── Calculate summary statistics
    │   ├── Compile all data arrays
    │   └── Set isRecording = false
    │
    ├── recordingActive = false
    ├── Update UI (hide indicator)
    │
    ├── await saveSession(sessionData)
    │   ├── Generate storage key
    │   ├── Save to localStorage/IndexedDB
    │   └── Update sessions index
    │
    └── showSessionSummary(sessionData)
        └── Display summary overlay with statistics
```

### Memory Management Strategy

```
[SessionRecorder Instance]
    │
    ├── coherenceUpdates: Array<Object>
    │   ├── Max size: 1200 entries (~1 hour)
    │   ├── Memory: ~120 KB
    │   └── Circular buffer: Remove oldest when limit reached
    │
    ├── heartbeats: Array<Object>
    │   ├── Max size: 10000 entries (~2.5 hours at 70 bpm)
    │   ├── Memory: ~500 KB
    │   └── Circular buffer: Remove oldest when limit reached
    │
    ├── bufferStatuses: Array<Object>
    │   ├── Max size: 1200 entries (~1 hour)
    │   ├── Memory: ~96 KB
    │   └── Circular buffer: Remove oldest when limit reached
    │
    └── statusUpdates: Array<Object>
        ├── Max size: 720 entries (~1 hour)
        ├── Memory: ~43 KB
        └── Circular buffer: Remove oldest when limit reached
            │
            ▼
Total Memory: ~759 KB (for 1 hour session)
            │
            ▼
[Periodic Flush Strategy]
    │
    └── Every 60 seconds:
        ├── Save buffers to IndexedDB (partial session)
        ├── Clear in-memory buffers
        └── Continue recording with fresh buffers
            │
            ▼
Result: Memory usage stays < 1 MB even for very long sessions
```

## Historical Context (from thoughts/)

### Related Research Documents

**Biometric Coherence Research:**
- `/workspace/thoughts/2025-10-25-biometric-coherence-research.md`
  - Comprehensive academic research on interpersonal physiological synchrony
  - HeartMath coherence methodology and scoring thresholds
  - Polar H10 sensor validation and accuracy (R² > 0.99 vs medical ECG)
  - Session design recommendations (3-5 min minimum, 10-15 min optimal)

**HeartMath Implementation:**
- `/workspace/thoughts/research/2025-10-28-heartmath-implementation-in-hrv-monitor-directory.md`
  - Complete technical documentation of hrv-monitor service
  - Coherence algorithm details (CR = Peak Power / (Total Power - Peak Power))
  - WebSocket API message formats
  - No built-in session recording in hrv-monitor (identified gap)

### Key Insights from Existing Research

**From Biometric Coherence Research:**

1. **Session Duration Recommendations** (lines 1016-1021):
   - Minimum: 3-5 minutes (enough time for synchrony to emerge)
   - Optimal: 10-15 minutes
   - Extended: Up to 30 minutes for deeper experience

2. **Breathing Guidance** (lines 982-997):
   - Coherent breathing: 5s in, 5s out (6 breaths/min = 0.1 Hz resonance)
   - Matches currentBreathingRate default of '6.0' in coherence-app-polar.js

3. **Data Storage for Art Installations** (lines 1030-1056):
   - Recommends minimal data retention
   - Anonymize if storing data
   - Comply with privacy laws

**From HeartMath Implementation Research:**

1. **No Existing Session Recording** (lines 1032-1087):
   - hrv-monitor service operates entirely in real-time
   - No persistent storage
   - No session management
   - **This research fills that gap for the visualization layer**

2. **Data Update Frequencies** (lines 596-607):
   - Coherence: Every 3 seconds
   - Heartbeat: Every heartbeat (~1 Hz)
   - Buffer status: Every 3 seconds
   - Connection status: Every 5 seconds

3. **Latency Analysis** (lines 598-607):
   - Window Duration: 60 seconds
   - Minimum Beats: 30 beats
   - Computation Time: 15-25 ms (FFT + calculations)
   - Total Latency: < 100 ms (from RR to broadcast)

## Related Research

### Within This Repository

- `thoughts/2025-10-25-biometric-coherence-research.md` - Academic research on HRV synchrony
- `thoughts/research/2025-10-28-heartmath-implementation-in-hrv-monitor-directory.md` - Backend service documentation

### Potential Future Research

- Session replay visualization (playing back recorded sessions)
- Multi-session trend analysis
- Session comparison tools
- Real-time breathing adherence tracking (compare actual breathing to guide)
- Advanced statistics (coherence trends, HRV time-domain metrics)
- Session sharing and export formats

## Open Questions

### Technical Implementation Questions

1. **Should we use localStorage or IndexedDB for session storage?**
   - localStorage: Simpler, 5-10MB limit, synchronous API
   - IndexedDB: More complex, larger storage, async API, better performance
   - **Recommendation:** Start with localStorage for MVP, migrate to IndexedDB if needed

2. **Should we implement periodic flush to storage during long sessions?**
   - Pros: Prevents memory growth, better crash recovery
   - Cons: More complex implementation, async operations
   - **Recommendation:** Implement auto-save every 30s for crash recovery, but keep data in memory

3. **How granular should breathing rate change tracking be?**
   - Current: Track every change with timestamp
   - Alternative: Just store initial and final rates
   - **Recommendation:** Track all changes (valuable for analysis)

4. **Should heartbeat data be downsampled for storage?**
   - Full resolution: ~4200 heartbeats/hour = ~210 KB
   - Downsampled: Every 10th heartbeat = ~21 KB
   - **Recommendation:** Store full resolution (modern browsers handle it easily)

### User Experience Questions

5. **Should recording start automatically when Polar H10 connects?**
   - Pros: Captures entire session, no user action needed
   - Cons: May record calibration/setup time, less control
   - **Recommendation:** Manual start/stop for user control

6. **Should we prompt for session name before or after recording?**
   - Before: User provides meaningful name upfront
   - After: Auto-generate name, user can rename later
   - **Recommendation:** Auto-generate name, allow editing after

7. **How should we handle very long sessions (> 3 hours)?**
   - Option A: Circular buffer (lose oldest data)
   - Option B: Periodic flush and merge
   - Option C: Warn user and suggest stopping
   - **Recommendation:** Warn at 2 hours, suggest stopping/saving

8. **Should we show a "Sessions History" view?**
   - Pros: User can review past sessions, compare progress
   - Cons: Requires additional UI, more complex
   - **Recommendation:** Add as future enhancement (V2)

### Data Analysis Questions

9. **What summary statistics are most valuable?**
   - Current: avg/min/max coherence, avg HR, total heartbeats
   - Additional: SDNN, RMSSD, time in high coherence, breathing adherence
   - **Recommendation:** Start with current set, add time-domain HRV metrics in V2

10. **Should we calculate breathing adherence (how well user followed guide)?**
    - Requires: Compare heartbeat timing to breathing cycle
    - Complex: Need to detect breathing from HRV data
    - **Recommendation:** Future enhancement (requires RSA analysis)

## Conclusion

Session recording can be seamlessly integrated into the existing coherence visualization with minimal performance impact. The implementation leverages existing `PolarH10Client` callbacks for data capture, avoiding any modification to the main draw loop. Key components include:

1. **UI Controls**: Add recording toggle, indicator, and elapsed time display to the existing `ControlPanel`
2. **SessionRecorder Class**: New class to buffer data and manage session lifecycle
3. **Storage Layer**: Browser-based persistence using localStorage (simple) or IndexedDB (robust)
4. **Breathing Guide Tracking**: Capture breathing rate and changes during session
5. **Performance Safety**: All data capture in callbacks, not draw loop; efficient buffering strategies

The architecture maintains the visualization's 60fps target while capturing comprehensive HRV data including coherence scores, heartbeats, buffer status, connection events, and breathing guide state. Sessions can be saved, exported (JSON/CSV), and include summary statistics for immediate feedback.

**Recommended Implementation Approach:**

**Phase 1 (MVP):**
- Add recording toggle to ControlPanel
- Implement SessionRecorder class with in-memory buffering
- localStorage-based persistence
- Basic session summary display
- Breathing guide state tracking

**Phase 2 (Enhanced):**
- Auto-save mechanism (every 30s)
- Crash recovery on startup
- Session export (JSON/CSV)
- Enhanced summary with coherence interpretation

**Phase 3 (Advanced):**
- IndexedDB migration for large sessions
- Sessions history view
- Session replay visualization
- Multi-session trend analysis

The implementation is ready for immediate development with all technical specifications, code examples, and integration points documented above.
