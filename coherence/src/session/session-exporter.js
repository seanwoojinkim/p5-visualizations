/**
 * SessionExporter - Export session data to JSON and CSV formats
 * Provides GDPR-compliant data export functionality
 */

/**
 * Export a single session to JSON format
 * @param {Object} session - Session object with all fields
 * @param {Object[]} samples - Array of sample objects
 */
export function exportSessionJSON(session, samples) {
    const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        session: {
            ...session,
            samples: samples.map(s => ({
                timestamp: s.timestamp,
                coherence: s.coherence,
                ratio: s.ratio,
                peakFrequency: s.peakFrequency,
                heartRate: s.heartRate,
                level: s.level
            }))
        }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `session_${formatDateForFilename(session.startTime)}.json`;

    downloadFile(jsonString, filename, 'application/json');

    console.log(`[SessionExporter] Exported session ${session.sessionId} to ${filename}`);
}

/**
 * Export all sessions to CSV format
 * @param {Object[]} sessions - Array of session objects
 */
export function exportAllSessionsCSV(sessions) {
    // CSV headers
    const headers = [
        'date',
        'time',
        'duration_min',
        'mean_coherence',
        'median_coherence',
        'max_coherence',
        'min_coherence',
        'std_coherence',
        'time_in_low_sec',
        'time_in_low_pct',
        'time_in_medium_sec',
        'time_in_medium_pct',
        'time_in_high_sec',
        'time_in_high_pct',
        'achievement_score',
        'mean_hr',
        'samples_collected'
    ];

    // Build CSV rows
    const rows = sessions.map(session => {
        const startDate = new Date(session.startTime);
        const date = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = startDate.toTimeString().split(' ')[0]; // HH:MM:SS
        const durationMin = (session.durationSeconds / 60).toFixed(2);

        return [
            date,
            time,
            durationMin,
            session.meanCoherence.toFixed(2),
            session.medianCoherence.toFixed(2),
            session.maxCoherence.toFixed(2),
            session.minCoherence.toFixed(2),
            session.stdCoherence.toFixed(2),
            session.timeInZones.low.seconds,
            session.timeInZones.low.percentage.toFixed(2),
            session.timeInZones.medium.seconds,
            session.timeInZones.medium.percentage.toFixed(2),
            session.timeInZones.high.seconds,
            session.timeInZones.high.percentage.toFixed(2),
            session.achievementScore,
            session.meanHeartRate.toFixed(2),
            session.samplesCollected
        ];
    });

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `coherence_sessions_${formatDateForFilename(Date.now())}.csv`;
    downloadFile(csvContent, filename, 'text/csv');

    console.log(`[SessionExporter] Exported ${sessions.length} sessions to ${filename}`);
}

/**
 * Export all sessions with samples to JSON format
 * @param {Object[]} sessions - Array of session objects
 * @param {Function} getSamplesFunc - Function to retrieve samples for a session
 */
export async function exportAllSessionsJSON(sessions, getSamplesFunc) {
    const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        totalSessions: sessions.length,
        sessions: []
    };

    // Load samples for each session
    for (const session of sessions) {
        const samples = await getSamplesFunc(session.sessionId);
        exportData.sessions.push({
            ...session,
            samples: samples.map(s => ({
                timestamp: s.timestamp,
                coherence: s.coherence,
                ratio: s.ratio,
                peakFrequency: s.peakFrequency,
                heartRate: s.heartRate,
                level: s.level
            }))
        });
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `coherence_all_sessions_${formatDateForFilename(Date.now())}.json`;

    downloadFile(jsonString, filename, 'application/json');

    console.log(`[SessionExporter] Exported ${sessions.length} sessions with samples to ${filename}`);
}

/**
 * Download a file to the user's computer
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    // Create a Blob with the content
    const blob = new Blob([content], { type: mimeType });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format a timestamp for use in filenames
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted string (YYYY-MM-DD_HH-MM-SS)
 */
function formatDateForFilename(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
