# Quick Start: Session Tracking

## Testing the Implementation

An HTTP server is currently running on port 8080.

### Option 1: Test in Full App (with Polar H10)

**URL**: http://localhost:8080/index-polar.html

**Steps**:
1. Open the URL in your browser
2. Click "Start Visualization" to close the instructions overlay
3. Press **P** to enable Polar H10 mode
4. Press **X** to start recording (or click "Start Session" button)
5. You'll see a pulsing red dot labeled "REC" in the top-right corner
6. Wait 2+ minutes (or collect some coherence data)
7. Press **X** again to stop recording
8. A modal will appear showing your session summary

**Verify Data Saved**:
1. Open browser DevTools (F12)
2. Go to Application → Storage → IndexedDB → hrv-coherence
3. Expand "sessions" and "coherence_samples" to see your data

### Option 2: Standalone Testing (No Polar H10 Required)

**URL**: http://localhost:8080/test-session-tracking.html

**Steps**:
1. Open the URL in your browser
2. Click buttons to test individual components:
   - **Test Database** - Tests IndexedDB operations
   - **Test Statistics** - Tests statistical calculations
   - **Test Session Recorder** - Tests recording lifecycle
   - **Test Full Workflow** - Complete end-to-end test
   - **Clear Database** - Remove all sessions

Results appear in the output box with green (success) or red (error) indicators.

## Keyboard Shortcuts (Full App)

| Key | Action |
|-----|--------|
| **P** | Toggle Polar H10 mode |
| **X** | Start/Stop session recording |
| **S** | Toggle simulation mode |
| **B** | Toggle breathing guide |
| **↑/↓** | Adjust breathing rate |
| **C** | Toggle control panel |
| **Space** | Pause/unpause |
| **R** | Reset simulation |
| **←/→** | Adjust coherence (manual mode) |

## What You Should See

### Recording Indicator
When recording is active:
- Top-right corner: Pulsing red dot
- Text: "REC"
- Elapsed time (e.g., "5m 42s")

### Session Summary Modal
After stopping a recording:
- Duration (e.g., "15m 24s")
- Mean Coherence (e.g., "62.3/100")
- Max Coherence (e.g., "87/100")
- Time in High Zone (e.g., "8m (53%)")
- Achievement Score (e.g., "1,245")
- Samples collected count

## IndexedDB Inspection

To manually inspect saved sessions:

1. Open DevTools (F12)
2. Go to: Application → Storage → IndexedDB → hrv-coherence
3. Click on "sessions" to see session records
4. Click on "coherence_samples" to see sample data

Each session has:
- Unique sessionId (UUID)
- Start/end timestamps
- Calculated statistics
- Time in coherence zones
- Achievement score

## Troubleshooting

**"Session recorder not initialized"**
- Wait a few seconds after page load for initialization
- Check console for errors

**"Please enable Polar H10 mode"**
- Press P before pressing X
- Session recording only works in Polar H10 mode

**"Failed to start recording"**
- Check browser console for detailed error
- Ensure IndexedDB is enabled in browser settings

**No data in IndexedDB**
- Make sure you stopped the recording (press X again)
- Recording must run for at least a few seconds

## Next Steps

This is **Phase 1** - basic session recording. Future phases will add:
- **Phase 2**: Session history UI, export to JSON/CSV, delete sessions
- **Phase 3**: Progress dashboard, 7-day moving average, trends
- **Phase 4**: Session tags/notes, context tracking

## Server Management

To restart the server:
```bash
cd /workspace/coherence
python3 -m http.server 8080
```

To stop the server:
```bash
pkill -f "http.server 8080"
```
