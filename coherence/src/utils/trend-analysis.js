/**
 * Trend Analysis Utilities
 * Provides functions for analyzing trends, streaks, and comparisons in session data
 */

/**
 * Calculate 7-day moving average from daily averages
 * @param {Object[]} dailyAverages - Array of {date, avgCoherence, count, totalDuration}
 * @returns {Object[]} Array with {date, ma7} where ma7 is null for first 6 days
 */
export function calculate7DayMA(dailyAverages) {
    const result = [];

    for (let i = 0; i < dailyAverages.length; i++) {
        if (i < 6) {
            // Not enough data for 7-day window
            result.push({
                date: dailyAverages[i].date,
                ma7: null
            });
            continue;
        }

        // Get window of 7 days (current day + 6 previous days)
        const window = dailyAverages.slice(i - 6, i + 1);
        const sum = window.reduce((acc, val) => acc + val.avgCoherence, 0);
        const ma7 = sum / window.length;

        result.push({
            date: dailyAverages[i].date,
            ma7: ma7
        });
    }

    return result;
}

/**
 * Calculate 30-day moving average from daily averages
 * @param {Object[]} dailyAverages - Array of {date, avgCoherence, count, totalDuration}
 * @returns {Object[]} Array with {date, ma30} where ma30 is null for first 29 days
 */
export function calculate30DayMA(dailyAverages) {
    const result = [];

    for (let i = 0; i < dailyAverages.length; i++) {
        if (i < 29) {
            // Not enough data for 30-day window
            result.push({
                date: dailyAverages[i].date,
                ma30: null
            });
            continue;
        }

        // Get window of 30 days
        const window = dailyAverages.slice(i - 29, i + 1);
        const sum = window.reduce((acc, val) => acc + val.avgCoherence, 0);
        const ma30 = sum / window.length;

        result.push({
            date: dailyAverages[i].date,
            ma30: ma30
        });
    }

    return result;
}

/**
 * Calculate current streak (consecutive days with at least 1 session)
 * @param {Object[]} sessions - Array of session objects (sorted newest first)
 * @returns {number} Current streak in days
 */
export function calculateCurrentStreak(sessions) {
    if (!sessions || sessions.length === 0) {
        return 0;
    }

    // Filter to completed sessions only
    const completedSessions = sessions.filter(s => s.endTime !== null);
    if (completedSessions.length === 0) {
        return 0;
    }

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);

    // Check each day going backwards from today
    while (true) {
        const dayStart = checkDate.getTime();
        const dayEnd = dayStart + 86400000; // 24 hours in ms

        // Check if there's at least one session on this day
        const hasSession = completedSessions.some(s =>
            s.startTime >= dayStart && s.startTime < dayEnd
        );

        if (!hasSession) {
            break; // Streak broken
        }

        streak++;
        checkDate.setDate(checkDate.getDate() - 1);

        // Safety limit to prevent infinite loops
        if (streak > 365) {
            console.warn('[TrendAnalysis] Streak calculation exceeded 365 days, stopping');
            break;
        }
    }

    return streak;
}

/**
 * Calculate longest streak ever achieved
 * @param {Object[]} sessions - Array of session objects
 * @returns {Object} {days, startDate, endDate}
 */
export function calculateLongestStreak(sessions) {
    if (!sessions || sessions.length === 0) {
        return { days: 0, startDate: null, endDate: null };
    }

    // Filter to completed sessions and get unique days
    const completedSessions = sessions
        .filter(s => s.endTime !== null)
        .sort((a, b) => a.startTime - b.startTime);

    if (completedSessions.length === 0) {
        return { days: 0, startDate: null, endDate: null };
    }

    // Get unique days with sessions
    const daysWithSessions = new Set();
    for (const session of completedSessions) {
        const date = new Date(session.startTime);
        date.setHours(0, 0, 0, 0);
        daysWithSessions.add(date.getTime());
    }

    // Convert to sorted array
    const sortedDays = Array.from(daysWithSessions).sort((a, b) => a - b);

    // Find longest streak
    let longestStreak = 0;
    let longestStreakStart = null;
    let longestStreakEnd = null;

    let currentStreak = 1;
    let currentStreakStart = sortedDays[0];

    for (let i = 1; i < sortedDays.length; i++) {
        const prevDay = sortedDays[i - 1];
        const currentDay = sortedDays[i];
        const daysDiff = (currentDay - prevDay) / 86400000;

        if (daysDiff === 1) {
            // Consecutive day
            currentStreak++;
        } else {
            // Streak broken, check if it was the longest
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
                longestStreakStart = currentStreakStart;
                longestStreakEnd = sortedDays[i - 1];
            }

            // Start new streak
            currentStreak = 1;
            currentStreakStart = currentDay;
        }
    }

    // Check final streak
    if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = currentStreakStart;
        longestStreakEnd = sortedDays[sortedDays.length - 1];
    }

    return {
        days: longestStreak,
        startDate: longestStreakStart,
        endDate: longestStreakEnd
    };
}

/**
 * Calculate week-over-week comparison
 * @param {Object[]} dailyAverages - Array of {date, avgCoherence, count, totalDuration}
 * @returns {Object} {thisWeek, lastWeek, change, changePercent}
 */
export function calculateWeekOverWeek(dailyAverages) {
    if (!dailyAverages || dailyAverages.length < 7) {
        return {
            thisWeek: 0,
            lastWeek: 0,
            change: 0,
            changePercent: 0
        };
    }

    // Sort by date (oldest to newest)
    const sorted = [...dailyAverages].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get last 14 days (if available)
    const last14Days = sorted.slice(-14);

    if (last14Days.length < 7) {
        // Not enough data
        return {
            thisWeek: 0,
            lastWeek: 0,
            change: 0,
            changePercent: 0
        };
    }

    // Split into this week and last week
    const thisWeekData = last14Days.slice(-7);
    const lastWeekData = last14Days.slice(0, Math.min(7, last14Days.length - 7));

    // Calculate averages
    const thisWeekAvg = thisWeekData.reduce((sum, d) => sum + d.avgCoherence, 0) / thisWeekData.length;
    const lastWeekAvg = lastWeekData.length > 0
        ? lastWeekData.reduce((sum, d) => sum + d.avgCoherence, 0) / lastWeekData.length
        : 0;

    // Calculate change
    const change = thisWeekAvg - lastWeekAvg;
    const changePercent = lastWeekAvg > 0 ? (change / lastWeekAvg) * 100 : 0;

    return {
        thisWeek: thisWeekAvg,
        lastWeek: lastWeekAvg,
        change: change,
        changePercent: changePercent
    };
}

/**
 * Format date for display (e.g., "Oct 15" or "Oct 15, 2025")
 * @param {number|Date} timestamp - Timestamp or Date object
 * @param {boolean} includeYear - Whether to include year
 * @returns {string} Formatted date
 */
export function formatDate(timestamp, includeYear = false) {
    const date = new Date(timestamp);
    const options = { month: 'short', day: 'numeric' };
    if (includeYear) {
        options.year = 'numeric';
    }
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date for chart axis (e.g., "10/15")
 * @param {number|Date} timestamp - Timestamp or Date object
 * @returns {string} Formatted date
 */
export function formatDateForChart(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

/**
 * Calculate date range label (e.g., "Sep 15 - Oct 15, 2025")
 * @param {number} startTimestamp - Start timestamp
 * @param {number} endTimestamp - End timestamp
 * @returns {string} Formatted date range
 */
export function formatDateRange(startTimestamp, endTimestamp) {
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);

    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

    if (sameMonth) {
        return `${formatDate(startTimestamp)} - ${formatDate(endTimestamp, true)}`;
    } else if (sameYear) {
        return `${formatDate(startTimestamp)} - ${formatDate(endTimestamp, true)}`;
    } else {
        return `${formatDate(startTimestamp, true)} - ${formatDate(endTimestamp, true)}`;
    }
}
