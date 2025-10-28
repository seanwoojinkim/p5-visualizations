/**
 * SessionHistory - Panel component for viewing and managing past sessions
 * Displays list of sessions with pagination and export options
 */

import { SessionDetail } from './session-detail.js';
import { exportAllSessionsCSV, exportAllSessionsJSON } from '../session/session-exporter.js';
import { formatDuration } from '../utils/statistics.js';

export class SessionHistory {
    constructor(database, onRefresh) {
        this.database = database;
        this.onRefresh = onRefresh;
        this.panel = null;
        this.isVisible = false;
        this.currentOffset = 0;
        this.sessionsPerPage = 50;
        this.sessionDetail = null;
    }

    /**
     * Toggle visibility of the history panel
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the history panel
     */
    async show() {
        console.log('[SessionHistory] Showing panel');
        this.isVisible = true;
        this.currentOffset = 0;

        // Create panel overlay
        this.panel = createDiv();
        this.panel.style('position', 'fixed');
        this.panel.style('top', '0');
        this.panel.style('right', '0');
        this.panel.style('width', '500px');
        this.panel.style('height', '100%');
        this.panel.style('background', 'rgba(20, 20, 20, 0.98)');
        this.panel.style('color', 'white');
        this.panel.style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        this.panel.style('box-shadow', '-5px 0 30px rgba(0, 0, 0, 0.5)');
        this.panel.style('z-index', '2000');
        this.panel.style('display', 'flex');
        this.panel.style('flex-direction', 'column');
        this.panel.style('overflow', 'hidden');

        // Load and display sessions
        await this.loadSessions();
    }

    /**
     * Hide the history panel
     */
    hide() {
        console.log('[SessionHistory] Hiding panel');
        this.isVisible = false;

        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    /**
     * Load and display sessions
     */
    async loadSessions() {
        if (!this.panel) return;

        // Clear existing content
        this.panel.html('');

        // Create header
        this.createHeader();

        // Create content area (scrollable)
        const content = createDiv();
        content.style('flex', '1');
        content.style('overflow-y', 'auto');
        content.style('padding', '20px');
        content.parent(this.panel);

        try {
            // Get total count and recent sessions
            const allSessions = await this.database.getAllSessions();
            const totalCount = allSessions.length;
            const sessions = await this.database.getRecentSessions(this.sessionsPerPage, this.currentOffset);

            console.log(`[SessionHistory] Loaded ${sessions.length} of ${totalCount} total sessions`);

            if (sessions.length === 0) {
                // Empty state
                this.createEmptyState(content);
            } else {
                // Session list
                for (const session of sessions) {
                    this.createSessionItem(session, content);
                }

                // Load More button if there are more sessions
                const remainingCount = totalCount - (this.currentOffset + sessions.length);
                if (remainingCount > 0) {
                    this.createLoadMoreButton(remainingCount, content);
                }
            }
        } catch (error) {
            console.error('[SessionHistory] Failed to load sessions:', error);
            this.createErrorState(content, error);
        }
    }

    /**
     * Create panel header with title and actions
     */
    createHeader() {
        const header = createDiv();
        header.style('padding', '20px');
        header.style('border-bottom', '1px solid rgba(255, 255, 255, 0.2)');
        header.style('display', 'flex');
        header.style('justify-content', 'space-between');
        header.style('align-items', 'center');
        header.parent(this.panel);

        // Title with count
        const titleContainer = createDiv();
        titleContainer.style('flex', '1');
        titleContainer.parent(header);

        this.database.getAllSessions().then(sessions => {
            const title = createDiv(`Session History (${sessions.length})`);
            title.style('font-size', '20px');
            title.style('font-weight', 'bold');
            title.parent(titleContainer);
        });

        // Actions container
        const actions = createDiv();
        actions.style('display', 'flex');
        actions.style('gap', '10px');
        actions.parent(header);

        // Export dropdown button
        const exportBtn = createButton('Export ▼');
        exportBtn.style('background', '#3b82f6');
        exportBtn.style('color', 'white');
        exportBtn.style('border', 'none');
        exportBtn.style('padding', '8px 16px');
        exportBtn.style('border-radius', '6px');
        exportBtn.style('cursor', 'pointer');
        exportBtn.style('font-size', '14px');
        exportBtn.mousePressed(() => this.showExportMenu(exportBtn));
        exportBtn.parent(actions);

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
        closeBtn.mousePressed(() => this.hide());
        closeBtn.parent(actions);
    }

    /**
     * Show export menu
     */
    showExportMenu(button) {
        const menu = createDiv();
        menu.style('position', 'fixed');
        menu.style('background', 'rgba(40, 40, 40, 0.98)');
        menu.style('border', '1px solid rgba(255, 255, 255, 0.2)');
        menu.style('border-radius', '8px');
        menu.style('box-shadow', '0 10px 30px rgba(0, 0, 0, 0.5)');
        menu.style('z-index', '2100');
        menu.style('min-width', '200px');

        // Position menu near button
        const buttonRect = button.elt.getBoundingClientRect();
        menu.style('top', `${buttonRect.bottom + 5}px`);
        menu.style('right', `${window.innerWidth - buttonRect.right}px`);

        // Menu items
        const items = [
            { label: 'Export All to CSV', action: () => this.exportAllCSV() },
            { label: 'Export All to JSON', action: () => this.exportAllJSON() },
            { label: 'Delete All Sessions', action: () => this.deleteAllSessions() }
        ];

        items.forEach((item, index) => {
            const menuItem = createDiv(item.label);
            menuItem.style('padding', '12px 20px');
            menuItem.style('cursor', 'pointer');
            menuItem.style('font-size', '14px');
            if (index === items.length - 1) {
                menuItem.style('color', '#ef4444'); // Red for delete
                menuItem.style('border-top', '1px solid rgba(255, 255, 255, 0.1)');
            }
            menuItem.mouseOver(() => {
                menuItem.style('background', 'rgba(255, 255, 255, 0.1)');
            });
            menuItem.mouseOut(() => {
                menuItem.style('background', 'transparent');
            });
            menuItem.mousePressed(() => {
                item.action();
                menu.remove();
            });
            menuItem.parent(menu);
        });

        // Close menu when clicking outside
        setTimeout(() => {
            const closeMenu = () => {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    /**
     * Create a session list item
     */
    createSessionItem(session, parent) {
        const item = createDiv();
        item.style('margin-bottom', '15px');
        item.style('padding', '15px');
        item.style('background', 'rgba(40, 40, 40, 0.5)');
        item.style('border-radius', '10px');
        item.style('cursor', 'pointer');
        item.style('transition', 'background 0.2s');
        item.mouseOver(() => {
            item.style('background', 'rgba(60, 60, 60, 0.7)');
        });
        item.mouseOut(() => {
            item.style('background', 'rgba(40, 40, 40, 0.5)');
        });
        item.parent(parent);

        // Color indicator based on mean coherence
        const indicator = this.getColorIndicator(session.meanCoherence);

        // Header row (date, time, duration)
        const headerRow = createDiv();
        headerRow.style('display', 'flex');
        headerRow.style('justify-content', 'space-between');
        headerRow.style('align-items', 'center');
        headerRow.style('margin-bottom', '10px');
        headerRow.parent(item);

        const dateTimeDiv = createDiv();
        dateTimeDiv.style('display', 'flex');
        dateTimeDiv.style('align-items', 'center');
        dateTimeDiv.style('gap', '8px');
        dateTimeDiv.parent(headerRow);

        const indicatorDiv = createDiv(indicator.emoji);
        indicatorDiv.style('font-size', '18px');
        indicatorDiv.parent(dateTimeDiv);

        const dateText = this.formatRelativeDate(session.startTime);
        const dateDiv = createDiv(dateText);
        dateDiv.style('font-size', '15px');
        dateDiv.style('font-weight', 'bold');
        dateDiv.parent(dateTimeDiv);

        const durationDiv = createDiv(formatDuration(session.durationSeconds));
        durationDiv.style('font-size', '14px');
        durationDiv.style('color', 'rgba(255, 255, 255, 0.6)');
        durationDiv.parent(headerRow);

        // Stats row
        const statsRow = createDiv();
        statsRow.style('font-size', '13px');
        statsRow.style('color', 'rgba(255, 255, 255, 0.7)');
        statsRow.style('margin-bottom', '10px');
        statsRow.parent(item);

        statsRow.html(
            `Mean: ${session.meanCoherence.toFixed(0)}/100 &nbsp;` +
            `Max: ${session.maxCoherence.toFixed(0)} &nbsp;` +
            `High: ${session.timeInZones.high.percentage.toFixed(0)}%`
        );

        // Check for personal best
        this.checkPersonalBest(session).then(isBest => {
            if (isBest) {
                const bestBadge = createDiv('⭐ New personal best!');
                bestBadge.style('font-size', '12px');
                bestBadge.style('color', '#fbbf24');
                bestBadge.style('margin-bottom', '10px');
                bestBadge.parent(item);
            }
        });

        // View Details button
        const detailsBtn = createButton('View Details');
        detailsBtn.style('background', 'rgba(59, 130, 246, 0.3)');
        detailsBtn.style('color', '#60a5fa');
        detailsBtn.style('border', '1px solid #60a5fa');
        detailsBtn.style('padding', '6px 12px');
        detailsBtn.style('border-radius', '6px');
        detailsBtn.style('cursor', 'pointer');
        detailsBtn.style('font-size', '13px');
        detailsBtn.style('width', '100%');
        detailsBtn.mousePressed(async (e) => {
            e.stopPropagation();
            await this.showSessionDetail(session);
        });
        detailsBtn.parent(item);

        // Make entire item clickable
        item.mousePressed(async () => {
            await this.showSessionDetail(session);
        });
    }

    /**
     * Get color indicator based on mean coherence
     */
    getColorIndicator(meanCoherence) {
        if (meanCoherence >= 60) {
            return { emoji: '🟢', color: '#22c55e', label: 'High' };
        } else if (meanCoherence >= 40) {
            return { emoji: '🟡', color: '#eab308', label: 'Medium' };
        } else {
            return { emoji: '🔴', color: '#ef4444', label: 'Low' };
        }
    }

    /**
     * Format relative date (Today, Yesterday, or date)
     */
    formatRelativeDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();

        // Check if today
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `Today, ${timeStr}`;
        }

        // Check if yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) {
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `Yesterday, ${timeStr}`;
        }

        // Otherwise, show date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Check if session is a personal best
     */
    async checkPersonalBest(session) {
        try {
            const allSessions = await this.database.getAllSessions();
            const completedSessions = allSessions.filter(s => s.endTime !== null);

            if (completedSessions.length === 0) return false;

            // Check if this session has the highest mean coherence
            const maxMean = Math.max(...completedSessions.map(s => s.meanCoherence));
            return session.meanCoherence === maxMean;
        } catch (error) {
            console.error('[SessionHistory] Error checking personal best:', error);
            return false;
        }
    }

    /**
     * Show session detail modal
     */
    async showSessionDetail(session) {
        console.log('[SessionHistory] Showing detail for session:', session.sessionId);

        try {
            // Load samples for the session
            const samples = await this.database.getSamples(session.sessionId);

            // Create and show detail modal
            this.sessionDetail = new SessionDetail(
                () => {
                    this.sessionDetail = null;
                },
                async (sessionId) => {
                    await this.deleteSession(sessionId);
                }
            );

            this.sessionDetail.show(session, samples);
        } catch (error) {
            console.error('[SessionHistory] Failed to load session detail:', error);
            alert('Failed to load session details: ' + error.message);
        }
    }

    /**
     * Create Load More button
     */
    createLoadMoreButton(remainingCount, parent) {
        const buttonContainer = createDiv();
        buttonContainer.style('margin-top', '20px');
        buttonContainer.style('text-align', 'center');
        buttonContainer.parent(parent);

        const loadMoreBtn = createButton(`Load More (${remainingCount} remaining)`);
        loadMoreBtn.style('background', 'rgba(59, 130, 246, 0.3)');
        loadMoreBtn.style('color', '#60a5fa');
        loadMoreBtn.style('border', '1px solid #60a5fa');
        loadMoreBtn.style('padding', '10px 20px');
        loadMoreBtn.style('border-radius', '8px');
        loadMoreBtn.style('cursor', 'pointer');
        loadMoreBtn.style('font-size', '14px');
        loadMoreBtn.mousePressed(async () => {
            this.currentOffset += this.sessionsPerPage;
            await this.loadSessions();
        });
        loadMoreBtn.parent(buttonContainer);
    }

    /**
     * Create empty state
     */
    createEmptyState(parent) {
        const empty = createDiv();
        empty.style('text-align', 'center');
        empty.style('padding', '60px 20px');
        empty.style('color', 'rgba(255, 255, 255, 0.5)');
        empty.parent(parent);

        const icon = createDiv('📊');
        icon.style('font-size', '48px');
        icon.style('margin-bottom', '20px');
        icon.parent(empty);

        const message = createDiv('No sessions recorded yet');
        message.style('font-size', '18px');
        message.style('margin-bottom', '10px');
        message.parent(empty);

        const hint = createDiv('Start a session in Polar H10 mode (press P, then X)');
        hint.style('font-size', '14px');
        hint.parent(empty);
    }

    /**
     * Create error state
     */
    createErrorState(parent, error) {
        const errorDiv = createDiv();
        errorDiv.style('text-align', 'center');
        errorDiv.style('padding', '60px 20px');
        errorDiv.style('color', '#ef4444');
        errorDiv.parent(parent);

        const icon = createDiv('⚠️');
        icon.style('font-size', '48px');
        icon.style('margin-bottom', '20px');
        icon.parent(errorDiv);

        const message = createDiv('Failed to load sessions');
        message.style('font-size', '18px');
        message.style('margin-bottom', '10px');
        message.parent(errorDiv);

        const errorMsg = createDiv(error.message);
        errorMsg.style('font-size', '14px');
        errorMsg.style('color', 'rgba(255, 255, 255, 0.5)');
        errorMsg.parent(errorDiv);
    }

    /**
     * Export all sessions to CSV
     */
    async exportAllCSV() {
        try {
            const sessions = await this.database.getAllSessions();
            const completedSessions = sessions.filter(s => s.endTime !== null);

            if (completedSessions.length === 0) {
                alert('No completed sessions to export.');
                return;
            }

            exportAllSessionsCSV(completedSessions);
            console.log(`[SessionHistory] Exported ${completedSessions.length} sessions to CSV`);
        } catch (error) {
            console.error('[SessionHistory] Failed to export CSV:', error);
            alert('Failed to export data: ' + error.message);
        }
    }

    /**
     * Export all sessions to JSON (with samples)
     */
    async exportAllJSON() {
        try {
            const sessions = await this.database.getAllSessions();
            const completedSessions = sessions.filter(s => s.endTime !== null);

            if (completedSessions.length === 0) {
                alert('No completed sessions to export.');
                return;
            }

            await exportAllSessionsJSON(completedSessions, (sessionId) => {
                return this.database.getSamples(sessionId);
            });

            console.log(`[SessionHistory] Exported ${completedSessions.length} sessions to JSON`);
        } catch (error) {
            console.error('[SessionHistory] Failed to export JSON:', error);
            alert('Failed to export data: ' + error.message);
        }
    }

    /**
     * Delete a single session
     */
    async deleteSession(sessionId) {
        try {
            await this.database.deleteSession(sessionId);
            console.log(`[SessionHistory] Deleted session ${sessionId}`);

            // Refresh the list
            await this.loadSessions();

            // Notify parent to refresh if needed
            if (this.onRefresh) {
                this.onRefresh();
            }
        } catch (error) {
            console.error('[SessionHistory] Failed to delete session:', error);
            alert('Failed to delete session: ' + error.message);
        }
    }

    /**
     * Delete all sessions (with confirmation)
     */
    async deleteAllSessions() {
        try {
            const sessions = await this.database.getAllSessions();

            if (sessions.length === 0) {
                alert('No sessions to delete.');
                return;
            }

            // Require typing "DELETE" to confirm
            const confirmation = prompt(
                `This will permanently delete ${sessions.length} session(s) and all associated data.\n\n` +
                `This action cannot be undone.\n\n` +
                `Type "DELETE" to confirm:`
            );

            if (confirmation !== 'DELETE') {
                console.log('[SessionHistory] Delete all cancelled');
                return;
            }

            // Delete all sessions
            await this.database.deleteAllSessions();
            console.log(`[SessionHistory] Deleted all ${sessions.length} sessions`);

            // Refresh the list
            await this.loadSessions();

            // Notify parent to refresh if needed
            if (this.onRefresh) {
                this.onRefresh();
            }
        } catch (error) {
            console.error('[SessionHistory] Failed to delete all sessions:', error);
            alert('Failed to delete sessions: ' + error.message);
        }
    }

    /**
     * Refresh the session list
     */
    async refresh() {
        if (this.isVisible) {
            this.currentOffset = 0;
            await this.loadSessions();
        }
    }
}
