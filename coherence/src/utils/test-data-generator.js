/**
 * Test Data Generator
 * Generates synthetic session data for testing Phase 2 functionality
 */

import { HRVDatabase } from '../session/hrv-database.js';

/**
 * Generate test sessions with synthetic data
 * @param {number} count - Number of sessions to generate
 * @returns {Promise<void>}
 */
export async function generateTestSessions(count = 10) {
    console.log(`[TestDataGenerator] Generating ${count} test sessions...`);

    const db = new HRVDatabase();
    await db.init();

    const now = Date.now();

    for (let i = 0; i < count; i++) {
        // Create sessions spread over the past 30 days
        const daysAgo = Math.floor((count - i) * (30 / count));
        const startTime = now - (daysAgo * 86400000) + (Math.random() * 43200000); // Random time within day

        console.log(`[TestDataGenerator] Creating session ${i + 1}/${count} (${daysAgo} days ago)...`);

        // Create session
        const sessionId = await db.createSession();

        // Update start time to be in the past
        const session = await db.getSession(sessionId);
        session.startTime = startTime;
        await updateSessionDirectly(db, session);

        // Generate samples (3-15 minutes of data)
        const durationMinutes = 3 + Math.random() * 12;
        const sampleCount = Math.floor(durationMinutes * 20); // 20 samples per minute at 3s intervals

        // Create coherence pattern (varies by session quality)
        const sessionQuality = Math.random(); // 0-1
        let baseCoherence;
        if (sessionQuality < 0.3) {
            baseCoherence = 30 + Math.random() * 20; // Low: 30-50
        } else if (sessionQuality < 0.7) {
            baseCoherence = 50 + Math.random() * 20; // Medium: 50-70
        } else {
            baseCoherence = 65 + Math.random() * 25; // High: 65-90
        }

        const samples = [];
        for (let j = 0; j < sampleCount; j++) {
            const progress = j / sampleCount;

            // Add some variation and trending
            const trend = Math.sin(progress * Math.PI * 2) * 10; // Wave pattern
            const noise = (Math.random() - 0.5) * 15; // Random noise
            let coherence = baseCoherence + trend + noise;

            // Clamp to valid range
            coherence = Math.max(10, Math.min(95, coherence));

            // Generate corresponding ratio (coherence correlates with ratio)
            const ratio = (coherence / 100) * 8 + (Math.random() - 0.5) * 2; // 0-10 range

            // Generate heart rate (60-80 bpm with variation)
            const heartRate = 70 + (Math.random() - 0.5) * 20;

            // Peak frequency (around resonant frequency 0.1 Hz)
            const peakFrequency = 0.08 + Math.random() * 0.04;

            // Level (normalized coherence -1 to 1)
            const level = (coherence - 50) / 50;

            samples.push({
                timestamp: startTime + (j * 3000), // 3 seconds per sample
                coherence: Math.round(coherence),
                ratio: ratio,
                peakFrequency: peakFrequency,
                heartRate: heartRate,
                level: level
            });
        }

        // Add samples to database
        await db.addSamples(sessionId, samples);

        // End session (this will calculate statistics)
        await db.endSession(sessionId);

        console.log(`[TestDataGenerator] Session ${i + 1} complete: ${durationMinutes.toFixed(1)} min, mean coherence: ${samples.reduce((sum, s) => sum + s.coherence, 0) / samples.length}`);
    }

    console.log(`[TestDataGenerator] Successfully generated ${count} test sessions!`);
    console.log('[TestDataGenerator] Press H to view session history.');

    db.close();
}

/**
 * Update a session record directly (bypass normal API)
 * Used to set custom timestamps for test data
 */
async function updateSessionDirectly(db, session) {
    return new Promise((resolve, reject) => {
        const transaction = db.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        const request = store.put(session);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear all test data
 */
export async function clearAllTestData() {
    const confirmed = confirm('This will delete ALL session data. Are you sure?');
    if (!confirmed) {
        console.log('[TestDataGenerator] Clear cancelled');
        return;
    }

    const db = new HRVDatabase();
    await db.init();
    await db.deleteAllSessions();
    db.close();

    console.log('[TestDataGenerator] All test data cleared');
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
    window.generateTestSessions = generateTestSessions;
    window.clearAllTestData = clearAllTestData;
}
