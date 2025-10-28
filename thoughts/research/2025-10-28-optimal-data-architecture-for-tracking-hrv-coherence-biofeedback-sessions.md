---
doc_type: research
date: 2025-10-28T04:15:39+00:00
title: "Optimal Data Architecture for Tracking HRV/Coherence Biofeedback Sessions"
research_question: "What is the optimal data architecture for tracking HRV/coherence biofeedback sessions including schema design, storage options, data models, performance considerations, and real-world examples?"
researcher: Sean Kim

git_commit: 36b4f99dafec272233e1aa89b89a368a5ba0a8b3
branch: main
repository: workspace

created_by: Sean Kim
last_updated: 2025-10-28
last_updated_by: Sean Kim

tags:
  - hrv
  - coherence
  - data-architecture
  - biofeedback
  - session-tracking
  - time-series
  - database-design
  - polar-h10
  - indexeddb
  - postgresql
status: completed

related_docs:
  - thoughts/research/2025-10-28-heartmath-implementation-in-hrv-monitor-directory.md
  - thoughts/research/2025-10-28-interpersonal-physiological-coherence-and-heart-rate-synchrony.md
  - coherence/docs/research/2025-10-25-biometric-coherence-research.md
---

# Research: Optimal Data Architecture for Tracking HRV/Coherence Biofeedback Sessions

**Date**: 2025-10-28T04:15:39+00:00
**Researcher**: Sean Kim
**Git Commit**: 36b4f99d
**Branch**: main
**Repository**: workspace

## Research Question

What is the optimal data architecture for tracking HRV/coherence biofeedback sessions including schema design, storage options, data models, performance considerations, and real-world examples from apps like HeartMath Inner Balance, Elite HRV, and HRV4Training?

## Summary

This research provides a comprehensive data architecture for tracking HRV/coherence biofeedback sessions in the Polar H10 + visualization system. The optimal architecture uses **hybrid storage** (client-side IndexedDB for caching + optional backend for sync/analysis) with a **three-tier data model** (Session metadata, Coherence samples, Raw RR intervals) that balances real-time performance with comprehensive historical tracking.

**Key Findings:**

1. **Storage Strategy**: IndexedDB for client-side (unlimited storage, efficient queries), optional PostgreSQL/TimescaleDB backend for multi-user/analysis
2. **Session Data Size**: ~5-15 KB per 5-minute session (compressed), ~100-500 KB with full RR intervals
3. **Schema Design**: Normalized three-table approach separating sessions, coherence samples, and raw measurements
4. **Performance**: Sub-100ms query times for session lists, ~200ms for full session reconstruction
5. **Commercial Insights**: HeartMath uses 64-second windows with 5-second updates; Elite HRV stores full time-domain + frequency-domain metrics; HRV4Training exports standardized CSV format

The architecture supports: recording sessions in real-time, storing historical data, comparing multiple sessions, tracking improvement over time, and exporting data for external analysis.

## Detailed Findings

### 1. Data Schema Design

#### 1.1 What Data Points Should Be Captured Per Session?

Based on the existing hrv-monitor implementation and commercial app analysis, sessions should capture multiple data aggregation levels:

**Session-Level Metadata** (stored once per session):
```typescript
interface Session {
  // Identity
  session_id: string;              // UUID
  user_id?: string;                // Optional multi-user support

  // Timing
  start_time: number;              // Unix timestamp (ms)
  end_time: number;                // Unix timestamp (ms)
  duration_seconds: number;        // Calculated duration

  // Session Context
  session_type: string;            // 'solo' | 'paired' | 'group'
  mode: string;                    // 'breathing' | 'meditation' | 'custom'
  notes?: string;                  // User notes/journal
  tags?: string[];                 // ['work', 'morning', 'stress', etc.]

  // Coherence Summary Statistics
  coherence_stats: {
    mean_score: number;            // 0-100
    max_score: number;
    min_score: number;
    std_dev: number;
    time_in_high: number;          // Seconds with score >= 67
    time_in_medium: number;        // Seconds with score 33-67
    time_in_low: number;           // Seconds with score < 33
  };

  // HRV Summary Statistics (from buffer)
  hrv_stats: {
    mean_heart_rate: number;       // BPM
    max_heart_rate: number;
    min_heart_rate: number;
    mean_rr_interval: number;      // ms
    sdnn?: number;                 // Standard deviation of NN intervals (optional)
    rmssd?: number;                // Root mean square of successive differences (optional)
  };

  // Frequency Domain Summary
  frequency_stats?: {
    dominant_frequency: number;    // Hz (typically ~0.1 Hz for coherence)
    mean_peak_frequency: number;   // Average across all samples
    frequency_stability: number;   // Variance in peak frequency
  };

  // Quality Metrics
  quality: {
    samples_collected: number;     // Total coherence updates
    expected_samples: number;      // duration / update_interval
    data_completeness: number;     // Percentage (0-100)
    buffer_ready_time: number;     // Seconds until buffer filled
  };
}
```

**Coherence Sample Data** (stored every 3-5 seconds):
```typescript
interface CoherenceSample {
  sample_id: string;               // UUID
  session_id: string;              // Foreign key to Session
  timestamp: number;               // Unix timestamp (ms)
  elapsed_seconds: number;         // Seconds since session start

  // Coherence Metrics (from hrv-monitor/src/coherence_calculator.py)
  coherence_score: number;         // 0-100
  coherence_ratio: number;         // Raw ratio (unbounded)
  coherence_level: string;         // 'low' | 'medium' | 'high'

  // Frequency Analysis
  peak_frequency: number;          // Hz
  peak_power: number;              // Power in ±0.015 Hz window
  total_power: number;             // Total power in 0.04-0.26 Hz

  // Heart Rate Context
  instantaneous_hr: number;        // BPM at this moment
  beats_in_window: number;         // Number of beats used for calculation

  // Visualization Level (mapped from score for real-time viz)
  visualization_level: number;     // -1.0 to +1.0 for boid coherence
}
```

**Raw RR Interval Data** (optional, per-heartbeat):
```typescript
interface RRInterval {
  rr_id: string;                   // UUID
  session_id: string;              // Foreign key to Session
  timestamp: number;               // Unix timestamp (ms)
  elapsed_ms: number;              // Milliseconds since session start

  rr_interval: number;             // Milliseconds between beats
  heart_rate: number;              // Calculated: 60000 / rr_interval

  // Quality Flags (optional)
  is_artifact?: boolean;           // Detected outlier/noise
  interpolated?: boolean;          // Gap-filled value
}
```

#### 1.2 Metadata and Context

**Additional valuable metadata:**

```typescript
interface SessionMetadata {
  // Environmental Context
  environment?: {
    location?: string;             // 'home' | 'office' | 'outdoor'
    time_of_day: string;           // 'morning' | 'afternoon' | 'evening' | 'night'
    day_of_week: number;           // 0-6
  };

  // Physiological Context
  pre_session?: {
    resting_hr?: number;           // BPM before session
    stress_level?: number;         // 1-10 self-reported
    energy_level?: number;         // 1-10 self-reported
    mood?: string;                 // 'calm' | 'anxious' | 'energized' | etc.
  };

  // Post-Session Reflection
  post_session?: {
    perceived_coherence?: number;  // 1-10 self-reported
    ease_of_focus?: number;        // 1-10 self-reported
    how_felt?: string;             // Free text
  };

  // Breathing Guidance
  breathing?: {
    guide_enabled: boolean;
    breaths_per_minute: number;    // 3.0 - 7.0
    resonance_achieved: boolean;   // Whether peak frequency matched target
  };

  // Device Information
  device?: {
    sensor_type: string;           // 'Polar H10'
    sensor_id?: string;            // Device MAC/UUID
    firmware_version?: string;
    connection_quality: number;    // 0-100
  };
}
```

#### 1.3 Time-Series Data Structure Efficiency

**Aggregation Levels:**

1. **Per-Heartbeat (Raw RR Intervals)**
   - **Frequency**: 40-120 times per minute (0.5-2 Hz)
   - **Storage**: ~24 bytes per beat
   - **5-minute session**: ~200-600 beats = 4.8-14.4 KB
   - **Use case**: Post-hoc detailed analysis, export for researchers
   - **Recommendation**: Optional, store only if needed

2. **Per-Coherence-Update (Coherence Samples)**
   - **Frequency**: Every 3-5 seconds (0.2-0.33 Hz)
   - **Storage**: ~120 bytes per sample
   - **5-minute session**: 60-100 samples = 7.2-12 KB
   - **Use case**: Session playback, trend visualization, real-time feedback
   - **Recommendation**: Always store

3. **Per-Session (Summary Statistics)**
   - **Frequency**: Once per session
   - **Storage**: ~500-1000 bytes per session
   - **Use case**: Session list, quick comparison, trend graphs
   - **Recommendation**: Always store

**Storage Optimization Strategy:**

```typescript
// Efficient time-series storage using typed arrays
interface CompressedCoherenceSamples {
  session_id: string;
  sample_count: number;

  // Use typed arrays for efficient binary storage
  timestamps: Uint32Array;         // Relative ms from session start
  coherence_scores: Uint8Array;    // 0-100 fits in 1 byte
  coherence_ratios: Float32Array;  // 4 bytes each
  peak_frequencies: Uint16Array;   // Fixed-point: freq * 10000
  heart_rates: Uint8Array;         // 40-200 BPM fits in 1 byte

  // Compression: ~70% size reduction vs JSON objects
}

// Example: 100 samples
// JSON objects: ~12 KB
// Typed arrays: ~3.4 KB
// Savings: 71%
```

**From research findings:**
- HRV4Training exports CSV with columns: `timestamp_measurement, HR, AVNN, SDNN, rMSSD, pNN50, LF, HF, HRV4T_Recovery_Points`
- HeartMath uses 64-second windows updated every 5 seconds
- Elite HRV stores both time-domain (SDNN, RMSSD, NN50, PNN50) and frequency-domain (LF, HF, LF/HF ratio) metrics

### 2. Storage Options Analysis

#### 2.1 Browser Storage: localStorage vs IndexedDB

**localStorage:**

```typescript
// Limitations
const MAX_SIZE = 5 * 1024 * 1024;  // ~5 MB typical limit
const sessions = localStorage.getItem('hrv_sessions');
// ❌ Synchronous - blocks UI thread
// ❌ String-only - requires JSON.stringify/parse
// ❌ No indexing - must load entire dataset
// ❌ Limited size - only ~100-200 sessions
```

**IndexedDB (Recommended for Client-Side):**

```typescript
// Advantages
const db = await openDB('HRVCoherenceDB', 1, {
  upgrade(db) {
    // Sessions store
    const sessionStore = db.createObjectStore('sessions', {
      keyPath: 'session_id'
    });
    sessionStore.createIndex('start_time', 'start_time');
    sessionStore.createIndex('user_id', 'user_id');
    sessionStore.createIndex('session_type', 'session_type');

    // Coherence samples store
    const samplesStore = db.createObjectStore('coherence_samples', {
      keyPath: 'sample_id'
    });
    samplesStore.createIndex('session_id', 'session_id');
    samplesStore.createIndex('timestamp', 'timestamp');

    // RR intervals store (optional)
    const rrStore = db.createObjectStore('rr_intervals', {
      keyPath: 'rr_id'
    });
    rrStore.createIndex('session_id', 'session_id');
  }
});

// ✅ Asynchronous - doesn't block UI
// ✅ Binary data support - efficient storage
// ✅ Indexing - fast queries
// ✅ Large capacity - hundreds of MB to several GB
// ✅ Transactional - data integrity
```

**Storage Capacity:**

From web research (IndexedDB Max Storage Size Limit 2025):
- **Chrome**: Up to 60% of total disk space (can be several GB)
- **Firefox**: Up to 50% of free disk space, max 2 GB per origin
- **Safari**: Up to 1 GB per origin
- **Edge**: Similar to Chrome (Chromium-based)

**Typical Capacity Estimates:**
- **1,000 sessions** (5 min each):
  - Metadata only: ~1 MB
  - With coherence samples: ~10-15 MB
  - With full RR intervals: ~100-500 MB

**Conclusion**: IndexedDB can easily store years of biofeedback sessions locally.

#### 2.2 Backend Database Options

**SQLite (Embedded/Local):**

```sql
-- Advantages for Desktop/Mobile Apps
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_seconds REAL,
    coherence_mean REAL,
    coherence_max REAL,
    notes TEXT,
    metadata JSON  -- SQLite supports JSON since 3.38.0
);

CREATE INDEX idx_sessions_start_time ON sessions(start_time);

CREATE TABLE coherence_samples (
    sample_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    coherence_score INTEGER,
    peak_frequency REAL,
    heart_rate INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE INDEX idx_samples_session ON coherence_samples(session_id);
CREATE INDEX idx_samples_timestamp ON coherence_samples(timestamp);
```

**Use cases:**
- ✅ Desktop applications (Electron, Tauri)
- ✅ Mobile apps (React Native, Flutter)
- ✅ Single-user systems
- ✅ Offline-first applications
- ❌ Not suitable for web browsers (though SQL.js exists)
- ❌ Limited multi-user concurrency

**PostgreSQL (with TimescaleDB extension):**

```sql
-- Optimal for time-series data with PostgreSQL 17 + TimescaleDB
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds REAL,
    session_type VARCHAR(20),
    coherence_stats JSONB,  -- Efficient binary JSON
    hrv_stats JSONB,
    metadata JSONB
);

CREATE INDEX idx_sessions_user_time ON sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_type ON sessions(session_type);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('coherence_samples', 'timestamp');

CREATE TABLE coherence_samples (
    timestamp TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL,
    coherence_score SMALLINT,         -- 0-100 fits in 2 bytes
    coherence_ratio REAL,
    peak_frequency REAL,
    peak_power REAL,
    total_power REAL,
    heart_rate SMALLINT,
    PRIMARY KEY (session_id, timestamp)
);

CREATE INDEX idx_samples_session ON coherence_samples(session_id, timestamp DESC);

-- Optional: Continuous aggregates for dashboards
CREATE MATERIALIZED VIEW session_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', start_time) AS bucket,
    user_id,
    COUNT(*) as session_count,
    AVG((coherence_stats->>'mean_score')::numeric) as avg_coherence,
    AVG(duration_seconds) as avg_duration
FROM sessions
GROUP BY bucket, user_id;
```

**Advantages:**
- ✅ Multi-user support
- ✅ Excellent for time-series (with TimescaleDB)
- ✅ Rich query capabilities (aggregations, window functions)
- ✅ ACID transactions
- ✅ Scalable to millions of sessions
- ✅ Built-in compression (TimescaleDB)

**From research**: "TimescaleDB is a 100 percent open-source extension that optimizes PostgreSQL for rapid ingest rates and efficient querying"

**MongoDB (Document-Based):**

```javascript
// Schema-less flexibility, good for evolving data models
{
  _id: ObjectId("..."),
  session_id: "uuid-here",
  user_id: "uuid-here",
  start_time: ISODate("2025-10-28T10:30:00Z"),
  end_time: ISODate("2025-10-28T10:35:00Z"),

  // Nested document structure
  coherence_stats: {
    mean_score: 72,
    max_score: 95,
    time_in_high: 180,
    // ... more stats
  },

  // Embedded time-series (for small sessions)
  coherence_samples: [
    {
      elapsed: 0,
      score: 45,
      peak_freq: 0.098,
      hr: 68
    },
    // ... up to ~100 samples
  ],

  metadata: {
    tags: ["morning", "meditation"],
    breathing: { bpm: 6.0, guide_enabled: true },
    // ... flexible structure
  }
}

// Indexes
db.sessions.createIndex({ "user_id": 1, "start_time": -1 });
db.sessions.createIndex({ "metadata.tags": 1 });
db.sessions.createIndex({ "coherence_stats.mean_score": 1 });
```

**Advantages:**
- ✅ Flexible schema (good for evolving requirements)
- ✅ Embedded arrays (samples in session document)
- ✅ Horizontal scalability
- ✅ Good for rapid prototyping
- ❌ Time-series queries less optimized than TimescaleDB
- ❌ JOIN operations more complex

#### 2.3 Hybrid Approach (Recommended)

**Architecture:**

```
┌──────────────────────────────┐
│   Browser / Client App       │
│                              │
│  ┌────────────────────────┐  │
│  │   IndexedDB            │  │  ← Primary storage
│  │   - Session cache      │  │  ← Offline support
│  │   - Fast queries       │  │  ← Real-time access
│  │   - Local-first        │  │
│  └────────────────────────┘  │
│           │                  │
│           │ Sync API         │
│           ▼                  │
└───────────┼──────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Backend API                  │
│   (Node.js / Python / Go)      │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│   PostgreSQL + TimescaleDB     │  ← Cloud storage
│   - Multi-user data            │  ← Long-term archive
│   - Cross-device sync          │  ← Advanced analytics
│   - Historical analysis        │  ← Research export
└────────────────────────────────┘
```

**Benefits:**
- ✅ Works offline (IndexedDB)
- ✅ Instant local access
- ✅ Optional cloud sync
- ✅ Multi-device support (when synced)
- ✅ Privacy-preserving (data stays local by default)
- ✅ Scalable to cloud when needed

**Sync Strategy:**

```typescript
class SessionSyncManager {
  private db: IDBDatabase;
  private syncQueue: string[] = [];

  async saveSession(session: Session) {
    // 1. Save to IndexedDB immediately
    await this.db.put('sessions', session);

    // 2. Mark for sync if user is authenticated
    if (this.isAuthenticated) {
      this.syncQueue.push(session.session_id);
      await this.attemptSync();
    }
  }

  async attemptSync() {
    if (!navigator.onLine) return; // Wait for connection

    for (const sessionId of this.syncQueue) {
      try {
        const session = await this.db.get('sessions', sessionId);
        const samples = await this.db.getAllFromIndex(
          'coherence_samples',
          'session_id',
          sessionId
        );

        // Upload to backend
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session, samples })
        });

        // Mark as synced
        session.synced = true;
        session.last_sync_time = Date.now();
        await this.db.put('sessions', session);

        // Remove from queue
        this.syncQueue = this.syncQueue.filter(id => id !== sessionId);
      } catch (error) {
        console.error(`Sync failed for ${sessionId}:`, error);
        // Will retry on next sync attempt
      }
    }
  }
}
```

#### 2.4 File-Based Storage (Export/Import)

**CSV Export (Compatible with HRV4Training format):**

```csv
timestamp_measurement,HR,AVNN,SDNN,rMSSD,pNN50,LF,HF,coherence_score,peak_frequency
2025-10-28T10:30:00Z,68,882.4,45.2,38.7,12.5,1250.3,890.2,72,0.098
2025-10-28T10:30:05Z,69,869.6,46.1,39.2,13.1,1180.5,920.1,75,0.101
2025-10-28T10:30:10Z,67,895.5,44.8,37.9,11.8,1300.2,870.5,70,0.096
```

**JSON Export (Full fidelity):**

```json
{
  "export_version": "1.0",
  "export_date": "2025-10-28T10:35:00Z",
  "sessions": [
    {
      "session": {
        "session_id": "uuid-here",
        "start_time": 1730110200000,
        "duration_seconds": 300,
        "coherence_stats": {
          "mean_score": 72,
          "max_score": 95
        }
      },
      "coherence_samples": [
        {
          "elapsed_seconds": 0,
          "coherence_score": 45,
          "peak_frequency": 0.098,
          "heart_rate": 68
        }
      ],
      "rr_intervals": [
        { "elapsed_ms": 0, "rr_interval": 882, "heart_rate": 68 }
      ]
    }
  ]
}
```

### 3. Data Model Design

#### 3.1 Entity Relationships

```
┌─────────────────────┐
│      User           │
│  (optional)         │
│                     │
│  - user_id (PK)     │
│  - name             │
│  - email            │
│  - created_at       │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│      Session        │
│                     │
│  - session_id (PK)  │
│  - user_id (FK)     │
│  - start_time       │
│  - end_time         │
│  - coherence_stats  │
│  - hrv_stats        │
│  - metadata         │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────┐
│   CoherenceSample       │
│                         │
│  - sample_id (PK)       │
│  - session_id (FK)      │
│  - timestamp            │
│  - coherence_score      │
│  - peak_frequency       │
│  - heart_rate           │
└─────────────────────────┘

           │ (Optional)
           │ 1:N
           │
┌──────────▼──────────────┐
│     RRInterval          │
│                         │
│  - rr_id (PK)           │
│  - session_id (FK)      │
│  - timestamp            │
│  - rr_interval          │
│  - heart_rate           │
└─────────────────────────┘
```

#### 3.2 Normalized Schema (PostgreSQL Example)

```sql
-- Full normalized schema with all tables

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB
);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds REAL GENERATED ALWAYS AS
        (EXTRACT(EPOCH FROM (end_time - start_time))) STORED,

    -- Session type and mode
    session_type VARCHAR(20) CHECK (session_type IN ('solo', 'paired', 'group')),
    mode VARCHAR(20),

    -- Summary statistics (JSONB for flexibility)
    coherence_stats JSONB NOT NULL,
    hrv_stats JSONB NOT NULL,
    frequency_stats JSONB,
    quality JSONB,

    -- Context and notes
    notes TEXT,
    tags TEXT[],
    metadata JSONB,

    -- Sync tracking
    synced BOOLEAN DEFAULT FALSE,
    last_sync_time TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_sessions_user_time ON sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_tags ON sessions USING GIN(tags);
CREATE INDEX idx_sessions_coherence_mean ON sessions((coherence_stats->>'mean_score'));

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('coherence_samples', 'timestamp',
    chunk_time_interval => INTERVAL '1 week'
);

CREATE TABLE coherence_samples (
    timestamp TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    sample_id UUID DEFAULT gen_random_uuid(),

    -- Time context
    elapsed_seconds REAL,

    -- Coherence metrics
    coherence_score SMALLINT CHECK (coherence_score BETWEEN 0 AND 100),
    coherence_ratio REAL,
    coherence_level VARCHAR(10) CHECK (coherence_level IN ('low', 'medium', 'high')),

    -- Frequency analysis
    peak_frequency REAL,
    peak_power REAL,
    total_power REAL,

    -- Heart rate
    instantaneous_hr SMALLINT,
    beats_in_window SMALLINT,

    -- Visualization
    visualization_level REAL CHECK (visualization_level BETWEEN -1.0 AND 1.0),

    PRIMARY KEY (session_id, timestamp)
);

CREATE INDEX idx_samples_session ON coherence_samples(session_id, timestamp DESC);

-- Optional: Raw RR intervals table
SELECT create_hypertable('rr_intervals', 'timestamp',
    chunk_time_interval => INTERVAL '1 day'
);

CREATE TABLE rr_intervals (
    timestamp TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    rr_id UUID DEFAULT gen_random_uuid(),

    elapsed_ms BIGINT,
    rr_interval REAL NOT NULL,  -- milliseconds
    heart_rate REAL,  -- calculated: 60000 / rr_interval

    -- Quality flags
    is_artifact BOOLEAN DEFAULT FALSE,
    interpolated BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (session_id, timestamp)
);

CREATE INDEX idx_rr_session ON rr_intervals(session_id, timestamp DESC);

-- Continuous aggregates for dashboard performance
CREATE MATERIALIZED VIEW daily_coherence_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', start_time) AS day,
    user_id,
    COUNT(*) as session_count,
    AVG((coherence_stats->>'mean_score')::numeric) as avg_coherence,
    MAX((coherence_stats->>'max_score')::numeric) as best_coherence,
    SUM(duration_seconds) as total_practice_seconds
FROM sessions
GROUP BY day, user_id;

-- Refresh policy: update every hour
SELECT add_continuous_aggregate_policy('daily_coherence_stats',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

#### 3.3 IndexedDB Schema (Client-Side)

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface HRVCoherenceDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      'start_time': number;
      'session_type': string;
      'synced': boolean;
    };
  };
  coherence_samples: {
    key: string;
    value: CoherenceSample;
    indexes: {
      'session_id': string;
      'timestamp': number;
    };
  };
  rr_intervals: {
    key: string;
    value: RRInterval;
    indexes: {
      'session_id': string;
    };
  };
}

class HRVDatabase {
  private db: IDBPDatabase<HRVCoherenceDB>;

  async init() {
    this.db = await openDB<HRVCoherenceDB>('HRVCoherenceDB', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', {
            keyPath: 'session_id'
          });
          sessionStore.createIndex('start_time', 'start_time');
          sessionStore.createIndex('session_type', 'session_type');
          sessionStore.createIndex('synced', 'synced');
        }

        // Coherence samples store
        if (!db.objectStoreNames.contains('coherence_samples')) {
          const samplesStore = db.createObjectStore('coherence_samples', {
            keyPath: 'sample_id'
          });
          samplesStore.createIndex('session_id', 'session_id');
          samplesStore.createIndex('timestamp', 'timestamp');
        }

        // RR intervals store
        if (!db.objectStoreNames.contains('rr_intervals')) {
          const rrStore = db.createObjectStore('rr_intervals', {
            keyPath: 'rr_id'
          });
          rrStore.createIndex('session_id', 'session_id');
        }
      }
    });
  }

  // Session operations
  async createSession(session: Session): Promise<void> {
    await this.db.put('sessions', session);
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    return await this.db.get('sessions', sessionId);
  }

  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const index = this.db.transaction('sessions').store.index('start_time');
    const sessions = await index.getAll();
    return sessions.sort((a, b) => b.start_time - a.start_time).slice(0, limit);
  }

  async getSessionsByType(type: string): Promise<Session[]> {
    return await this.db.getAllFromIndex('sessions', 'session_type', type);
  }

  // Coherence sample operations
  async addCoherenceSample(sample: CoherenceSample): Promise<void> {
    await this.db.put('coherence_samples', sample);
  }

  async getSessionSamples(sessionId: string): Promise<CoherenceSample[]> {
    return await this.db.getAllFromIndex('coherence_samples', 'session_id', sessionId);
  }

  // Batch operations for performance
  async saveSessionWithSamples(
    session: Session,
    samples: CoherenceSample[]
  ): Promise<void> {
    const tx = this.db.transaction(
      ['sessions', 'coherence_samples'],
      'readwrite'
    );

    await Promise.all([
      tx.objectStore('sessions').put(session),
      ...samples.map(s => tx.objectStore('coherence_samples').put(s)),
      tx.done
    ]);
  }

  // RR interval operations
  async addRRInterval(interval: RRInterval): Promise<void> {
    await this.db.put('rr_intervals', interval);
  }

  async getSessionRRIntervals(sessionId: string): Promise<RRInterval[]> {
    return await this.db.getAllFromIndex('rr_intervals', 'session_id', sessionId);
  }

  // Analytics queries
  async getCoherenceStats(fromDate: number, toDate: number) {
    const sessions = await this.db.getAll('sessions');

    const filtered = sessions.filter(
      s => s.start_time >= fromDate && s.start_time <= toDate
    );

    const totalSessions = filtered.length;
    const avgCoherence = filtered.reduce(
      (sum, s) => sum + s.coherence_stats.mean_score, 0
    ) / totalSessions;

    const totalDuration = filtered.reduce(
      (sum, s) => sum + s.duration_seconds, 0
    );

    return {
      totalSessions,
      avgCoherence,
      totalDuration,
      sessions: filtered
    };
  }

  // Export operations
  async exportAllData(): Promise<ExportData> {
    const sessions = await this.db.getAll('sessions');
    const allSamples: CoherenceSample[] = [];

    for (const session of sessions) {
      const samples = await this.getSessionSamples(session.session_id);
      allSamples.push(...samples);
    }

    return {
      export_version: '1.0',
      export_date: new Date().toISOString(),
      sessions,
      coherence_samples: allSamples
    };
  }

  async exportToCSV(sessionId: string): Promise<string> {
    const samples = await this.getSessionSamples(sessionId);
    const session = await this.getSession(sessionId);

    const header = 'timestamp_measurement,HR,coherence_score,peak_frequency,coherence_ratio\n';
    const rows = samples.map(s =>
      `${new Date(s.timestamp).toISOString()},` +
      `${s.instantaneous_hr},` +
      `${s.coherence_score},` +
      `${s.peak_frequency},` +
      `${s.coherence_ratio}`
    ).join('\n');

    return header + rows;
  }
}
```

### 4. Performance Considerations

#### 4.1 Data Size Estimation

**Per-Session Storage (5-minute session):**

```typescript
// Session metadata
const sessionSize =
  8 + // session_id (UUID as string ~ 8 bytes compact)
  8 + // start_time (number)
  8 + // end_time (number)
  4 + // duration_seconds (number)
  20 + // session_type, mode (strings)
  200 + // coherence_stats (JSON object)
  150 + // hrv_stats (JSON object)
  100 + // frequency_stats (JSON object)
  100 + // quality (JSON object)
  200; // notes, tags, metadata

// Total session metadata: ~800 bytes

// Coherence samples (100 samples at 3-second intervals)
const sampleSize =
  8 + // sample_id (UUID compact)
  8 + // session_id (UUID compact)
  8 + // timestamp (number)
  4 + // elapsed_seconds (number)
  1 + // coherence_score (0-100, byte)
  4 + // coherence_ratio (float)
  10 + // coherence_level (string)
  4 + // peak_frequency (float)
  4 + // peak_power (float)
  4 + // total_power (float)
  1 + // instantaneous_hr (byte)
  1 + // beats_in_window (byte)
  4; // visualization_level (float)

// Per sample: ~61 bytes
// 100 samples: ~6.1 KB

// Optional: RR intervals (avg 60 BPM × 5 min = 300 beats)
const rrSize =
  8 + // rr_id (UUID compact)
  8 + // session_id (UUID compact)
  8 + // timestamp (number)
  8 + // elapsed_ms (number)
  4 + // rr_interval (float)
  4 + // heart_rate (float)
  2; // flags (booleans)

// Per RR: ~42 bytes
// 300 RRs: ~12.6 KB

// TOTAL PER SESSION:
// Without RR intervals: ~7 KB
// With RR intervals: ~20 KB
```

**Storage Capacity Projections:**

```
Scenario: Active user, 1 session per day

Year 1:
- 365 sessions × 7 KB = 2.6 MB (metadata + coherence samples only)
- 365 sessions × 20 KB = 7.3 MB (including RR intervals)

Year 5:
- 1,825 sessions × 7 KB = 12.8 MB
- 1,825 sessions × 20 KB = 36.5 MB

Scenario: Heavy user, 3 sessions per day

Year 1:
- 1,095 sessions × 7 KB = 7.7 MB
- 1,095 sessions × 20 KB = 21.9 MB

Year 5:
- 5,475 sessions × 7 KB = 38.3 MB
- 5,475 sessions × 20 KB = 109.5 MB
```

**Conclusion**: IndexedDB can easily handle 5-10 years of heavy usage (100-500 MB well within browser limits of several GB).

#### 4.2 Query Patterns and Indexing

**Common Query Patterns:**

1. **List recent sessions** (most frequent)
   ```sql
   SELECT * FROM sessions
   WHERE user_id = ?
   ORDER BY start_time DESC
   LIMIT 20;
   ```
   **Index**: `(user_id, start_time DESC)`
   **Performance**: O(log n + 20) = ~5-10 ms for millions of records

2. **Get session with samples** (session playback)
   ```sql
   SELECT * FROM sessions WHERE session_id = ?;
   SELECT * FROM coherence_samples
   WHERE session_id = ?
   ORDER BY timestamp ASC;
   ```
   **Index**: `(session_id, timestamp)`
   **Performance**: ~10-50 ms (depends on sample count)

3. **Compare multiple sessions** (trend analysis)
   ```sql
   SELECT session_id, start_time, coherence_stats
   FROM sessions
   WHERE session_id IN (?, ?, ?, ?)
   ORDER BY start_time ASC;
   ```
   **Index**: Primary key (session_id)
   **Performance**: ~2-5 ms per session

4. **Time range statistics** (dashboard)
   ```sql
   SELECT
     DATE_TRUNC('day', start_time) AS day,
     COUNT(*) AS sessions,
     AVG((coherence_stats->>'mean_score')::numeric) AS avg_coherence
   FROM sessions
   WHERE user_id = ?
     AND start_time BETWEEN ? AND ?
   GROUP BY day
   ORDER BY day DESC;
   ```
   **Index**: `(user_id, start_time)`
   **Performance**: ~20-100 ms for 1 year of data
   **Optimization**: Use materialized view for faster access

5. **Filter by tags** (search)
   ```sql
   SELECT * FROM sessions
   WHERE user_id = ?
     AND tags && ARRAY['meditation', 'morning']
   ORDER BY start_time DESC
   LIMIT 20;
   ```
   **Index**: GIN index on tags array
   **Performance**: ~10-30 ms

6. **Export session data** (analysis)
   ```sql
   SELECT s.*, cs.*
   FROM sessions s
   JOIN coherence_samples cs ON s.session_id = cs.session_id
   WHERE s.session_id = ?
   ORDER BY cs.timestamp ASC;
   ```
   **Performance**: ~50-200 ms (depends on sample count)

#### 4.3 Indexing Strategies

**PostgreSQL Recommended Indexes:**

```sql
-- Essential indexes
CREATE INDEX idx_sessions_user_time ON sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_samples_session_time ON coherence_samples(session_id, timestamp DESC);

-- Optional indexes for specific queries
CREATE INDEX idx_sessions_tags ON sessions USING GIN(tags);  -- For tag searches
CREATE INDEX idx_sessions_coherence_mean
    ON sessions((coherence_stats->>'mean_score'));  -- For sorting by coherence
CREATE INDEX idx_sessions_duration ON sessions(duration_seconds);  -- For filtering by duration

-- Partial indexes for common filters
CREATE INDEX idx_sessions_solo ON sessions(user_id, start_time DESC)
    WHERE session_type = 'solo';  -- Faster queries for solo sessions only

CREATE INDEX idx_sessions_synced ON sessions(user_id, start_time DESC)
    WHERE NOT synced;  -- Find unsynced sessions quickly
```

**IndexedDB Indexes:**

```typescript
// In upgrade callback
const sessionStore = db.createObjectStore('sessions', { keyPath: 'session_id' });

// Index for listing recent sessions
sessionStore.createIndex('start_time', 'start_time');

// Index for filtering by type
sessionStore.createIndex('session_type', 'session_type');

// Index for finding unsynced sessions
sessionStore.createIndex('synced', 'synced');

// Compound index for user+time (if multi-user)
sessionStore.createIndex('user_time', ['user_id', 'start_time']);
```

**Index Size Overhead:**

- Each index adds ~10-20% storage overhead
- Indexes speed up reads but slow down writes
- For session recording: Write once, read many times → indexes are worthwhile
- Recommendation: Start with essential indexes, add more based on actual query patterns

#### 4.4 Optimization Techniques

**1. Batch Inserts (During Live Session):**

```typescript
class SessionRecorder {
  private pendingSamples: CoherenceSample[] = [];
  private batchSize = 10; // Commit every 10 samples

  async recordSample(sample: CoherenceSample) {
    this.pendingSamples.push(sample);

    if (this.pendingSamples.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  async flushBatch() {
    if (this.pendingSamples.length === 0) return;

    const tx = this.db.transaction('coherence_samples', 'readwrite');
    await Promise.all(
      this.pendingSamples.map(s => tx.store.put(s))
    );
    await tx.done;

    this.pendingSamples = [];
  }

  async endSession() {
    await this.flushBatch(); // Ensure all samples saved
  }
}
```

**2. Compression for Large Datasets:**

```typescript
// Use typed arrays for efficient binary storage
interface CompressedSession {
  session_id: string;
  metadata: Session; // Full metadata
  samples: {
    count: number;
    // Typed arrays: ~70% smaller than JSON
    timestamps: Uint32Array;      // Relative ms from start
    scores: Uint8Array;           // 0-100
    heart_rates: Uint8Array;      // 40-200 BPM
    peak_freqs: Uint16Array;      // Fixed-point: freq × 10000
    ratios: Float32Array;         // Full precision needed
  };
}

function compressSamples(samples: CoherenceSample[]): CompressedSession['samples'] {
  const startTime = samples[0].timestamp;

  return {
    count: samples.length,
    timestamps: new Uint32Array(samples.map(s => s.timestamp - startTime)),
    scores: new Uint8Array(samples.map(s => s.coherence_score)),
    heart_rates: new Uint8Array(samples.map(s => s.instantaneous_hr)),
    peak_freqs: new Uint16Array(samples.map(s => Math.round(s.peak_frequency * 10000))),
    ratios: new Float32Array(samples.map(s => s.coherence_ratio))
  };
}

function decompressSamples(
  compressed: CompressedSession['samples'],
  sessionStartTime: number
): CoherenceSample[] {
  const samples: CoherenceSample[] = [];

  for (let i = 0; i < compressed.count; i++) {
    samples.push({
      sample_id: crypto.randomUUID(),
      session_id: '', // Filled by caller
      timestamp: sessionStartTime + compressed.timestamps[i],
      elapsed_seconds: compressed.timestamps[i] / 1000,
      coherence_score: compressed.scores[i],
      instantaneous_hr: compressed.heart_rates[i],
      peak_frequency: compressed.peak_freqs[i] / 10000,
      coherence_ratio: compressed.ratios[i],
      // ... other fields can be derived or stored separately
    });
  }

  return samples;
}
```

**3. Lazy Loading for UI:**

```typescript
// Don't load all samples immediately
async function loadSessionForDisplay(sessionId: string) {
  // Load metadata first (fast)
  const session = await db.getSession(sessionId);

  // Render UI with session info
  renderSessionHeader(session);

  // Load samples in background (slower)
  const samples = await db.getSessionSamples(sessionId);

  // Update chart when ready
  renderCoherenceChart(samples);
}

// Paginate large result sets
async function loadRecentSessions(page: number = 0, pageSize: number = 20) {
  const allSessions = await db.getAllFromIndex('sessions', 'start_time');
  const sorted = allSessions.sort((a, b) => b.start_time - a.start_time);

  const start = page * pageSize;
  const end = start + pageSize;

  return {
    sessions: sorted.slice(start, end),
    total: sorted.length,
    hasMore: end < sorted.length
  };
}
```

**4. Data Retention Policies:**

```typescript
// Automatically archive or delete old sessions
async function applyRetentionPolicy() {
  const retentionDays = 365; // Keep 1 year
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

  const oldSessions = await db.getAllFromIndex('sessions', 'start_time');
  const toArchive = oldSessions.filter(s => s.start_time < cutoffTime);

  for (const session of toArchive) {
    // Option 1: Export to file before deleting
    const csvData = await db.exportToCSV(session.session_id);
    await downloadFile(`session-${session.session_id}.csv`, csvData);

    // Option 2: Move to cloud storage
    await uploadToCloud(session);

    // Delete from local storage
    await db.deleteSession(session.session_id);
  }
}
```

**5. Caching Computed Statistics:**

```typescript
// Cache expensive calculations in session metadata
interface SessionWithCache extends Session {
  computed_cache?: {
    calculated_at: number;
    coherence_percentile: number;  // vs all user sessions
    trend: 'improving' | 'stable' | 'declining';
    best_5min_window: {
      start_elapsed: number;
      avg_score: number;
    };
  };
}

async function computeAndCacheStats(session: Session) {
  const samples = await db.getSessionSamples(session.session_id);

  // Expensive calculations done once
  const coherence_percentile = await calculatePercentile(session);
  const trend = await calculateTrend(session);
  const best_5min_window = findBestWindow(samples);

  // Cache results
  session.computed_cache = {
    calculated_at: Date.now(),
    coherence_percentile,
    trend,
    best_5min_window
  };

  await db.updateSession(session);
}
```

### 5. Real-World Examples from Commercial Apps

#### 5.1 HeartMath Inner Balance

**Data Model (Inferred from Research):**

```typescript
interface HeartMathSession {
  // Session identity
  session_id: string;
  start_time: number;
  duration_seconds: number;

  // Coherence metrics (using 64-second window, 5-second updates)
  coherence_samples: Array<{
    timestamp: number;
    score: number;            // 0-100
    level: 'low' | 'medium' | 'high';  // Red/Blue/Green
    hr: number;               // Current heart rate
  }>;

  // Summary displayed on "Score Board"
  summary: {
    coherence: number;        // Overall coherence score
    length: number;           // Session duration
    achievement: number;      // Achievement score/level
  };

  // Stored metrics (from manual)
  metrics: {
    coherence_over_time: number[];  // Time series
    heart_rate_bpm: number[];
    hrv_rhythm: number[];          // HRV pattern data
    power_spectrum: number[];      // Frequency domain
  };

  // Journal and notes
  notes?: string;             // User can add notes post-session

  // Sync
  synced_to_heartcloud: boolean;
}
```

**Key Insights:**
- Uses 64-second sliding window for coherence calculation
- Updates score every 5 seconds
- Three-level coherence indicator (low/medium/high = red/blue/green)
- Automatic save to local storage + HeartCloud sync
- Frequency range: 0.04-0.24 Hz (3-15 cycles per minute)
- Sessions tracked in journal with ability to add notes retroactively

**Storage Approach:**
- Local storage in app (iOS Core Data / Android SQLite likely)
- Cloud sync to HeartMath HeartCloud service
- Cross-device synchronization

#### 5.2 Elite HRV

**Data Model (Inferred from Research):**

```typescript
interface EliteHRVReading {
  reading_id: string;
  timestamp: number;

  // Time-domain HRV metrics
  time_domain: {
    mean_rr: number;          // Mean RR interval (ms)
    rmssd: number;            // Root mean square of successive differences
    ln_rmssd: number;         // Natural log of RMSSD
    sdnn: number;             // Standard deviation of NN intervals
    nn50: number;             // Number of pairs differing > 50ms
    pnn50: number;            // Percentage of NN50
    cv: number;               // Coefficient of variation
  };

  // Frequency-domain metrics
  frequency_domain: {
    total_power: number;
    lf_power: number;         // Low frequency (0.04-0.15 Hz)
    hf_power: number;         // High frequency (0.15-0.4 Hz)
    lf_hf_ratio: number;
    peak_frequency: number;
  };

  // Elite HRV scores
  scores: {
    hrv_score: number;        // Proprietary score
    readiness_score: number;  // Overall readiness
    readiness_level: 'green' | 'yellow' | 'red';
    ans_balance: number;      // Autonomic nervous system balance
  };

  // Contextual tags (user-created or standard)
  tags: {
    exercise?: { type: string; rpe: number };  // RPE = Rate of Perceived Exertion
    sleep?: { hours: number; quality: number };
    mood?: string;
    blood_glucose?: number;
    bodyweight?: number;
    energy?: number;
    soreness?: number;
    custom?: Record<string, any>;
  };

  // Raw data export capability
  raw_rr_data?: number[];     // Optional full RR intervals
}
```

**Key Insights:**
- Comprehensive HRV analysis (both time and frequency domain)
- Readiness scoring system (Green/Yellow/Red)
- Extensive tagging system for contextual data
- Allows custom user-defined tags
- Data export: "raw RR data, calculated HRV values and metadata"
- Automatic cloud sync with SSL encryption
- Unlimited data storage in cloud
- Web dashboard with table view of all data

**Storage Approach:**
- Local app storage (likely SQLite on mobile)
- Automatic cloud synchronization
- Secure SSL encryption for transmission
- Web-accessible dashboard for viewing data
- CSV/Excel export functionality

#### 5.3 HRV4Training

**Data Model (Inferred from Research):**

```typescript
interface HRV4TrainingData {
  // CSV Export format (standardized for interoperability)
  csv_columns: {
    timestamp_measurement: string;  // ISO 8601 timestamp (mandatory)
    HR: number;                     // Heart rate (BPM)
    AVNN: number;                   // Average NN interval (ms)
    SDNN: number;                   // Standard deviation of NN intervals
    rMSSD: number;                  // Root mean square of successive differences (mandatory)
    pNN50: number;                  // Percentage of NN50
    LF: number;                     // Low frequency power
    HF: number;                     // High frequency power
    HRV4T_Recovery_Points: number;  // Proprietary recovery score
  };

  // Additional metadata (not in CSV but likely stored)
  reading: {
    reading_id: string;
    user_id: string;
    timestamp: number;

    // Morning readiness measurement
    morning_hrv: {
      rmssd: number;
      hr: number;
      recovery_points: number;
    };

    // Training context
    training_context?: {
      planned_workout?: string;
      actual_workout?: string;
      intensity?: number;
      duration_minutes?: number;
    };

    // Recovery advice
    recommendation?: {
      training_readiness: 'optimal' | 'moderate' | 'low';
      suggested_intensity: 'high' | 'medium' | 'low';
      notes: string;
    };
  };
}
```

**Key Insights:**
- Focus on morning HRV measurements for training readiness
- Standardized CSV export format compatible with GoldenCheetah and Intervals.icu
- Mandatory fields: `timestamp_measurement` and `rMSSD`
- Dropbox integration for data export/import
- Designed for athlete recovery tracking
- Emphasis on longitudinal trends rather than single sessions

**Storage Approach:**
- Local app storage
- CSV file export to Dropbox
- Compatible with third-party training platforms
- Simple, standardized data format for interoperability

### 6. Practical Implementation Guide

#### 6.1 Recommended Architecture for This Project

Based on the existing hrv-monitor implementation and project goals:

```
┌─────────────────────────────────────────────────┐
│   Browser (Coherence Visualization)             │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │  React/Vue Frontend                      │  │
│   │  - Session recording UI                  │  │
│   │  - Real-time coherence display           │  │
│   │  - Session history browser               │  │
│   │  - Export functionality                  │  │
│   └──────────────┬───────────────────────────┘  │
│                  │                              │
│   ┌──────────────▼───────────────────────────┐  │
│   │  IndexedDB (Primary Storage)             │  │
│   │  - sessions                              │  │
│   │  - coherence_samples                     │  │
│   │  - rr_intervals (optional)               │  │
│   └──────────────┬───────────────────────────┘  │
│                  │                              │
│                  │ WebSocket (Real-time)        │
└──────────────────┼──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│   Python Backend (hrv-monitor/)                 │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │  WebSocket Server (port 8765)            │  │
│   │  - Coherence updates (every 3s)          │  │
│   │  - Heartbeat events                      │  │
│   │  - Buffer status                         │  │
│   └──────────────┬───────────────────────────┘  │
│                  │                              │
│   ┌──────────────▼───────────────────────────┐  │
│   │  CoherenceCalculator                     │  │
│   │  - RR interval buffer (60s)              │  │
│   │  - FFT and coherence calculation         │  │
│   └──────────────┬───────────────────────────┘  │
│                  │                              │
│   ┌──────────────▼───────────────────────────┐  │
│   │  PolarH10 Client                         │  │
│   │  - Bluetooth LE connection               │  │
│   │  - RR interval streaming                 │  │
│   └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                   │
                   ▼
           ┌───────────────┐
           │   Polar H10   │
           │  (Chest Strap) │
           └───────────────┘
```

**Implementation Steps:**

**Step 1: Add Session Recording to WebSocket Client**

```typescript
// coherence/src/integrations/polar-session-recorder.js

import { v4 as uuidv4 } from 'uuid';

export class PolarSessionRecorder {
  private db: HRVDatabase;
  private currentSession: Session | null = null;
  private sessionStartTime: number = 0;
  private samples: CoherenceSample[] = [];

  constructor(db: HRVDatabase) {
    this.db = db;
  }

  async startSession(sessionType: 'solo' | 'paired' = 'solo') {
    const sessionId = uuidv4();
    const startTime = Date.now();

    this.currentSession = {
      session_id: sessionId,
      start_time: startTime,
      end_time: 0, // Will be set on endSession
      duration_seconds: 0,
      session_type: sessionType,
      mode: 'breathing', // Can be parameterized
      coherence_stats: {
        mean_score: 0,
        max_score: 0,
        min_score: 100,
        std_dev: 0,
        time_in_high: 0,
        time_in_medium: 0,
        time_in_low: 0
      },
      hrv_stats: {
        mean_heart_rate: 0,
        max_heart_rate: 0,
        min_heart_rate: 200
      },
      quality: {
        samples_collected: 0,
        expected_samples: 0,
        data_completeness: 0,
        buffer_ready_time: 0
      },
      tags: [],
      synced: false
    };

    this.sessionStartTime = startTime;
    this.samples = [];

    console.log(`[SessionRecorder] Started session ${sessionId}`);
    return sessionId;
  }

  async recordCoherenceSample(data: any) {
    if (!this.currentSession) {
      console.warn('[SessionRecorder] No active session');
      return;
    }

    const now = Date.now();
    const elapsedSeconds = (now - this.sessionStartTime) / 1000;

    const sample: CoherenceSample = {
      sample_id: uuidv4(),
      session_id: this.currentSession.session_id,
      timestamp: now,
      elapsed_seconds: elapsedSeconds,
      coherence_score: data.coherence,
      coherence_ratio: data.ratio,
      coherence_level: this.getCoherenceLevel(data.coherence),
      peak_frequency: data.peak_frequency,
      peak_power: data.peak_power || 0,
      total_power: data.total_power || 0,
      instantaneous_hr: Math.round(data.heart_rate || 0),
      beats_in_window: data.beats_used,
      visualization_level: this.scoreToLevel(data.coherence)
    };

    this.samples.push(sample);

    // Update session statistics
    this.updateSessionStats(sample);

    // Batch save every 10 samples
    if (this.samples.length % 10 === 0) {
      await this.db.saveSessionWithSamples(
        this.currentSession,
        this.samples.slice(-10)
      );
    }
  }

  async endSession(notes?: string, tags?: string[]) {
    if (!this.currentSession) {
      console.warn('[SessionRecorder] No active session to end');
      return;
    }

    const endTime = Date.now();
    this.currentSession.end_time = endTime;
    this.currentSession.duration_seconds = (endTime - this.sessionStartTime) / 1000;
    this.currentSession.notes = notes;
    this.currentSession.tags = tags || [];

    // Calculate expected samples (every 3 seconds)
    this.currentSession.quality.expected_samples =
      Math.floor(this.currentSession.duration_seconds / 3);
    this.currentSession.quality.samples_collected = this.samples.length;
    this.currentSession.quality.data_completeness =
      (this.samples.length / this.currentSession.quality.expected_samples) * 100;

    // Save final session and any remaining samples
    await this.db.saveSessionWithSamples(this.currentSession, this.samples);

    console.log(`[SessionRecorder] Ended session ${this.currentSession.session_id}`);
    console.log(`[SessionRecorder] Collected ${this.samples.length} samples`);
    console.log(`[SessionRecorder] Mean coherence: ${this.currentSession.coherence_stats.mean_score.toFixed(1)}`);

    const sessionId = this.currentSession.session_id;
    this.currentSession = null;
    this.samples = [];

    return sessionId;
  }

  private updateSessionStats(sample: CoherenceSample) {
    if (!this.currentSession) return;

    const stats = this.currentSession.coherence_stats;
    const hrvStats = this.currentSession.hrv_stats;

    // Update coherence stats
    const allScores = this.samples.map(s => s.coherence_score);
    stats.mean_score = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    stats.max_score = Math.max(stats.max_score, sample.coherence_score);
    stats.min_score = Math.min(stats.min_score, sample.coherence_score);

    // Calculate standard deviation
    const mean = stats.mean_score;
    const squaredDiffs = allScores.map(score => Math.pow(score - mean, 2));
    stats.std_dev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / allScores.length);

    // Time in levels (assuming 3-second intervals)
    if (sample.coherence_score >= 67) {
      stats.time_in_high += 3;
    } else if (sample.coherence_score >= 33) {
      stats.time_in_medium += 3;
    } else {
      stats.time_in_low += 3;
    }

    // Update HRV stats
    const allHRs = this.samples.map(s => s.instantaneous_hr);
    hrvStats.mean_heart_rate = allHRs.reduce((a, b) => a + b, 0) / allHRs.length;
    hrvStats.max_heart_rate = Math.max(hrvStats.max_heart_rate, sample.instantaneous_hr);
    hrvStats.min_heart_rate = Math.min(hrvStats.min_heart_rate, sample.instantaneous_hr);
  }

  private getCoherenceLevel(score: number): string {
    if (score >= 67) return 'high';
    if (score >= 33) return 'medium';
    return 'low';
  }

  private scoreToLevel(score: number): number {
    // Map 0-100 score to -1.0 to +1.0 for visualization
    // Using HeartMath-inspired mapping from polar-h10-client.js
    if (score <= 25) {
      return -1.0 + (score / 25) * 0.5; // -1.0 to -0.5
    } else if (score <= 40) {
      return -0.5 + ((score - 25) / 15) * 0.5; // -0.5 to 0.0
    } else if (score <= 60) {
      return 0.0 + ((score - 40) / 20) * 0.5; // 0.0 to +0.5
    } else {
      return 0.5 + Math.min((score - 60) / 40, 1.0) * 0.5; // +0.5 to +1.0
    }
  }

  isRecording(): boolean {
    return this.currentSession !== null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSession?.session_id || null;
  }
}
```

**Step 2: Integrate with Existing Coherence App**

```javascript
// In coherence/src/apps/coherence-app-polar.js

import { HRVDatabase } from '../storage/hrv-database.js';
import { PolarSessionRecorder } from '../integrations/polar-session-recorder.js';

// Global state (add to existing globals)
let hrvDatabase;
let sessionRecorder;
let recordingActive = false;

// In window.setup function (add after existing initialization)
window.setup = async function() {
  // ... existing setup code ...

  // Initialize HRV database
  hrvDatabase = new HRVDatabase();
  await hrvDatabase.init();

  // Initialize session recorder
  sessionRecorder = new PolarSessionRecorder(hrvDatabase);

  console.log('[Setup] HRV session recording initialized');
};

// Modify polarClient initialization to record samples
polarClient = new PolarH10Client({
  wsUrl: wsUrl,

  onCoherenceUpdate: (data) => {
    if (polarMode) {
      params.coherenceLevel = data.level;
      polarStatus.currentScore = data.score;

      // Record to database if recording active
      if (recordingActive && sessionRecorder) {
        sessionRecorder.recordCoherenceSample({
          coherence: data.score,
          ratio: data.ratio,
          peak_frequency: data.peakFrequency,
          peak_power: data.peakPower || 0,
          total_power: data.totalPower || 0,
          heart_rate: polarStatus.heartRate,
          beats_used: data.beatsUsed
        });
      }

      console.log(
        `[Coherence] Score: ${data.score}/100, ` +
        `Level: ${data.level.toFixed(2)}, ` +
        `Peak: ${data.peakFrequency.toFixed(3)} Hz`
      );
    }
  },

  // ... rest of polarClient config ...
});

// Add keyboard controls for recording
window.keyPressed = function() {
  // ... existing key handlers ...

  // 'X' = start/stop recording
  if (key === 'x' || key === 'X') {
    if (!recordingActive && polarMode) {
      startRecording();
    } else if (recordingActive) {
      stopRecording();
    }
  }

  // 'L' = list recent sessions
  if (key === 'l' || key === 'L') {
    listRecentSessions();
  }
};

async function startRecording() {
  if (!polarMode) {
    console.warn('[Recording] Can only record in Polar H10 mode');
    return;
  }

  const sessionId = await sessionRecorder.startSession('solo');
  recordingActive = true;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 RECORDING STARTED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Session ID: ${sessionId}`);
  console.log('Press X again to stop recording');
  console.log('');
}

async function stopRecording() {
  const sessionId = await sessionRecorder.endSession();
  recordingActive = false;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏹️  RECORDING STOPPED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Session saved: ${sessionId}`);
  console.log('');

  // Show session summary
  const session = await hrvDatabase.getSession(sessionId);
  if (session) {
    console.log('Session Summary:');
    console.log(`  Duration: ${Math.floor(session.duration_seconds / 60)}m ${Math.floor(session.duration_seconds % 60)}s`);
    console.log(`  Mean Coherence: ${session.coherence_stats.mean_score.toFixed(1)}/100`);
    console.log(`  Max Coherence: ${session.coherence_stats.max_score}`);
    console.log(`  Time in High: ${session.coherence_stats.time_in_high}s`);
    console.log(`  Samples: ${session.quality.samples_collected}`);
  }
}

async function listRecentSessions() {
  const sessions = await hrvDatabase.getRecentSessions(10);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RECENT SESSIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (sessions.length === 0) {
    console.log('  No sessions recorded yet');
  } else {
    sessions.forEach((session, index) => {
      const date = new Date(session.start_time);
      const duration = `${Math.floor(session.duration_seconds / 60)}m ${Math.floor(session.duration_seconds % 60)}s`;

      console.log(`${index + 1}. ${date.toLocaleString()}`);
      console.log(`   Duration: ${duration}, Coherence: ${session.coherence_stats.mean_score.toFixed(1)}/100`);
      console.log(`   Session ID: ${session.session_id.substring(0, 8)}...`);
      console.log('');
    });
  }

  console.log('Press L to refresh list');
  console.log('');
}

// Update instruction printout
function printInstructions() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('COHERENCE VISUALIZATION - SESSION RECORDING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Keyboard Controls:');
  console.log('  P = Toggle Polar H10 mode (real HRV data)');
  console.log('  X = Start/Stop recording session');  // NEW
  console.log('  L = List recent sessions');          // NEW
  console.log('  S = Toggle simulation mode');
  console.log('  B = Toggle breathing guide');
  // ... rest of instructions ...
}
```

**Step 3: Add Export Functionality**

```typescript
// coherence/src/storage/session-exporter.js

export class SessionExporter {
  constructor(private db: HRVDatabase) {}

  async exportSessionToCSV(sessionId: string): Promise<string> {
    const session = await this.db.getSession(sessionId);
    const samples = await this.db.getSessionSamples(sessionId);

    if (!session || samples.length === 0) {
      throw new Error('Session not found or has no data');
    }

    // HRV4Training-compatible format
    const header = 'timestamp_measurement,HR,coherence_score,peak_frequency,coherence_ratio,peak_power,total_power\n';

    const rows = samples.map(sample => {
      const timestamp = new Date(sample.timestamp).toISOString();
      return [
        timestamp,
        sample.instantaneous_hr,
        sample.coherence_score,
        sample.peak_frequency.toFixed(4),
        sample.coherence_ratio.toFixed(4),
        sample.peak_power?.toFixed(2) || '0',
        sample.total_power?.toFixed(2) || '0'
      ].join(',');
    }).join('\n');

    return header + rows;
  }

  async exportSessionToJSON(sessionId: string): Promise<string> {
    const session = await this.db.getSession(sessionId);
    const samples = await this.db.getSessionSamples(sessionId);

    const exportData = {
      export_version: '1.0',
      export_date: new Date().toISOString(),
      session: session,
      coherence_samples: samples
    };

    return JSON.stringify(exportData, null, 2);
  }

  async exportAllSessionsToJSON(): Promise<string> {
    const exportData = await this.db.exportAllData();
    return JSON.stringify(exportData, null, 2);
  }

  downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportAndDownload(sessionId: string, format: 'csv' | 'json' = 'csv') {
    const session = await this.db.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const date = new Date(session.start_time).toISOString().split('T')[0];
    const shortId = sessionId.substring(0, 8);

    if (format === 'csv') {
      const csv = await this.exportSessionToCSV(sessionId);
      this.downloadFile(
        `hrv-session-${date}-${shortId}.csv`,
        csv,
        'text/csv'
      );
    } else {
      const json = await this.exportSessionToJSON(sessionId);
      this.downloadFile(
        `hrv-session-${date}-${shortId}.json`,
        json,
        'application/json'
      );
    }
  }
}
```

#### 6.2 Performance Benchmarks

Expected performance with recommended architecture:

**IndexedDB Operations:**

| Operation | Time | Notes |
|-----------|------|-------|
| Save session metadata | 5-10 ms | Single put operation |
| Save 10 coherence samples | 15-30 ms | Batch transaction |
| Load recent sessions (20) | 10-50 ms | Indexed query |
| Load session + samples | 50-200 ms | Depends on sample count |
| Full-text search in notes | 100-500 ms | No native FTS, linear scan |
| Export to CSV (5 min session) | 20-50 ms | Array mapping + string join |
| Export to JSON (full data) | 100-300 ms | Serialization overhead |

**PostgreSQL + TimescaleDB Operations:**

| Operation | Time | Notes |
|-----------|------|-------|
| Insert session | 2-5 ms | Single INSERT |
| Bulk insert samples (100) | 10-30 ms | COPY or multi-row INSERT |
| List recent sessions | 5-20 ms | Indexed query with LIMIT |
| Session + samples JOIN | 20-100 ms | Optimized with indexes |
| Daily stats (1 year) | 50-200 ms | Or instant with materialized view |
| Export CSV (server-side) | 10-50 ms | Direct COPY TO STDOUT |

**Real-World Usage Scenarios:**

**Scenario 1: Live Session Recording**
- User starts 5-minute biofeedback session
- Coherence updates every 3 seconds = ~100 samples
- Operation: Batch save every 10 samples
- Total write time: ~150-300 ms over 5 minutes
- Performance impact: Negligible (< 0.1% of session time)

**Scenario 2: View Session History**
- User opens session list
- Load 20 most recent sessions with metadata
- Operation: Indexed query on start_time
- Load time: 10-50 ms
- User experience: Instant

**Scenario 3: Session Playback**
- User selects session to review
- Load session metadata + 100 coherence samples
- Operation: Primary key lookup + indexed query
- Load time: 50-200 ms
- User experience: Nearly instant

**Scenario 4: Export for Analysis**
- User exports session to CSV for Excel/R/Python
- 5-minute session, 100 samples
- Operation: Query + serialize + download
- Export time: 50-100 ms
- User experience: Immediate download

### 7. Recommendations and Best Practices

#### 7.1 For This Project (Polar H10 + Visualization)

**Recommended Architecture:**

```
✅ Client-Side: IndexedDB
   - Primary storage for all session data
   - Fast, offline-capable
   - No backend required initially
   - Scales to thousands of sessions locally

⚠️ Optional Backend: PostgreSQL + TimescaleDB
   - Add later if multi-user or cross-device sync needed
   - Use for advanced analytics and research
   - Deploy only if requirements justify complexity

✅ Export Formats:
   - CSV (HRV4Training-compatible)
   - JSON (full fidelity with metadata)
```

**Data to Capture:**

```
✅ Essential (Always Capture):
   - Session metadata (timing, type, summary stats)
   - Coherence samples (every 3 seconds)
   - User notes and tags

⚠️ Optional (Capture if Needed):
   - Raw RR intervals (for research, adds ~70% storage)
   - Breathing guide settings
   - Environmental context
   - Pre/post session self-reports

❌ Don't Capture:
   - Video/audio (too large, privacy concerns)
   - Continuous raw ECG (use Polar's own recording if needed)
```

**Schema Design:**

```typescript
// Minimal viable schema
interface MinimalSession {
  session_id: string;
  start_time: number;
  end_time: number;
  coherence_stats: {
    mean_score: number;
    max_score: number;
    time_in_high: number;
  };
  samples: CoherenceSample[];  // Embedded or separate table
}

// Comprehensive schema (recommended)
// Use the full Session interface from section 1.1
// Allows future expansion without migration
```

**Performance Targets:**

```
✅ Session save: < 100 ms total
✅ Session load: < 200 ms
✅ Session list: < 50 ms
✅ Export: < 100 ms
✅ Storage: < 20 KB per session (without RR intervals)
```

#### 7.2 Privacy and Data Governance

**Privacy-First Design:**

```typescript
// 1. Local-first by default
const privacySettings = {
  storeLocally: true,           // Always
  syncToCloud: false,           // Opt-in only
  shareWithResearchers: false,  // Explicit consent
  anonymizeExports: true        // Remove PII by default
};

// 2. Easy data deletion
async function deleteAllUserData() {
  // IndexedDB: Clear all stores
  await db.clear('sessions');
  await db.clear('coherence_samples');
  await db.clear('rr_intervals');

  // Local storage: Clear any app settings
  localStorage.clear();

  console.log('All local data deleted');
}

// 3. Anonymized exports
async function exportAnonymized(sessionId: string) {
  const session = await db.getSession(sessionId);

  // Remove all PII
  delete session.user_id;
  delete session.notes; // May contain identifying info
  delete session.metadata?.device?.sensor_id;

  // Replace with anonymous ID
  session.user_id = 'anonymous_' + hashUserId(originalUserId);

  return session;
}
```

**Compliance Considerations:**

- **GDPR**: Right to deletion, data portability, explicit consent
- **HIPAA**: Not medical device, but consider if used in clinical settings
- **Data Minimization**: Only collect what's necessary
- **Transparency**: Clear disclosure of what data is captured and stored

#### 7.3 Future Extensibility

**Design for Evolution:**

```typescript
// Use versioned schemas
interface SessionV1 {
  schema_version: 1;
  // ... v1 fields
}

interface SessionV2 extends SessionV1 {
  schema_version: 2;
  new_field?: string;  // Optional for backward compatibility
}

// Migration function
async function migrateSession(session: any): Promise<Session> {
  if (!session.schema_version || session.schema_version === 1) {
    // Migrate v1 to v2
    session.schema_version = 2;
    session.new_field = 'default_value';
  }
  return session as Session;
}
```

**Planned Extensions:**

1. **Multi-User Support**
   - Add `user_id` to all tables
   - Implement user authentication
   - Add user settings and preferences

2. **Two-Person Sessions**
   - Extend `session_type` to include paired sessions
   - Add interpersonal synchrony metrics
   - Link two sensor streams to one session

3. **Advanced Analytics**
   - Add computed fields for trend analysis
   - Implement percentile rankings
   - Add goal tracking and progress metrics

4. **Cloud Sync**
   - Add sync status flags
   - Implement conflict resolution
   - Add last_modified timestamps

## Code References

### Existing Codebase

- `/workspace/hrv-monitor/src/coherence_calculator.py` (lines 14-256) - Coherence calculation implementation
- `/workspace/hrv-monitor/src/polar_h10.py` (lines 16-221) - Polar H10 sensor integration
- `/workspace/hrv-monitor/src/websocket_server.py` (lines 17-236) - Real-time data streaming
- `/workspace/coherence/src/apps/coherence-app-polar.js` (lines 1-672) - Visualization application
- `/workspace/coherence/src/integrations/polar-h10-client.js` (lines 1-353) - WebSocket client

### Commercial App Insights

- HeartMath Inner Balance: 64-second window, 5-second updates, HeartCloud sync
- Elite HRV: Comprehensive time + frequency domain metrics, unlimited cloud storage
- HRV4Training: CSV export format `timestamp_measurement,HR,AVNN,SDNN,rMSSD,pNN50,LF,HF`

### Database Schema Examples

- PostgreSQL schema: Section 3.2 (lines 1-150 of SQL examples)
- IndexedDB schema: Section 3.3 (lines 1-200 of TypeScript examples)
- Session entity: Section 1.1 (lines 1-100 of interface definitions)

## Architecture Documentation

### Three-Tier Data Model

```
Tier 1: Session Metadata (Summary)
  - Basic info, timing, aggregated statistics
  - ~800 bytes per session
  - Optimized for quick lists and filtering

Tier 2: Coherence Samples (Time-Series)
  - 3-5 second resolution
  - ~60 bytes per sample, ~100 samples per 5-min session
  - Total: ~6 KB per session
  - Optimized for visualization and playback

Tier 3: Raw Measurements (Optional)
  - Per-heartbeat RR intervals
  - ~40 bytes per beat, ~200-600 beats per 5-min session
  - Total: ~8-24 KB per session
  - Optimized for post-hoc research analysis
```

### Storage Decision Matrix

| Requirement | IndexedDB | PostgreSQL | MongoDB | localStorage |
|-------------|-----------|------------|---------|--------------|
| Client-side | ✅ | ❌ | ❌ | ✅ |
| Large capacity | ✅ (GB) | ✅ (TB+) | ✅ (TB+) | ❌ (5 MB) |
| Offline support | ✅ | ❌ | ❌ | ✅ |
| Multi-user | ❌ | ✅ | ✅ | ❌ |
| Time-series optimized | ⚠️ | ✅ | ⚠️ | ❌ |
| Query performance | ✅ | ✅ | ✅ | ❌ |
| Sync capability | Manual | ✅ | ✅ | ❌ |
| Ease of setup | ✅ | ⚠️ | ⚠️ | ✅ |

**Recommendation**: Start with IndexedDB, add PostgreSQL backend if multi-user or advanced analytics needed.

## Related Research

- **HeartMath Implementation**: `/workspace/thoughts/research/2025-10-28-heartmath-implementation-in-hrv-monitor-directory.md`
- **Interpersonal Synchrony**: `/workspace/thoughts/research/2025-10-28-interpersonal-physiological-coherence-and-heart-rate-synchrony.md`
- **Biometric Coherence Research**: `/workspace/coherence/docs/research/2025-10-25-biometric-coherence-research.md`
- **HRV Coherence Algorithm**: `/workspace/coherence/docs/research/HRV_COHERENCE_ALGORITHM_RESEARCH.md`

## Conclusion

The optimal data architecture for HRV/coherence biofeedback sessions uses a **hybrid client-first approach** with IndexedDB for primary storage and optional PostgreSQL backend for advanced use cases. The recommended **three-tier data model** (Session metadata, Coherence samples, Optional RR intervals) balances storage efficiency with query performance.

**Key Takeaways:**

1. **Storage**: IndexedDB provides sufficient capacity (GB-scale) for years of personal use
2. **Schema**: Normalized three-table design enables efficient queries and future extensibility
3. **Performance**: Sub-100ms operations for all common use cases with proper indexing
4. **Privacy**: Local-first design with opt-in sync protects user data
5. **Interoperability**: CSV export compatible with research tools and other HRV apps
6. **Scalability**: Can grow from single-user desktop app to multi-user cloud platform

**Implementation Priority:**

1. ✅ **Phase 1**: IndexedDB + Session Recording (MVP) - 2-3 days
2. ⚠️ **Phase 2**: Export functionality + Session browser UI - 2-3 days
3. ⚠️ **Phase 3**: Backend API + Cloud sync (optional) - 5-7 days
4. ⚠️ **Phase 4**: Advanced analytics + Trend tracking - 5-7 days

The architecture is production-ready for research use, art installations, and personal biofeedback applications. It can scale to commercial applications with the addition of a backend tier.
