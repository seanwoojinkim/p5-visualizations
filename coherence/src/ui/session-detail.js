/**
 * SessionDetail - Modal component for viewing detailed session information
 * Displays time-series chart, statistics, and action buttons (export, delete)
 */

import { exportSessionJSON } from '../session/session-exporter.js';
import { formatDuration } from '../utils/statistics.js';

export class SessionDetail {
    constructor(onClose, onDelete) {
        this.onClose = onClose;
        this.onDelete = onDelete;
        this.modal = null;
        this.overlay = null;
    }

    /**
     * Show the session detail modal
     * @param {Object} session - Session object
     * @param {Object[]} samples - Array of sample objects
     */
    show(session, samples) {
        console.log('[SessionDetail] Showing detail for session:', session.sessionId);

        // Create modal overlay
        this.overlay = createDiv();
        this.overlay.style('position', 'fixed');
        this.overlay.style('top', '0');
        this.overlay.style('left', '0');
        this.overlay.style('width', '100%');
        this.overlay.style('height', '100%');
        this.overlay.style('background', 'rgba(0, 0, 0, 0.85)');
        this.overlay.style('z-index', '3000');
        this.overlay.style('display', 'flex');
        this.overlay.style('justify-content', 'center');
        this.overlay.style('align-items', 'center');
        this.overlay.style('overflow-y', 'auto');
        this.overlay.style('padding', '20px');

        // Create modal content
        this.modal = createDiv();
        this.modal.style('background', 'rgba(20, 20, 20, 0.98)');
        this.modal.style('padding', '30px');
        this.modal.style('border-radius', '15px');
        this.modal.style('color', 'white');
        this.modal.style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        this.modal.style('max-width', '800px');
        this.modal.style('width', '100%');
        this.modal.style('box-shadow', '0 20px 60px rgba(0, 0, 0, 0.8)');
        this.modal.style('max-height', '90vh');
        this.modal.style('overflow-y', 'auto');
        this.modal.parent(this.overlay);

        // Header with title and action buttons
        this.createHeader(session, samples);

        // Session info
        this.createSessionInfo(session);

        // Chart
        this.createChart(samples);

        // Statistics
        this.createStatistics(session);

        // Time in zones
        this.createTimeInZones(session);

        // HRV metrics
        this.createHRVMetrics(session);
    }

    /**
     * Create header with title and action buttons
     */
    createHeader(session, samples) {
        const header = createDiv();
        header.style('display', 'flex');
        header.style('justify-content', 'space-between');
        header.style('align-items', 'center');
        header.style('margin-bottom', '25px');
        header.style('border-bottom', '1px solid rgba(255, 255, 255, 0.2)');
        header.style('padding-bottom', '15px');
        header.parent(this.modal);

        // Title
        const title = createDiv('Session Details');
        title.style('font-size', '24px');
        title.style('font-weight', 'bold');
        title.parent(header);

        // Action buttons container
        const actions = createDiv();
        actions.style('display', 'flex');
        actions.style('gap', '10px');
        actions.parent(header);

        // Export button
        const exportBtn = createButton('Export');
        exportBtn.style('background', '#3b82f6');
        exportBtn.style('color', 'white');
        exportBtn.style('border', 'none');
        exportBtn.style('padding', '8px 16px');
        exportBtn.style('border-radius', '6px');
        exportBtn.style('cursor', 'pointer');
        exportBtn.style('font-size', '14px');
        exportBtn.mousePressed(() => {
            exportSessionJSON(session, samples);
        });
        exportBtn.parent(actions);

        // Delete button
        const deleteBtn = createButton('Delete');
        deleteBtn.style('background', '#ef4444');
        deleteBtn.style('color', 'white');
        deleteBtn.style('border', 'none');
        deleteBtn.style('padding', '8px 16px');
        deleteBtn.style('border-radius', '6px');
        deleteBtn.style('cursor', 'pointer');
        deleteBtn.style('font-size', '14px');
        deleteBtn.mousePressed(() => {
            const confirmed = confirm('Are you sure you want to delete this session? This action cannot be undone.');
            if (confirmed) {
                this.close();
                if (this.onDelete) {
                    this.onDelete(session.sessionId);
                }
            }
        });
        deleteBtn.parent(actions);

        // Close button
        const closeBtn = createButton('✕');
        closeBtn.style('background', 'rgba(255, 255, 255, 0.1)');
        closeBtn.style('color', 'white');
        closeBtn.style('border', 'none');
        closeBtn.style('width', '32px');
        closeBtn.style('height', '32px');
        closeBtn.style('border-radius', '6px');
        closeBtn.style('cursor', 'pointer');
        closeBtn.style('font-size', '18px');
        closeBtn.style('line-height', '1');
        closeBtn.mousePressed(() => this.close());
        closeBtn.parent(actions);
    }

    /**
     * Create session info section
     */
    createSessionInfo(session) {
        const info = createDiv();
        info.style('margin-bottom', '25px');
        info.parent(this.modal);

        const startDate = new Date(session.startTime);
        const dateStr = startDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const dateDiv = createDiv(dateStr);
        dateDiv.style('font-size', '18px');
        dateDiv.style('color', 'rgba(255, 255, 255, 0.8)');
        dateDiv.style('margin-bottom', '10px');
        dateDiv.parent(info);

        const durationDiv = createDiv(`Duration: ${formatDuration(session.durationSeconds)}`);
        durationDiv.style('font-size', '16px');
        durationDiv.style('color', 'rgba(255, 255, 255, 0.7)');
        durationDiv.parent(info);
    }

    /**
     * Create time-series chart of coherence over session duration
     */
    createChart(samples) {
        const chartContainer = createDiv();
        chartContainer.style('margin-bottom', '25px');
        chartContainer.style('background', 'rgba(40, 40, 40, 0.5)');
        chartContainer.style('border-radius', '10px');
        chartContainer.style('padding', '20px');
        chartContainer.parent(this.modal);

        const chartTitle = createDiv('Coherence Over Time');
        chartTitle.style('font-size', '16px');
        chartTitle.style('font-weight', 'bold');
        chartTitle.style('margin-bottom', '15px');
        chartTitle.parent(chartContainer);

        // Create canvas for chart
        const canvas = createGraphics(700, 200);
        canvas.parent(chartContainer);

        // Draw chart background
        canvas.background(30, 30, 30);

        if (samples.length === 0) {
            canvas.fill(255, 255, 255, 150);
            canvas.noStroke();
            canvas.textAlign(CENTER, CENTER);
            canvas.textSize(14);
            canvas.text('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Chart dimensions
        const padding = { left: 50, right: 20, top: 20, bottom: 40 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        // Find min/max for scaling
        const coherenceValues = samples.map(s => s.coherence);
        const minCoherence = 0; // Always start at 0
        const maxCoherence = 100; // Always go to 100
        const timestamps = samples.map(s => s.timestamp);
        const minTime = timestamps[0];
        const maxTime = timestamps[timestamps.length - 1];
        const duration = maxTime - minTime;

        // Draw grid lines
        canvas.stroke(255, 255, 255, 30);
        canvas.strokeWeight(1);

        // Horizontal grid lines (coherence levels)
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            canvas.line(padding.left, y, canvas.width - padding.right, y);

            // Y-axis labels
            const value = maxCoherence - (i * 25);
            canvas.noStroke();
            canvas.fill(255, 255, 255, 150);
            canvas.textAlign(RIGHT, CENTER);
            canvas.textSize(11);
            canvas.text(value, padding.left - 10, y);
        }

        // Draw coherence zones (colored backgrounds)
        canvas.noStroke();
        // High zone (60-100) - green
        const highY = padding.top + (chartHeight * (1 - 60 / 100));
        canvas.fill(100, 255, 100, 20);
        canvas.rect(padding.left, padding.top, chartWidth, highY - padding.top);

        // Medium zone (40-60) - yellow
        const mediumY = padding.top + (chartHeight * (1 - 40 / 100));
        canvas.fill(255, 255, 100, 20);
        canvas.rect(padding.left, highY, chartWidth, mediumY - highY);

        // Low zone (0-40) - red
        canvas.fill(255, 100, 100, 20);
        canvas.rect(padding.left, mediumY, chartWidth, padding.top + chartHeight - mediumY);

        // Draw data line
        canvas.noFill();
        canvas.stroke(100, 200, 255, 255);
        canvas.strokeWeight(2);
        canvas.beginShape();

        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const x = padding.left + (chartWidth * (sample.timestamp - minTime) / duration);
            const y = padding.top + chartHeight - (chartHeight * (sample.coherence - minCoherence) / (maxCoherence - minCoherence));
            canvas.vertex(x, y);
        }

        canvas.endShape();

        // Draw data points
        canvas.fill(100, 200, 255, 200);
        canvas.noStroke();
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const x = padding.left + (chartWidth * (sample.timestamp - minTime) / duration);
            const y = padding.top + chartHeight - (chartHeight * (sample.coherence - minCoherence) / (maxCoherence - minCoherence));
            canvas.circle(x, y, 4);
        }

        // X-axis labels (time)
        canvas.noStroke();
        canvas.fill(255, 255, 255, 150);
        canvas.textAlign(CENTER, TOP);
        canvas.textSize(11);

        const numTimeLabels = 5;
        for (let i = 0; i <= numTimeLabels; i++) {
            const x = padding.left + (chartWidth / numTimeLabels) * i;
            const timeSeconds = (duration / 1000) * (i / numTimeLabels);
            const minutes = Math.floor(timeSeconds / 60);
            const seconds = Math.floor(timeSeconds % 60);
            const label = `${minutes}:${String(seconds).padStart(2, '0')}`;
            canvas.text(label, x, canvas.height - padding.bottom + 10);
        }

        // Axis labels
        canvas.fill(255, 255, 255, 200);
        canvas.textSize(12);
        canvas.textAlign(CENTER, CENTER);
        canvas.text('Time (minutes)', canvas.width / 2, canvas.height - 10);

        canvas.push();
        canvas.translate(15, canvas.height / 2);
        canvas.rotate(-HALF_PI);
        canvas.text('Coherence Score', 0, 0);
        canvas.pop();
    }

    /**
     * Create statistics section
     */
    createStatistics(session) {
        const statsContainer = createDiv();
        statsContainer.style('margin-bottom', '25px');
        statsContainer.parent(this.modal);

        const statsTitle = createDiv('Statistics');
        statsTitle.style('font-size', '18px');
        statsTitle.style('font-weight', 'bold');
        statsTitle.style('margin-bottom', '15px');
        statsTitle.parent(statsContainer);

        const statsGrid = createDiv();
        statsGrid.style('display', 'grid');
        statsGrid.style('grid-template-columns', 'repeat(2, 1fr)');
        statsGrid.style('gap', '15px');
        statsGrid.parent(statsContainer);

        // Stat items
        const stats = [
            { label: 'Mean', value: `${session.meanCoherence.toFixed(1)}/100` },
            { label: 'Median', value: `${session.medianCoherence.toFixed(1)}/100` },
            { label: 'Max', value: `${session.maxCoherence.toFixed(1)}/100` },
            { label: 'Min', value: `${session.minCoherence.toFixed(1)}/100` },
            { label: 'Std Dev', value: session.stdCoherence.toFixed(1) },
            { label: 'Achievement Score', value: session.achievementScore.toLocaleString() }
        ];

        stats.forEach(stat => {
            const item = createDiv();
            item.style('background', 'rgba(60, 60, 60, 0.5)');
            item.style('padding', '15px');
            item.style('border-radius', '8px');
            item.parent(statsGrid);

            const label = createDiv(stat.label);
            label.style('font-size', '12px');
            label.style('color', 'rgba(255, 255, 255, 0.6)');
            label.style('margin-bottom', '5px');
            label.parent(item);

            const value = createDiv(stat.value);
            value.style('font-size', '20px');
            value.style('font-weight', 'bold');
            value.parent(item);
        });
    }

    /**
     * Create time in zones section
     */
    createTimeInZones(session) {
        const zonesContainer = createDiv();
        zonesContainer.style('margin-bottom', '25px');
        zonesContainer.parent(this.modal);

        const zonesTitle = createDiv('Time in Zones');
        zonesTitle.style('font-size', '18px');
        zonesTitle.style('font-weight', 'bold');
        zonesTitle.style('margin-bottom', '15px');
        zonesTitle.parent(zonesContainer);

        // Stacked bar
        const barContainer = createDiv();
        barContainer.style('display', 'flex');
        barContainer.style('height', '40px');
        barContainer.style('border-radius', '8px');
        barContainer.style('overflow', 'hidden');
        barContainer.style('margin-bottom', '15px');
        barContainer.parent(zonesContainer);

        const zones = [
            { name: 'low', color: '#ef4444', data: session.timeInZones.low },
            { name: 'medium', color: '#eab308', data: session.timeInZones.medium },
            { name: 'high', color: '#22c55e', data: session.timeInZones.high }
        ];

        zones.forEach(zone => {
            if (zone.data.percentage > 0) {
                const segment = createDiv();
                segment.style('flex', `${zone.data.percentage}`);
                segment.style('background', zone.color);
                segment.parent(barContainer);
            }
        });

        // Zone labels
        const labelsContainer = createDiv();
        labelsContainer.style('display', 'flex');
        labelsContainer.style('justify-content', 'space-between');
        labelsContainer.style('font-size', '14px');
        labelsContainer.parent(zonesContainer);

        zones.forEach(zone => {
            const label = createDiv();
            label.style('color', zone.color);
            label.parent(labelsContainer);

            const minutes = Math.round(zone.data.seconds / 60);
            const percentage = zone.data.percentage.toFixed(0);
            label.html(`<strong>${zone.name.toUpperCase()}:</strong> ${minutes}m (${percentage}%)`);
        });
    }

    /**
     * Create HRV metrics section
     */
    createHRVMetrics(session) {
        const metricsContainer = createDiv();
        metricsContainer.style('margin-bottom', '20px');
        metricsContainer.parent(this.modal);

        const metricsTitle = createDiv('HRV Metrics');
        metricsTitle.style('font-size', '18px');
        metricsTitle.style('font-weight', 'bold');
        metricsTitle.style('margin-bottom', '15px');
        metricsTitle.parent(metricsContainer);

        const metricsList = createDiv();
        metricsList.style('display', 'flex');
        metricsList.style('gap', '20px');
        metricsList.style('flex-wrap', 'wrap');
        metricsList.parent(metricsContainer);

        // Mean heart rate
        if (session.meanHeartRate > 0) {
            const hrItem = createDiv();
            hrItem.style('font-size', '14px');
            hrItem.style('color', 'rgba(255, 255, 255, 0.8)');
            hrItem.parent(metricsList);
            hrItem.html(`<strong>Mean HR:</strong> ${session.meanHeartRate.toFixed(1)} bpm`);
        }

        // Samples collected
        const samplesItem = createDiv();
        samplesItem.style('font-size', '14px');
        samplesItem.style('color', 'rgba(255, 255, 255, 0.8)');
        samplesItem.parent(metricsList);
        samplesItem.html(`<strong>Samples:</strong> ${session.samplesCollected}`);
    }

    /**
     * Close the modal
     */
    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.modal = null;
        }

        if (this.onClose) {
            this.onClose();
        }

        console.log('[SessionDetail] Modal closed');
    }
}
