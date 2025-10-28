# Phase 2 Testing Guide

## Quick Start Testing

### 1. Start the Application

```bash
cd /workspace/coherence
python3 -m http.server 8080
```

Open browser: `http://localhost:8080/index-polar.html`

---

### 2. Generate Test Data

Open browser console (F12) and run:

```javascript
// Generate 10 test sessions
await generateTestSessions(10);
```

This creates 10 sessions with synthetic data spread over the past 30 days.

---

### 3. Open Session History

**Method 1**: Press `H` key

**Method 2**: Click "View History" button in control panel (press `C` to open control panel if minimized)

You should see a panel slide in from the right showing your sessions.

---

### 4. Verify Session List Display

Check that each session shows:
- ✅ Color indicator (🟢 Green, 🟡 Yellow, or 🔴 Red)
- ✅ Relative date ("Today", "Yesterday", or absolute date)
- ✅ Duration (e.g., "5m 42s")
- ✅ Mean coherence score
- ✅ Max coherence score
- ✅ Time in high zone percentage
- ✅ "View Details" button

---

### 5. Test Session Detail View

1. Click "View Details" on any session
2. Verify modal opens with:
   - ✅ Chart showing coherence over time
   - ✅ Date and time of session
   - ✅ Duration
   - ✅ Statistics (Mean, Median, Max, Min, Std Dev, Achievement Score)
   - ✅ Time in zones (stacked bar)
   - ✅ HRV metrics (Mean HR, Samples)
3. Check that chart shows:
   - ✅ Data line connecting points
   - ✅ Background zones (red/yellow/green)
   - ✅ X-axis labels (time)
   - ✅ Y-axis labels (coherence 0-100)

---

### 6. Test Single Session Export

1. In session detail modal, click "Export" button
2. Verify JSON file downloads
3. Open the file and verify structure:

```json
{
  "version": "1.0",
  "exportedAt": 1730139900000,
  "session": {
    "sessionId": "...",
    "startTime": 1730139000000,
    "meanCoherence": 62.3,
    "samples": [
      {
        "timestamp": 1730139015000,
        "coherence": 67,
        "ratio": 4.2,
        "peakFrequency": 0.098,
        "heartRate": 68.5,
        "level": 0.34
      }
      // ... more samples
    ]
  }
}
```

---

### 7. Test CSV Export

1. Click "Export ▼" dropdown in history panel header
2. Select "Export All to CSV"
3. Verify CSV file downloads
4. Open in Excel/Numbers/Google Sheets
5. Verify columns:
   - date
   - time
   - duration_min
   - mean_coherence
   - median_coherence
   - max_coherence
   - min_coherence
   - std_coherence
   - time_in_low_sec
   - time_in_low_pct
   - time_in_medium_sec
   - time_in_medium_pct
   - time_in_high_sec
   - time_in_high_pct
   - achievement_score
   - mean_hr
   - samples_collected

---

### 8. Test JSON Export (All Sessions)

1. Click "Export ▼" → "Export All to JSON"
2. Verify JSON file downloads
3. Open and verify it contains:
   - `version` field
   - `exportedAt` timestamp
   - `totalSessions` count
   - `sessions` array with all sessions and samples

---

### 9. Test Session Deletion

1. Open a session detail
2. Click "Delete" button
3. Verify confirmation dialog appears
4. Click "OK" to confirm
5. Verify:
   - ✅ Modal closes
   - ✅ Session removed from history list
6. Refresh page and verify session still deleted (persistence)

---

### 10. Test Delete All Sessions

1. Click "Export ▼" → "Delete All Sessions"
2. Verify prompt appears asking to type "DELETE"
3. First try: Type something else (e.g., "delete") and click OK
   - ✅ Should cancel and keep sessions
4. Second try: Type "DELETE" exactly and click OK
   - ✅ All sessions should be deleted
   - ✅ History panel shows empty state
5. Refresh page and verify all sessions still deleted

---

### 11. Test Pagination

Generate more sessions:

```javascript
// Generate 60 sessions to test pagination
await generateTestSessions(60);
```

1. Open history panel
2. Verify only first 50 sessions shown
3. Verify "Load More (10 remaining)" button appears
4. Click "Load More"
5. Verify next 10 sessions load
6. Verify button disappears (no more to load)

---

### 12. Test Personal Best Badge

1. Generate sessions with varying coherence:
   ```javascript
   await generateTestSessions(5);
   ```
2. Open history panel
3. Find the session with highest mean coherence
4. Verify it has the ⭐ "New personal best!" badge

---

### 13. Test Empty State

1. Delete all sessions:
   ```javascript
   await clearAllTestData();
   ```
2. Open history panel
3. Verify empty state displays:
   - ✅ 📊 icon
   - ✅ "No sessions recorded yet" message
   - ✅ Helpful hint about starting a session

---

### 14. Test Keyboard Shortcuts

- `H` - Toggle history panel open/closed
- `X` - Start/stop session recording (requires Polar H10 mode)
- `C` - Toggle control panel

---

### 15. Test Integration with Session Recording

**Note**: This requires Polar H10 hardware or can be tested with manual session creation.

1. Enable Polar H10 mode (press `P`)
2. Start session recording (press `X` or click "Start Session")
3. Wait a few seconds
4. Stop recording (press `X` or click "Stop Session")
5. Verify session summary modal appears
6. If history panel is open, verify it refreshes automatically
7. Open history panel if closed
8. Verify new session appears at top of list

---

## Expected Behaviors

### Color Indicators
- 🟢 **Green**: Mean coherence ≥ 60 (High)
- 🟡 **Yellow**: Mean coherence 40-60 (Medium)
- 🔴 **Red**: Mean coherence < 40 (Low)

### Date Formatting
- Sessions from today: "Today, 2:35 PM"
- Sessions from yesterday: "Yesterday, 9:15 AM"
- Older sessions: "Oct 26, 8:45 PM"

### Chart Display
- Background zones:
  - Red (0-40): Low coherence
  - Yellow (40-60): Medium coherence
  - Green (60-100): High coherence
- Blue line with data points
- Grid lines at 25-point intervals
- Time axis shows elapsed time in minutes:seconds

---

## Common Issues & Solutions

### Issue: History panel doesn't open
- **Check**: Press `H` key or click "View History" button
- **Check**: Browser console for errors (F12)
- **Solution**: Verify all files imported correctly

### Issue: No sessions displayed
- **Check**: Generate test data first
- **Solution**: Run `await generateTestSessions(10)` in console

### Issue: Chart not rendering
- **Check**: Browser console for errors
- **Check**: Verify samples exist for session
- **Solution**: Try viewing a different session

### Issue: Export doesn't download
- **Check**: Browser popup blocker
- **Check**: Browser console for errors
- **Solution**: Allow downloads from localhost

### Issue: Delete confirmation doesn't work
- **Check**: Type "DELETE" exactly (uppercase)
- **Solution**: Case-sensitive, must match exactly

---

## Performance Benchmarks

Expected performance on modern hardware:

- **Load 50 sessions**: < 50ms
- **Render session list**: < 100ms
- **Open session detail**: < 200ms
- **Render chart**: < 100ms
- **Export CSV (50 sessions)**: < 500ms
- **Export JSON (50 sessions)**: < 1000ms
- **Delete session**: < 100ms

If experiencing slowness, check:
1. Number of sessions (>1000 may slow pagination)
2. Number of samples per session (>1000 may slow chart)
3. Browser memory usage

---

## Database Inspection (Advanced)

Check IndexedDB directly:

1. Open DevTools (F12)
2. Go to Application tab
3. Expand IndexedDB → hrv-coherence
4. View "sessions" and "coherence_samples" stores
5. Verify data structure matches schema

---

## Cleanup After Testing

```javascript
// Clear all test data
await clearAllTestData();

// Or delete database entirely
indexedDB.deleteDatabase('hrv-coherence');
```

Then refresh the page to reinitialize.

---

## Next Steps After Testing

1. ✅ Verify all Phase 2 features work
2. ✅ Test with real Polar H10 data
3. 📋 Document any bugs found
4. 📋 Note UX improvements for future
5. 🚀 Ready for Phase 3 (Statistics & Trends)
