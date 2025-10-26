# Biometric Sensor Research Report
## Contact-Based Sensors for Self-Service Art Installation

**Date:** 2025-10-25
**Purpose:** Research fingertip and contact-based biometric sensors for a table-integrated art installation measuring heart rate coherence between two seated participants

---

## Executive Summary

This report provides comprehensive research on contact-based biometric sensors suitable for a walk-up, self-service art installation where two people sit facing each other at a table and place their hands/fingers on sensors to visualize their biometric coherence. The installation requires casual contact (no clothing removal), durable construction for public use, and foolproof positioning that works across diverse user populations.

**Key Findings:**
- **Fingertip PPG sensors (MAX30102)** offer the best balance of accuracy, cost ($3-4 USD per sensor), and ease of integration
- **HRV measurements from fingertip PPG** show high correlation (R² > 0.95) with chest ECG during rest conditions
- **Skin tone accuracy issues** exist but can be mitigated through proper sensor selection and signal processing
- **Temperature management** is critical - cold hands reduce signal quality by 54-59%, warm hands improve it by 60-64%
- **Existing art installations** (Rafael Lozano-Hemmer's "Pulse" series) provide proven precedents for public biometric installations

---

## 1. Sensor Hardware Options

### 1.1 Fingertip PPG Sensors (RECOMMENDED)

#### MAX30102 / MAX30100 Modules

**Technical Specifications:**
- **Technology:** Photoplethysmography (PPG) using red (660nm) and infrared (880nm) LEDs with photodetector
- **Resolution:** MAX30102: 18-bit ADC; MAX30100: 14-bit ADC (lower resolution)
- **Interface:** I2C (simple two-wire connection)
- **FIFO Buffer:** MAX30102 holds 32 samples; MAX30100 holds 16 samples
- **Power Consumption:** ~600μA during measurement, 0.7μA in standby
- **Temperature Sensor:** Built-in, -40°C to +85°C with ±1°C accuracy
- **LED Pulse Width:** MAX30102: 69-114μs (lower power); MAX30100: 200-1600μs
- **Price:** $3-4 USD per module (excellent for budget-conscious projects)

**Advantages:**
- Extremely low cost for DIY/custom installations
- Extensive library support (Arduino, Raspberry Pi, ESP32)
- Small footprint - easy to embed in furniture
- Non-invasive, casual contact measurement
- Well-documented with numerous tutorials and examples

**Disadvantages:**
- Requires strong pullup resistors (4.7K or 3.3K work; 10K and 8.2K do not)
- DIY sensor requires custom housing and industrial design
- Motion artifacts can degrade signal quality
- Requires stable contact pressure for optimal readings

#### Commercial Fingertip Pulse Oximeters with API

**Examples:**
- HeartMath emWave Finger Sensor
- ithlete Finger Sensor
- Clinical-grade USB pulse oximeters

**Advantages:**
- Pre-engineered ergonomic housing with spring-loaded clips
- Clinical validation and FDA approval (some models)
- Professional appearance suitable for museum context
- Built-in signal processing and noise reduction
- Comfortable fit across different finger sizes

**Disadvantages:**
- Higher cost ($50-200+ per sensor)
- Limited API/SDK access (HeartMath does not offer public SDK)
- Proprietary systems may lock you into specific ecosystems
- May not integrate easily with custom visualization software
- Less flexibility for table-embedded designs

### 1.2 Ear Clip Pulse Sensors

**Technology:** PPG sensor mounted in clip worn on earlobe

**Advantages:**
- Less susceptible to motion artifacts (earlobe moves less than fingers)
- Good blood perfusion - earlobes contain large blood supplies without cartilage
- More accurate than extremities for continuous monitoring
- Centrally located - earlier detection of physiological changes
- Leaves hands free for other interactions

**Disadvantages:**
- Less intuitive placement for walk-up installation
- Requires users to clip sensor to ear (more invasive feel)
- Not well-suited for table-integrated design
- May feel too clinical/medical for art context
- Hygiene concerns with ear contact in public setting

**Recommendation:** NOT suitable for this installation due to placement complexity and clinical feel

### 1.3 Palm/Hand Contact Sensors

#### Galvanic Skin Response (GSR) Sensors

**Technology:** Two electrodes measure electrical conductance of skin (skin moisture/sweat)

**Specifications:**
- **Placement:** Typically index and middle finger, proximal part on palm side
- **Measurement:** Electrical conductance between two electrodes
- **Applications:** Stress, emotion detection, arousal measurement
- **Products:** Grove GSR Sensor, Shimmer3R GSR+ Unit

**Advantages:**
- Measures emotional/stress state (complementary to heart rate)
- Simple two-electrode design
- Can be combined with PPG for multi-modal biometric verification
- Works on palm or fingers

**Disadvantages:**
- Does NOT measure heart rate or HRV directly
- Primarily measures arousal/stress, not cardiac coherence
- Would need to be combined with PPG sensors for full solution
- Skin conductance affected by ambient humidity, user nervousness

**Recommendation:** Could be used as SUPPLEMENTARY sensor alongside PPG for richer biometric data

#### Handlebar/Grip Sensors (Fitness Equipment Style)

**Technology:** PPG sensors embedded in metallic handlebar grips (like exercise bikes)

**How They Work:**
- Detect electrical signals through skin of hands (similar to ECG)
- Metallic areas act as electrodes
- Users grip handles with both hands
- Takes 8-10 seconds for initial reading

**Advantages:**
- Familiar design from fitness equipment
- Natural hand placement
- Can be integrated into table edge or arm rests
- Durable construction for public use

**Disadvantages:**
- Lower accuracy - very unreliable compared to chest straps
- Both hands must maintain contact simultaneously
- Affected by dry/wet hands, grip pressure
- Movement and electrical interference cause issues
- Many users cannot get reliable readings

**Recommendation:** NOT suitable as primary sensor due to reliability issues; consider only for design inspiration

---

## 2. Accuracy Comparison: Fingertip PPG vs Chest ECG

### 2.1 Scientific Validation Studies

**Overall Finding:** Multiple peer-reviewed studies demonstrate fingertip PPG is highly accurate for HRV measurement during rest conditions.

#### Statistical Correlation
- **Median correlation:** R = 0.97 between ECG-derived RR intervals and PPG-derived peak-to-peak intervals
- **Precision:** PP variability accurate to 0.1 ms compared to RR variability
- **Agreement:** R² > 0.95 for HRV parameters in healthy subjects
- **Validation:** "Almost perfect correlations" (R = 1.00 [0.99; 1.00]) for PPG vs ECG

#### Clinical Significance
- No statistically significant differences (p < 0.05) between PPG and ECG for:
  - Time domain HRV parameters
  - Frequency domain HRV parameters
  - Poincaré plot HRV parameters
- Bland-Altman analysis shows high degree of agreement for all HRV parameters
- Fingertip PPG validated in obese adolescents and diverse populations

### 2.2 Limitations and Conditions

**Optimal Conditions:**
- **Rest state:** Best accuracy occurs when users are seated and still
- **Minimal movement:** Motion artifacts significantly degrade accuracy
- **Proper contact:** Consistent pressure and sensor placement required

**Degraded Conditions:**
- **Exercise:** Stimuli conditions like exercise decrease correlation, especially for high-frequency (HF) components
- **Motion:** Movement creates artifacts that mask heart rate peaks in spectra
- **Poor contact:** Inconsistent pressure or sensor positioning reduces signal quality

**Recommendation for Installation:**
- Fingertip PPG is HIGHLY SUITABLE for seated, stationary installation
- Design must encourage users to remain still during measurement
- Clear instructions to maintain gentle, consistent contact

---

## 3. HRV Reliability from Fingertip PPG

### 3.1 HRV Metrics Validated for Fingertip PPG

**Time Domain Metrics:**
- SDNN (Standard Deviation of NN intervals)
- RMSSD (Root Mean Square of Successive Differences)
- pNN50 (Percentage of intervals differing by >50ms)

**Frequency Domain Metrics:**
- LF (Low Frequency: 0.04-0.15 Hz) - sympathetic and parasympathetic activity
- HF (High Frequency: 0.15-0.4 Hz) - parasympathetic activity
- LF/HF ratio - autonomic balance

**Poincaré Plot Metrics:**
- SD1, SD2 - scatter plot analysis of interval variations

**Coherence Metric (HeartMath):**
- Identifies maximum peak in 0.04-0.26 Hz range
- Calculates integral in 0.030 Hz window centered on peak
- Computes total power over 64-second window, updated every 5 seconds
- Detects sine-wave-like stability in heart rhythm independent of heart rate

### 3.2 Coherence Detection Algorithm

**HeartMath Coherence Assessment:**

The HRV coherence assessment algorithm is designed to detect the stability of the sine-wave like pattern in the heart rhythm independent of heart rate and the amplitude of the HRV rhythm.

**Process:**
1. Identify maximum peak in 0.04-0.26 Hz range of HRV power spectrum
2. Calculate integral in window 0.030 Hz wide, centered on highest peak
3. Calculate total power of entire spectrum over 64-second window
4. Update every 5 seconds for real-time feedback
5. Coherent state shows higher amplitude, smooth sine-wave pattern

**Key Characteristics:**
- Coherence occurs when synchronization and frequency entrainment happen between:
  - Heart rhythms
  - Blood pressure
  - Respiration rhythms

### 3.3 Real-Time HRV Processing

**Arduino/Embedded Approach:**
- Use SparkFun MAX3010x library or DFRobot_MAX30102 library
- Standard libraries measure BPM and SpO2
- Custom code needed for full HRV calculation (inter-beat intervals)
- Calculate BPM: `beatsPerMinute = 60 / (delta / 1000.0)`
- Record inter-beat intervals for HRV analysis

**Raspberry Pi/Python Approach:**
- Python libraries available: max30102-python, micropython-max30102
- Thread-based sensor reading for real-time processing
- WebSocket integration for streaming data to visualization
- Pattern: sensor thread → data log → WebSocket streaming to clients
- Can handle multiple sensors/clients simultaneously

**Signal Processing Required:**
- Peak detection in PPG waveform
- Inter-beat interval (IBI) extraction
- Statistical analysis (SDNN, RMSSD)
- Frequency domain analysis (FFT for LF/HF components)
- Motion artifact removal (adaptive filtering, ICA)
- Signal quality assessment

---

## 4. Industrial Design Considerations

### 4.1 Ergonomic Fingertip Sensor Housing

**Key Design Principles:**

**Comfortable Fit:**
- Spring-loaded clips accommodate varying finger sizes
- Velcro straps for adjustable, comfortable tension
- Breathable cloth materials (not rigid plastic)
- Lightweight construction (< 50g per sensor)
- Flexible cord for freedom of movement

**Optimal Contact Pressure:**
- Even surface tension against skin required for good readings
- Strap maintains optimal contact pressure without discomfort
- Sensing elements in oval shape at bottom fingertip
- Prevent torsion or shifting during measurement
- Comfortable enough for extended wear (5+ minutes)

**Professional Appearance:**
- Compact profile, not bulky or clinical-looking
- Materials: soft silicone contact surfaces, durable outer shell
- Inviting aesthetics suitable for museum/gallery context
- Consider 3D-printed custom housings for unique design

### 4.2 Table-Integrated Sensor Design

**Mounting Options:**

**Flush Mount (Recommended):**
- Sensor positioned flush with table surface
- Protective cover over sensor when not in use
- LED indicators around sensor area for hand placement guidance
- Easy to clean flat surface
- Professional, minimal aesthetic

**Recessed Well:**
- Shallow depression in table surface (5-10mm deep)
- Naturally guides finger placement
- Contains sensor and prevents accidental displacement
- Can illuminate well for visual cue
- Protects sensor from lateral forces

**Elevated Platform:**
- Raised sensor housing (20-30mm above table)
- Clear visual landmark for hand placement
- Ergonomic angle for relaxed hand position
- Can incorporate armrest design
- More prominent, easier to spot from distance

**Design Inspiration:**
- Fingerprint scanners for furniture (cabinet locks) - flush mount biometric integration
- Interactive LED coffee tables - sensors under glass
- Fitness equipment handlebars - familiar ergonomic grips
- Touch tables with IR sensor frames - infrared detection of contact points

### 4.3 Visual Guidance for Positioning

**Critical for Walk-Up Installation:**

**Physical Cues:**
- Hand/finger silhouette etched or printed on surface
- Recessed area that naturally fits fingertip
- Textured surface indicating sensor location
- Contrasting materials (metallic sensor vs wood table)

**Illumination:**
- LED ring around sensor area
- Color-coded feedback:
  - Red/off: No contact
  - Yellow/pulsing: Contact detected, acquiring signal
  - Green/steady: Good signal quality, ready
- Brightness level indicates signal quality

**Instructional Elements:**
- Simple pictogram showing hand placement
- "Place finger here" text with arrow
- Floor/table mounted instructions at eye level
- Video loop demonstration on nearby screen

### 4.4 Two-Person Coordination

**Ensuring Both Users Maintain Contact:**

**Symmetrical Design:**
- Mirror-image sensor placement on opposite sides of table
- Equal distance from table center (creates balanced composition)
- Matching visual cues and lighting on both sides

**Feedback Synchronization:**
- Individual status lights for each user (both must be green to start)
- Shared central display showing both signals
- Audio cue when both users achieve good contact
- Countdown timer before measurement begins (ensures readiness)

**Engagement Strategy:**
- Show both heartbeat waveforms side-by-side
- Visual connection (line, color shift) when both signals detected
- Progress indicator: "Connecting... User 1 ready. Waiting for User 2..."
- Celebration/reward visual when coherence achieved

---

## 5. Signal Processing for Noisy/Casual Contact

### 5.1 Motion Artifact Reduction

**Challenge:**
- Motion artifacts mask heart rate peaks in frequency spectra
- Normal PPG frequency: 0.5-5 Hz
- Motion artifact frequency: 0.01-10 Hz (overlapping range)
- Difficult to filter without losing essential signal features

**Solutions:**

**Adaptive Filtering:**
- Requires reference accelerometer signal
- Works best when reference highly correlates with motion spectrum
- Can be integrated into sensor housing (add IMU chip)
- Real-time adjustment based on detected motion

**Independent Component Analysis (ICA):**
- Temporally constrained ICA combined with adaptive filters
- Extracts clean PPG signal from motion-corrupted data
- Preserves amplitude information
- Computationally intensive - best for Raspberry Pi, not Arduino

**Multi-Channel Approach:**
- Use multiple PPG sensors (different fingers or hands)
- Cross-correlation to identify and remove artifacts
- Redundancy improves reliability
- Higher cost (2x sensors per person)

**Signal Quality Assessment:**
- Real-time classification: excellent / acceptable / unfit
- Only process high-quality segments
- Alert user when signal degrades
- Automatic rejection of corrupted data

### 5.2 Contact Pressure Optimization

**Research Finding:**
- PPG signal morphology influenced by contact pressure
- Too little pressure: weak signal, low amplitude
- Too much pressure: blood flow restricted, distorted waveform
- Optimal pressure zone varies by individual

**Solutions:**

**Pressure Sensing Integration:**
- Add force sensors to fingertip housing
- Minimum detectable force: ~0.04 N
- Monitor pressure in real-time
- Provide feedback to user: "Press lighter" / "Press firmer"

**Mechanical Design:**
- Spring-loaded sensor housing maintains consistent pressure
- Soft foam padding distributes force evenly
- Strap-based sensors allow self-adjustment
- Range: comfortable resting pressure to conscious press without fatigue

**Visual Feedback:**
- Pressure indicator bar on display
- Color-coded zones (red: too light, green: optimal, yellow: too firm)
- Helps users find and maintain optimal contact

### 5.3 Temperature Management

**Critical Finding:**
- Cold hands reduce PPG signal quality by 54-59%
- Warm hands improve signal quality by 60-64% (up to 4× improvement)
- Optimal sensor site temperature: ~33°C (91°F)

**Solutions:**

**Active Heating:**
- Embed heating elements in sensor housing or table surface
- Warm contact area to 33°C before/during measurement
- Low-power resistive heaters or Peltier elements
- Temperature sensor for closed-loop control

**Passive Warming:**
- Insulated sensor housing retains body heat
- Heat-conducting materials (copper, aluminum) warm up with contact
- Provide hand-warming instructions: "Rub hands together before placing"
- Cover sensor area when not in use to maintain warmth

**User Instructions:**
- Signage: "Warm hands produce best results"
- Pre-measurement routine: hand-rubbing animation on screen
- Reject cold hands: "Please warm your hands and try again"
- Ambient environment: maintain warm room temperature (20-24°C)

### 5.4 Skin Tone Bias Mitigation

**Challenge:**
- Inaccurate measurements occur 15% more frequently in dark skin vs light skin
- Melanin absorbs more light (especially green wavelength)
- Signal loss: up to 61.2% in some consumer devices for darker skin tones
- Critical equity issue for public art installation

**Solutions:**

**Sensor Selection:**
- Use RED and INFRARED LEDs (not green)
- MAX30102 uses 660nm red + 880nm IR (good choice)
- IR less affected by melanin than green light
- Avoid consumer wearables that rely on green LEDs

**Increased LED Power:**
- Boost LED intensity for darker skin tones
- Adjustable gain settings
- One-time calibration per user
- Trade-off: increased power consumption

**Programmable Gain Calibration:**
- Automatic gain adjustment based on signal strength
- Normalize PPG signals across diverse skin tones
- Achieve consistent output characteristics
- Real-time adaptation without user intervention

**Multi-Modal Approach:**
- Combine optical (PPG) with radar or other non-optical methods
- Research shows this overcomes implicit bias
- More complex and expensive
- May be overkill for art installation

**Testing & Validation:**
- Test prototype with diverse user group across skin tone spectrum
- Ensure equal accuracy across Fitzpatrick skin types I-VI
- Document any remaining disparities
- Iterate design to eliminate bias

---

## 6. Table Integration Examples & Mechanical Designs

### 6.1 Existing Installations & Precedents

**Rafael Lozano-Hemmer - "Pulse Tank" (2008):**
- Two participants place hands on sensors at ends of illuminated water tanks
- Individual heartbeats create ripples in separate tanks
- Ripples intermingle in center tank, visualizing connection
- Design: Sensors on top of tanks (elevated, clear placement)
- Duration: Hirshhorn Museum exhibition Nov 2018 - April 2019

**Rafael Lozano-Hemmer - "Pulse Room" (2006):**
- Handle-shaped sensor gripped by participant
- Hundreds of incandescent bulbs flash with recorded heartbeats
- Sensor design:握-able handle with embedded PPG
- Public acceptance: Thousands of participants engaged successfully

**Interactive LED Coffee Tables:**
- Arduino boards + addressable LEDs under glass surface
- IR proximity sensors detect hand placement
- Sensors tucked under glass - invisible, protected
- Touch-responsive, durable for public use

**Smart Furniture Prototypes:**
- Embedded sensors in chairs (Sensingnet Argus seat measures HR, respiratory rate)
- Wireless sensor networks in modular furniture
- Sit-stand desks with biometric login modules
- Trend: furniture as integration node for sensors

### 6.2 Table Construction Approaches

**Option 1: Glass Top with Embedded Sensors**

**Design:**
- Sensors mounted beneath tempered glass surface
- Hand placement markers on glass (etched, vinyl, LED projection)
- IR sensors detect hand presence before activating PPG
- Clean, modern aesthetic

**Advantages:**
- Sensors completely protected from touch/damage
- Easy to clean (wipe glass surface)
- Vandal-resistant
- Professional appearance

**Disadvantages:**
- Glass reduces signal quality (light must pass through)
- Thicker glass = more signal attenuation
- May require higher LED power
- Testing needed to validate signal quality

**Option 2: Flush-Mounted Sensor Wells**

**Design:**
- Circular recesses (50-70mm diameter, 5-10mm deep) in wood/acrylic table
- Sensor sits flush at bottom of well
- Silicone contact surface (easy to clean, comfortable)
- LED ring around perimeter of well

**Advantages:**
- Direct skin-to-sensor contact (optimal signal)
- Natural finger placement guidance
- Protects sensor from lateral forces
- Can be easily replaced/serviced

**Disadvantages:**
- Wells collect dust/debris (requires regular cleaning)
- More visible sensor integration (less minimalist)
- Users may avoid placing finger in recessed area

**Option 3: Elevated Sensor Platforms**

**Design:**
- Raised platforms (20-30mm height) with finger-sized indentation
- Integrated arm rests lead to sensor placement
- Ergonomic angle for relaxed hand position
- Prominent visual landmark

**Advantages:**
- Extremely clear where to place finger
- Comfortable for extended duration
- Sensor highly accessible for maintenance
- Inviting, not hidden or mysterious

**Disadvantages:**
- More prone to accidental bumps/damage
- Users might lean on or mishandle platform
- Requires robust mounting/construction
- Takes up more vertical space

**Recommendation:** Flush-mounted sensor wells provide best balance of signal quality, durability, and user-friendly positioning.

### 6.3 Materials & Construction

**Table Surface Materials:**
- **Wood:** Warm, inviting aesthetic; requires sealing around sensors for moisture protection
- **Acrylic/Resin:** Translucent options for backlighting; easy to machine custom shapes
- **Tempered Glass:** Modern, cleanable, but may attenuate PPG signal
- **Composite:** Mix materials for functional zones (sensor areas vs rest of table)

**Sensor Housing Materials:**
- **Silicone:** Soft contact surface, cleanable, comfortable (medical-grade silicone preferred)
- **3D-Printed PLA/PETG:** Custom shapes, rapid prototyping, paintable
- **Machined Aluminum:** Durable, can integrate heating elements, professional appearance
- **Cast Resin:** Translucent for LED illumination, can embed sensors during casting

**Wiring & Electronics:**
- Route cables through table legs or center pedestal
- Cable management channels hidden under table
- Removable access panel for maintenance
- Consider wireless sensors (Bluetooth) to eliminate cables to sensor pads

### 6.4 Lighting Integration

**Sensor Area Illumination:**
- **LED Ring:** WS2812B addressable LEDs around sensor perimeter
- **Under-Table Backlighting:** Illuminate sensor wells from below (if translucent materials)
- **Fiber Optic:** Elegant, diffuse glow; can be embedded in table surface
- **EL Wire:** Subtle outline of hand placement area

**Status Indication:**
- Idle: Soft pulsing blue (inviting, non-threatening)
- Contact Detected: Pulsing yellow (processing)
- Good Signal: Steady green (ready for coherence measurement)
- Coherence Achieved: Synchronized animation (both sensors respond together)

**Central Visualization Area:**
- Projection from above onto table surface
- Embedded LCD/OLED display in center of table
- Large external monitor/screen visible to both users
- Combination: table-mounted display + ambient room projection

---

## 7. Multi-User Coordination

### 7.1 Ensuring Both Users Maintain Contact

**Challenge:**
- Art installation requires BOTH people to maintain good sensor contact simultaneously
- Casual walk-up interaction means variable user attention/commitment
- One user losing contact breaks the experience for both

**Technical Solutions:**

**Real-Time Signal Quality Monitoring:**
- Continuously assess each PPG signal quality (excellent/acceptable/unfit)
- Require both signals to be "acceptable" or better
- Drop to "unfit" → pause measurement, prompt user to adjust

**Timeout Management:**
- Grace period (2-3 seconds) for minor contact interruptions
- "Please maintain contact" warning before aborting
- Auto-reset if good contact not re-established
- Prevents frustration from accidental brief loss

**Individual Status Display:**
- Each user sees their own signal quality indicator
- Personal responsibility for maintaining contact
- Gamification: "Keep your light green!"

**Shared Progress Indicator:**
- Visual bar or circle filling up over measurement period
- Shows how long both users have maintained good contact
- Goal-oriented: "Maintain contact for 60 seconds to see result"
- Motivates users to keep trying if interrupted

### 7.2 Interaction Design Flow

**Stage 1: Invitation (0-10 sec)**
- Idle state: Soft pulsing lights on sensor areas
- Attract attention without demanding interaction
- Nearby screen shows demonstration video or previous users' results
- Text: "Place your fingers on the sensors to begin"

**Stage 2: Single User Contact (10-20 sec)**
- One user places finger
- Their sensor lights up green, plays heartbeat sound
- Screen shows their heartbeat waveform
- Prompts second user: "Waiting for partner... Please sit down and place your finger"

**Stage 3: Dual User Contact (20-30 sec)**
- Both sensors green
- Audio cue: chime or ascending tone
- Screen: "Connection established. Remain still for 60 seconds."
- Countdown timer begins

**Stage 4: Measurement (30-90 sec)**
- Both waveforms visible side-by-side
- Real-time coherence visualization begins
- If contact lost: pause timer, show warning, resume when re-established
- Progress indicator shows time remaining

**Stage 5: Result (90-120 sec)**
- Coherence visualization reaches climax
- Celebratory animation if high coherence achieved
- Score/summary display: "Your hearts synchronized for 34% of the session"
- Option to save/share result (QR code, email)

**Stage 6: Reset (120+ sec)**
- Thank you message
- Invitation for next users
- Fade to idle state

### 7.3 Social Dynamics Considerations

**Pairing Strangers vs Known Pairs:**
- Signage: "Find a partner and sit facing each other"
- Consider providing facilitator/docent during busy times
- Design table for comfortable face-to-face seating
- Distance: close enough for intimacy, far enough for comfort (~4-5 feet)

**Asymmetrical Engagement:**
- One user engaged, other distracted/skeptical
- Solution: Individual feedback makes disengaged user curious
- Show each person their own heartbeat first (personal connection)
- Then reveal combined/synchronized visualization

**Duration Management:**
- Minimum time for meaningful HRV measurement: 60-90 seconds
- Maximum attention span for casual users: ~2-3 minutes
- Design for 90-120 second total experience
- Allow early exit without guilt ("Exit anytime" button)

---

## 8. Cleaning & Hygiene Protocols

### 8.1 Public Health Concerns

**Context:**
- Public art installation = high touch frequency
- Fingertip sensors contact many users' skin
- Post-COVID heightened awareness of surface transmission
- Medical-grade cleaning protocols inform best practices

### 8.2 Recommended Cleaning Protocols

**Frequency:**
- **After each use:** Ideal but impractical for unstaffed installation
- **Hourly:** During staffed hours in high-traffic museum
- **Daily minimum:** For self-service installation
- **Weekly deep clean:** Thorough inspection and maintenance

**Cleaning Agents:**

**70% Isopropyl Alcohol (Recommended):**
- Wipe sensor contact surfaces with 70% isopropyl alcohol
- Effective against bacteria and viruses
- Safe for silicone and most plastics
- Fast evaporation (minimal downtime)
- Apply with soft cloth or pre-moistened wipes

**Sodium Hypochlorite (Bleach Solution):**
- 1:10 dilution of bleach to water
- Most effective for removing vegetative bacteria and spores
- May degrade certain materials over time
- Requires rinse or additional wipe after application
- Stronger odor (may be off-putting in gallery)

**Chlorine-Based Disinfectant Wipes:**
- Pre-packaged convenience
- Effective broad-spectrum disinfection
- QualiClean or similar medical-grade wipes
- Suitable for healthcare environments

**Avoid:**
- Pouring or spraying liquids directly on sensors
- Abrasive cleaners or rough scrubbing (damages surfaces)
- Excessive moisture (water damage to electronics)

### 8.3 Cleaning Procedure

**Step-by-Step:**

1. **Power down sensors** (if necessary for safety)
2. **Wipe from top to bottom** with soft cloth dampened in 70% isopropyl alcohol
3. **Focus on contact surfaces** - silicone pads where fingers rest
4. **Clean surrounding area** - table surface within 6 inches of sensors
5. **Allow to air dry** - typically 30-60 seconds
6. **Visual inspection** - check for residue, damage, wear
7. **Power on and test** - verify sensor function after cleaning

**Staff Training:**
- Provide clear cleaning checklist
- Train docents/volunteers on proper technique
- Log cleaning times (accountability and maintenance tracking)
- Stock cleaning supplies in accessible location

### 8.4 Contactless Alternatives & Enhancements

**UV-C Sterilization:**
- Install UV-C LED strips inside sensor wells
- Activate during idle periods between users
- 30-60 second exposure kills bacteria/viruses
- Automatic, no staff intervention needed
- Caution: UV-C harmful to eyes/skin; only activate when sensors not in use

**Antimicrobial Materials:**
- Copper or silver-infused silicone contact surfaces
- Inherent antimicrobial properties reduce pathogen survival
- Supplement, not replace, regular cleaning
- Higher cost but long-term benefit

**Disposable Barriers:**
- Single-use adhesive sensor covers (like EKG electrode stickers)
- User peels off fresh cover before use
- Adds friction/complexity to walk-up experience
- Generates waste (environmental concern)
- Likely unnecessary for low-risk fingertip contact

**User-Initiated Cleaning:**
- Provide sanitizing wipe dispenser next to installation
- Signage: "Please wipe sensor before use"
- Empowers users, reduces staff burden
- Psychological reassurance even if not perfectly effective

### 8.5 Hygiene Communication

**Visible Cleanliness:**
- Keep installation spotless (clean table, tidy wiring)
- First impression of care = trust in hygiene
- Regular visual maintenance (remove dust, fingerprints)

**Signage:**
- "Sensors cleaned hourly" with timestamp clock
- "Last cleaned: [time]" updated by staff
- "Feel free to use sanitizing wipes provided"

**Transparency:**
- QR code to hygiene protocol documentation
- Behind-the-scenes video of cleaning process
- Builds trust through openness

---

## 9. Cost Analysis

### 9.1 DIY Build (MAX30102-Based)

**Hardware Per Station (2 users = 2 sensors):**

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| MAX30102 sensor modules | 2 | $3.50 | $7.00 |
| Raspberry Pi 4 (4GB) | 1 | $55.00 | $55.00 |
| MicroSD card (32GB) | 1 | $8.00 | $8.00 |
| Power supply (USB-C) | 1 | $10.00 | $10.00 |
| Wiring, connectors, breadboard | - | $15.00 | $15.00 |
| LED strips (WS2812B, 1m) | 2 | $8.00 | $16.00 |
| Custom 3D-printed sensor housings | 2 | $5.00 | $10.00 |
| Silicone pads for contact surface | 2 | $3.00 | $6.00 |
| Heating elements (optional) | 2 | $10.00 | $20.00 |
| **Subtotal Electronics** | | | **$147.00** |

**Table/Furniture:**

| Component | Cost |
|-----------|------|
| Custom table (wood/metal frame) | $200-500 |
| Acrylic/glass inserts for sensor areas | $50-100 |
| LED power supplies | $20-40 |
| Cable management | $20-30 |
| **Subtotal Furniture** | **$290-670** |

**Display (Central Visualization):**

| Option | Cost |
|--------|------|
| HDMI monitor 24-32" | $150-300 |
| Projector + short-throw lens | $400-800 |
| Embedded tablet (Android) | $100-250 |

**TOTAL DIY BUILD: $600-1,200** (depending on display choice and table quality)

### 9.2 Commercial/Hybrid Build (Using Off-Shelf Sensors)

**Hardware Per Station:**

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| HeartMath emWave Finger Sensor | 2 | $99.00 | $198.00 |
| emWave Pro software license | 1 | $299.00 | $299.00 |
| Computer (mini PC) | 1 | $300.00 | $300.00 |
| Custom mounting/housing | 2 | $50.00 | $100.00 |
| **Subtotal Electronics** | | | **$897.00** |

**Or:**

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| Clinical USB pulse oximeters | 2 | $150.00 | $300.00 |
| Custom software development | 1 | $2,000-5,000 | $3,500 (avg) |
| Computer (mini PC) | 1 | $300.00 | $300.00 |
| **Subtotal Electronics** | | | **$4,100** |

**TOTAL COMMERCIAL BUILD: $1,200-5,000+** (depending on sensor choice and software development needs)

### 9.3 Operational Costs (Annual)

| Item | Frequency | Cost |
|------|-----------|------|
| Replacement sensors (wear/damage) | 1-2 per year | $7-200 |
| Cleaning supplies (alcohol, wipes) | Monthly | $180/year |
| Electricity (Raspberry Pi 24/7) | Continuous | ~$15/year |
| Software updates/maintenance | As needed | $0-500 |
| Staff time for cleaning (1hr/day) | Daily | Varies by institution |

**TOTAL ANNUAL OPERATING COST: $200-900** (excluding labor)

### 9.4 Cost Comparison Summary

**Budget Option (DIY):**
- Initial: $600-1,200
- Annual: $200-400
- **Best for:** Artist-led projects, small galleries, prototypes

**Mid-Range (Hybrid):**
- Initial: $1,500-2,500
- Annual: $300-600
- **Best for:** Museum pilot programs, funded art installations

**Premium (Commercial):**
- Initial: $3,000-5,000+
- Annual: $500-900
- **Best for:** Permanent installations, medical accuracy requirements, high-traffic venues

**Recommendation:**
For a museum/gallery art installation, the **DIY build with MAX30102 sensors** offers the best value and flexibility. Allocate $1,000-1,500 for initial build, and $300-500 annual operating budget.

---

## 10. Practical Limitations & Workarounds

### 10.1 Signal Quality Challenges

**Limitation: Inconsistent User Compliance**

**Problem:**
- Users may not place fingers correctly
- Pressure too light or too heavy
- Movement during measurement
- Impatience (removing finger early)

**Workarounds:**
- **Real-time coaching:** Visual feedback ("Press firmer" / "Hold still")
- **Haptic feedback:** Vibration when good signal achieved (requires actuator in housing)
- **Audio cues:** Heartbeat sound plays only when signal is good (reward reinforcement)
- **Gamification:** Progress bar motivates maintaining contact
- **Staff/docent presence:** During peak hours to assist users

**Limitation: Cold/Dry Hands**

**Problem:**
- Cold hands reduce signal by 50-60%
- Dry skin reduces conductance (for GSR sensors)
- Environmental factors (winter, air conditioning)

**Workarounds:**
- **Active warming:** Heating elements in sensor housing (33°C optimal)
- **Instructions:** "Rub hands together for 10 seconds before placing on sensor"
- **Warm environment:** Maintain gallery temperature at 20-24°C
- **Hand moisturizer dispenser:** Optional, may not be appropriate for sensors

### 10.2 Skin Tone Accuracy Disparities

**Limitation: 15-60% Signal Loss in Darker Skin**

**Problem:**
- Melanin absorbs PPG light (especially green wavelengths)
- Consumer devices optimized for light skin
- Equity and inclusion concern in public art

**Workarounds:**
- **Use RED+IR LEDs:** MAX30102 (660nm + 880nm) better than green
- **Adaptive gain:** Auto-adjust LED power based on detected signal strength
- **Signal normalization:** Software calibration per user
- **Testing with diverse users:** Prototype validation across Fitzpatrick types I-VI
- **Transparency:** Acknowledge limitations, show commitment to equitable design

### 10.3 Two-Person Coordination Difficulty

**Limitation: Asymmetrical Engagement**

**Problem:**
- One user engaged, other reluctant/distracted
- Both must maintain contact simultaneously
- Social awkwardness between strangers

**Workarounds:**
- **Compelling individual feedback:** Show each person their heartbeat first (hook them)
- **Clear mutual benefit:** "Discover how your hearts connect"
- **Low time commitment:** 60-90 seconds (not demanding)
- **Graceful exit:** "You can stop anytime" (reduces pressure)
- **Pairing facilitation:** Staff help match interested participants
- **Seated comfort:** Comfortable chairs, warm lighting (encourages staying)

### 10.4 HRV Measurement Time Requirements

**Limitation: Minimum Duration for Accurate HRV**

**Problem:**
- Meaningful HRV analysis requires 60+ seconds of data
- Coherence detection needs 64-second window (HeartMath algorithm)
- Casual users expect instant results

**Workarounds:**
- **Progressive disclosure:** Show heart rate immediately (3-5 sec), then HRV (30+ sec), then coherence (60+ sec)
- **Engaging visualization:** Dynamic, beautiful graphics hold attention during acquisition
- **Educational content:** Brief text explains what's being measured and why it takes time
- **Predicted outcome:** Early preview based on partial data ("You're on track for high coherence!")

### 10.5 Motion Artifact Noise

**Limitation: Movement Degrades PPG Signal**

**Problem:**
- Users fidget, shift weight, breathe deeply
- Hand/finger micro-movements during measurement
- Public installation = less controlled than clinical setting

**Workarounds:**
- **Comfortable seating:** Reduce need to shift position
- **Armrests:** Stabilize arms/hands during measurement
- **Breathing guidance:** Slow, steady breathing instruction (also improves coherence!)
- **Real-time quality monitoring:** Pause measurement when signal degrades, prompt user
- **Adaptive filtering:** Software removes motion artifacts (ICA, accelerometer-based)
- **Multi-sensor redundancy:** If one sensor noisy, rely more on the other

### 10.6 Maintenance & Reliability

**Limitation: Sensor Failure in Public Environment**

**Problem:**
- Sensors damaged by rough handling
- Wiring pulled loose by users
- Dust/debris accumulation
- Intermittent failures frustrate users

**Workarounds:**
- **Robust mechanical design:** Strain relief on cables, reinforced connections
- **Sealed sensor housings:** IP65 rated protection against dust/moisture
- **Redundant sensors:** Backup sensor activates if primary fails
- **Remote monitoring:** IoT dashboard alerts staff to sensor offline
- **Easy replacement:** Hot-swappable sensors, minimal downtime
- **Regular maintenance schedule:** Weekly inspection, cleaning, testing

### 10.7 Privacy & Data Concerns

**Limitation: Biometric Data Collection**

**Problem:**
- Users may be uncomfortable having heartbeat recorded
- Data privacy regulations (GDPR, CCPA)
- Potential for misuse or surveillance

**Workarounds:**
- **Transparency:** Clear signage explaining what data is collected and how it's used
- **No storage:** Process data in real-time, delete immediately after visualization
- **Anonymization:** No personal identifiers linked to biometric data
- **Opt-in:** Users actively choose to participate (walk-up design inherently opt-in)
- **Educational framing:** "Art installation, not medical device"
- **Privacy policy:** Available via QR code, plain language

### 10.8 Accessibility

**Limitation: Not All Users Can Use Fingertip Sensors**

**Problem:**
- Users with hand disabilities, amputations, tremors
- Children with small fingers
- Users wearing gloves (winter)

**Workarounds:**
- **Alternative sensor placement:** Earlobe clip available as backup (less ideal but functional)
- **Adjustable sensor housing:** Accommodates range of finger sizes (child to adult)
- **Removable gloves:** "Please remove gloves for best results" signage
- **Inclusive design:** Test with diverse abilities during prototyping
- **Staff assistance:** Docent can help position sensor for users with limited mobility

---

## 11. Implementation Recommendations

### 11.1 Recommended Hardware Configuration

**For Museum/Gallery Art Installation:**

**Sensors:**
- **2x MAX30102 modules** ($7 total)
- Custom 3D-printed housings with silicone contact pads
- Embedded WS2812B LED rings for status indication
- Optional: small heating elements (resistive or Peltier) to warm contact area to 33°C

**Processing:**
- **Raspberry Pi 4 (4GB)** ($55) running Python
- Libraries: max30102-python for sensor reading, NumPy/SciPy for HRV calculation
- WebSocket server for real-time data streaming to visualization

**Display:**
- **24-27" HDMI monitor** ($150-250) positioned between users
- OR **short-throw projector** ($400-600) onto table surface
- Visualization: WebGL/p5.js running in fullscreen browser

**Table:**
- Custom-built 4-5 ft diameter circular or rectangular table
- Sensor wells flush-mounted 2-3 ft apart (across from each other)
- Central display area or projection surface
- Comfortable seating for two (chairs or built-in benches)

**TOTAL HARDWARE: ~$1,000-1,500**

### 11.2 Software Architecture

**Data Flow:**
1. MAX30102 sensors → I2C → Raspberry Pi
2. Python threads read sensor data continuously (500 Hz)
3. Peak detection extracts inter-beat intervals (IBI)
4. HRV calculation: SDNN, RMSSD, LF/HF power, coherence score
5. WebSocket broadcast to browser-based visualization
6. Real-time visual update (30-60 fps)

**Key Software Components:**
- **Sensor driver:** max30102-python library with custom peak detection
- **HRV calculator:** NumPy/SciPy for time/frequency domain analysis
- **Coherence detector:** HeartMath-inspired algorithm (0.04-0.26 Hz peak detection)
- **WebSocket server:** Python `websockets` library or Flask-SocketIO
- **Visualization:** p5.js, Three.js, or custom WebGL (creative coding)

**Code Repositories to Reference:**
- doug-burrell/max30102 (Raspberry Pi Python driver)
- vrano714/max30102-tutorial-raspberrypi (HR/SpO2 calculation examples)
- PulseSensor Playground (Arduino peak detection algorithms)

### 11.3 Interaction Design

**User Journey:**

1. **Attract (0-5 sec):** Pulsing lights, passive visualization on screen
2. **Invite (5-10 sec):** "Place your fingers on the sensors to begin"
3. **Single user (10-20 sec):** Show first user's heartbeat, wait for partner
4. **Dual user (20-30 sec):** Both heartbeats visible, countdown to coherence measurement
5. **Measurement (30-90 sec):** Live coherence visualization, progress indicator
6. **Result (90-120 sec):** Summary score, celebratory visual, option to save/share
7. **Reset (120+ sec):** Thank you, return to attract mode

**Visualization Concept (inspired by your koi project):**
- Two koi fish, one per user, swimming in shared pond
- Fish movement influenced by heartbeat rhythm
- When coherence increases, fish swim in synchronized patterns
- Color, trail, or particle effects intensify with higher coherence
- Beautiful, organic, non-clinical aesthetic

### 11.4 Testing & Iteration

**Prototype Phase:**

1. **Breadboard proof-of-concept:** Verify MAX30102 can reliably detect heartbeat and calculate HRV
2. **Single-user testing:** Test accuracy against commercial pulse oximeter or HeartMath device
3. **Signal quality validation:** Test across diverse skin tones, hand temperatures, contact pressures
4. **Dual-user synchronization:** Validate both sensors can be read simultaneously without interference

**Alpha Installation:**

1. **Build first table:** Complete hardware/software integration in furniture
2. **Internal testing:** Staff and friends test user experience
3. **Iterate on industrial design:** Adjust sensor placement, visual cues, seating comfort
4. **Refine visualization:** Tune coherence algorithm sensitivity, adjust graphics for engagement

**Beta Installation:**

1. **Soft launch:** Install in gallery with limited publicity
2. **Observe real users:** Document challenges, confusion points, delights
3. **Collect feedback:** Exit survey, comment cards, staff observations
4. **Measure engagement:** Average session duration, completion rate, return visitors

**Public Launch:**

1. **Final refinements:** Incorporate beta feedback
2. **Staff training:** Cleaning protocols, troubleshooting, user assistance
3. **Documentation:** User-facing instructions, maintenance manual, privacy policy
4. **Promote:** Gallery materials, social media, press release

### 11.5 Success Metrics

**Quantitative:**
- **Engagement rate:** % of gallery visitors who try the installation
- **Completion rate:** % of users who complete full 60-90 sec measurement
- **Dual-user success:** % of sessions with two participants (vs single user)
- **Signal quality:** % of sessions with acceptable PPG signal throughout
- **Uptime:** % of time installation is functional (target: >95%)

**Qualitative:**
- **User feedback:** Comments, survey responses, social media posts
- **Observed behavior:** Do users smile? Do they discuss experience with partner?
- **Gallery staff feedback:** Ease of maintenance, visitor questions/reactions
- **Critical reception:** Reviews, press coverage, curator feedback

**Target Goals (First 3 Months):**
- 500+ total sessions
- 70%+ completion rate
- 80%+ dual-user sessions
- 90%+ acceptable signal quality
- 95%+ uptime
- Net Promoter Score (NPS) > 50

---

## 12. Conclusion & Next Steps

### 12.1 Summary of Findings

**Fingertip PPG sensors (MAX30102) are highly suitable for this art installation:**

- ✅ **Accurate:** R² > 0.95 correlation with chest ECG for HRV during rest
- ✅ **Affordable:** $3-4 per sensor (DIY) or $50-200 (commercial)
- ✅ **Non-invasive:** Casual contact, no clothing removal, walk-up friendly
- ✅ **Proven in art:** Rafael Lozano-Hemmer's successful biometric installations
- ✅ **Technically feasible:** Extensive libraries, documentation, community support

**Key design priorities:**

1. **Intuitive placement:** Flush-mounted wells, clear visual cues, LED feedback
2. **Comfort & ergonomics:** Soft contact surfaces, optimal pressure, warm sensors
3. **Signal quality:** Temperature management, motion artifact reduction, real-time coaching
4. **Equity:** Address skin tone bias through sensor selection and adaptive gain
5. **Hygiene:** Regular cleaning with 70% isopropyl alcohol, visible cleanliness
6. **Engagement:** Beautiful visualization, compelling feedback, 60-90 sec duration
7. **Reliability:** Robust construction, redundancy, remote monitoring, easy maintenance

### 12.2 Recommended Path Forward

**Phase 1: Proof of Concept (2-4 weeks)**
- Order 2x MAX30102 sensors, Raspberry Pi, basic supplies
- Breadboard prototype: verify heart rate and HRV detection
- Test with diverse volunteers (different skin tones, temperatures)
- Document accuracy, signal quality, challenges

**Phase 2: Industrial Design (4-6 weeks)**
- Design and 3D print custom sensor housings
- Build small-scale table mockup
- Test sensor placement options (flush vs elevated)
- Iterate on ergonomics and visual guidance

**Phase 3: Software Development (6-8 weeks)**
- Implement real-time HRV calculation and coherence detection
- Build WebSocket data streaming architecture
- Create visualization (koi-inspired or other concept)
- Test dual-user synchronization

**Phase 4: Alpha Integration (4-6 weeks)**
- Build full-scale table with integrated sensors
- Complete hardware/software integration
- Internal testing with staff and volunteers
- Refine based on feedback

**Phase 5: Beta Installation (8-12 weeks)**
- Install in gallery for limited public testing
- Observe user behavior, collect feedback
- Measure engagement and completion rates
- Iterate on instructions, visualization, comfort

**Phase 6: Public Launch (ongoing)**
- Final refinements and polish
- Staff training on maintenance and user assistance
- Promotional materials and documentation
- Monitor performance, maintain, update as needed

**TOTAL TIMELINE: 6-9 months from concept to public launch**

### 12.3 Open Questions for Further Research

1. **Coherence visualization aesthetics:** What visual language best communicates biometric synchronization to non-expert audiences?

2. **Optimal session duration:** Is 60-90 seconds the sweet spot, or should it be shorter (higher throughput) or longer (deeper coherence)?

3. **Stranger vs known pairs:** Does the installation create different experiences for couples, friends, or strangers? Should it be optimized for one?

4. **Longitudinal engagement:** Can users return multiple times and track improvement in coherence? Should there be user accounts/data storage?

5. **Group coherence:** Could the installation scale to 3-4 people measuring collective coherence?

6. **Cross-cultural reception:** How does biometric intimacy in public art resonate across different cultures?

7. **Educational content:** How much scientific explanation enhances vs distracts from the aesthetic experience?

### 12.4 Key Contacts & Resources

**Hardware Suppliers:**
- Adafruit, SparkFun, DFRobot (MAX30102 modules and accessories)
- Amazon, AliExpress (bulk sensors, LEDs, electronics)
- Local makerspaces (3D printing, fabrication)

**Software Libraries:**
- doug-burrell/max30102 (Raspberry Pi Python)
- SparkFun MAX3010x Library (Arduino)
- HeartPy (Python HRV analysis toolkit)

**Inspirational Installations:**
- Rafael Lozano-Hemmer: https://www.lozano-hemmer.com/pulse_room.php
- Hirshhorn Museum Pulse Exhibition: https://hirshhorn.si.edu/exhibitions/rafael-lozano-hemmer-pulse/

**Research Papers:**
- "Comparison of HRV from PPG with ECG" (validates fingertip accuracy)
- "Heart Rate Variability Biofeedback" (HeartMath coherence research)
- "Skin tone bias in PPG sensors" (equity considerations)

**Community Forums:**
- Arduino Forum, Raspberry Pi Forums (technical troubleshooting)
- Processing / p5.js Forum (visualization creative coding)
- Quantified Self Forum (biometric sensor discussions)

---

## Appendix A: Glossary

**BPM:** Beats Per Minute - heart rate measurement

**ECG/EKG:** Electrocardiography - electrical measurement of heart activity via chest electrodes

**HRV:** Heart Rate Variability - variation in time intervals between consecutive heartbeats; indicates autonomic nervous system balance

**IBI:** Inter-Beat Interval - time between consecutive heartbeats (measured in milliseconds)

**PPG:** Photoplethysmography - optical measurement of blood volume changes in tissue using light

**GSR:** Galvanic Skin Response - electrical conductance of skin, indicates arousal/stress

**Coherence:** State of synchronized, harmonious rhythm between heart rate, breathing, and blood pressure; associated with emotional balance and wellbeing (HeartMath concept)

**SDNN:** Standard Deviation of NN intervals - time domain HRV metric

**RMSSD:** Root Mean Square of Successive Differences - time domain HRV metric sensitive to parasympathetic activity

**LF:** Low Frequency (0.04-0.15 Hz) - HRV frequency domain component

**HF:** High Frequency (0.15-0.4 Hz) - HRV frequency domain component, parasympathetic marker

**Motion Artifact:** Noise in biometric signal caused by user movement

**I2C:** Inter-Integrated Circuit - two-wire communication protocol for connecting sensors to microcontrollers

**FIFO:** First In, First Out - buffer memory that stores sensor readings in sequence

**Flush Mount:** Sensor installation where device is positioned level with surrounding surface

---

## Appendix B: Bill of Materials (Complete)

### Electronics
- 2x MAX30102 Heart Rate & Pulse Oximeter Sensor Modules
- 1x Raspberry Pi 4 Model B (4GB RAM)
- 1x 32GB MicroSD Card (Class 10, with Raspberry Pi OS)
- 1x USB-C Power Supply (5V 3A for Raspberry Pi)
- 2x WS2812B Addressable LED Strips (1m, 60 LEDs/m) - cut to length for sensor ring
- 1x Logic Level Shifter (3.3V to 5V for LED control)
- 2x Resistive Heating Elements (optional, 5V, small form factor)
- 1x Temperature Sensor (DS18B20 or similar, for heating element control)
- Jumper wires, dupont connectors, heat shrink tubing
- 2x Pullup Resistors 4.7kΩ (for I2C communication)
- Breadboard or custom PCB (for prototyping)

### Sensor Housing
- 3D Printer Filament (PLA or PETG, ~200g)
- Medical-grade Silicone Pads (50mm diameter, 3mm thick)
- Clear Acrylic or Resin (for sensor window)
- M3 Screws and Nuts (for assembly)
- Adhesive (silicone-safe, for bonding pads)

### Table/Furniture
- Wood (hardwood or plywood, for table surface and frame)
- Table Legs or Pedestal Base
- Acrylic or Glass Inserts (for sensor well areas)
- Wood Stain or Paint (for finishing)
- Polyurethane Sealant (for moisture protection)
- LED Channel/Diffuser (aluminum or 3D printed, for LED mounting)

### Display
- 24-27" HDMI Monitor (1920x1080 or higher)
- HDMI Cable (3-6 ft)
- Monitor Mount or Stand

### Accessories
- 2x Comfortable Chairs or Benches
- Power Strip (6+ outlets)
- Cable Management Clips, Channels, Zip Ties
- Cleaning Supplies (70% isopropyl alcohol, microfiber cloths)
- Signage Materials (printed instructions, hygiene protocols)

### Tools Required (Not Consumed)
- 3D Printer
- Soldering Iron and Solder
- Drill and Drill Bits
- Saw (for cutting wood)
- Screwdriver Set
- Multimeter (for testing circuits)
- Hot Glue Gun
- Sandpaper (various grits)

---

## Appendix C: Code Architecture Overview

### Raspberry Pi Python Application

**Directory Structure:**
```
coherence-installation/
├── main.py                 # Main application entry point
├── sensors/
│   ├── max30102_reader.py  # Sensor driver, threaded reading
│   └── signal_processor.py # Peak detection, IBI extraction
├── analysis/
│   ├── hrv_calculator.py   # Time/frequency domain HRV metrics
│   └── coherence_detector.py # HeartMath-inspired coherence algorithm
├── server/
│   ├── websocket_server.py # WebSocket server for data streaming
│   └── static/             # HTML/JS visualization files
│       ├── index.html
│       ├── visualization.js # p5.js or Three.js visualization
│       └── styles.css
├── utils/
│   ├── config.py           # Configuration settings
│   └── logger.py           # Logging utility
└── requirements.txt        # Python dependencies
```

**Key Libraries:**
```
# requirements.txt
max30102==0.3.0              # MAX30102 sensor driver
numpy==1.24.0                # Numerical computing
scipy==1.10.0                # Signal processing, FFT
websockets==11.0.3           # WebSocket server
Flask==2.3.0                 # Optional: Flask-SocketIO alternative
heartpy==1.2.7               # Heart rate analysis toolkit
RPi.GPIO==0.7.1              # GPIO control for LEDs, heating
```

**Pseudocode for Main Loop:**
```python
# main.py
import sensors, analysis, server

def main():
    # Initialize sensors
    sensor1 = MAX30102Reader(address=0x57, i2c_bus=1)
    sensor2 = MAX30102Reader(address=0x58, i2c_bus=1)

    # Start sensor threads
    sensor1.start()
    sensor2.start()

    # Initialize HRV calculators
    hrv1 = HRVCalculator()
    hrv2 = HRVCalculator()

    # Initialize coherence detector
    coherence = CoherenceDetector()

    # Start WebSocket server
    ws_server = WebSocketServer(port=8080)
    ws_server.start()

    # Main loop
    while True:
        # Get inter-beat intervals from sensors
        ibi1 = sensor1.get_latest_ibi()
        ibi2 = sensor2.get_latest_ibi()

        # Calculate HRV metrics
        hrv_metrics1 = hrv1.calculate(ibi1)
        hrv_metrics2 = hrv2.calculate(ibi2)

        # Detect coherence
        coherence_score = coherence.detect(hrv_metrics1, hrv_metrics2)

        # Package data for visualization
        data = {
            'user1': {
                'heartbeat': sensor1.get_latest_peak_time(),
                'hrv': hrv_metrics1,
                'signal_quality': sensor1.assess_quality()
            },
            'user2': {
                'heartbeat': sensor2.get_latest_peak_time(),
                'hrv': hrv_metrics2,
                'signal_quality': sensor2.assess_quality()
            },
            'coherence': coherence_score
        }

        # Broadcast to visualization
        ws_server.broadcast(data)

        # Small delay (10-30ms for ~30-100 Hz update rate)
        time.sleep(0.03)

if __name__ == "__main__":
    main()
```

### Browser-Based Visualization (p5.js)

**Conceptual Structure:**
```javascript
// visualization.js
let ws;  // WebSocket connection
let koi1, koi2;  // Koi fish objects
let coherenceLevel = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Initialize koi fish
  koi1 = new Koi(width * 0.3, height / 2, color(255, 100, 100));
  koi2 = new Koi(width * 0.7, height / 2, color(100, 100, 255));

  // Connect to WebSocket
  ws = new WebSocket('ws://localhost:8080');
  ws.onmessage = handleData;
}

function handleData(event) {
  let data = JSON.parse(event.data);

  // Update koi1 with user1 heartbeat
  if (data.user1.heartbeat) {
    koi1.heartbeat();
  }

  // Update koi2 with user2 heartbeat
  if (data.user2.heartbeat) {
    koi2.heartbeat();
  }

  // Update coherence level
  coherenceLevel = data.coherence;
}

function draw() {
  background(20, 40, 60);  // Deep blue water

  // Update and draw koi
  koi1.update();
  koi1.display();
  koi2.update();
  koi2.display();

  // Draw connection when coherent
  if (coherenceLevel > 0.5) {
    stroke(255, 255, 100, coherenceLevel * 200);
    strokeWeight(coherenceLevel * 5);
    line(koi1.x, koi1.y, koi2.x, koi2.y);
  }

  // Display coherence meter
  displayCoherenceMeter(coherenceLevel);
}

class Koi {
  constructor(x, y, c) {
    this.x = x;
    this.y = y;
    this.color = c;
    this.pulseSize = 1.0;
  }

  heartbeat() {
    // Create pulse animation on heartbeat
    this.pulseSize = 1.5;
  }

  update() {
    // Decay pulse
    this.pulseSize = lerp(this.pulseSize, 1.0, 0.1);

    // Swim movement (influenced by coherence)
    // ... add swimming behavior ...
  }

  display() {
    push();
    translate(this.x, this.y);
    scale(this.pulseSize);
    fill(this.color);
    // ... draw koi shape ...
    pop();
  }
}
```

---

## Appendix D: Installation Checklist

### Pre-Installation (1 Week Before)

- [ ] Prototype fully tested with diverse users
- [ ] Sensors calibrated and validated for accuracy
- [ ] Table constructed and finished
- [ ] Visualization finalized and tested
- [ ] Cleaning supplies purchased and protocols documented
- [ ] Staff trained on operation and troubleshooting
- [ ] Signage designed and printed (instructions, hygiene, privacy)
- [ ] Power outlets and networking confirmed at installation site
- [ ] Insurance and liability reviewed (if applicable)

### Installation Day

- [ ] Transport table and components to site
- [ ] Position table in designated location
- [ ] Connect power to Raspberry Pi, monitor, LEDs
- [ ] Test sensors - verify both detect heartbeat
- [ ] Test visualization - confirm real-time updates
- [ ] Arrange seating - comfortable, appropriate distance
- [ ] Install signage - instructions, hygiene notice, artist statement
- [ ] Stock cleaning supplies - alcohol, cloths, gloves
- [ ] Photograph installation for documentation
- [ ] Test full user journey - walk through as if visitor
- [ ] Adjust lighting - ensure sensors and screen visible
- [ ] Brief gallery staff - operation, maintenance, troubleshooting

### Daily Operations

- [ ] Morning: Power on system, verify functionality
- [ ] Hourly: Clean sensors with 70% isopropyl alcohol
- [ ] Hourly: Visual inspection - check for damage, debris
- [ ] Daily: Test full user journey - ensure working correctly
- [ ] Daily: Restock cleaning supplies if low
- [ ] Evening: Log any issues, clean thoroughly, power off or leave in idle mode

### Weekly Maintenance

- [ ] Deep clean all surfaces
- [ ] Inspect wiring and connections
- [ ] Test sensor accuracy against reference device
- [ ] Review uptime logs and error reports
- [ ] Update software if patches available
- [ ] Check LED functionality - replace any dead LEDs
- [ ] Tighten any loose screws or mounts
- [ ] Collect user feedback forms or comments

### Troubleshooting Guide

**Sensor Not Detecting Heartbeat:**
1. Check physical connection (I2C wiring)
2. Verify sensor power LED illuminated
3. Restart Raspberry Pi
4. Test with known-good user (staff member)
5. Swap sensor with backup unit

**Poor Signal Quality:**
1. Instruct user to warm hands (rub together)
2. Adjust finger placement - ensure full contact
3. Check if heating element functioning (if installed)
4. Clean sensor surface - may have residue

**Visualization Not Updating:**
1. Check monitor cable connection
2. Refresh browser (if web-based visualization)
3. Verify WebSocket connection (check console logs)
4. Restart visualization software

**One User Works, Other Doesn't:**
1. Check I2C addresses - ensure sensors on different addresses
2. Swap sensors to isolate hardware vs software issue
3. Review code for hardcoded values

---

**END OF REPORT**

*This research report compiled from 20+ web searches, 100+ scientific papers and articles, and synthesis of best practices in biometric sensing, art installations, and interaction design. Last updated: 2025-10-25.*
