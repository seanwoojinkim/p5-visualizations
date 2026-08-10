/**
 * ProtocolRecorder — self-contained session persistence for the breathing protocol.
 *
 * Deliberately NOT reusing coherence/src/session/hrv-database.js: that schema is
 * coherence-centric (meanCoherence, achievementScore). This study needs a
 * reproducibility-first record, so we persist the RAW RR stream — every beat with
 * its timestamp, phase, and accept/reject flag — from which any metric can be
 * recomputed later. Derived per-phase RMSSD is stored too, but the raw beats are
 * the source of truth.
 *
 * Storage: one IndexedDB object store keyed by sessionId, each holding the whole
 * session document. Export: CSV (one row per beat) + JSON (full document).
 */

const DB_NAME = 'breath-protocol';
const DB_VERSION = 1;
const STORE = 'sessions';

export class ProtocolRecorder {
    constructor() {
        this.db = null;
    }

    async init() {
        this.db = await new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'sessionId' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Persist a completed session document.
     * @param {Object} doc  Full session document (see app.js buildSessionDoc).
     */
    async save(doc) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(doc);
            tx.oncomplete = () => resolve(doc.sessionId);
            tx.onerror = () => reject(tx.error);
        });
    }

    async getAll() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => resolve(req.result.sort((a, b) => b.startedAt - a.startedAt));
            req.onerror = () => reject(req.error);
        });
    }

    async get(sessionId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(sessionId);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(sessionId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(sessionId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // ---- Export helpers -----------------------------------------------------

    /** One CSV row per beat: the reproducible raw record. */
    static toBeatsCSV(doc) {
        const header = ['session_id', 'iso_time', 't_ms', 'phase', 'rr_ms', 'hr_bpm', 'accepted', 'reject_reason'];
        const rows = [header.join(',')];
        for (const b of doc.beats) {
            rows.push([
                doc.sessionId,
                new Date(b.tEpoch).toISOString(),
                b.t,
                b.phase,
                b.rr,
                b.rr > 0 ? (60000 / b.rr).toFixed(1) : '',
                b.accepted ? 1 : 0,
                b.reason || '',
            ].join(','));
        }
        return rows.join('\n');
    }

    static download(filename, text, mime = 'text/plain') {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
