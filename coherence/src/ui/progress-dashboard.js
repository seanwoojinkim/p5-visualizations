/**
 * Progress Dashboard
 * Displays trend charts, statistics, and personal bests
 */

import { formatDuration } from '../utils/statistics.js';
import {
    calculate7DayMA,
    calculateCurrentStreak,
    calculateLongestStreak,
    calculateWeekOverWeek,
    formatDate,
    formatDateForChart
} from '../utils/trend-analysis.js';

export class ProgressDashboard {
    constructor(database, onRefresh) {
        this.db = database;
        this.onRefresh = onRefresh;
        this.isVisible = false;
        this.panel = null;
        this.chart = null;
        this.chartCanvas = null;
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the dashboard
     */
    async show() {
        if (this.isVisible) {
            return;
        }

        console.log('[ProgressDashboard] Opening dashboard...');
        this.isVisible = true;
        await this.render();
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (!this.isVisible) {
            return;
        }

        console.log('[ProgressDashboard] Closing dashboard...');
        this.isVisible = false;

        // Destroy chart instance
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Remove panel
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }

        this.chartCanvas = null;
    }

    /**
     * Refresh dashboard data
     */
    async refresh() {
        if (!this.isVisible) {
            return;
        }

        console.log('[ProgressDashboard] Refreshing dashboard...');

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Re-render
        await this.render();
    }

    /**
     * Render the dashboard
     */
    async render() {
        // Create overlay panel
        this.panel = createDiv();
        this.panel.style('position', 'fixed');
        this.panel.style('top', '50%');
        this.panel.style('left', '50%');
        this.panel.style('transform', 'translate(-50%, -50%)');
        this.panel.style('background', 'rgba(20, 20, 20, 0.98)');
        this.panel.style('border', '2px solid rgba(255, 255, 255, 0.2)');
        this.panel.style('border-radius', '15px');
        this.panel.style('padding', '30px');
        this.panel.style('width', '800px');
        this.panel.style('max-width', '90vw');
        this.panel.style('max-height', '90vh');
        this.panel.style('overflow-y', 'auto');
        this.panel.style('z-index', '3000');
        this.panel.style('color', 'white');
        this.panel.style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        this.panel.style('box-shadow', '0 20px 60px rgba(0, 0, 0, 0.8)');

        // Header
        const header = createDiv();
        header.style('display', 'flex');
        header.style('justify-content', 'space-between');
        header.style('align-items', 'center');
        header.style('margin-bottom', '25px');
        header.parent(this.panel);

        const title = createDiv('Progress Dashboard');
        title.style('font-size', '24px');
        title.style('font-weight', 'bold');
        title.parent(header);

        const subtitle = createDiv('Last 30 Days');
        subtitle.style('font-size', '14px');
        subtitle.style('color', 'rgba(255, 255, 255, 0.6)');
        subtitle.style('margin-right', 'auto');
        subtitle.style('margin-left', '15px');
        subtitle.parent(header);

        // Close button
        const closeBtn = createButton('✕');
        closeBtn.style('background', 'transparent');
        closeBtn.style('border', '1px solid rgba(255, 255, 255, 0.3)');
        closeBtn.style('color', 'white');
        closeBtn.style('padding', '8px 14px');
        closeBtn.style('border-radius', '6px');
        closeBtn.style('cursor', 'pointer');
        closeBtn.style('font-size', '16px');
        closeBtn.mousePressed(() => this.hide());
        closeBtn.parent(header);

        // Load data
        const stats = await this.db.getAggregateStats(30);
        const allSessions = await this.db.getAllSessions();
        const dailyAverages = await this.db.getDailyAverages(30);
        const personalBests = await this.db.getPersonalBests();

        // Calculate derived stats
        const currentStreak = calculateCurrentStreak(allSessions);
        const longestStreak = calculateLongestStreak(allSessions);
        const weekComparison = calculateWeekOverWeek(dailyAverages);
        const movingAverage = calculate7DayMA(dailyAverages);

        // Stats cards grid
        const statsGrid = createDiv();
        statsGrid.style('display', 'grid');
        statsGrid.style('grid-template-columns', 'repeat(3, 1fr)');
        statsGrid.style('gap', '15px');
        statsGrid.style('margin-bottom', '30px');
        statsGrid.parent(this.panel);

        // Create 6 stat cards
        this.createStatCard(statsGrid, stats.totalSessions.toString(), 'Sessions', '#4ade80');
        this.createStatCard(statsGrid, formatDuration(stats.avgDuration), 'Avg Length', '#60a5fa');
        this.createStatCard(statsGrid, `${stats.avgCoherence.toFixed(0)}/100`, 'Avg Score', '#a78bfa');
        this.createStatCard(statsGrid, `${currentStreak}`, 'Current Streak', '#f59e0b', currentStreak > 0);
        this.createStatCard(statsGrid, `${personalBests.maxCoherence.value.toFixed(0)}/100`, 'Best Score', '#ec4899');
        this.createStatCard(statsGrid, formatDuration(personalBests.longestSession.duration), 'Longest', '#14b8a6');

        // Trend chart section
        const chartSection = createDiv();
        chartSection.style('margin-bottom', '25px');
        chartSection.parent(this.panel);

        const chartTitle = createDiv('Coherence Trend (Last 30 Days)');
        chartTitle.style('font-size', '16px');
        chartTitle.style('font-weight', 'bold');
        chartTitle.style('margin-bottom', '15px');
        chartTitle.parent(chartSection);

        // Create canvas for Chart.js
        const canvasContainer = createDiv();
        canvasContainer.style('background', 'rgba(255, 255, 255, 0.05)');
        canvasContainer.style('border-radius', '10px');
        canvasContainer.style('padding', '20px');
        canvasContainer.style('position', 'relative');
        canvasContainer.style('height', '300px');
        canvasContainer.parent(chartSection);

        // Create canvas element
        this.chartCanvas = document.createElement('canvas');
        this.chartCanvas.style.maxHeight = '260px';
        canvasContainer.elt.appendChild(this.chartCanvas);

        // Render chart
        if (dailyAverages.length > 0) {
            this.renderChart(dailyAverages, movingAverage);
        } else {
            const noDataMsg = createDiv('No data available yet. Record some sessions to see trends!');
            noDataMsg.style('text-align', 'center');
            noDataMsg.style('color', 'rgba(255, 255, 255, 0.5)');
            noDataMsg.style('padding', '60px 20px');
            noDataMsg.parent(canvasContainer);
        }

        // Week-over-week comparison
        if (weekComparison.lastWeek > 0) {
            const weekSection = createDiv();
            weekSection.style('margin-bottom', '25px');
            weekSection.parent(this.panel);

            const weekTitle = createDiv('Week-over-Week:');
            weekTitle.style('font-size', '14px');
            weekTitle.style('color', 'rgba(255, 255, 255, 0.7)');
            weekTitle.style('margin-bottom', '8px');
            weekTitle.parent(weekSection);

            const change = weekComparison.change;
            const changeSign = change >= 0 ? '+' : '';
            const changeColor = change >= 0 ? '#4ade80' : '#ef4444';

            const weekStats = createDiv(
                `This week: <strong>${weekComparison.thisWeek.toFixed(1)}</strong>  ` +
                `Last week: <strong>${weekComparison.lastWeek.toFixed(1)}</strong>  ` +
                `<span style="color: ${changeColor}">(${changeSign}${weekComparison.changePercent.toFixed(1)}%)</span>`
            );
            weekStats.style('font-size', '15px');
            weekStats.style('line-height', '1.6');
            weekStats.parent(weekSection);
        }

        // Personal bests section
        const bestsSection = createDiv();
        bestsSection.style('margin-bottom', '10px');
        bestsSection.parent(this.panel);

        const bestsTitle = createDiv('Personal Bests:');
        bestsTitle.style('font-size', '16px');
        bestsTitle.style('font-weight', 'bold');
        bestsTitle.style('margin-bottom', '12px');
        bestsTitle.parent(bestsSection);

        // Max coherence
        if (personalBests.maxCoherence.value > 0) {
            const maxCoherenceDiv = createDiv(
                `Max Coherence: <strong>${personalBests.maxCoherence.value.toFixed(0)}/100</strong> ` +
                `(${formatDate(personalBests.maxCoherence.date, true)})`
            );
            maxCoherenceDiv.style('font-size', '14px');
            maxCoherenceDiv.style('color', 'rgba(255, 255, 255, 0.85)');
            maxCoherenceDiv.style('margin-bottom', '8px');
            maxCoherenceDiv.style('line-height', '1.6');
            maxCoherenceDiv.parent(bestsSection);
        }

        // Longest session
        if (personalBests.longestSession.duration > 0) {
            const longestDiv = createDiv(
                `Longest Session: <strong>${formatDuration(personalBests.longestSession.duration)}</strong> ` +
                `(${formatDate(personalBests.longestSession.date, true)})`
            );
            longestDiv.style('font-size', '14px');
            longestDiv.style('color', 'rgba(255, 255, 255, 0.85)');
            longestDiv.style('margin-bottom', '8px');
            longestDiv.style('line-height', '1.6');
            longestDiv.parent(bestsSection);
        }

        // Longest streak
        if (longestStreak.days > 0) {
            const streakDiv = createDiv(
                `Longest Streak: <strong>${longestStreak.days} days</strong> ` +
                `(${formatDate(longestStreak.startDate)} - ${formatDate(longestStreak.endDate, true)})`
            );
            streakDiv.style('font-size', '14px');
            streakDiv.style('color', 'rgba(255, 255, 255, 0.85)');
            streakDiv.style('margin-bottom', '8px');
            streakDiv.style('line-height', '1.6');
            streakDiv.parent(bestsSection);
        }

        console.log('[ProgressDashboard] Dashboard rendered successfully');
    }

    /**
     * Create a stat card
     */
    createStatCard(parent, value, label, color, addFireEmoji = false) {
        const card = createDiv();
        card.style('background', 'rgba(255, 255, 255, 0.05)');
        card.style('border', '1px solid rgba(255, 255, 255, 0.1)');
        card.style('border-radius', '10px');
        card.style('padding', '20px');
        card.style('text-align', 'center');
        card.parent(parent);

        const valueDiv = createDiv(addFireEmoji && value !== '0' ? `${value}` : value);
        valueDiv.style('font-size', '32px');
        valueDiv.style('font-weight', 'bold');
        valueDiv.style('color', color);
        valueDiv.style('margin-bottom', '8px');
        valueDiv.parent(card);

        const labelDiv = createDiv(label);
        labelDiv.style('font-size', '13px');
        labelDiv.style('color', 'rgba(255, 255, 255, 0.6)');
        labelDiv.style('text-transform', 'uppercase');
        labelDiv.style('letter-spacing', '0.5px');
        labelDiv.parent(card);
    }

    /**
     * Render trend chart using Chart.js
     */
    renderChart(dailyAverages, movingAverage) {
        if (!this.chartCanvas) {
            console.error('[ProgressDashboard] Chart canvas not available');
            return;
        }

        // Prepare data for Chart.js
        const labels = dailyAverages.map(d => formatDateForChart(d.timestamp));
        const dailyData = dailyAverages.map(d => d.avgCoherence);
        const ma7Data = movingAverage.map(d => d.ma7);

        // Create chart
        const ctx = this.chartCanvas.getContext('2d');

        // Import Chart.js from global scope (loaded via script tag)
        if (typeof Chart === 'undefined') {
            console.error('[ProgressDashboard] Chart.js not loaded');
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Daily Mean',
                        data: dailyData,
                        borderColor: 'rgba(147, 197, 253, 1)',
                        backgroundColor: 'rgba(147, 197, 253, 0.3)',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgba(147, 197, 253, 1)',
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: '7-Day MA',
                        data: ma7Data,
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 3,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'rgba(255, 255, 255, 0.9)',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            },
                            stepSize: 20
                        },
                        title: {
                            display: true,
                            text: 'Coherence Score',
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 10
                            },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        console.log('[ProgressDashboard] Chart rendered with', dailyAverages.length, 'data points');
    }
}
