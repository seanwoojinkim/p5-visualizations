# Phase 3: Progress Dashboard - Testing Instructions

## Overview
Phase 3 implements the Progress Dashboard with trend charts, statistics, and personal bests tracking.

## Files Created
1. `/workspace/coherence/lib/chart.min.js` - Chart.js library (201KB)
2. `/workspace/coherence/src/utils/trend-analysis.js` - Trend analysis utilities
3. `/workspace/coherence/src/ui/progress-dashboard.js` - Dashboard UI component

## Files Modified
1. `/workspace/coherence/src/session/hrv-database.js` - Added aggregate methods:
   - `getDailyAverages(days)` - Group sessions by day and calculate averages
   - `getAggregateStats(days)` - Calculate aggregate statistics
   - `getPersonalBests()` - Find all-time records
2. `/workspace/coherence/src/apps/coherence-app-polar.js` - Integrated dashboard:
   - Imported ProgressDashboard
   - Added D key shortcut for dashboard toggle
   - Removed old D key (debug) conflict
   - Dashboard refreshes after session stops
3. `/workspace/coherence/index-polar.html` - Updated UI:
   - Added Chart.js library script tag
   - Updated keyboard shortcuts documentation

## Testing Steps

### 1. Generate Test Data
Open the coherence visualization in browser:
```bash
# In browser console:
await generateTestSessions(30);
```

This will create 30 sessions spread over the last 30 days with varying coherence scores and durations.

### 2. Open Progress Dashboard
Press **D** key to open the dashboard.

### 3. Verify Stats Cards (Top Section)

Should see 6 cards with:
1. **Sessions**: Total count (e.g., "30")
2. **Avg Length**: Average duration (e.g., "7m 32s")
3. **Avg Score**: Average coherence (e.g., "61/100")
4. **Current Streak**: Days with sessions (e.g., "14")
5. **Best Score**: Highest coherence ever (e.g., "87/100")
6. **Longest**: Longest session duration (e.g., "14m 23s")

**Verification**:
- All 6 cards display
- Numbers are formatted correctly
- Colors are distinct for each card
- Current streak shows a number (may be 0 if no consecutive days)

### 4. Verify Trend Chart

Should see a chart with:
- **X-axis**: Dates (formatted as "M/D")
- **Y-axis**: Coherence score (0-100)
- **Two lines**:
  - Light blue dots: Daily mean coherence
  - Dark blue line: 7-day moving average (smooth line)
- **Legend**: At bottom showing "Daily Mean" and "7-Day MA"

**Verification**:
- Chart renders without errors
- Both lines are visible
- 7-day MA is null for first 6 days (line starts on day 7)
- Hover over data points shows tooltips with exact values
- Chart is responsive (resize window to test)

### 5. Verify Week-over-Week Comparison

Below chart, should see:
```
Week-over-Week:
This week: 61.2  Last week: 57.8  (+5.9%)
```

**Verification**:
- Shows two averages
- Percentage change is calculated correctly
- Positive changes show in green
- Negative changes show in red

### 6. Verify Personal Bests Section

Should show 3 records:
1. **Max Coherence**: Highest score with date (e.g., "87/100 (Oct 15, 2025)")
2. **Longest Session**: Duration with date (e.g., "28 min (Oct 22, 2025)")
3. **Longest Streak**: Days with date range (e.g., "21 days (Sep 15 - Oct 5, 2025)")

**Verification**:
- All 3 bests display
- Dates are formatted correctly
- Values match the test data

### 7. Test Dashboard Interactions

- **Close**: Click X button or press D again → dashboard closes
- **Reopen**: Press D again → dashboard reopens with same data
- **Scroll**: If needed, scroll inside dashboard → scrolling works

### 8. Test with Real Session Recording

1. Press **P** to enable Polar H10 mode (if available) or use simulation mode
2. Press **X** to start recording
3. Wait 2-3 minutes
4. Press **X** to stop recording
5. Press **D** to open dashboard
6. Verify new session is included in stats

**Verification**:
- Dashboard updates with new session
- Current streak may increment (if consecutive day)
- Chart updates with new data point
- Personal bests update if new records achieved

### 9. Test Edge Cases

#### Empty Database
```javascript
// In console:
await clearAllTestData();
```
- Open dashboard (D)
- Should show "No data available yet" message in chart area
- Stats cards should show zeros or appropriate empty states

#### Single Session
```javascript
// In console:
await generateTestSessions(1);
```
- Open dashboard
- Should handle gracefully (no 7-day MA since < 7 days)
- Stats should be calculated correctly

#### Large Dataset
```javascript
// In console:
await generateTestSessions(90);
```
- Open dashboard
- Should show last 30 days only
- Chart should be readable (not too crowded)
- Performance should be acceptable (< 500ms to render)

### 10. Test Integration with Session History

1. Record a session
2. Press **H** to open session history
3. Verify session appears
4. Press **D** to open progress dashboard
5. Verify both can be opened independently
6. Close one, verify other remains functional

## Expected Results

### Stats Calculations

**Daily Averages**:
- Sessions grouped by day (midnight to midnight)
- Multiple sessions per day averaged correctly
- Last 30 days returned

**7-Day Moving Average**:
- First 6 days: null (not enough data)
- Day 7+: Average of current day + 6 previous days
- Smooth trend line visible

**Current Streak**:
- Counts consecutive days with ≥1 session
- Starts from today, goes backwards
- Breaks when finds day with 0 sessions

**Week-over-Week**:
- Compares last 7 days vs previous 7 days
- Shows percentage change
- Color-coded (green=positive, red=negative)

**Personal Bests**:
- Max coherence: Highest `maxCoherence` field
- Longest session: Highest `durationSeconds` field
- Longest streak: Most consecutive days ever

### Chart Rendering

**Chart.js Configuration**:
- Type: line
- Responsive: true
- Y-axis: 0-100 (coherence range)
- X-axis: Dates from dailyAverages
- Two datasets: daily mean + 7-day MA
- Tooltips: Show on hover
- Legend: Bottom position

## Known Issues / Limitations

1. **7-Day MA**: Requires at least 7 days of data to display
2. **Chart.js Global**: Loaded via script tag, not ES6 import
3. **Timezone**: Uses local timezone for date grouping
4. **Performance**: Calculates stats on every open (could be cached)

## Debugging

### Console Logs
Check browser console for:
```
[ProgressDashboard] Opening dashboard...
[ProgressDashboard] Chart rendered with X data points
[ProgressDashboard] Dashboard rendered successfully
```

### Common Errors

**"Chart is not defined"**:
- Solution: Ensure `<script src="lib/chart.min.js"></script>` in HTML
- Check Chart.js loaded in Network tab

**Empty Chart**:
- Check: `await db.getDailyAverages(30)` returns data
- Verify: Test sessions were created successfully

**Wrong Stats**:
- Verify: Sessions have `endTime !== null` (completed)
- Check: Timezone issues (dates should match local time)

## Performance Benchmarks

Target performance (measured in browser):
- Open dashboard: < 300ms
- Render chart: < 200ms
- Calculate stats: < 100ms
- Total time to interactive: < 500ms

Test with 30 sessions, 60 samples each (~1800 total samples).

## Next Steps

After Phase 3 is verified:
1. Consider adding more chart types (bar chart for zones)
2. Add date range selector (7, 30, 90 days)
3. Export dashboard as PNG/PDF
4. Add goal tracking and comparisons
5. Implement Phase 4: Context & tags
6. Implement Phase 5: Gamification & achievements

## Success Criteria

- [ ] Dashboard opens/closes with D key
- [ ] All 6 stat cards display correct values
- [ ] Trend chart renders with 2 lines (daily + MA)
- [ ] Chart tooltips work on hover
- [ ] Week-over-week comparison calculates correctly
- [ ] Personal bests show all-time records
- [ ] Dashboard updates after new session recorded
- [ ] No console errors
- [ ] Performance acceptable (< 500ms)
- [ ] Works with 0, 1, and 30+ sessions

---

**Implementation Complete!**

Phase 3 adds comprehensive progress tracking to the HRV coherence visualization.
