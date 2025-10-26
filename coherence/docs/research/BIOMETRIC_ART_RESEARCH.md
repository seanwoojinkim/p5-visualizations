# Biometric Coherence Visualization: Research Report

**Research Date:** October 2025
**Purpose:** Inform artistic direction for p5.js-based interpersonal coherence visualization
**Focus:** Interactive art installations using biometric data, creative visualization approaches, and participant experience

---

## Table of Contents

1. [Notable Existing Projects](#notable-existing-projects)
2. [Visualization Design Patterns & Metaphors](#visualization-design-patterns--metaphors)
3. [Participant Experience Insights](#participant-experience-insights)
4. [Technical Setup Examples](#technical-setup-examples)
5. [Ethical & Privacy Guidelines](#ethical--privacy-guidelines)
6. [Common Pitfalls & Lessons Learned](#common-pitfalls--lessons-learned)
7. [Making Coherence Visceral & Meaningful](#making-coherence-visceral--meaningful)
8. [Scientific Context: Interpersonal Synchrony](#scientific-context-interpersonal-synchrony)
9. [Technical Resources for Implementation](#technical-resources-for-implementation)

---

## Notable Existing Projects

### Rafael Lozano-Hemmer: The "Pulse" Series

**Overview:** Mexican-Canadian artist Rafael Lozano-Hemmer is perhaps the most prominent figure in biometric interactive art. His "Pulse" series has been exhibited at major institutions including the Hirshhorn Museum, MoMA, and Art Basel.

#### Key Works:

**1. Pulse Room (2006)**
- **Description:** 100-300 clear incandescent light bulbs hanging from ceiling in grid formation
- **Interaction:** Participants grip a sensor that reads their pulse, which is translated into the rhythm of a specific light bulb
- **Queue System:** Each new heartbeat is recorded and added to the first bulb, pushing all previous recordings forward through the grid
- **Scale:** Creates a temporal archive of up to 300 previous heartbeats
- **Experience:** Immersive mix of asynchronous light and sound; participants see their heartbeat become part of a collective memory
- **Collections:** Permanent collection at MoMA, ZKM, MACM

**2. Pulse Tank (2008)**
- **Description:** Heart rates converted into water waves in an illuminated ripple tank
- **Interaction:** Sensors pick up visitor's pulse and transform it into ripples over water
- **Visual Effect:** Water ripples are reflected as shadows on gallery walls, creating an ethereal, meditative atmosphere
- **Metaphor:** Uses water as a medium to represent the invisible flow of life force

**3. Pulse Index (2010)**
- **Description:** Documents participants' fingerprints while simultaneously tracking heart rate
- **Display:** Massive projections on curved walls showing thousands of individual fingerprints
- **Data:** Records last 10,000 users on a scaled grid
- **Themes:** Explores identity, surveillance, and the relationship between biometric markers

**4. Pulse Topology (2021)**
- **Technology:** Uses touchless remote photoplethysmography (PPG) technology
- **Scale:** 3,000-10,000 suspended light bulbs
- **Innovation:** Computer vision algorithms optically detect heartbeats without physical contact
- **Experience:** Immersive audio-visual environment responding to multiple participants simultaneously
- **Notable Installation:** Featured at Superblue Miami (2024)

**5. Public Art Installations:**

- **Pulse Park (2007):** Matrix of powerful spotlight beams in Madison Square Park, NYC, with intensity modulated by participants' heart rates, visualizing vital signs at urban scale
- **Pulse Corniche (Abu Dhabi):** Interactive canopy of robotic searchlights projected into sky, controlled by visitors' heart rates, creating unique lighting sequences visible across the city

**Artistic Philosophy:**
> "These works explore themes of human connection, biometric surveillance, and our shared humanity through technology." - Lozano-Hemmer uses biometric data to create "technological reliquaries" - temporary monuments to human presence.

---

### Lisa Park: Eunoia Series

**Artist Background:** Korean-American artist working with EEG sensors and biofeedback to create performance art

#### Eunoia (2013)

- **Title Meaning:** "Beautiful thinking" in Greek
- **Technology:** NeuroSky brainwave headset (EEG sensor)
- **Setup:** 5 aluminum plates with pools of water, each placed on speakers
- **Data Mapping:** Software musicalizes brainwave data, calibrating volume, pitch, and panning based on 'Attention' and 'Meditation' values
- **Visual Effect:** Sound vibrations create ripples in water pools, making mental states physically visible
- **Medium:** Combines audio synthesis, cymatics (study of visible sound vibrations), sculpture, and performance

#### Eunoia II (2014)

- **Scale:** 48 speakers and aluminum dishes with water pools
- **Inspiration:** Number 48 references Spinoza's 'Ethics' (Chapter III), which classifies 48 human emotions into three categories: desire, pleasure, and pain
- **Technology:** Emotiv EPOC with 14 EEG sensors
- **Data Captured:** Frustration, Meditation, Boredom, Engagement, and Excitement
- **Experience:** Water appears to move through sheer will, creating a mirror of the artist's internal emotional state

**Artistic Concept:**
Water becomes a tangible manifestation of invisible emotional and cognitive processes. The work challenges viewers to consider the physical reality of thought and emotion.

---

### George Khut: Body-Focused Interactive Art

**Overview:** Australian artist and researcher specializing in biofeedback art with focus on participant experience and therapeutic applications

#### Artistic Approach:

- **Philosophy:** "Body-focused interactive art" that directs participants' attention inward toward their own body processes
- **Visualization Strategy:** Avoids "info-graphic" representations in favor of abstract, immersive visualizations
- **Interaction Quality:** Promotes "softer quality of attention" - ambiguous displays provide catalyst for reflection and experimentation
- **Social Dimension:** Installations are intentionally social - others can witness the interaction, and conversations around the experience are integral

#### Notable Projects:

**The Heart Library Project (2008)**
- **Location:** Hospital setting
- **Concept:** Returns biofeedback technology to medical context while reframing it as art
- **Theme:** Manifests connection between mind and body

**BrightHearts App**
- **Mechanism:** Rewards decreases in user's heart rate with colorful animated visuals and sound effects
- **Purpose:** Provides tangible experience of mind-body connections
- **Application:** Used in clinical and wellness contexts

#### Key Insights from Participant Studies:

- **Active Control:** Some users actively tried to control visuals by altering breathing, describing it as a "joyful experience"
- **Passive Response:** Others noted that the rhythm of the visuals impacted their breathing involuntarily
- **Reflective Quality:** Work helps people "re-think/re-feel ideas of self-hood and embodiment"
- **Present-Moment Awareness:** Supports people to be present to themselves in ways that are difficult to find time for in daily routines

---

### Atau Tanaka: Muscle Sensing & Physiological Performance

**Position:** Professor of Media Computing at Goldsmiths, University of London

#### BioMuse System:

- **Technology:** Neural-musical interface using electromyogram (EMG) signals
- **Signal Type:** Picks up electrical impulses as central nervous system causes muscle contraction
- **Evolution:** Multiple incarnations from 1990 to present, with increasing miniaturization
- **Innovation:** Progression from wet gel electrodes to dry electrodes, addition of wireless communication

#### Performance Work:

**Sensorband (10-year collaboration)**
- **Members:** Edwin van der Heide, Zbigniew Karkowski, Atau Tanaka
- **Concept:** Reconciled new technologies with immediacy and energy of rock music
- **Instruments:** Ultrasound, infrared, and bioelectric sensors as musical instruments

**Bondage (2004)**
- **Exhibition:** Villette Numérique, Paris
- **Focus:** Corporeal interaction in performance and exhibition contexts

**Venues:** Ars Electronica, SFMOMA, Eyebeam, Southbank Meltdown, NTT-ICC, ZKM

---

### Christa Sommerer & Laurent Mignonneau: Bio-Interactive Pioneers

**Overview:** Internationally renowned media artists recognized as pioneers of interactive art, working together since early 1990s

#### Key Characteristics:

- **Backgrounds:** Sommerer's background in botany, anthropology, and sculpture + Mignonneau's studies in video and modern art
- **Approach:** Natural and intuitive interfaces applying scientific principles: artificial life, complexity, generative systems, nanotechnologies
- **Philosophy:** "Epoch-making" work in interface design

#### Major Installations:

**Interactive Plant Growing (1992)**
- **Innovation:** First artistic project, became landmark work of interactive art
- **Technology:** Connects real-time growing of virtual plants in 3D computer space to real living plants
- **Interaction:** Viewers can touch or approach living plants to affect virtual growth
- **Collection:** Permanent collection at ZKM Center for Art and Media, Karlsruhe (since 1997)

**A-Volve (1994-1997)**
- **Recognition:** Golden Nica grand prize in Prix Ars Electronica's Interactive Art category
- **Concept:** Interactive artificial life environment

**Portrait on the Fly (2015)**
- **Technology:** Monitor with swarm simulation
- **Visual:** Countless moving speckles resembling flies mimic contours of person
- **Effect:** Images construct and deconstruct reflected image of bystander
- **Commentary:** Critique of people's obsession with their own image

---

### Other Notable Projects

#### Heart Bot Interactive Installation
- **Concept:** Generates collective drawing in real-time using heartbeat input
- **Interface:** Pulse monitor inside podium
- **Visual Output:** Robotic arm draws from center of concentric design outward, creating visual record of collected heartbeat data

#### BREAKFAST Studio: Pulse (Brixels Art Installation)
- **Focus:** Large-scale kinetic installation responding to biometric data
- **Technology:** Modular display system (Brixels) that can be physically manipulated by data

#### Emotional Resonance Installation
- **Concept:** Transforms humans' pulse into motion and light reflections
- **Feedback Loop:** Pulse displayed as water and light movements → Observed by participant → Influences pulse through emotional reaction
- **Theme:** Explores how biometric technology mediates emotional experience

---

## Visualization Design Patterns & Metaphors

### Common Visual Metaphors

#### 1. **Water Ripples / Waves**

**Why it works:**
- Water is universal, primal, and emotionally resonant
- Ripples naturally represent propagation of influence and energy
- Visible manifestation of invisible vibrations (cymatics)
- Metaphorically represents interconnectedness

**Applications:**
- Lisa Park's Eunoia: Water pools vibrating with brainwave activity
- Lozano-Hemmer's Pulse Tank: Heart rates converted to ripples
- Mutual Wave Machine: EEG correlations shown as light wave patterns

**Design Considerations:**
- Water reads as both calming and dynamic
- Ripple interference patterns can show synchrony/coherence
- Natural unpredictability encourages discovery

#### 2. **Light / Illumination**

**Why it works:**
- Light represents life force, consciousness, awareness
- Can be scaled from intimate (single bulb) to monumental (searchlights)
- Immediate visual feedback - no learning curve
- Creates emotional atmosphere through brightness, color, rhythm

**Applications:**
- Pulse Room: Individual bulbs pulsing with heartbeats
- Pulse Topology: 3,000+ lights creating immersive environment
- Pulse Corniche: Searchlights projecting into sky

**Design Patterns:**
- Synchronous pulsing = coherence
- Brightness = intensity/engagement
- Color = emotional valence or different data streams
- Spatial distribution = collective vs. individual states

#### 3. **Sound / Audio**

**Why it works:**
- Sound is inherently temporal and rhythmic
- Can represent multiple data streams simultaneously
- Creates immersive environment without requiring visual attention
- Natural mapping to heartbeat rhythm

**Applications:**
- George Khut's work: Abstract soundscapes modulated by heart rate
- Lisa Park's Eunoia: Brainwave data musicalized
- Atau Tanaka's BioMuse: Muscle tension as sonic gesture

**Design Patterns:**
- Pitch = arousal or frequency of signal
- Volume = intensity
- Rhythm = heartbeat or breath
- Panning/spatialization = different participants
- Harmony/dissonance = coherence/incoherence

#### 4. **Organic Growth / Natural Forms**

**Why it works:**
- Biometric data is fundamentally organic
- Growth metaphors suggest life, connection, flourishing
- Familiar from nature, emotionally accessible

**Applications:**
- Sommerer & Mignonneau's Interactive Plant Growing
- Generative systems that evolve based on physiological state

**Design Patterns:**
- Growth rate = coherence level
- Branching/complexity = connection strength
- Color/vitality = emotional state
- Decay when disconnected = loss of coherence

#### 5. **Particle Systems / Swarms**

**Why it works:**
- Individual agents with collective behavior = perfect metaphor for coherence
- Can show both individual and group dynamics
- Natural emergence and self-organization
- Visually engaging and dynamic

**Applications:**
- Portrait on the Fly: Fly swarm mimicking human form
- Flocking behaviors responding to biometric data

**Design Patterns:**
- Particle alignment = synchrony
- Swarm cohesion = coherence
- Individual particle = single heartbeat/breath
- Color/brightness = data streams
- Attraction/repulsion forces = relationship quality

#### 6. **Temporal Visualization / Memory**

**Why it works:**
- Heartbeat is inherently temporal
- Creates sense of history and collective experience
- Shows change over time

**Applications:**
- Pulse Room: Queue of 300 previous heartbeats
- Pulse Index: Archive of 10,000 participants

**Design Patterns:**
- Spatial position = time
- Fading/transparency = recency
- Persistence = memory
- Queue structure = succession of experiences

---

### Emerging Design Patterns for Coherence

#### Synchrony Visualization Strategies:

**1. Phase Alignment**
- Show two waveforms converging/diverging
- Visual "locking" when in sync
- Color shift when coherence achieved

**2. Interference Patterns**
- Ripples/waves creating constructive interference when aligned
- Moire patterns indicating synchronization
- Resonance effects

**3. Field Effects**
- One person's state creates a "field" that affects visual environment
- Second person's field interacts with first
- Overlap regions show coherence

**4. Collective Forms**
- Individual data represented as particles/elements
- Coherence creates emergent collective patterns
- Mandala-like symmetrical forms when in sync

**5. Distance/Proximity Mapping**
- Visual distance between elements reflects physiological distance
- Convergence = increasing coherence
- Overlapping = high synchrony

---

### Visualization Research Methods

#### Measurement Techniques for Synchrony:

**Wavelet Transform Coherence (WTC)**
- Conceptualized as localized correlation coefficient between two time series
- Function of time AND frequency
- Represented by color gradients in time-frequency plots
- Shows when and at what frequencies synchrony occurs

**Windowed Cross-Correlation**
- Accounts for non-stationarity of physiological signals
- Handles delays between individuals' responses
- Shows lead-lag relationships (who leads, who follows)

**Partial Directed Coherence (PDC)**
- Novel approach for calculating psychophysiological synchrony
- Shows directional influence between signals
- Useful for understanding causal relationships

---

### Color Theory for Biometric Visualization

**Considerations from Research:**

1. **Emotional Valence:**
   - Warm colors (red, orange): High arousal, energy, excitement
   - Cool colors (blue, green): Calm, meditation, low arousal
   - Purple/violet: Often used for coherence/synchrony states

2. **Data Differentiation:**
   - Distinct hues for different participants
   - Blend/mix when synchronized
   - Saturation for intensity

3. **Accessibility:**
   - Consider colorblind-friendly palettes
   - Use brightness/position in addition to color
   - Avoid red-green combinations for critical information

---

## Participant Experience Insights

### Key Findings from Research

#### Engagement Patterns:

**Three Levels of Participation (from Design Research):**

1. **Passive Observation** (Spectators)
   - Watch others interact
   - Learn from observing before trying
   - Social witnessing creates community
   - Important for creating comfortable entry point

2. **Light Interaction** (Casual Participants)
   - Brief, exploratory engagement
   - Satisfy curiosity
   - May not invest time to discover deeper patterns
   - Need immediate, clear feedback

3. **Deep Creation** (Engaged Participants)
   - Extended engagement (5+ minutes)
   - Experimentation and discovery
   - Attempt to understand and control system
   - Reflective experience

**Design Implication:** Create clear affordances for all three levels. Don't require deep engagement to have meaningful experience.

---

#### Participant Behaviors with Biofeedback:

**From George Khut's Research:**

**Active Controllers:**
- Deliberately alter breathing or focus to change visualization
- Experience as "joyful" challenge
- Sense of agency and mastery
- More common in younger participants

**Passive Observers:**
- Notice visualization affecting their physiology
- Rhythm of visuals impacts their breathing involuntarily
- Sense of being guided or entranced
- More meditative experience

**Reflective Explorers:**
- Use experience to "re-think/re-feel" selfhood and embodiment
- Present-moment awareness
- Therapeutic quality
- Value the opportunity to focus inward

**Design Implication:** Support multiple interaction styles. Don't assume all participants want to "control" - some prefer to "resonate" with the system.

---

#### Social Dynamics:

**From ParticipArt and Interactive Installation Research:**

1. **Witnessing as Participation:**
   - Observers feel connected even without direct interaction
   - Conversations around the experience are integral
   - Social validation reduces inhibition

2. **Collaborative vs. Competitive:**
   - Couples/close partners naturally collaborate toward synchrony
   - Strangers may experience anxiety about "performing"
   - Competitive dynamics can emerge unintentionally

3. **Privacy Concerns:**
   - Publicly sharing biometric data can feel invasive
   - Some participants embarrassed by visible stress/anxiety
   - Need for consent and control

**Design Implication:**
- Make social witnessing intentional part of experience
- Frame as collaborative, not competitive
- Provide privacy options or abstract representations

---

#### Emotional Responses:

**From Biometric Art Studies:**

1. **Fascination Phase:** Initial wonder at seeing internal state externalized
2. **Experimentation Phase:** Trying to understand and influence system
3. **Relaxation/Engagement Phase:** Settling into experience, less self-conscious
4. **Reflection Phase:** Considering meaning and personal insights

**Problematic Responses:**
- Anxiety about "failing" or not producing interesting visuals
- Frustration if feedback is unclear or seems random
- Self-consciousness about being watched
- Concern about data privacy

**Successful Responses:**
- Sense of connection with partner/others
- Meditative, calming experience
- Playful exploration
- Meaningful insight about self or relationship

---

#### Participant Feedback from Emotional Resonance Installation:

**Key Quotes from Study:**
- "I felt like I could see my stress melting away"
- "It made me realize how my partner affects my body"
- "Beautiful but slightly uncomfortable - seeing myself so exposed"
- "I wanted to achieve perfect synchronization but couldn't control it"

**Lessons:**
- Ambiguity can be productive but also frustrating
- Participants want some sense of agency
- Making invisible visible is powerful but can be uncomfortable
- Synchrony goal should be invitation, not demand

---

### User Experience Best Practices

#### Onboarding & Instructions:

**Research Findings:**

1. **Minimize Cognitive Load:**
   - Avoid lengthy text instructions
   - Demonstrate through example
   - Allow learning through doing
   - Provide help on demand, not upfront

2. **Set Clear Expectations:**
   - What data is being collected
   - What visualization represents
   - How long to interact
   - What constitutes "success"

3. **Manage Anticipation:**
   - Small test before full experience
   - Calibration period that explains data
   - Gradual introduction of complexity

#### During Experience:

1. **Feedback Clarity:**
   - Immediate response to physiological changes
   - Clear mapping between input and output
   - Visual confirmation that system is working

2. **Pacing:**
   - Allow time for discovery (30-60 seconds minimum)
   - Gradual escalation of complexity
   - Natural conclusion or loop point

3. **Error Recovery:**
   - Graceful handling of lost sensor signal
   - Clear indication of technical issues vs. participant state
   - Easy restart without feeling like failure

#### Post-Experience:

1. **Closure:**
   - Clear ending
   - Optional: save/share visualization
   - Reflection prompt or conversation starter

2. **Context:**
   - Optional deeper explanation
   - Link to artist statement or research
   - Contact for questions

---

### Accessibility Considerations

**From Smithsonian Guidelines and Accessibility Research:**

#### Physical Accessibility:

1. **Sensor Placement:**
   - Should be reachable from seated position
   - Height-adjustable if possible
   - Consider multiple sensor options (ear clip vs. finger sensor)

2. **Alternative Interaction Methods:**
   - Not everyone can grip tightly or hold still
   - Provide options for different abilities
   - Consider touchless methods (like PPG cameras)

3. **Space Design:**
   - Wheelchair accessible
   - Clear pathways
   - Adequate space for assistive devices

#### Sensory Accessibility:

1. **Visual:**
   - Don't rely only on subtle color differences
   - Use multiple visual channels (brightness, size, position, motion)
   - Provide high contrast options
   - Consider screen reader compatibility for any text

2. **Auditory:**
   - Provide visual alternatives to sound
   - Adjustable volume
   - Consider hearing loop systems

3. **Cognitive:**
   - Avoid information overload
   - Clear, simple language
   - Multiple learning modalities
   - Option to experience at own pace

#### Comfort Considerations:

1. **Duration:**
   - Option for short (1-2 min) or extended (5+ min) interaction
   - Clear indication of expected time
   - Easy exit

2. **Sensory Intensity:**
   - Avoid strobing lights (epilepsy concern)
   - Manage sound levels
   - Provide calm spaces nearby

3. **Privacy:**
   - Screen positioning to control who can see
   - Option to interact alone or with partner only
   - Clear data handling policies

**Key Finding from Research:**
> "4% of control subjects cited lack of comfort as a reason for not using biometric recognition"

This may seem small, but in a public art context, if people decline participation due to discomfort, the experience fails before it begins.

---

## Technical Setup Examples

### Rafael Lozano-Hemmer: Pulse Room Technical Details

#### Hardware Components:

- **Lights:** 300 clear incandescent light bulbs (300W each)
- **Height:** Hung from cables at 3 meters
- **Sensor:** Stainless steel interface with heart rate sensor (cylindrical handles in some versions)
- **Voltage Controllers:** Individual dimmer/switch per bulb
- **Computer:** Central system for signal processing and control
- **Structure:** Ceiling-mounted cable grid

#### Signal Flow:

1. **Input:** Participant grips sensor with both hands
2. **Detection:** Heart rate sensor detects pulse
3. **Processing:** Computer receives pulse data
4. **Mapping:** Pulse rhythm mapped to first bulb in grid
5. **Queue:** Previous recording shifts to next bulb
6. **Display:** 300 bulbs show current + 299 previous heartbeats
7. **Reset:** When sensor released, all lights briefly off, pattern advances

#### Key Design Decisions:

- **Queue System:** FIFO (First In, First Out) creates temporal archive
- **Synchronization:** All 300 lights run independently with their recorded rhythm
- **Persistence:** Each heartbeat "lives" for duration of 300 subsequent recordings
- **Collective vs. Individual:** Your heartbeat becomes part of collective but remains distinct

---

### Lisa Park: Eunoia II Technical Setup

#### Hardware:

- **EEG Device:** Emotiv EPOC neuroheadset (14 sensors)
- **Audio:** 48 speakers (one per emotional state in Spinoza's classification)
- **Displays:** 48 aluminum dishes with water pools
- **Mounting:** Each dish placed on top of speaker

#### Data Processing:

- **Input Signals:** Frustration, Meditation, Boredom, Engagement, Excitement
- **Mapping Parameters:**
  - Speed of sound playback
  - Panning (spatial position)
  - Volume (amplitude)
- **Audio Generation:** Recorded sounds modulated in real-time
- **Visual Output:** Sound vibrations create water ripples (cymatics)

#### Software:

- Custom applications to interpret EEG SDK output
- Real-time audio synthesis
- Mapping of discrete emotional values to continuous audio parameters

---

### George Khut: BrightHearts Technical Approach

#### Platform:
- Mobile app (iOS/Android)

#### Sensors:
- **Camera-based PPG:** Phone camera detects pulse from fingertip
- **Optional:** External heart rate monitor via Bluetooth

#### Visual System:
- **Generative graphics:** Abstract, colorful animations
- **Mapping:** Lower heart rate → more vibrant, expansive visuals
- **Reward System:** Achieving target HR zone triggers special effects

#### Design Philosophy:
- **Ambiguous Abstraction:** Deliberately non-literal to encourage soft attention
- **Immediate Feedback:** < 100ms latency from physiological change to visual response
- **Aesthetic Priority:** Beautiful regardless of data - no "ugly" states

---

### Technical Considerations for Implementation

#### Sensor Technologies:

**1. Contact-Based Heart Rate Sensors:**

**Pulse Sensor (most common for art projects):**
- Type: Photoplethysmography (PPG)
- Connection: Analog output to Arduino/microcontroller
- Pros: Inexpensive ($25), reliable, well-documented
- Cons: Requires contact with fingertip or earlobe, can be affected by movement
- Usage: Most DIY biometric art installations

**Polar/Bluetooth Heart Rate Monitors:**
- Type: Chest strap or wrist-based
- Connection: Bluetooth LE to computer/phone
- Pros: Medical-grade accuracy, wireless, no hand occupation
- Cons: More expensive ($50-200), requires wearing device
- Usage: When accuracy and freedom of movement matter

**2. Touchless Technologies:**

**Remote Photoplethysmography (rPPG):**
- Technology: Computer vision analysis of subtle skin color changes
- Implementation: Webcam or camera + processing algorithms
- Pros: No physical contact, can track multiple people
- Cons: Requires good lighting, computationally intensive
- Example: Lozano-Hemmer's Pulse Topology (2021)

**3. Brain Sensing (EEG):**

**Consumer Options:**
- Muse headband ($200-300): 4-7 sensors, meditation focus
- Emotiv EPOC ($400-800): 14 sensors, emotion detection
- NeuroSky ($100): Single sensor, basic attention/meditation

**Considerations:**
- Requires calibration period
- Hair can interfere with signal
- More invasive feeling for participants
- Complex data interpretation

---

#### Data Flow Architectures:

**Architecture 1: Simple Serial (Arduino + p5.js)**

```
Sensor → Arduino → USB Serial → p5.serialport → p5.js visualization
```

**Pros:** Simple, reliable, well-documented
**Cons:** Requires p5.serialcontrol app, participant must be near computer

**Architecture 2: Wireless (Arduino/ESP32 + WebSocket)**

```
Sensor → ESP32/Arduino + WiFi → WebSocket Server → p5.js (multiple clients)
```

**Pros:** Wireless freedom, multiple viewers, web-based
**Cons:** More complex setup, network dependencies

**Architecture 3: Mobile-First**

```
Sensor → Phone (PPG from camera) → WebSocket → p5.js visualization (same device or projected)
```

**Pros:** No external hardware, accessible, portable
**Cons:** Phone camera PPG less accurate, participant holds phone

**Architecture 4: Multi-Participant**

```
Multiple sensors → Central server → Aggregation/analysis → Multi-channel visualization
```

**Challenge:** Synchronizing multiple data streams
**Solution:** Timestamp all data, use server clock as reference

---

#### Signal Processing Considerations:

**1. Noise Reduction:**
- Movement artifacts are common with contact sensors
- Implement median filtering or low-pass filter
- Consider requiring brief stillness for calibration

**2. Heart Rate Calculation:**
- Peak detection algorithms (rising edge, threshold crossing)
- Inter-beat interval (IBI) calculation: time between peaks
- Beats per minute (BPM): 60000ms / average IBI

**3. Heart Rate Variability:**
- Standard deviation of IBI (SDNN)
- Root mean square of successive differences (RMSSD)
- Frequency domain analysis (requires more data and computation)

**4. Coherence Detection:**
For two participants:
- Calculate cross-correlation between signals
- Windowed analysis to show coherence over time
- Phase difference: are peaks aligned?
- Frequency coherence: are BPMs converging?

---

#### Latency Considerations:

**Target Latency Budget: < 200ms**

Breakdown:
- Sensor sampling: 10-20ms (depends on sensor)
- Signal processing: 20-50ms (filtering, peak detection)
- Data transmission: 10-50ms (USB serial < WiFi < Internet)
- Visualization rendering: 16ms (60fps) to 33ms (30fps)
- Display lag: 10-50ms (projector > monitor)

**Total:** 66-203ms is achievable

**Why it matters:**
- Below 100ms feels instantaneous
- 100-200ms noticeable but acceptable
- Above 300ms feels disconnected, breaks sense of agency

---

#### Hardware Recommendations for Art Installation:

**Sensor Choice:**
- **For accuracy:** Polar H10 chest strap ($90) + Bluetooth receiver
- **For ease:** Pulse Sensor Amped ($25) + Arduino
- **For wow factor:** rPPG camera-based (no contact) but requires good lighting
- **For reliability:** Two redundant systems - if one fails, switch to backup

**Computing:**
- **Development:** Laptop running p5.js in browser
- **Installation:** Raspberry Pi 4 (8GB) can run p5.js + sensor input
- **Professional:** Dedicated PC if using rPPG or complex processing

**Display:**
- **Intimate (1-2 people):** 32-40" monitor
- **Small group (3-5):** Short-throw projector, 60-100" screen
- **Installation scale:** Multiple projectors or LED matrix

**Audio:**
- Quality speakers crucial - biometric feedback is multimodal
- Consider surround/spatial audio for immersion
- Separate volume control independent of visuals

---

### Example Sensor Integration Code Pattern:

**Arduino (Pulse Sensor):**
```cpp
// Simplified pattern - actual implementation would use Pulse Sensor library
int pulsePin = A0;
int threshold = 550;
boolean pulse = false;
unsigned long lastBeatTime = 0;

void loop() {
  int signal = analogRead(pulsePin);

  if (signal > threshold && !pulse) {
    pulse = true;
    unsigned long ibi = millis() - lastBeatTime;
    lastBeatTime = millis();
    int bpm = 60000 / ibi;

    Serial.print("BPM,");
    Serial.println(bpm);
  }

  if (signal < threshold) {
    pulse = false;
  }

  delay(10);
}
```

**p5.js (receiving data):**
```javascript
// Using p5.serialport library
let serial;
let currentBPM = 0;

function setup() {
  serial = new p5.SerialPort();
  serial.on('data', serialEvent);
  serial.open('/dev/ttyUSB0'); // Adjust port
}

function serialEvent() {
  let data = serial.readLine();
  if (data.includes('BPM')) {
    currentBPM = int(data.split(',')[1]);
    // Trigger visualization update
  }
}
```

---

## Ethical & Privacy Guidelines

### Legal Framework

#### GDPR (Europe) and Similar Regulations:

**Biometric Data Classification:**
- Biometric data is classified as "special category" data
- Requires explicit, informed consent
- Higher standard of protection than regular personal data

**Key Requirements:**

1. **Consent Must Be:**
   - Explicit (not implied)
   - Informed (participants understand what, why, how)
   - Freely given (no coercion)
   - Revocable at any time without consequence

2. **Transparency Requirements:**
   - Clear explanation of data collection
   - Purpose of collection
   - Who has access to data
   - How long data will be stored
   - How data can be modified or deleted

3. **Data Minimization:**
   - Collect only what's necessary for specific purpose
   - Define and enforce retention periods
   - Securely erase unused or obsolete data
   - Anonymous aggregation where possible

4. **Right to Erasure:**
   - Participants can request deletion at any time
   - Must comply "without undue delay"
   - Can only refuse if other lawful basis exists

5. **Security Measures:**
   - Encryption for data storage and transmission
   - Access controls
   - Breach notification procedures

**Enforcement Examples:**
- Spanish supermarket chain: €2.52 million fine for facial recognition without consent
- Clearview AI: €20 million fine from Italian Authority

---

#### BIPA (Illinois, USA) and Similar State Laws:

**Key Provisions:**
- Written policy required before collection
- Written consent required
- Data retention limitations
- Prohibition on selling biometric data
- Private right of action (individuals can sue for violations)

---

### Ethical Framework for Art Installations

#### Informed Consent Best Practices:

**1. Before Participation:**

**Minimum Information to Provide:**
- What biometric data will be collected (heart rate, etc.)
- How long interaction will take
- What data will be stored (if any) and for how long
- Whether data will be displayed publicly
- Who will have access to data
- How to withdraw consent

**Format:**
- Verbal explanation option for accessibility
- Written consent form for installations requiring data storage
- Option to decline specific data collection while still participating

**Red Flags to Avoid:**
- Assuming consent through participation
- Hiding consent in long terms of service
- Making consent difficult to withdraw
- Unclear about what data is collected

**2. During Participation:**

- Clear indication when biometric collection is active
- Visual indicator (LED, screen notification)
- Option to pause or stop at any time
- Technical failures should not default to data collection

**3. After Participation:**

- Option to view collected data
- Simple process to request deletion
- Contact information for questions or concerns
- Thank you / acknowledgment

---

#### Privacy Considerations:

**Public Display of Biometric Data:**

**Research Finding:**
> "There are concerns that publicly sharing private biometric data in performative contexts could be embarrassing and uncomfortable for those whose data is displayed."

**Mitigation Strategies:**

1. **Abstraction:**
   - Avoid literal representations (actual EKG waveform)
   - Use abstract visual metaphors
   - Example: Colors and patterns rather than numeric BPM display

2. **Aggregation:**
   - Show collective patterns rather than individual data
   - When showing two people, make streams equally anonymous
   - Example: "Two heartbeats" not "Alice's and Bob's heartbeats"

3. **Opt-In Levels:**
   - Level 1: Experience without data display
   - Level 2: Data displayed but not stored
   - Level 3: Data stored for archive/research

4. **Temporal Privacy:**
   - Data visible only during interaction
   - No recording or replay without explicit consent
   - Limited memory (like Pulse Room's 300-beat queue)

---

#### Vulnerable Populations:

**Additional Protections Needed:**

**Children:**
- Parental consent required
- Age-appropriate explanations
- Extra sensitivity to anxiety or discomfort
- No data retention

**People with Medical Conditions:**
- Disclaimers that installation is not medical advice
- Option to skip if health concerns exist
- Privacy about why someone declines (don't require disclosure)

**People with Disabilities:**
- Ensure consent materials are accessible
- Alternative participation methods
- Don't assume inability to consent

---

#### Data Storage and Retention:

**Best Practices:**

**1. Default to No Storage:**
- Real-time processing only
- Data discarded immediately after use
- No logs, no archives

**2. If Storage is Necessary:**
- Defined retention period (days, not years)
- Anonymization/pseudonymization
- Encryption at rest and in transit
- Regular automated deletion
- Audit trail of access

**3. Research Context:**
- IRB/Ethics board approval
- Participant information sheet
- Separate consent for research use
- Option to participate in art without research inclusion

---

#### Institutional Considerations:

**Museum/Gallery Context:**

- Often have existing data protection policies - work with them
- Insurance requirements may dictate data handling
- ADA and accessibility compliance required
- Security staff should understand installation

**Public Space:**

- May require additional permissions/permits
- Consider whether bystanders might inadvertently be captured (rPPG cameras)
- Weather/vandalism protection for hardware
- Clearly marked as art installation (not surveillance)

**Clinical/Therapeutic Context:**

- Medical device regulations may apply
- Professional liability considerations
- HIPAA (US) or equivalent medical privacy laws
- Clear boundary between art and medical treatment

---

### Artist Responsibility:

**From "Heart and Soul: Ethics of Biometric Capture" (CHI 2024):**

> "Given the sensitive nature of biometric data in immersive technology, it's imperative to ethically consider data handling in performative contexts, developing frameworks of ethical considerations for artists and researchers."

**Core Principles:**

1. **Respect Autonomy:**
   - Participants' choice always paramount
   - No shaming or pressure to participate
   - Easy opt-out at any stage

2. **Do No Harm:**
   - Avoid triggering anxiety or distress
   - Sensitive to vulnerability of sharing biometric data
   - Technical failures should fail safe

3. **Justice/Fairness:**
   - Accessible to diverse populations
   - Don't exploit participants for data
   - Fair representation in collective visualizations

4. **Beneficence:**
   - Aim for positive experience
   - Potential for insight, connection, joy
   - Avoid extractive data practices

---

### Recommended Consent Flow for Art Installation:

**1. Attraction Phase:**
- Signage explaining installation concept
- "This artwork uses your heartbeat to create..."
- Observation allowed without participation

**2. Decision Phase:**
- Clear invitation to participate
- Brief explanation of what happens
- "Your heart rate will be displayed as light and sound for approximately 2 minutes. No data will be stored."

**3. Consent Confirmation:**
- Interactive: "Touch here to begin" = consent
- Or verbal: Staff asks "Ready to try?"
- Option: "No thanks" button equally prominent

**4. Participation:**
- Visible indicator that sensing is active
- "Stop" option clearly available
- Smooth exit path

**5. Completion:**
- Thank you message
- "Your data has been deleted" confirmation if applicable
- Optional: "Want to try again?"

**6. Post-Installation:**
- Contact information for questions
- Link to artist statement
- How to request information deletion (if any was stored)

---

## Common Pitfalls & Lessons Learned

### Technical Pitfalls

#### 1. **Sensor Reliability Issues**

**Problem:**
- Pulse sensors lose signal with movement
- Skin tone can affect PPG sensor accuracy
- Dry skin or cold fingers reduce conductivity
- Interference from ambient light (especially with PPG)

**Solutions:**
- Test with diverse participants during development
- Provide clear instruction for sensor placement
- Have backup sensor ready
- Build in signal quality indicators
- Allow calibration period

**Lesson from Research:**
> "Technology design needs to be simple and easy to understand, as sensors that are too complicated to install or interact with will lead to less participant engagement."

---

#### 2. **Latency Creates Disconnection**

**Problem:**
- Delays between heartbeat and visual response break sense of agency
- Participants can't determine if visualization responds to them
- Frustration replaces engagement

**Solutions:**
- Optimize entire pipeline for < 200ms latency
- Use UDP instead of TCP for sensor data if networked
- Process data in chunks, not entire history
- Test on low-end hardware target (don't rely on powerful dev machine)

**Participant Quote:**
> "I couldn't tell if it was responding to me or just doing its own thing."

---

#### 3. **Overwhelming Complexity**

**Problem:**
- Too many visual elements
- Unclear mapping between input and output
- Participants confused about what to do

**Solutions:**
- Start simple, add complexity gradually
- One clear visual element that obviously responds to heartbeat
- Add secondary elements only after primary is understood
- User testing with people unfamiliar with installation

**Design Principle:**
- "Progressive disclosure" - reveal complexity over time

---

#### 4. **Technical Failure Anxiety**

**Problem:**
- Equipment failure during exhibition
- Sensor disconnection appears as "flat line"
- Participants think they're doing something wrong

**Solutions:**
- Redundant systems
- Clear error states (don't show flatline, show "Sensor connecting...")
- Easy restart without feeling like failure
- Staff training on troubleshooting

**Participant Impact:**
> Seeing a flatline or frozen screen when you're trying to connect creates immediate anxiety about your own health or ability to "do it right."

---

### Interaction Design Pitfalls

#### 5. **Difficulty Attracting Attention**

**Problem:**
- People walk past without noticing
- Unclear that interaction is invited
- Installation blends into environment

**Solutions from Research:**
- Movement attracts attention - use motion in idle state
- Someone already participating attracts others (social proof)
- Clear signage but not walls of text
- Staff or docents to invite participation
- Strategic placement (not in thoroughfare where people are rushing)

**Finding:**
> "Difficulty in attracting passersby attention is a commonly cited challenge in interactive artworks and public displays."

---

#### 6. **Uncomfortable Social Dynamics**

**Problem:**
- People feel watched/judged while participating
- Anxiety about "performing"
- Competition instead of collaboration
- Strangers forced into intimacy

**Solutions:**
- Frame experience appropriately (couples vs. strangers)
- Provide screen/partition for privacy if desired
- Make witnessing part of the design (comfortable seating for observers)
- Allow solo experience as valid option

**Research Insight:**
> "Although intensely intimate and personal, this work is also intentionally very social – as artworks they are always setup in such a way that other people can witness the interaction." - George Khut

Key: Make the social witnessing *intentional* rather than awkward

---

#### 7. **Achievement Pressure**

**Problem:**
- Participants feel they must achieve perfect synchrony
- Anxiety about "failing"
- Visualization implies judgment (good/bad coherence)
- Competitive rather than exploratory mindset

**Solutions:**
- Avoid goal-oriented language ("achieve coherence")
- Use exploratory framing ("discover what happens")
- All states are interesting (no "ugly" visualizations)
- Celebrate variety, not uniformity

**Participant Quote:**
> "I wanted to achieve perfect synchronization but couldn't control it" - feeling of failure rather than discovery

**Better Framing:**
- "Explore your heartbeat rhythms together"
- "See what patterns emerge"
- "There's no right or wrong way"

---

#### 8. **Insufficient Duration Options**

**Problem:**
- Fixed duration too short for depth
- Or too long for casual engagement
- No clear ending
- Participants unsure when to stop

**Solutions:**
- Tiered options: "Quick" (1-2 min), "Deep" (5+ min)
- Natural loop point (return to start state)
- Visual indication of time remaining
- "Continue?" option rather than abrupt end

---

### Aesthetic & Conceptual Pitfalls

#### 9. **Over-Literal Visualization**

**Problem:**
- Direct EKG waveform lacks poetry
- Medical aesthetic creates clinical distance
- Numbers (BPM display) reduce to data rather than experience

**Solutions:**
- Abstract representations
- Focus on feeling, not metrics
- Beautiful regardless of data state
- Avoid "dashboards"

**George Khut's Approach:**
> "Khut generally avoids 'info-graphic' representations of biofeedback data in favour of abstract (often large-scale) immersive visualisations that allow for a softer quality of attention."

---

#### 10. **Missing the Visceral**

**Problem:**
- Intellectually interesting but emotionally flat
- Too abstract - no clear connection to body
- Lacks physical presence

**Solutions:**
- Multimodal feedback (visual + audio + haptic if possible)
- Scale matters - intimate or monumental, not in-between
- Rhythm and pulse visible in the work
- Physical installation creates context

**Participant Need:**
> "I felt like I could see my stress melting away" - successful work makes internal state tangibly visible

---

#### 11. **Ignoring Cultural Context**

**Problem:**
- Heart symbolism varies across cultures
- Touch/intimacy norms differ
- Medical devices may trigger trauma
- Accessibility issues not considered

**Solutions:**
- Research cultural context of installation location
- Multiple interaction modalities
- Sensitivity to medical trauma (hospitals, illness, loss)
- Test with diverse participants

---

#### 12. **Data Extractivism**

**Problem:**
- Collecting participant data for artist's benefit without reciprocity
- Surveillance aesthetic without critical engagement
- Participants feel used rather than engaged

**Solutions:**
- Transparency about data use
- Participants see immediate benefit/beauty
- Delete data immediately if not needed
- If collecting for research, offer participants results

**Ethical Principle:**
- Art installation should be gift to participants, not extraction from them

---

### Environmental & Logistical Pitfalls

#### 13. **Inadequate Testing**

**Problem:**
- Works in lab, fails in installation space
- Lighting affects sensors
- Ambient noise obscures audio feedback
- Space too small/large

**Solutions:**
- Site visit before final development
- Test in actual conditions (lighting, noise, traffic patterns)
- Have contingency plans
- Soft opening/beta testing period

---

#### 14. **Poor Hygiene/Comfort**

**Problem:**
- Shared sensors feel unsanitary
- Uncomfortable seating/standing
- Temperature (cold fingers don't pulse sensor well)
- Sensor positioned awkwardly

**Solutions:**
- Sanitizing wipes visible and available
- Disposable sensor covers if possible
- Comfortable seating
- Space heaters in cold venues
- Ergonomic sensor placement

**Impact:**
> "4% of control subjects cited lack of comfort as a reason for not using biometric recognition" - and this increases in public art contexts

---

#### 15. **Insufficient Documentation/Instructions**

**Problem:**
- Staff don't understand how to operate/troubleshoot
- Artists not present to explain
- Participants confused
- Maintenance needs unclear

**Solutions:**
- Clear documentation for venue staff
- Troubleshooting guide
- Video documentation of how it should work
- Artist/technician on-call during opening period
- Participant instructions in multiple formats

---

### Lessons from Specific Projects

#### From Rafael Lozano-Hemmer's Pulse Room:

**Success Factors:**
- Queue system creates collective memory without requiring simultaneous participation
- Scale creates impact - 300 bulbs is overwhelming in best way
- Simple interaction - just grip sensor
- Clear feedback - see your bulb start pulsing immediately

**Lesson:** Simplicity of interaction allows focus on aesthetic and conceptual impact

---

#### From Lisa Park's Eunoia:

**Success Factors:**
- Water as medium is universally engaging
- Cymatics makes sound visible
- Artist as performer - sharing vulnerability invites empathy
- Multiple simultaneous displays create richness

**Challenges:**
- EEG requires extensive setup (gel, calibration)
- Hair interferes with sensors
- Difficult to translate to participatory (vs. performative) format

**Lesson:** Performance context may be more appropriate than open participation for complex sensing technologies

---

#### From George Khut's BrightHearts:

**Success Factors:**
- Mobile app makes accessible anywhere
- No special hardware required (uses phone camera)
- Clinical validation in hospital settings
- Beautiful regardless of user's state

**Challenges:**
- Phone camera PPG less accurate than dedicated sensors
- Need to hold phone limits other activities
- App maintenance requires ongoing development

**Lesson:** Accessibility sometimes requires compromise on technical perfection

---

### Meta-Lesson: Embrace Ambiguity Carefully

**The Paradox:**

Research shows that ambiguous biofeedback displays can be productive:
- Encourage exploration
- Prevent fixation on "correct" response
- Allow softer quality of attention
- Create space for reflection

**But also:**
- Can create frustration
- Participants may feel lost
- Unclear if system is working

**Resolution:**

- Ambiguous *aesthetics* with clear *responsiveness*
- Obvious that system responds to you
- Mysterious what specifically it's responding to
- Clear that there's no wrong way

**George Khut's Insight:**
> "The ambiguities these displays can present provide an important catalyst for reflection and experimentation during the interaction."

But this works only if participants trust the system is working and there's no pressure to "succeed."

---

## Making Coherence Visceral & Meaningful

### The Challenge

**Coherence is Abstract:**
- Mathematical concept (cross-correlation, phase alignment)
- Not directly perceptible
- Requires two signals to compare
- Changes over time

**Participants Need:**
- Immediate understanding of what they're seeing
- Emotional connection to the concept
- Sense of agency (can we influence it?)
- Meaningful interpretation (why does this matter?)

---

### Strategies for Visceral Coherence Visualization

#### 1. **Convergence/Divergence Metaphor**

**Visual Approach:**
- Two distinct elements (colors, shapes, particles) representing each person
- When in coherence: elements move toward each other, overlap, blend
- When diverging: elements separate, distinct boundaries
- Intermediate states: orbiting, dancing around each other

**Why It Works:**
- Spatial distance = psychological distance (conceptual metaphor)
- Convergence feels positive (connection, unity)
- Clear directionality - getting closer or farther

**Example Implementation:**
- Two particle systems, different colors
- Coherence calculation affects attraction force
- High coherence: particles intermingle, create new blended colors
- Low coherence: particles separate into distinct clouds

---

#### 2. **Resonance/Harmony Metaphor**

**Visual Approach:**
- Each heartbeat creates a wave/ripple
- When synchronized: waves create constructive interference (larger combined wave)
- When out of phase: waves cancel/create complex patterns
- Visual "amplification" when in coherence

**Audio Approach:**
- Each heartbeat triggers a tone
- When synchronized: tones harmonize
- When out of sync: dissonance or polyrhythm
- Coherence = consonance

**Why It Works:**
- Resonance is physically intuitive (we've all seen ripples interact)
- Harmony is emotionally positive
- Amplification rewards coherence without judging incoherence

**Example Implementation:**
- Two sets of concentric circles emanating from different points
- When beats align: circles overlap to create Moire patterns
- When coherent: patterns stabilize into mandala-like forms
- Audio: Heartbeat 1 = fundamental tone, Heartbeat 2 = harmonic

---

#### 3. **Emergent Form Metaphor**

**Visual Approach:**
- Individual heartbeats = simple elements (dots, lines)
- Coherence = emergence of higher-order pattern (geometric form, recognizable shape)
- Low coherence = chaos, noise, randomness
- High coherence = order, beauty, symmetry

**Why It Works:**
- Creates visible "reward" for coherence
- Taps into human pattern-recognition pleasure
- Coherence becomes a co-creative act (we made this together)

**Example Implementation:**
- Particles positioned based on heartbeat timing
- High coherence: particles arrange into fractal or sacred geometry
- Low coherence: particles scattered, no apparent pattern
- Transition states create evolving, morphing forms

---

#### 4. **Environmental Response Metaphor**

**Visual Approach:**
- Shared environment (garden, ecosystem, weather) responds to collective state
- High coherence: environment flourishes (flowers bloom, sun shines, growth)
- Low coherence: not punitive, but different (rain, autumn, dormancy)
- Both states aesthetically valid

**Why It Works:**
- Removes judgment - all seasons have beauty
- Shared environment emphasizes connection
- Slow, gradual changes feel organic
- Rich cultural associations with nature metaphors

**Example Implementation:**
- Garden scene with plants/flowers
- Coherence affects growth rate, blooming, color saturation
- Individual heartbeats affect different plants
- Time-lapse quality shows change over interaction duration

---

#### 5. **Collective Light/Energy Metaphor**

**Visual Approach:**
- Each person contributes light/energy to shared space
- Coherence = lights synchronize (pulse together)
- Energy accumulates, becomes brighter
- Creates shared luminosity

**Why It Works:**
- Light = universal symbol of life, consciousness, connection
- Synchronized pulsing is immediately apparent
- Brightness increase is rewarding
- Can scale to intimate or monumental

**Example Implementation:**
- Two colored lights, one per person
- Brightness varies with heart rate
- When in phase: lights pulse together, create third color where they overlap
- Accumulated energy creates expanding aura or halo

---

#### 6. **Temporal Memory Metaphor**

**Visual Approach:**
- Traces/trails show recent history
- Coherent periods leave different traces than incoherent
- Build up visual narrative over time
- Participants see pattern of their session

**Why It Works:**
- Shows journey, not just current state
- Reveals patterns not obvious in the moment
- Creates artifact/memento of experience
- Rewards sustained coherence

**Example Implementation:**
- Two ribbon/trails following heartbeat rhythm
- When synchronized: ribbons weave together, create braid
- When separate: ribbons independent
- Over 2-5 minutes: accumulated pattern reveals coherence journey

---

### Multimodal Coherence Feedback

**Why Multimodal Matters:**

Research shows that biometric feedback is most effective when it engages multiple senses:
- Visual: Primary information channel
- Audio: Emotional resonance and rhythm
- Haptic: (If possible) physical vibration creates embodied connection

#### Audio Design for Coherence:

**Heartbeat Sonification:**
- Each beat = brief tone or percussive sound
- When synchronized: tones blend/harmonize
- When out of phase: distinct, separate sounds
- Coherence: tones merge into unified rhythm

**Ambient Soundscape:**
- Base layer: Calm, drone-like sound
- Coherence affects: Filter cutoff, reverb, spatial width
- High coherence: Opens up, becomes expansive and warm
- Low coherence: Remains intimate, focused

**Spatial Audio:**
- Heartbeat 1 = Left channel
- Heartbeat 2 = Right channel
- Coherence: Signals move toward center, create centered phantom image
- Incoherence: Signals remain separated in stereo field

#### Haptic Feedback (If Available):

- Wrist-worn device could pulse with heartbeat
- Coherence creates shared pulse
- Research shows touch increases synchrony - haptic feedback could enhance it

---

### Framing the Experience

**Language Matters:**

**Avoid:**
- "Achieve coherence"
- "Synchronize your heartbeats"
- "Reach the goal"
- Medical/clinical terms

**Instead:**
- "Explore your heartbeat rhythms together"
- "See what patterns emerge when you're close"
- "Discover your shared rhythm"
- "Let your hearts talk to each other"

**Conceptual Frames:**

**Option 1: Discovery/Exploration**
- "Every interaction creates unique patterns"
- "What will you discover?"
- Emphasizes novelty and curiosity

**Option 2: Connection/Intimacy**
- "Experience your connection made visible"
- "See how you affect each other"
- Emphasizes relationship

**Option 3: Meditation/Mindfulness**
- "A moment of presence together"
- "Become aware of your shared breath"
- Emphasizes calm, awareness

**Option 4: Play/Experimentation**
- "Play with your heartbeats"
- "Can you create patterns together?"
- Emphasizes fun, low-stakes

---

### Creating Emotional Resonance

**From Research on Emotional Data in Art:**

> "This content can create a close link between an artwork and its audience by causing them to become deeply engaged with the artwork through their own stories, creating unique personalized experiences for each audience member."

**Strategies:**

#### 1. **Personal Investment**
- Use *your* heartbeat, not generic data
- Real-time, not recorded
- Immediate feedback to changes

#### 2. **Aesthetic Beauty**
- Beautiful regardless of coherence level
- No "punishment" for incoherence
- George Khut principle: "No ugly states"

#### 3. **Surprise and Delight**
- Unexpected responses create memorable moments
- Balance predictability (agency) with surprise (interest)
- Special events at high coherence (but not required)

#### 4. **Narrative Arc**
- Beginning: Introduction, calibration, simple
- Middle: Exploration, experimentation, complexity
- End: Culmination, reflection, closure

#### 5. **Shareability**
- Screenshot/photo opportunity
- Memorable visual moment
- Social media consideration (if appropriate)

---

### Meaningful Interpretation

**Why Coherence Matters (Context to Communicate):**

**Scientific Context:**
- Physiological synchrony occurs naturally between close partners
- Couples' heartbeats synchronize when in proximity
- Touch increases synchrony
- Synchrony associated with empathy, cooperation, connection

**Artistic Context:**
- Makes invisible visible
- Externalizes internal state
- Creates shared experience
- Raises questions about boundaries, connection, individuality vs. collective

**Experiential Context:**
- Slows down, creates present-moment awareness
- Focus on sensation rather than thought
- Rare opportunity to "see" inside bodies
- Shared vulnerability creates bonding

**Application Contexts:**

**For Couples:**
- Playful way to explore connection
- Non-verbal communication
- Can reveal patterns (who leads/follows, comfort with closeness, arousal levels)

**For Strangers:**
- Icebreaker
- Equalizer (everyone has heartbeat)
- Creates intimacy without requiring disclosure

**For Solo Experience:**
- Self-awareness
- Meditation/mindfulness tool
- Biofeedback for anxiety/stress

**For Groups:**
- Collective consciousness exploration
- Social cohesion visualization
- Performance/ritual context

---

### Installation Context Considerations

#### Museum/Gallery:

**Advantages:**
- Controlled environment (lighting, sound, temperature)
- Primed audience (expects art experience)
- Staff support
- Longer dwell time

**Design Implications:**
- Can be more conceptual/abstract
- Artist statement contextualizes
- Multiple experience levels supported

#### Public Space:

**Advantages:**
- Reaches broader audience
- Serendipitous encounters
- Part of daily life
- Democratic access

**Design Implications:**
- Must work without prior knowledge
- Immediate visual impact
- Weather/durability
- Vandalism resistance

#### Festival/Event:

**Advantages:**
- Social context
- People expecting novel experiences
- Photo/social media moments
- Multiple attempts possible

**Design Implications:**
- High throughput (short sessions)
- Robust to equipment wear
- Staff supervision
- Shareable aesthetics

#### Therapeutic/Clinical:

**Advantages:**
- Motivated participants
- Longer sessions
- Professional context
- Measurable outcomes

**Design Implications:**
- Evidence-based
- Reliable/consistent
- Privacy paramount
- Medical device regulations may apply

---

### The Koi Pond Metaphor (Specific to Your Project)

**Why Koi Work for Coherence:**

**Symbolic Associations:**
- Koi = harmony, partnership (pairs swim together)
- Water = flow, emotion, unconscious
- Japanese aesthetic = wabi-sabi, imperfection, presence
- Fish = life force, vitality

**Visual Possibilities:**

**Individual States:**
- Each person represented by a koi
- Color, size, energy reflects individual heart rate
- Natural movement rhythms

**Coherence States:**

**Low Coherence:**
- Koi swim independently
- Separate areas of pond
- Different rhythms
- Still beautiful (natural behavior)

**Medium Coherence:**
- Koi swim near each other
- Occasional synchrony
- Circling, investigating
- Dance-like quality

**High Coherence:**
- Koi swim in unison
- Mirrored movements
- Create unified patterns
- Sacred geometry in paths

**Environmental Feedback:**
- Ripples from koi movement
- Lotus blooms respond to coherence
- Water clarity/luminosity
- Light rays penetrating water

**Audio:**
- Water sounds (base layer)
- Heartbeat = gentle splash or bubble
- Coherence = harmonized water music
- Wind chimes or bamboo flute for high coherence moments

**Participant Positioning:**
- Two sensors, side by side or facing
- Comfortable seating
- Eye contact optional (some people synchronize better without)
- Close enough to feel "together" (within 3-5 feet)

---

## Scientific Context: Interpersonal Synchrony

### What is Interpersonal Physiological Synchrony (IPS)?

**Definition:**
The tendency for social partners to temporally coordinate their physiological signals when interacting. Also called "physiological linkage" or "biobehavioral synchrony."

**Measures:**
- Heart rate (HR) and heart rate variability (HRV)
- Respiratory rate and depth
- Electrodermal activity (skin conductance)
- Brain activity (EEG, fMRI)
- Body movement and posture

---

### Key Research Findings

#### 1. **Synchrony in Romantic Couples**

**Emilio Ferrer, UC Davis (2013):**
- 32 heterosexual couples connected to monitors
- Found: couples synchronize heart rates and respiration when near each other
- Non-couples do not show this synchrony
- "Lovers' hearts beat for each other, or at least at the same rate"

**Recent Studies (2021):**
- Heart rhythms synchronize when couples in long-term relationships are in close proximity
- Lead-lag relationship: sometimes one partner leads, sometimes the other
- Proximity matters: synchrony is stronger when physically close

#### 2. **Touch Increases Synchrony**

**UC Boulder/University of Haifa Study:**
- Couples show increased respiratory coupling under both pain and no-pain conditions
- Heart rate coupling increases under pain conditions when holding hands
- When partner holds hand during pain: synchrony increases AND pain decreases
- Empathy predicts degree of synchrony

**Mechanism:** Interpersonal touch appears to facilitate physiological coupling

---

#### 3. **Synchrony Predicts Relationship Quality**

**Cardiac Synchrony in Marital Interactions:**
- Particularly during conflict
- Positive (in-phase) synchrony of heart rate
- Negative (anti-phase) synchrony of HRV
- Direction of covariation has relational meaning

**Heightened Inflammation Study:**
- When couples' HRV synchronizes during conflict, predicts inflammation throughout the day
- Suggests physiological consequences of interpersonal dynamics

---

#### 4. **Synchrony in Cooperation and Performance**

**Real-Life Interactions Study (2020):**
- Physiological synchrony associated with cooperative success
- Higher synchrony = better task performance
- Bidirectional: synchrony helps cooperation AND cooperation increases synchrony

**Joint Action Study (2023):**
- Self-paced joint motor tasks
- Cardiac synchrony emerges during collaboration
- Players' subjective excitement increases with heart rate synchrony

**Social Anxiety Factor:**
- Task novelty increases synchrony
- Social anxiety reduces synchrony
- Suggests individual differences matter

---

#### 5. **Synchrony in Therapy**

**Couple Therapy Research:**
- Partial Directed Coherence (PDC) measures synchrony between partners
- Synchrony associated with therapeutic alliance
- Synchrony linked to meaning construction in therapy
- Therapist-client synchrony also measurable

---

#### 6. **Synchrony in Clinical Populations**

**Dementia Research:**
- Interpersonal physiological synchrony can detect "moments of connection"
- Important for populations with reduced communicative abilities
- Provides objective measure of quality of interaction

---

### Measurement Techniques

#### Wavelet Transform Coherence (WTC)

**Most Common in Recent Research:**

- Localized correlation coefficient between two time series
- Function of both time and frequency
- Shows WHEN (time axis) and AT WHAT RHYTHM (frequency axis) synchrony occurs
- Visualized as color heat map

**Why It's Better:**
- Captures non-stationary signals (heart rate changes over time)
- Shows frequency-specific synchrony (e.g., respiratory vs. cardiac rhythms)
- Time-resolved (shows evolution of synchrony)

#### Windowed Cross-Correlation

**Simpler Alternative:**

- Correlation calculated over sliding time window
- Accounts for non-stationarity
- Handles delays/lags between partners
- Shows who leads, who follows

**Interpretation:**
- Positive correlation: beats align in phase
- Negative correlation: beats alternate (anti-phase)
- Zero: no relationship

#### Partial Directed Coherence (PDC)

**For Causal Relationships:**

- Shows direction of influence (A → B or B → A)
- Used in therapy research
- More complex computation
- Requires longer data segments

---

### Factors Affecting Synchrony

#### Increases Synchrony:

1. **Physical Proximity** (closer = stronger)
2. **Touch** (especially hand-holding)
3. **Eye Contact** (in some contexts)
4. **Empathy** (higher empathy = more synchrony)
5. **Familiarity** (long-term partners sync more)
6. **Cooperation** (shared goals)
7. **Positive Affect** (liking each other)

#### Decreases Synchrony:

1. **Distance** (physical separation)
2. **Social Anxiety** (inhibits natural coordination)
3. **Conflict** (depending on type)
4. **Distraction** (attention elsewhere)
5. **Low Empathy**

---

### Theoretical Explanations

#### Why Does Synchrony Occur?

**1. Co-Regulation:**
- Partners regulate each other's arousal
- Calming or energizing effect
- Bidirectional influence

**2. Shared Environmental Input:**
- Both responding to same stimuli
- Conversation rhythm, ambient sounds, visual events

**3. Emotional Contagion:**
- Emotions spread between people
- Creates parallel physiological states

**4. Intentional Coordination:**
- Deliberate attempts to match
- Attunement as social skill

**5. Unconscious Mimicry:**
- Automatic behavioral copying
- Physiology follows behavior

**Likely:** Combination of all these mechanisms

---

### Implications for Art Installation

#### Design Insights:

**1. Synchrony is Natural But Not Guaranteed:**
- Don't expect instant synchrony
- Allow time for emergence (2-5 minutes)
- Some pairs will synchronize more easily than others

**2. Context Matters:**
- Instructions affect approach
- Physical setup influences behavior
- Social setting creates expectations

**3. Individual Differences:**
- Introverts vs. extroverts may synchronize differently
- Anxiety inhibits synchrony
- Familiarity helps

**4. Bidirectional Causality:**
- Seeing synchrony visualization may increase actual synchrony (biofeedback loop)
- Positive visualization may reduce performance anxiety
- Design can facilitate or hinder natural synchrony

---

### Research-Informed Design Principles

**1. Optimize for Proximity:**
- Comfortable seating close together
- Within arm's reach (though touch optional)
- Facing each other OR side-by-side (test both)

**2. Allow Time:**
- Minimum 2 minutes for patterns to emerge
- Ideal: 5-10 minutes for deep exploration
- Show progression over time

**3. Reduce Anxiety:**
- Frame as exploration, not achievement
- Beautiful visualizations reduce performance pressure
- Privacy options

**4. Consider Touch:**
- Make hand-holding optional
- Some sensors could be held together
- Research shows touch increases synchrony

**5. Visualize Process, Not Just State:**
- Show journey toward synchrony
- Reveal patterns not obvious to participants
- Time-based unfolding

**6. Respect Natural Variability:**
- Coherence comes and goes naturally
- "Perfect" synchrony is rare and unnecessary
- Beauty in fluctuation

---

## Technical Resources for Implementation

### Sensor Options & Suppliers

#### Recommended Heart Rate Sensors:

**1. Pulse Sensor Amped**
- Supplier: PulseSensor.com or Adafruit
- Cost: ~$25
- Connection: Analog output to Arduino
- Docs: Excellent Arduino library and tutorials
- Best For: DIY installations, reliable and well-supported

**2. Polar H10 Chest Strap**
- Supplier: Polar, Amazon
- Cost: ~$90
- Connection: Bluetooth LE
- Accuracy: Medical-grade
- Best For: When accuracy matters, freedom of movement needed

**3. MAX30102 / MAX30105**
- Supplier: SparkFun, Adafruit
- Cost: ~$15-25
- Connection: I2C to Arduino/ESP32
- Features: PPG + SpO2, small form factor
- Best For: Custom hardware builds

**4. Webcam + rPPG Software**
- Software: OpenCV + custom algorithms or commercial SDK
- Cost: Free to $$$
- Accuracy: Lower, lighting-dependent
- Best For: Wow factor, no-contact experience

---

### Software Frameworks

#### For p5.js Biometric Visualization:

**1. p5.serialport**
- Purpose: Connect Arduino via serial to p5.js
- Requires: p5.serialcontrol app running locally
- Pros: Simple, well-documented
- Cons: Requires app installation

**2. WebSocket Libraries**
- Server: Socket.io (Node.js) or SimpleWebSocketServer (Python)
- Client: Native WebSocket or Socket.io client in p5.js
- Pros: More flexible, can support multiple clients
- Cons: More setup complexity

**3. Web Bluetooth API**
- Purpose: Direct Bluetooth connection from browser to sensor
- Support: Chrome, Edge (not Safari, Firefox)
- Pros: No intermediary software
- Cons: Browser support limited, security restrictions

---

### Coherence Calculation Approaches

#### Simple Cross-Correlation:

```javascript
// Pseudocode for time-domain coherence
function calculateCoherence(hrv1, hrv2, windowSize) {
  // Take last N beats from each person
  let window1 = hrv1.slice(-windowSize);
  let window2 = hrv2.slice(-windowSize);

  // Normalize
  window1 = normalize(window1);
  window2 = normalize(window2);

  // Calculate correlation
  let correlation = pearsonCorrelation(window1, window2);

  // Return absolute value (phase doesn't matter for visualization)
  return Math.abs(correlation);
}
```

**Pros:** Simple, real-time, interpretable
**Cons:** Doesn't account for frequency, requires enough data points

---

#### Heartbeat Interval Similarity:

```javascript
// Simpler: are the heartbeat intervals similar?
function beatSimilarity(ibi1, ibi2) {
  // Inter-beat interval (time between beats in ms)
  let difference = Math.abs(ibi1 - ibi2);

  // Convert to similarity (0-1 scale)
  let maxDiff = 500; // 500ms difference = completely different
  let similarity = Math.max(0, 1 - (difference / maxDiff));

  return similarity;
}
```

**Pros:** Instant, no history needed, intuitive
**Cons:** Doesn't capture sustained synchrony, just momentary similarity

---

#### Phase Coherence:

```javascript
// Are the beats "in phase"?
function phaseCoherence(beatHistory1, beatHistory2, currentTime) {
  // When did each person's last beat occur?
  let lastBeat1 = beatHistory1[beatHistory1.length - 1];
  let lastBeat2 = beatHistory2[beatHistory2.length - 1];

  // How far apart in time?
  let phaseDiff = Math.abs(lastBeat1 - lastBeat2);

  // Normalize by average IBI (closer in phase = higher coherence)
  let avgIBI = (calculateIBI(beatHistory1) + calculateIBI(beatHistory2)) / 2;
  let phaseCoherence = 1 - (phaseDiff / avgIBI);

  return Math.max(0, phaseCoherence);
}
```

**Pros:** Captures synchrony of rhythm, not just rate
**Cons:** More complex, requires beat detection

---

### Learning Resources

#### Tutorials:

**Arduino + Pulse Sensor:**
- Last Minute Engineers: "Pulse Sensor Arduino Tutorial" (comprehensive)
- Public Lab: "Visualize live sensor data with p5js and an Arduino"

**p5.js Serial Communication:**
- ITP NYU Physical Computing Labs: "Serial Input to p5.js"
- Daniel Shiffman (The Coding Train): p5.js serial videos

**Biofeedback Art:**
- George Khut's research publications (ResearchGate, Academia.edu)
- CHI Conference proceedings: search "biofeedback" or "physiological interaction"

**Heart Rate Variability:**
- HeartMath Institute resources
- Kubios HRV (free software for analysis)

---

### Example Technical Stack for Two-Person Installation:

**Hardware:**
- 2x Pulse Sensor Amped ($50)
- 1x Arduino Uno or ESP32 ($20-30)
- 1x Computer/Raspberry Pi for display
- 1x Projector or large monitor
- Comfortable seating for two

**Software:**
- Arduino: Pulse Sensor library, send IBI data via serial
- Node.js: Serial port reader, WebSocket server
- p5.js: Visualization, WebSocket client
- Browser: Full-screen p5.js sketch

**Data Flow:**
```
Sensors → Arduino → USB Serial → Node.js → WebSocket → p5.js → Display
```

**Processing:**
- Arduino: Beat detection, IBI calculation
- Node.js: Data routing, minimal processing
- p5.js: Coherence calculation, visualization, animation

---

### Performance Optimization:

**For Real-Time Responsiveness:**

1. **Minimize Latency:**
   - Send data immediately, don't batch
   - Use UDP-like approach (drop old data rather than queue)
   - Optimize visualization draw() loop

2. **Smooth Animation:**
   - Interpolate between data points
   - Use easing functions (lerp, ease-in-out)
   - Target 60fps for visuals

3. **Data Management:**
   - Keep limited history (last 100 beats, not entire session)
   - Ring buffer for efficient memory use
   - Downsample if displaying long-term trends

---

## Conclusion & Recommendations

### Key Takeaways for Your Project

**1. Prioritize Participant Experience:**
- Make it immediately engaging (clear feedback within seconds)
- But also reward sustained attention (5+ minutes reveals patterns)
- Support multiple interaction styles (active controllers, passive observers, reflective explorers)

**2. Embrace Beautiful Ambiguity:**
- Abstract, artistic representation > medical dashboard
- Avoid literal BPM numbers in main visualization
- All states should be aesthetically pleasing
- Frame as exploration, not achievement

**3. Design for Coherence as Emergence:**
- Show both individual and collective states
- Coherence should feel like discovery, not demand
- Use metaphors: convergence, resonance, harmony, emergent form
- Visualize the journey toward coherence, not just the end state

**4. Multimodal Feedback:**
- Visual (primary): Rich, immersive, responds to coherence
- Audio (essential): Heartbeats sonified, soundscape responds to coherence
- Consider haptic if possible

**5. Technical Robustness:**
- Test with diverse participants
- Plan for sensor failures
- Minimize latency (< 200ms)
- Provide clear feedback when system working vs. technical issue

**6. Ethical Rigor:**
- Explicit consent
- Clear data handling (prefer no storage)
- Easy opt-out
- Privacy through abstraction

**7. Contextual Framing:**
- Language shapes experience (exploration > achievement)
- Consider who will participate (couples, strangers, solo)
- Venue affects expectations (museum, public space, festival)

---

### Specific Recommendations for Koi Pond Coherence:

**Your Project Strengths:**
- Koi = perfect metaphor (partnership, harmony, flow)
- Water = calming, reflective
- Japanese aesthetic = wabi-sabi, acceptance of impermanence
- Already visually beautiful (foundation for "no ugly states" principle)

**Coherence Visualization Ideas:**

**Low Coherence:**
- Koi swim independently
- Each explores different area of pond
- Individual ripples
- Natural, beautiful behavior (not "wrong")

**Emerging Coherence:**
- Koi become aware of each other
- Begin to mirror movements
- Paths cross, circling
- Ripples start to interact

**High Coherence:**
- Koi swim in unison
- Synchronized turns, mirrored positions
- Create mandala-like patterns in paths
- Ripples create interference patterns
- Lotus blooms open
- Light/color intensifies

**Audio:**
- Base: Calm water ambience
- Heartbeat 1: Left-panned gentle splash
- Heartbeat 2: Right-panned gentle splash
- Coherence: Splashes converge to center, add harmonics
- High coherence: Wind chimes or shakuhachi flute

**Participant Setup:**
- Side-by-side seating facing projection
- Comfortable, calming space
- Pulse sensors (consider ear clips to avoid hand holding)
- Duration: 3-5 minutes ideal

**Framing:**
- "Explore how your heartbeats create patterns together"
- "Watch how the koi respond to your rhythms"
- "There's no right or wrong - just discover what emerges"

---

### Next Steps for Development:

**Phase 1: Proof of Concept**
- ✅ Koi visual system (you have this)
- Single heartbeat input → koi movement
- Verify sensor reliability
- Basic beat detection

**Phase 2: Dual Input**
- Two sensors → two koi
- Independent movement based on individual heartbeats
- Test with users

**Phase 3: Coherence Calculation**
- Implement simple coherence metric (IBI similarity or phase alignment)
- Test: can you manually create synchrony (slow breathing together)?
- Tune responsiveness

**Phase 4: Coherence Visualization**
- Koi behavior responds to coherence (proximity, synchrony, patterns)
- Environmental responses (lotus, ripples, light)
- Audio integration

**Phase 5: User Testing**
- Test with couples, friends, strangers
- Observe behaviors and responses
- Iterate on framing and interaction design

**Phase 6: Polish & Deploy**
- Error handling
- Installation instructions
- Consent/privacy materials
- Documentation

---

### Inspirational Closing Thoughts

**From the Research:**

Rafael Lozano-Hemmer creates "technological reliquaries" - temporary monuments to human presence. Your coherence visualization can be a monument to human connection.

George Khut helps people "re-think/re-feel ideas of selfhood and embodiment." Your work can make visible the invisible threads that connect us.

Lisa Park makes water a mirror of internal state. Your koi pond can reflect not just individuals, but the space between them - the relational field where coherence emerges.

**The Opportunity:**

Biometric art makes us aware of our bodies in ways daily life doesn't. We walk around with hearts beating, breath flowing, constantly in subtle physiological communication with others - but we never see it.

Your installation can make these invisible rhythms visible, not as medical data but as living art. It can show that coherence is not something we must achieve but something we discover, together.

In a world that increasingly fragments and disconnects us, visualizing interpersonal coherence is more than an aesthetic choice - it's a statement about what it means to be human, together.

---

## Sources & Further Reading

### Key Artists & Websites:

- Rafael Lozano-Hemmer: https://www.lozano-hemmer.com/
- Lisa Park: https://www.thelisapark.com/
- George Khut: https://www.georgekhut.com/
- Christa Sommerer & Laurent Mignonneau: https://dam.org/museum/artists_ui/artists/sommerer-mignonneau/

### Research Databases:

- CHI Conference Proceedings (Human-Computer Interaction)
- SIGGRAPH (Computer Graphics)
- Leonardo (Art/Science/Technology journal)
- Frontiers in Psychology (Interpersonal Synchrony research)

### Technical Resources:

- Pulse Sensor: https://pulsesensor.com/
- p5.js: https://p5js.org/
- HeartMath Institute: https://www.heartmath.org/
- ITP Physical Computing: https://itp.nyu.edu/physcomp/

### Ethical Guidelines:

- ICO (UK): Biometric Data Guidance
- GDPR: https://gdpr.eu/
- BIPA (Illinois): https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004

---

**Report Compiled:** October 2025
**For Project:** Coherence - Interactive Biometric Art Installation
**Technology:** p5.js, Heart Rate Sensors, Koi Visualization

**Total Sources Reviewed:** 100+ articles, projects, and research papers
**Key Projects Analyzed:** 15+ major biometric art installations
**Research Papers:** 30+ peer-reviewed studies on interpersonal synchrony
