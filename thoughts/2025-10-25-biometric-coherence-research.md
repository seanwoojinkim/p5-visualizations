# Biometric Coherence Research: Academic Studies on Interpersonal Physiological Synchrony

**Date:** October 25, 2025
**Purpose:** Research for interactive art installation measuring biometric coherence between two people
**Focus:** Low-cost sensors, self-administered measurements, real-time feedback systems

---

## Executive Summary

This comprehensive research report examines current academic studies (2018-2025) on biometric coherence between two people, focusing on practical measures suitable for art installations. The research covers Heart Rate Variability (HRV) synchronization, physiological synchrony metrics, respiratory synchrony, skin conductance, and provides specific hardware recommendations with implementation details.

**Key Findings:**
- **Heart Rate Variability (HRV)** synchronization is the most studied and accessible biometric for interpersonal coherence
- **Consumer-grade sensors** (Polar H10, MAX30102) can achieve research-quality measurements
- **Wavelet Transform Coherence** and **Cross-Correlation** are the primary analysis methods
- **Real-time feedback systems** have been successfully implemented in art installations and neurofeedback applications
- **Python libraries** exist for rapid prototyping (pyHRV, hrv-analysis, Systole)

---

## 1. Heart Rate Variability (HRV) Synchronization

### 1.1 Overview and Importance

Heart rate variability (HRV) synchronization between individuals has emerged as the most accessible and well-studied measure of interpersonal physiological coherence. HRV reflects the variation in time intervals between consecutive heartbeats, serving as an indicator of autonomic nervous system activity.

### 1.2 Key Academic Studies (2023-2025)

#### Study 1: "Interpersonal Physiological Synchrony During Dyadic Joint Action" (2025)
- **Source:** Boukarras et al., Psychophysiology Journal
- **Link:** https://pmc.ncbi.nlm.nih.gov/articles/PMC11913774/

**Key Findings:**
- Interpersonal physiological synchrony (IPS) refers to temporal coordination of autonomic states during social encounters
- Task novelty significantly increases physiological synchrony
- Social anxiety negatively predicts IPS (more anxious dyads show less alignment)
- Task switching characterized by increased HRV

**Methodology:**
- **Sensors:** Disposable Ag/AgCl electrodes on left wrist and both ankles
- **Equipment:** g.HIAMP biosignal amplifier with g.RECORDER software
- **Sampling Rate:** 512 Hz for ECG acquisition
- **Primary Metric:** Inter-beat intervals (IBIs) extracted from ECG

**Analysis Method:**
1. **Pre-processing:** High-pass filter (0.6 Hz) to remove baseline wandering, low-pass filter (20 Hz)
2. **Stationarity Correction:** ARIMA modeling to eliminate autocorrelation
3. **Cross-Correlation:** Computed across ±3 second windows
4. **Control:** 13,260 pseudo-dyad pairs to distinguish genuine synchrony from coincidence
5. **HRV Metric:** rMSSD (root mean square of successive RR interval differences)

#### Study 2: "How Our Hearts Beat Together" (2023)
- **Source:** Scientific Reports
- **Link:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10368740/

**Key Findings:**
- Significant increases in heart rate synchronization during joint motor tasks
- **Important caveat:** Control analysis showed NO difference between correctly paired and randomized dyads
- Conclusion: Synchronization resulted from shared mental state (task engagement) rather than dyadic connection
- Suggests need for careful control conditions in synchrony research

**Methodology:**
- **Equipment:** 3-channel continuous ECG (SOMNOtouch™ NIBP, SOMNO Medics)
- **Electrode Configuration:** Modified Einthoven configuration on chest
- **Analysis:** Wavelet Transform Coherence across two frequency bands:
  - Low-frequency: 0.04-0.15 Hz
  - High-frequency: 0.15-0.40 Hz
- **HRV Analysis:** Welch's method for power spectral density

**Critical Insight for Art Installations:**
This study suggests that simply measuring synchrony isn't enough - you need to determine whether synchrony is specific to the pair or just a shared response to the same stimulus. For an art context, this might actually be acceptable (shared experience creates alignment), but it's important to understand the mechanism.

#### Study 3: "Interpersonal Heart Rate Synchrony Predicts Effective Information Processing" (2024)
- **Source:** PNAS (Proceedings of the National Academy of Sciences)
- **Link:** https://pmc.ncbi.nlm.nih.gov/articles/PMC11127007/

**Key Findings:**
- Heart rate synchrony predicted group decision-making success with >70% cross-validation accuracy
- Provides a biomarker of interpersonal engagement that facilitates adaptive learning
- Demonstrates practical predictive value of synchrony measures

### 1.3 HRV Metrics for Coherence Assessment

#### Time-Domain Metrics

**RMSSD (Root Mean Square of Successive Differences)**
- **Calculation:** Square root of the mean of squared differences between successive RR intervals
- **What it measures:** Beat-to-beat variability, parasympathetic nervous system activity
- **Advantage:** Can be reliably measured in recordings as short as 10 seconds
- **Real-time suitable:** YES - ideal for continuous monitoring
- **Formula:** RMSSD = √(Σ(RR_i+1 - RR_i)² / (N-1))

**SDNN (Standard Deviation of NN Intervals)**
- **Calculation:** Standard deviation of all RR intervals
- **What it measures:** Overall HRV influenced by both fast and slow changes
- **Typical window:** 90-second periods in research studies
- **Real-time suitable:** Moderate - requires longer windows than RMSSD

**PNN50**
- **Calculation:** Percentage of successive RR intervals differing by more than 50ms
- **What it measures:** Parasympathetic activity
- **Real-time suitable:** YES

#### Frequency-Domain Metrics

**LF (Low Frequency) Power: 0.04-0.15 Hz**
- Reflects both sympathetic and parasympathetic activity
- Associated with blood pressure regulation

**HF (High Frequency) Power: 0.15-0.40 Hz**
- Reflects parasympathetic (vagal) activity
- Linked to respiratory sinus arrhythmia

**LF/HF Ratio**
- Indicates sympatho-vagal balance
- Higher values suggest sympathetic dominance (stress)

#### Coherence-Specific Metrics

**HeartMath Coherence Score**
- **Frequency:** Most common coherence at 0.10 Hz (range 0.04-0.10 Hz)
- **Requirement:** Minimum 80 beats to calculate
- **Update Rate:** Score updates every 5 seconds in real-time systems
- **Characteristic:** High-amplitude peak in HRV power spectrum at ~0.1 Hz resonance frequency

### 1.4 HRV Synchrony Analysis Methods

#### Method 1: Cross-Correlation Analysis

**How it works:**
- Compares two time series (Person A's IBI vs Person B's IBI)
- Computes correlation at various time lags
- Peak correlation indicates synchrony strength and temporal relationship

**Implementation:**
```
1. Extract IBI time series from both participants
2. Resample to consistent rate (typically 4 Hz)
3. Apply windowed analysis (e.g., ±3 second windows)
4. Compute Pearson correlation at each lag
5. Apply Fisher's Z-transformation for statistical analysis
```

**Advantages:**
- Simple to understand and implement
- Captures both in-phase and anti-phase synchrony
- Well-established statistical framework

**Disadvantages:**
- Assumes stationarity (may need ARIMA pre-processing)
- Doesn't capture frequency-specific coherence

#### Method 2: Wavelet Transform Coherence (WTC)

**How it works:**
- Analyzes correlation between two signals across multiple time scales
- Provides time-frequency representation of synchrony
- Standard method for hyperscanning and physiological synchrony research

**Implementation:**
- Uses continuous wavelet transform (typically Morlet wavelet)
- Computes coherence in specific frequency bands
- Generates time-frequency coherence maps

**Advantages:**
- Handles non-stationary signals well
- Frequency-specific analysis
- Unaffected by interregional HRF changes
- Most common in recent literature (2023-2025)

**Disadvantages:**
- More computationally intensive
- Requires more expertise to interpret

**Key Parameters:**
- Wavelength range: 10-20 seconds shows highest correlations
- Low frequency band: 0.04-0.15 Hz
- High frequency band: 0.15-0.40 Hz

#### Method 3: Windowed Cross-Correlation

**How it works:**
- Segments time series into smaller windows
- Shifts segments to account for varying delays
- Accounts for fluctuating synchrony levels

**Implementation:**
- Define window size (e.g., 15-30 seconds)
- Define maximum lag (e.g., ±5 seconds)
- Compute correlation for each window-lag combination
- Can update continuously (e.g., every 200ms)

**Advantages:**
- Captures dynamic changes in synchrony
- Suitable for real-time applications
- Accounts for variable delays between participants

#### Method 4: Transfer Entropy & Information Theory

**Normalized Symbolic Transfer Entropy (NSTE)**
- Measures information flow direction between participants
- Identifies "leader" vs "follower" patterns
- More sophisticated than correlation-based methods

**Advantages:**
- Provides directional information
- Can resolve ambiguous synchrony moments

**Disadvantages:**
- More complex to implement
- Requires more data

### 1.5 Practical Sensor Recommendations for HRV

#### Gold Standard: ECG-Based Sensors

**Polar H10 Heart Rate Monitor**
- **Type:** Chest strap with 1-lead ECG
- **Sampling Rate:** 1000 Hz (some sources report 130 Hz)
- **Connectivity:**
  - Bluetooth Smart (2 concurrent connections)
  - ANT+ (unlimited connections)
  - 5kHz analog heart rate
- **Cost:** ~$90-100 USD
- **Accuracy:** Validated as most accurate wearable compared to medical ECG
- **Key Feature:** Dual Bluetooth mode (enable in Polar Beat app)
- **Research Use:** Widely cited in academic literature
- **IBI Data:** Provides inter-beat interval data required for HRV
- **Recommendation:** **BEST CHOICE for art installation**

**Advantages for Art Installation:**
- Consumer-accessible price point
- Wireless (no cables restricting movement)
- Can connect two monitors simultaneously to one computer
- Research-validated accuracy
- Comfortable for 30+ minute sessions

**Implementation Notes:**
- Use ANT+ for easier multi-device connection (one-to-many broadcast)
- Or enable dual Bluetooth for two simultaneous BT connections per device
- Python libraries available (Systole can interface with Polar)

**Movesense**
- **Type:** ECG chest strap
- **Accuracy:** Similar to Polar H10
- **Cost:** ~$90-150 USD
- **Features:** 1-lead ECG, open API

#### Consumer PPG Sensors

**MAX30102 / MAX30105 PPG Sensors**
- **Type:** Photoplethysmography (optical)
- **Cost:** $5-15 USD per sensor
- **LEDs:**
  - MAX30102: Red + IR
  - MAX30105: Red + IR + Green
- **FIFO Buffer:** 32-bit
- **ADC Resolution:** 18-bit
- **Sampling:** Up to 400 Hz
- **Interface:** I2C
- **Arduino Library:** SparkFun MAX3010x library (most popular)
- **Application:** Finger or earlobe clip

**Advantages:**
- Very low cost
- Small form factor
- Easy Arduino/ESP32 integration
- Good for prototyping

**Disadvantages:**
- Motion artifacts affect accuracy significantly
- Lower HRV accuracy compared to ECG
- Requires proper contact pressure
- Beat detection accuracy lower than ECG

**Implementation Notes:**
- Use for prototyping or budget-constrained projects
- Requires careful signal processing (filtering, peak detection)
- Not all PPG sensors provide IBI data (required for HRV)

**DFRobot PPG Heart Rate Sensor**
- **Type:** Thumb-sized PPG sensor for Arduino
- **Interface:** Analog/Digital output
- **Cost:** ~$15-20 USD
- **Library:** DFRobot libraries available

#### Research-Grade Wearables

**Empatica E4**
- **Type:** Wrist-worn research-grade device
- **Sensors:** PPG (HR/HRV), EDA/GSR, temperature, accelerometer
- **Sampling Rate:** 4 Hz for EDA, 64 Hz for PPG
- **Cost:** €1,500-2,000
- **Validation:** Extensively validated in research
- **Advantages:** Non-invasive, naturalistic settings, multi-sensor
- **Disadvantages:** High cost, lower sampling rate than Shimmer

**Shimmer3 GSR+ Unit**
- **Type:** Laboratory-grade wearable
- **Sensors:** EDA/GSR, PPG
- **Sampling Rate:** 64 Hz for EDA
- **Cost:** €514 for sensor alone
- **Advantages:** High sampling rate, research accuracy
- **Disadvantages:**
  - Finger electrodes restrict movement
  - Higher cost
  - More invasive than wrist devices

**Comparison:**
A 2023 study compared these devices and found:
- **SCL correlation:** R = 0.681, p < 10⁻³⁴
- **HR correlation:** R = 0.596, p < 10⁻³³
- Both are suitable for research, but Empatica E4 better for naturalistic settings

#### Recommendation for Art Installation

**Budget: Under $500**
- 2x Polar H10 chest straps ($180-200 total)
- 1x Computer/Raspberry Pi with Bluetooth/ANT+ receiver
- Python for analysis and visualization

**Budget: Under $100**
- 2x MAX30102 PPG sensors ($10-30 total)
- 1x Arduino or ESP32 microcontroller ($20-40)
- Open-source Arduino libraries

**Budget: $3,000-4,000**
- 2x Empatica E4 devices
- Professional analysis software
- Multi-sensor data (HRV + skin conductance + temperature)

---

## 2. Respiratory Synchrony

### 2.1 Overview

Respiratory synchrony between two people occurs when their breathing patterns align in frequency, phase, or depth. It's often correlated with HRV synchrony through respiratory sinus arrhythmia (RSA) - the natural increase in heart rate during inspiration and decrease during expiration.

### 2.2 Measurement Techniques

#### Respiratory Sinus Arrhythmia (RSA)

**What it is:**
- Heart rate variability synchronized with respiration
- R-R interval shortens during inspiration, lengthens during expiration
- Can be extracted from ECG alone (no separate breathing sensor needed)

**Measurement Methods:**

**Peak-to-Trough Method:**
- Subtract shortest heart period (inspiration) from longest (expiration)
- Produces RSA estimate for each breath
- Simple to implement

**Automated Analysis:**
- AcqKnowledge and BIOPAC systems include automated RSA routines
- Measures max/min heart rate changes during respiration
- Reports difference between the two

**Sliding Window Method:**
- 15-second sliding window
- Updates every 200ms
- Provides continuous measure of cardiac vagal tone
- Good for real-time monitoring

**Software:**
- physio Python toolbox for ECG and respiratory signal processing
- Includes RSA analysis approaches

#### Direct Breathing Measurement

**Commercial Respiratory Belt Transducers:**
- Measure chest diameter changes during breathing
- Produce linear voltage proportional to length changes
- Typically use strain gauge or piezoelectric sensors

**Low-Cost DIY Approaches:**

**1. Piezoelectric Beeper Method**
- **Source:** Singing greeting card piezo beeper
- **Cost:** <$5
- **Materials:**
  - Piezo beeper from greeting card
  - Velcro strap (60cm × 2.5cm)
  - Latex strip (25-30cm × 2cm)
  - Copper wire (1-2mm thick)
  - Fast-curing epoxy
- **How it works:** Chest movement induces strain on piezo material, producing voltage
- **Output:** Can be recorded via Arduino or oscilloscope

**2. Piezoresistive Strain Sensors**
- **Type:** Conductive material + polymer mixture
- **Application:** Elastic belts on upper chest, lower chest, or abdomen
- **Measurement:** Resistance changes with thoracic/abdominal expansion
- **Commercial option:** FlexiForce sensor with 3D-printed chest strap

**3. Humidity Sensors (2023 Innovation)**
- **Type:** Bosch BME280 relative humidity sensor
- **Cost:** ~$10
- **Method:** Measures humidity changes in exhaled breath
- **Advantage:** 10x lower cost than industry standard
- **Note:** Requires nasal/oral positioning

**4. Capaciflector Sensors**
- **Type:** Thin, flat, flexible capacitive sensors
- **Size:** Few cm²
- **Weight:** <10 grams
- **Advantages:**
  - No skin preparation needed
  - Can be printed at low cost
  - Comfortable for extended wear

### 2.3 Low-Cost Sensor Recommendations

**For Art Installation - Respiratory Measurement:**

**Option 1: No Additional Hardware (Use ECG only)**
- Extract RSA from ECG/heart rate data
- No separate breathing sensor needed
- Lower cost, less invasive
- **Recommended for simplicity**

**Option 2: DIY Piezo Belt**
- $5-10 per participant
- Requires some fabrication
- Provides direct breathing measurement
- Good for workshops/educational component

**Option 3: Commercial Humidity Sensor**
- Bosch BME280 (~$10)
- Arduino/ESP32 compatible
- Nasal positioning may be awkward for art context

**Option 4: Commercial Respiratory Belt**
- PLUX Biosignals PZT sensor: ~€100-150
- NeuLog GSR sensor: ~$200
- Professional-grade
- More expensive but plug-and-play

---

## 3. Skin Conductance (Galvanic Skin Response - GSR/EDA)

### 3.1 Overview

Galvanic Skin Response (GSR), also called Electrodermal Activity (EDA), measures electrical conductance of skin, which changes with moisture level (sweating). It reflects emotional arousal and sympathetic nervous system activity.

### 3.2 Why GSR for Interpersonal Synchrony?

**Advantages:**
- Reflects emotional arousal and stress
- Simple to measure (just two electrodes)
- Relatively inexpensive sensors available
- Good indicator of sympathetic nervous system activity
- Complements HRV (which primarily reflects parasympathetic activity)

**Emotional Connection:**
- Studies show greater GSR synchrony in friend dyads vs strangers
- Particularly in positive emotion conditions
- Useful for measuring emotional contagion

### 3.3 Low-Cost GSR Sensors

**Grove GSR Sensor (Seeed Studio)**
- **Cost:** ~$15-20 USD
- **Interface:** Analog output for Arduino
- **Electrodes:** Two finger electrodes on one hand
- **Application:** Simple emotional monitoring projects
- **Library:** Arduino libraries available
- **Recommendation:** **BEST LOW-COST OPTION**

**DIY Arduino GSR**
- **Cost:** <$5
- **Components:**
  - 2x 250kΩ resistors in series
  - Breadboard
  - Ring terminals for finger contact
  - Arduino Uno
- **Output:** Analog voltage proportional to skin conductance

**Research-Grade Options:**

**Shimmer3 GSR+**
- **Cost:** €514
- **Sampling Rate:** 64 Hz
- **Application:** Professional research, therapy settings
- **Features:** Wireless, wearable
- **Disadvantages:** Finger electrodes restrict movement

**Empatica E4 (includes EDA)**
- **Cost:** €1,500-2,000
- **Sampling Rate:** 4 Hz for EDA
- **Electrodes:** Wrist placement (less invasive)
- **Additional sensors:** HR, temperature, accelerometer

**PLUX EDA Sensor**
- **Cost:** €175
- **Application:** Research and educational settings

### 3.4 Art Installation Examples

**"Stress Makes Art" Project**
- Used Arduino-based GSR sensor
- GSR value controlled visual generation speed
- Demonstrated simple biofeedback loop
- Total cost: <$50

**Implementation for Art:**
- GSR values can modulate:
  - Color intensity or hue
  - Animation speed
  - Sound pitch or volume
  - Particle density
  - Pattern complexity

### 3.5 Considerations

**Measurement Notes:**
- Typically requires 1-5 minutes to stabilize
- Sensitive to movement artifacts
- Temperature affects readings
- Slowly adapting (tonic component) vs fast changes (phasic component)

**For Interpersonal Synchrony:**
- Use same analysis methods as HRV (cross-correlation, wavelet coherence)
- Calculate Skin Conductance Level (SCL) - tonic component
- Or Skin Conductance Response (SCR) - phasic peaks

---

## 4. Multi-Modal Approaches

### 4.1 Combining Multiple Biometrics

Research shows that combining multiple physiological measures provides richer data about interpersonal connection:

**Recommended Combinations:**

**Tier 1: Basic (Budget <$300)**
- 2x Polar H10 for HRV synchrony
- RSA extracted from heart rate
- Focus: Heart-based coherence

**Tier 2: Enhanced (Budget <$400)**
- 2x Polar H10 for HRV
- 2x Grove GSR sensors
- Focus: Autonomic balance (parasympathetic + sympathetic)

**Tier 3: Comprehensive (Budget $3,000-4,000)**
- 2x Empatica E4
- Measures: HRV, EDA, temperature, movement
- Professional-grade multi-sensor approach

### 4.2 Notable Multi-Sensor Art Installation Projects

#### Rafael Lozano-Hemmer's "Pulse" Series

**Pulse Room:**
- Hundreds of incandescent bulbs
- Participants grip handle-shaped sensor
- Heartbeats converted to light pulses
- Creates shared physiological space

**Pulse Index:**
- Digital microscope (220x) captures fingerprint
- Heart rate sensor records pulse
- Projects 10,000 fingerprints with pulsating heartbeats
- Connects visitors through biometric data

**Pulse Tank:**
- Hand-placed sensors detect pulse
- Creates ripples on illuminated water tanks
- Reflected patterns on gallery walls
- Physical manifestation of heartbeat

#### "Hybrid Harmony" (Neurofeedback System)

**Technology:**
- Multi-person EEG neurofeedback
- Real-time brain-to-brain coupling calculation
- Visual and auditory feedback

**Sensors:**
- Compatible with MUSE, Emotiv EPOC/EPOC+, SMARTING, Brain Vision LiveAmp
- Uses LabStreamingLayer for data integration

**Interpersonal Synchrony Calculation:**
- 30-second data buffer
- 3-second analysis window
- Updates ~3.5x per second
- Metrics: Coherence, imaginary coherence, envelope correlation
- IIR filtering into frequency bands (theta, alpha, beta)

**Feedback:**
- Visual: Real-time synchrony visualization
- Auditory: Greater synchrony = more pleasant, stable chords
- Output protocols: LabStreamingLayer (recording) + OSC (experiences)

**Implementation:**
- Open-source Python package
- PyQt5 graphical interface
- User-adjustable parameters
- Channel and frequency band selection

---

## 5. Real-Time Analysis and Feedback Systems

### 5.1 Software Architectures

#### Typical Pipeline:
```
[Sensors] → [Data Acquisition] → [Signal Processing] → [Synchrony Analysis] → [Visualization/Sonification]
```

#### Data Acquisition Layer

**For Polar H10:**
- Bluetooth LE or ANT+ connection
- Python libraries:
  - `systole` - specifically for cardiac data synchronization
  - `pyheartlib` - Polar device interface
- Sampling: 1000 Hz (ECG) → IBI extraction

**For Arduino/ESP32 + PPG:**
- Serial communication or WiFi
- Sampling: 100-500 Hz
- Onboard preprocessing (moving average)
- WebSocket or Bluetooth to computer

**For Research-Grade (Empatica E4):**
- Proprietary SDK or BLE connection
- Streaming rate: 4-64 Hz depending on sensor

#### Signal Processing Layer

**Libraries:**

**Python HRV Libraries:**

1. **pyHRV** (Recommended)
   - GitHub: https://github.com/PGomes92/pyhrv
   - Features: 78 HRV parameters
   - Time domain, frequency domain, nonlinear
   - Well-documented

2. **hrv-analysis**
   - PyPI: https://pypi.org/project/hrv-analysis/
   - Preprocessing: Outlier and ectopic beat removal
   - Wide variety of HRV methods

3. **Systole** (Best for synchrony)
   - GitHub: https://github.com/embodied-computation-group/systole
   - **Specific synchronizing capabilities**
   - Designed for cardiac data from multiple participants

4. **RapidHRV**
   - For extensive cardiac data
   - Ultra-short window analysis
   - Automated artifact detection

**Processing Steps:**
1. IBI extraction from ECG or PPG
2. Artifact removal (ectopic beats, outliers)
3. Resampling to consistent rate (typically 4 Hz)
4. Optional: ARIMA modeling for stationarity
5. Calculate HRV metrics (RMSSD, SDNN, etc.)

#### Synchrony Analysis Layer

**Methods:**

**Cross-Correlation:**
```python
import numpy as np
from scipy import signal

def calculate_synchrony(ibi_person_a, ibi_person_b, window_size=30, lag_max=3):
    """
    Calculate cross-correlation based synchrony

    Parameters:
    - ibi_person_a, ibi_person_b: IBI time series
    - window_size: seconds
    - lag_max: maximum lag in seconds

    Returns:
    - max_correlation: peak correlation value
    - lag: lag at peak correlation
    """
    correlation = signal.correlate(ibi_person_a, ibi_person_b, mode='same')
    lags = signal.correlation_lags(len(ibi_person_a), len(ibi_person_b), mode='same')

    # Find peak within lag_max
    lag_samples = int(lag_max * sampling_rate)
    center = len(correlation) // 2
    valid_range = slice(center - lag_samples, center + lag_samples)

    max_idx = np.argmax(correlation[valid_range]) + (center - lag_samples)
    max_correlation = correlation[max_idx]
    lag = lags[max_idx]

    return max_correlation, lag
```

**Wavelet Coherence:**
- Can use `pycwt` library
- More complex but frequency-specific

**Real-Time Implementation:**
- Use sliding window approach
- Update every 200ms to 5 seconds
- Requires minimum data (e.g., 80 beats for HeartMath coherence)

#### Visualization/Sonification Layer

**Visual Feedback Examples:**

1. **Coherence Meter**
   - Simple gauge/meter showing 0-100% synchrony
   - Color coding: Red (low) → Yellow (medium) → Green (high)
   - Updates every 2-5 seconds

2. **Dual Waveform Display**
   - Show both participants' heart rate traces
   - Highlight moments of alignment
   - Optional: Overlay correlation value

3. **Abstract Generative Art**
   - Particle systems where synchrony affects:
     - Particle attraction/repulsion
     - Color harmony
     - Pattern complexity
     - Movement fluidity
   - Examples: Koi fish swimming patterns, flowing water, interconnected lights

4. **Shared Mandala/Pattern**
   - Two individuals co-create visual pattern
   - Synchrony increases pattern coherence and beauty
   - Lack of synchrony creates discord or fragmentation

**Auditory Feedback Examples:**

1. **Chord Harmonization**
   - Each person assigned a tone
   - High synchrony = consonant intervals (harmonious)
   - Low synchrony = dissonant intervals
   - Reference: Hybrid Harmony project

2. **Rhythm Alignment**
   - Each heartbeat triggers a sound
   - Synchrony creates rhythmic patterns
   - Visual: Bouncing balls that align when in sync

3. **Volume Modulation**
   - Base ambient sound
   - Volume increases with synchrony
   - Creates reinforcement loop

### 5.2 Real-Time Performance Considerations

**Latency Requirements:**
- Sensor → Computer: <100ms
- Processing: <500ms
- Feedback update: 1-5 seconds acceptable
- Total loop: <5 seconds for good user experience

**Computational Efficiency:**
- Use windowed approaches (avoid recomputing entire history)
- Pre-filter data (remove artifacts in real-time)
- Optimize for CPU or use GPU for heavy processing
- Consider edge computing (process on ESP32/Arduino before sending)

**Buffer Management:**
- Maintain circular buffer (e.g., 30-60 seconds of data)
- Balance between responsiveness and statistical reliability
- Minimum viable window: 10 seconds for RMSSD

### 5.3 Recommended Technology Stack

**For Python-Based System:**
```
Hardware:
- 2x Polar H10 or MAX30102 sensors
- Computer or Raspberry Pi 4

Software Stack:
- Python 3.8+
- Libraries:
  - systole (sensor interface + synchrony analysis)
  - pyHRV or hrv-analysis (HRV metrics)
  - numpy, scipy (signal processing)
  - matplotlib or PyQt5 (visualization)
  - python-osc (for sound engines)
  - pygame or Processing (for generative art)

Real-time Framework:
- Use threading for concurrent sensor reading
- Queue system for data buffering
- Separate processes for analysis and visualization
```

**For Arduino/ESP32-Based System:**
```
Hardware:
- 2x MAX30102/MAX30105 PPG sensors
- ESP32 microcontroller (WiFi enabled)
- Computer for visualization

Software:
- Arduino IDE or PlatformIO
- SparkFun MAX3010x library
- WiFi/WebSocket for data transmission
- Computer: Node.js + p5.js or Python + pygame

Advantages:
- Very low cost (<$100 total)
- Standalone operation possible
- Good for prototyping
```

---

## 6. Practical Implementation Guide for Art Installation

### 6.1 Recommended Setup (Best Balance of Cost/Quality)

**Hardware:**
- **2x Polar H10 Heart Rate Monitors** ($90 each = $180)
  - Gold standard for affordable HRV measurement
  - Wireless chest straps
  - Research-validated accuracy
  - Comfortable for extended wear

- **Optional: 2x Grove GSR Sensors** ($20 each = $40)
  - Add emotional arousal dimension
  - Simple finger attachment
  - Arduino-compatible

- **Computer:**
  - Raspberry Pi 4 (8GB) - $75
  - Or any laptop/desktop with Bluetooth

- **ANT+ USB Adapter** ($40) - if not using Bluetooth
  - Easier multi-device connection
  - More reliable than Bluetooth

**Total Budget:** $220-335

### 6.2 Software Setup

**Step 1: Sensor Connection**
```python
# Using systole library for Polar H10
from systole import serialSim
from systole.recording import Oximeter

# Initialize sensors
sensor_a = Oximeter(serial_port='/dev/ttyUSB0', add_channels=1)
sensor_b = Oximeter(serial_port='/dev/ttyUSB1', add_channels=1)

# Start recording
sensor_a.setup()
sensor_b.setup()
```

**Step 2: Real-Time IBI Extraction**
```python
import numpy as np
from collections import deque

# Circular buffers for IBI data
buffer_a = deque(maxlen=300)  # ~5 minutes at 1 sample/sec
buffer_b = deque(maxlen=300)

def extract_ibi(sensor):
    """Extract inter-beat interval from sensor"""
    recording = sensor.read()
    if recording['peaks'][-1] == 1:  # New heartbeat detected
        ibi = recording['ibi'][-1]
        return ibi
    return None

# Main loop
while True:
    ibi_a = extract_ibi(sensor_a)
    ibi_b = extract_ibi(sensor_b)

    if ibi_a:
        buffer_a.append(ibi_a)
    if ibi_b:
        buffer_b.append(ibi_b)
```

**Step 3: Calculate Synchrony**
```python
from scipy import signal
from scipy.stats import pearsonr

def calculate_realtime_synchrony(buffer_a, buffer_b, window_seconds=30):
    """
    Calculate synchrony using cross-correlation
    Returns synchrony score 0-100
    """
    if len(buffer_a) < window_seconds or len(buffer_b) < window_seconds:
        return 0  # Not enough data yet

    # Get last window_seconds of data
    data_a = np.array(list(buffer_a)[-window_seconds:])
    data_b = np.array(list(buffer_b)[-window_seconds:])

    # Normalize
    data_a = (data_a - np.mean(data_a)) / np.std(data_a)
    data_b = (data_b - np.mean(data_b)) / np.std(data_b)

    # Cross-correlation
    correlation = signal.correlate(data_a, data_b, mode='same')
    max_corr = np.max(correlation) / window_seconds

    # Convert to 0-100 scale
    synchrony_score = max(0, min(100, max_corr * 100))

    return synchrony_score
```

**Step 4: Visualization**
```python
import pygame
import colorsys

# Initialize pygame
pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

def visualize_coherence(synchrony_score):
    """
    Visual feedback: Color shifts from red (0) to green (100)
    Particle density increases with synchrony
    """
    # Color mapping
    hue = synchrony_score / 300  # 0 = red, 0.33 = green
    rgb = colorsys.hsv_to_rgb(hue, 1.0, 1.0)
    color = tuple(int(c * 255) for c in rgb)

    # Background color
    screen.fill((0, 0, 0))

    # Central circle grows with synchrony
    radius = int(50 + synchrony_score * 2)
    pygame.draw.circle(screen, color, (400, 300), radius)

    # Particles: more when synchronized
    num_particles = int(synchrony_score / 2)
    for _ in range(num_particles):
        x = random.randint(0, 800)
        y = random.randint(0, 600)
        pygame.draw.circle(screen, color, (x, y), 2)

    # Text overlay
    font = pygame.font.Font(None, 48)
    text = font.render(f"Coherence: {synchrony_score:.1f}%", True, (255, 255, 255))
    screen.blit(text, (250, 50))

    pygame.display.flip()

# Main visualization loop
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Calculate synchrony
    synchrony = calculate_realtime_synchrony(buffer_a, buffer_b)

    # Update visualization
    visualize_coherence(synchrony)

    clock.tick(30)  # 30 FPS
```

### 6.3 Alternative: Processing (p5.js) for Web-Based

**Advantages:**
- Beautiful generative art capabilities
- Web-based (can run in browser)
- Large creative coding community
- Easy to create flowing, organic visuals

**Example Concept:**
- Two koi fish representing each participant
- Fish swim closer together when heart rates synchronize
- Water ripples intensify with coherence
- Color harmony increases with synchrony

### 6.4 Space and Experience Design

**Physical Setup:**
- Two comfortable chairs or cushions
- 2-3 feet apart (close enough to feel connected, not touching)
- Facing each other or at 45° angle
- Soft lighting
- Quiet space or ambient soundscape

**Participant Instructions:**
1. "Put on the chest strap sensor (over or under clothing)"
2. "Sit comfortably and face your partner"
3. "Take a few deep breaths to settle in"
4. "The visualization shows your heart rhythm coherence"
5. "Try to synchronize by breathing together, making eye contact, or simply being present"
6. "Notice how the visualization changes"

**Session Duration:**
- Minimum: 3-5 minutes (enough time for synchrony to emerge)
- Optimal: 10-15 minutes
- Possible to extend to 30 minutes for deeper experience

**Facilitation Tips:**
- Allow 1-2 minutes for sensors to stabilize
- Suggest optional activities:
  - Breathing together
  - Eye gazing
  - Holding hands (if comfortable)
  - Listening to shared ambient music
- Debrief: Show them their synchrony graph afterwards

### 6.5 Troubleshooting Common Issues

**Low or No Signal:**
- Check sensor battery
- Ensure good skin contact (moisten chest strap if needed)
- Verify Bluetooth/ANT+ connection
- Check sensor placement (should be just below chest muscles)

**High Noise/Artifacts:**
- Participant movement - ask to sit still
- Electrical interference - move away from power sources
- Poor electrode contact - adjust strap tightness
- Motion artifacts - consider more stable sensor (ECG > PPG)

**No Synchrony Detected:**
- Ensure enough data (minimum 20-30 seconds)
- Check if participants are engaged (talking, distracted)
- Consider baseline period for comparison
- May be genuine lack of synchrony (this is valid data!)

**Performance/Lag:**
- Reduce visualization complexity
- Increase update interval (e.g., 5s instead of 1s)
- Use more efficient algorithms
- Pre-process data before visualization

---

## 7. Key Research Papers and Resources

### 7.1 Essential Papers (2023-2025)

1. **Boukarras et al. (2025)** - "Interpersonal Physiological Synchrony During Dyadic Joint Action Is Increased by Task Novelty and Reduced by Social Anxiety"
   - Journal: Psychophysiology
   - Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC11913774/
   - Key: Detailed methodology for IBI-based synchrony with cross-correlation

2. **Czeszumski et al. (2023)** - "How Our Hearts Beat Together: Study on Physiological Synchronization"
   - Journal: Scientific Reports
   - Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC10368740/
   - Key: Wavelet transform coherence method, important controls

3. **Mayo et al. (2024)** - "Interpersonal Heart Rate Synchrony Predicts Effective Information Processing"
   - Journal: PNAS
   - Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC11127007/
   - Key: Predictive value of synchrony for group dynamics

4. **Sclocco et al. (2023)** - "Wearable Technologies for Electrodermal and Cardiac Activity: Empatica E4 and Shimmer GSR3+ Comparison"
   - Journal: Sensors
   - Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC10346781/
   - Key: Validation of consumer research devices

5. **HeartMath Institute (2025)** - "Heart Rate Variability Biofeedback in a Global Study"
   - Journal: Scientific Reports
   - Link: https://www.nature.com/articles/s41598-025-87729-7
   - Key: Largest HRV biofeedback dataset, coherence frequency findings

### 7.2 Technical Resources

**Python Libraries:**
- pyHRV: https://github.com/PGomes92/pyhrv
- hrv-analysis: https://github.com/Aura-healthcare/hrv-analysis
- Systole: https://github.com/embodied-computation-group/systole
- RapidHRV: https://github.com/Aminsinichi/rapid-hrv

**Arduino/Hardware:**
- SparkFun MAX3010x Library: https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library
- Polar H10 SDK: https://github.com/polarofficial/polar-ble-sdk
- DFRobot PPG Sensor: https://www.dfrobot.com/product-1540.html

**Neurofeedback/Art:**
- Hybrid Harmony: https://www.frontiersin.org/journals/neuroergonomics/articles/10.3389/fnrgo.2021.687108/full
- Rafael Lozano-Hemmer: https://www.lozano-hemmer.com/

**Analysis Methods:**
- Wavelet Coherence: https://github.com/regeirk/pycwt
- Cross-Correlation tutorial: SciPy documentation

### 7.3 Recommended Reading Order

**For Quick Start:**
1. HeartMath coherence documentation
2. Polar H10 reviews (DC Rainmaker)
3. pyHRV documentation
4. Hybrid Harmony paper (art implementation)

**For Deep Understanding:**
1. Boukarras et al. (2025) - methodology
2. Czeszumski et al. (2023) - controls and caveats
3. HRV analysis methods (Kubios blog)
4. Wavelet transform coherence optimization paper

**For Practical Implementation:**
1. SparkFun MAX30105 hookup guide
2. Systole library documentation
3. Processing or pygame tutorials
4. Rafael Lozano-Hemmer project documentation

---

## 8. Implementation Recommendations Summary

### 8.1 Minimum Viable Installation

**For Budget-Conscious Art Project:**

**Hardware ($30-50):**
- 2x MAX30102 PPG sensors
- 1x Arduino or ESP32
- Basic USB connection

**Software (Free/Open-Source):**
- Arduino IDE + SparkFun library
- Python + pyHRV
- Processing for visualization

**Capabilities:**
- Basic heart rate synchrony
- Simple visual feedback
- Good for proof-of-concept

**Limitations:**
- Lower accuracy than ECG
- Motion artifacts
- May need careful positioning

### 8.2 Recommended Installation

**For Serious Art Installation:**

**Hardware ($220-300):**
- 2x Polar H10 chest straps
- ANT+ USB adapter or Bluetooth computer
- Laptop or Raspberry Pi 4

**Software (Free/Open-Source):**
- Python + systole library
- pyHRV or hrv-analysis
- Pygame or Processing for visualization
- Optional: Node.js + p5.js for web

**Capabilities:**
- Research-grade HRV measurement
- Multiple synchrony metrics (RMSSD, cross-correlation, coherence)
- Comfortable for participants
- Wireless operation
- Real-time feedback <5s latency

**This is the RECOMMENDED option for art installations**

### 8.3 Professional Installation

**For Museum or Long-Term Exhibition:**

**Hardware ($3,500-4,500):**
- 2x Empatica E4 wristbands
- Dedicated computer
- Professional display system

**Software (Mixed):**
- Empatica SDK (licensed)
- Custom Python analysis pipeline
- Professional visualization software
- Data logging and analytics

**Capabilities:**
- Multi-sensor data (HRV, EDA, temperature)
- Highest reliability
- Less invasive (wrist vs chest)
- Professional support
- Research-publication quality data

**Advantages:**
- Most comfortable for participants
- Multiple biometric dimensions
- Professional aesthetics
- Long-term durability

---

## 9. Ethical and Privacy Considerations

### 9.1 Data Collection

**Participant Consent:**
- Clearly explain what biometric data is being collected
- Describe how data will be used and displayed
- Obtain written or digital consent
- Allow opt-out at any time

**Data Storage:**
- Minimize data retention (delete after session if possible)
- If storing data, ensure encryption
- Anonymize data (no personal identifiers)
- Comply with GDPR/local privacy laws

### 9.2 Participant Comfort

**Physical:**
- Provide clear instructions for sensor placement
- Allow private area for chest strap application if needed
- Ensure sensors are clean and sanitized
- Offer disposable electrode pads if using ECG

**Psychological:**
- Normalize the experience ("There's no right or wrong")
- Don't judge lack of synchrony
- Allow participants to end session at any time
- Consider triggers (health anxiety, body image)

**Social:**
- Allow participants to choose their partner
- Provide option for strangers OR friends/couples
- Consider power dynamics and consent
- Monitor for participant discomfort

### 9.3 Data Interpretation

**Avoid Over-Interpretation:**
- Synchrony doesn't equal "love" or "connection" (per research findings)
- May reflect shared task engagement rather than unique bond
- Individual differences in HRV are normal
- Don't pathologize low synchrony

**Framing:**
- Use neutral or playful language
- "Explore biometric coherence" not "measure your connection"
- Emphasize the aesthetic/experiential aspect
- Provide educational context about physiology

---

## 10. Future Directions and Emerging Technologies

### 10.1 Emerging Sensor Technologies

**Radar-Based Contactless Sensing (2025):**
- FMCW radar for respiratory monitoring
- No body contact required
- Measures heart rate and breathing through clothing
- Still in research phase, not yet consumer-available

**Piezoelectric Tattoo Sensors:**
- Ultra-thin, flexible sensors
- Applied like temporary tattoos
- Measure respiration, heart rate, EDA
- More comfortable than traditional sensors

**Smart Textiles:**
- ECG electrodes woven into clothing
- Eliminates need for chest straps
- Still in development for consumer market

### 10.2 Advanced Analysis Methods

**Machine Learning Approaches:**
- Deep learning for artifact removal
- Predictive models for synchrony emergence
- Pattern recognition for synchrony types

**Multi-Scale Analysis:**
- Combining micro (second-by-second) and macro (session-level) synchrony
- Time-lag analysis to identify leader/follower
- Complexity matching (matching of variability patterns)

**Network Analysis:**
- Extending beyond dyads to groups
- Synchrony patterns in 3+ people
- Collective coherence

### 10.3 Art Installation Innovations

**Haptic Feedback:**
- Vibrotactile pulse feedback (feel partner's heartbeat)
- Wearables that pulse in sync
- Creates embodied connection

**Immersive Environments:**
- VR/AR integration
- Spatial audio based on synchrony
- Full-room installations

**Long-Distance Connection:**
- Internet-connected synchrony measurement
- Partners in different locations
- Pandemic-era innovation

**Collective Experiences:**
- Group coherence visualization
- Events/workshops with multiple dyads
- Community building through biometric sharing

---

## 11. Conclusion

### Key Takeaways

1. **HRV synchronization is the most accessible and well-validated measure** for interpersonal biometric coherence in art installations

2. **Polar H10 chest straps** ($90 each) provide the best balance of cost, accuracy, and participant comfort for art projects

3. **Analysis methods are well-established:** Cross-correlation and wavelet transform coherence are the standards

4. **Real-time feedback is achievable** with Python (systole + pyHRV) and visualization tools (pygame, Processing, p5.js)

5. **Important caveat:** Research shows synchrony may reflect shared task engagement rather than unique interpersonal bonds - this is important for interpretation but doesn't diminish the aesthetic or experiential value

6. **Multi-modal approaches** (HRV + GSR + respiration) provide richer data but require more complex setup

7. **Ethical considerations** around consent, data privacy, and psychological comfort are essential

8. **Art installation precedents exist** (Rafael Lozano-Hemmer, Hybrid Harmony) demonstrating successful implementations

### Recommended Next Steps

1. **Prototype Phase:**
   - Order 2x Polar H10 sensors
   - Set up Python environment with systole and pyHRV
   - Create simple cross-correlation analysis
   - Build basic visualization

2. **Testing Phase:**
   - Test with friends/volunteers
   - Refine sensor placement and instructions
   - Iterate on visualization design
   - Measure typical synchrony levels for calibration

3. **Installation Phase:**
   - Design physical space for comfort and engagement
   - Create clear participant instructions
   - Develop facilitation protocol
   - Plan for troubleshooting

4. **Documentation Phase:**
   - Record participant experiences
   - Gather qualitative feedback
   - Consider research collaboration if interested
   - Share learnings with maker/art communities

### Final Thoughts

The intersection of biometric sensing and art creates powerful opportunities for people to experience their physiology in new ways and explore subtle connections with others. While the science of interpersonal physiological synchrony is still evolving, the tools are now accessible enough for artists to experiment with these technologies in compelling ways.

The key is balancing technical accuracy with aesthetic experience - you don't need perfect research-grade measurements to create meaningful encounters with biometric data. Start simple, iterate based on participant feedback, and focus on the experiential and educational aspects as much as the technical precision.

---

## 12. Additional Resources and Contact Information

### Communities and Forums

- **Quantified Self Forums** - Biometric tracking enthusiasts
- **HeartMath Institute Community** - HRV and coherence discussions
- **Arduino/ESP32 Forums** - Hardware implementation help
- **Processing Forum** - Creative coding and visualization
- **r/biohacking** - DIY biometric sensing

### Conferences and Events

- **ACM CHI** - Human-computer interaction (includes biometric art)
- **SIGGRAPH** - Computer graphics and interactive art
- **Ars Electronica** - Digital art and technology
- **Quantified Self Conferences** - Personal sensing and data

### Academic Journals

- Psychophysiology
- Scientific Reports
- Frontiers in Neuroergonomics
- PNAS (Proceedings of the National Academy of Sciences)
- Sensors (MDPI)

### Manufacturers and Suppliers

**Sensors:**
- Polar Global: https://www.polar.com/ (H10)
- SparkFun Electronics: https://www.sparkfun.com/ (MAX30105)
- Seeed Studio: https://www.seeedstudio.com/ (Grove GSR)
- DFRobot: https://www.dfrobot.com/ (PPG sensors)
- Empatica: https://www.empatica.com/ (E4)
- Shimmer Sensing: https://www.shimmersensing.com/ (GSR3+)
- PLUX Biosignals: https://www.pluxbiosignals.com/ (Research-grade)

**Educational:**
- HeartMath Institute: https://www.heartmath.org/
- Biopac: https://www.biopac.com/ (Educational physiology)
- ADInstruments: https://www.adinstruments.com/ (Teaching equipment)

---

**Document prepared:** October 25, 2025
**Research conducted by:** Claude (Anthropic)
**For:** Interactive art installation project on biometric coherence

**Document Status:** Comprehensive research report ready for implementation

---

## Appendix A: Quick Reference Guide

### Hardware Quick Comparison

| Sensor | Type | Cost | Accuracy | Ease of Use | Recommendation |
|--------|------|------|----------|-------------|----------------|
| Polar H10 | ECG chest strap | $90 | ★★★★★ | ★★★★☆ | **Best Choice** |
| MAX30102 | PPG finger | $10 | ★★★☆☆ | ★★★★★ | Budget/Prototype |
| Empatica E4 | Multi-sensor wrist | $1,800 | ★★★★★ | ★★★★★ | Professional |
| Grove GSR | EDA finger | $20 | ★★★☆☆ | ★★★★★ | Add-on for emotion |
| DIY Piezo | Respiration belt | $5 | ★★☆☆☆ | ★★☆☆☆ | Educational/DIY |

### Software Quick Comparison

| Library/Tool | Language | Purpose | Difficulty | Cost |
|--------------|----------|---------|------------|------|
| systole | Python | Sensor interface + sync | Medium | Free |
| pyHRV | Python | HRV analysis | Easy | Free |
| Processing | Java-like | Visualization | Easy | Free |
| pygame | Python | Interactive graphics | Medium | Free |
| p5.js | JavaScript | Web-based visuals | Easy | Free |

### Analysis Method Quick Comparison

| Method | Complexity | Real-Time | Frequency Info | Recommendation |
|--------|------------|-----------|----------------|----------------|
| Cross-Correlation | Low | Yes | No | **Start Here** |
| Wavelet Coherence | High | Moderate | Yes | Research-level |
| Windowed Cross-Corr | Medium | Yes | No | Production |
| Transfer Entropy | High | No | Directional | Advanced |

### Metrics Quick Reference

| Metric | What It Measures | Time Window | Real-Time? | Units |
|--------|------------------|-------------|------------|-------|
| RMSSD | Short-term HRV (parasympathetic) | 10s+ | Yes | ms |
| SDNN | Overall HRV | 90s+ | Moderate | ms |
| LF Power | Mixed autonomic | 2-5 min | No | ms² |
| HF Power | Parasympathetic | 2-5 min | No | ms² |
| Coherence | Cardiac resonance | 80+ beats | Yes | Score 0-100 |

---

*End of Research Report*
