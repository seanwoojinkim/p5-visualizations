# Muse SDK Application - Response Templates

**Project:** Biometric Coherence Art Installation
**Last Updated:** 2025-10-26

---

## Application Form Responses

### First Name*
```
[Your first name]
```

### Last Name*
```
[Your last name]
```

### Business Name
```
Independent Artist / [Your Studio Name if applicable]
```
*Or leave blank if purely personal project*

### Email*
```
[Your email address]
```

### Country
```
[Your country]
```

---

## Description of Development or Research Initiative*

### Version 1: Detailed (Recommended)

```
I am developing an interactive biometric art installation that visualizes interpersonal
physiological coherence between two people in real-time. The installation explores how
human nervous systems synchronize during shared contemplative experiences, making
invisible physiological connections visible through generative art.

PROJECT OVERVIEW:
The installation consists of a custom-designed table where two participants sit facing
each other. Real-time EEG and cardiac data are captured from both participants and
processed to measure interpersonal neural and physiological synchrony. This synchrony
data drives a generative visualization system (built with p5.js) that responds to the
degree of alignment between participants' physiological states.

The visualization uses organic metaphors—flocking algorithms inspired by Craig Reynolds'
Boids—where two groups of autonomous agents shift from repulsion to coherent unified
movement based on the measured biometric coherence level. At low coherence, the groups
remain independent or repel. At high coherence, they orbit a central attractor in
synchronized patterns, creating a beautiful visual representation of human connection.

MUSE SDK INTEGRATION:
I am specifically interested in the Muse SDK to capture frontal cortex EEG data
(alpha, beta, theta, gamma bands) to complement the cardiac coherence measurements
I'm already implementing with ECG sensors. The Muse headband's ability to detect
meditative states, focus, and relaxation would add a critical neural dimension to
the interpersonal coherence calculation.

TECHNICAL REQUIREMENTS:
- Real-time EEG data streaming from 2 Muse headbands simultaneously
- Access to raw EEG waveforms and/or processed band power data (alpha, beta, theta, gamma)
- Low-latency data transmission (<500ms) for responsive visualization
- Integration with custom JavaScript/p5.js visualization engine
- Ability to calculate cross-correlation between two participants' EEG signals

RESEARCH COMPONENT:
Beyond the artistic installation, this project explores academic questions about
interpersonal physiological synchrony—a phenomenon documented in couples therapy,
meditation dyads, and social neuroscience research. The installation will generate
insights into what behavioral and environmental factors facilitate or inhibit
synchronization between strangers in a gallery setting.

INSTALLATION CONTEXT:
- Type: Public interactive art installation
- Duration: 3-6 month gallery exhibition (initial run)
- Audience: General public, walk-up self-service interaction
- Session length: 3-5 minutes per pair
- Privacy: Real-time processing only, no data storage or cloud upload
- Ethics: Fully informed consent, participants can stop anytime

TIMELINE:
- Month 1-2: SDK integration and EEG signal processing development
- Month 3-4: Multi-device synchronization and coherence algorithm refinement
- Month 5-6: Table fabrication and installation assembly
- Month 7+: Gallery exhibition and public engagement

This project sits at the intersection of neuroscience, interactive art, and
contemplative practice. The Muse SDK would be instrumental in creating a
scientifically-grounded yet aesthetically compelling exploration of human connection.
```

### Version 2: Concise (Alternative)

```
Interactive biometric art installation measuring and visualizing real-time physiological
coherence between two people. Participants sit at a custom table equipped with Muse EEG
headbands and ECG sensors. Their combined neural and cardiac synchrony drives a generative
visualization that makes invisible human connection visible through organic, responsive
visual patterns.

Technical needs: Real-time EEG streaming from 2 Muse devices, band power data (alpha,
beta, theta, gamma), integration with p5.js visualization engine. The installation will
be exhibited in galleries as a contemplative, walk-up experience exploring interpersonal
physiological synchrony.

Research component: Investigating what factors facilitate neural and cardiac synchronization
between strangers in public art contexts, drawing on academic studies of interpersonal
physiological coherence.
```

**Recommendation:** Use Version 1 if form allows (demonstrates serious intent and technical knowledge). Use Version 2 if character limit is restrictive.

---

## Link to Previous App Development Work*

### Option A: If you have a portfolio website
```
Portfolio: https://[your-website.com]
Project repository: https://github.com/[your-username]/coherence
Live demo: https://[your-demo-url.com] (current visualization without biometric integration)

This project demonstrates my technical capability with real-time data visualization,
generative algorithms, and interactive web applications. The existing codebase includes
a fully functional flocking simulation with coherence parameter integration, ready to
receive real biometric data streams.
```

### Option B: If you have GitHub but no portfolio
```
Project repository: https://github.com/[your-username]/coherence

This repository contains the current state of the visualization system—a p5.js-based
generative artwork using flocking algorithms (1000+ autonomous agents) with real-time
parameter control. The coherence parameter (-1.0 to +1.0) is currently controlled
manually but designed to receive biometric data input. Code demonstrates experience
with real-time data processing, WebSocket integration, and performance optimization
for complex visualizations.
```

### Option C: If you're creating the GitHub now
```
Project documentation: https://github.com/[your-username]/coherence

Repository includes:
- Functional p5.js visualization system (flocking algorithms with coherence parameter)
- Comprehensive research documentation on biometric sensors and HRV analysis
- Technical specifications for ECG integration (currently in development)
- Implementation plans for multi-device biometric data synchronization

Prior work: [List any other relevant projects, apps, or research you've done, even if
not directly related to EEG—web development, data visualization, interactive installations,
Arduino/ESP32 projects, academic research, etc.]
```

### Option D: No public code repository
```
While this is my first project requiring EEG integration, I have significant experience
with real-time data visualization and hardware integration:

- Interactive generative art systems using p5.js
- Biometric sensor integration (ECG, PPG) with microcontrollers
- Real-time data streaming architectures (WebSocket, Bluetooth)
- Signal processing and analysis
- [Add any other relevant experience: academic background, previous installations,
  technical projects, research work]

I have developed the complete visualization system for this project and extensively
researched biometric coherence measurement. The Muse SDK integration represents the
final component needed to add neural data to the existing cardiac measurements.

Project documentation available upon request.
```

**Recommendation:** Be honest but emphasize your technical capabilities and serious intent. Muse team wants to see you'll actually build something, not that you're already an expert.

---

## Do you have EEG data processing or analysis experience?*

### If you have some experience:
**Select:** ☑ **Yes - limited capacity**

### If you're new to EEG (most likely):
**Select:** ☑ **No**

**Don't worry!** Selecting "No" won't disqualify you. They're looking for:
- Clear project vision ✓
- Technical capability ✓
- Serious intent ✓
- Ability to learn ✓

Your detailed project description demonstrates all of these.

### Optional follow-up text (if form allows):
```
While I don't have prior EEG experience, I have extensively researched EEG signal
processing for this project, including:
- Alpha/beta/theta/gamma band separation via FFT
- Power spectral density analysis
- Artifact detection and filtering
- Cross-correlation for interpersonal synchrony measurement

I have significant experience with related biometric signal processing (ECG R-peak
detection, HRV analysis, real-time filtering) and am prepared to learn EEG-specific
techniques. I've also reviewed academic literature on EEG-based coherence measurement
and interpersonal neural synchrony.
```

---

## Do you have experience with hardware integrations?*

**Select:** ☑ **Yes**

### Optional elaboration (if form allows):
```
Yes. Current project already integrates:
- ESP32-S3 microcontrollers for biometric data acquisition
- AD8232 ECG analog front-end modules for cardiac measurement
- Bluetooth/WiFi wireless data streaming
- Real-time sensor data processing and visualization

Prior hardware projects include: [List any relevant work with Arduino, Raspberry Pi,
sensors, IoT devices, embedded systems, etc.]

The Muse headband integration will follow similar patterns—Bluetooth LE connection,
real-time data streaming, signal processing pipeline, and visualization mapping.
```

---

## Terms & Conditions*

**Select:** ☑ **Upon submission of this form, I acknowledge, I understand and I agree to the SDK Terms and Conditions of use.**

**Action:** Read the SDK Terms and Conditions thoroughly before checking this box.

**Key things to verify:**
- ✓ Non-commercial/art use is permitted (usually yes for research/art)
- ✓ You can display Muse data in public installations
- ✓ Data privacy requirements align with your "no storage" approach
- ✓ Attribution requirements are acceptable
- ✓ Any licensing fees are within your budget

---

## Please verify your request* (CAPTCHA)

Complete the CAPTCHA verification.

---

## Additional Tips for Strong Application

### Before Submitting:

1. **Create a GitHub repository** (even if minimal)
   - Include your visualization code
   - Add comprehensive README
   - Include research documentation
   - Shows professionalism and serious intent

2. **Polish your project description**
   - Clear technical requirements
   - Specific use case (not vague)
   - Timeline demonstrates planning
   - Academic/artistic credibility

3. **Emphasize the research angle**
   - Muse supports research and education
   - Mention academic literature you've reviewed
   - Describe what you'll learn/contribute
   - Frame as exploration, not just art

4. **Show you understand EEG**
   - Even if inexperienced, demonstrate research
   - Mention specific EEG bands (alpha, beta, theta, gamma)
   - Reference interpersonal neural synchrony studies
   - Cite relevant neuroscience concepts

5. **Highlight the public benefit**
   - Educational component for gallery visitors
   - Making neuroscience accessible through art
   - Contemplative/wellness application
   - Community engagement

### After Submitting:

**If Approved:**
- ✅ Thank them professionally
- ✅ Ask about multi-device licensing
- ✅ Clarify any usage restrictions
- ✅ Request technical documentation
- ✅ Join their developer community

**If Denied or No Response:**
- Plan B: Use OpenBCI instead (open-source EEG)
- Plan C: Focus on cardiac coherence only (ECG-based)
- Plan D: Partner with a research institution for Muse access

---

## Muse Alternatives (Backup Plans)

### If Muse SDK Access Denied:

**Option 1: OpenBCI**
- Open-source EEG platform
- No SDK approval needed
- More expensive ($200-500 per headset)
- Full data access, customizable
- Steeper learning curve

**Option 2: Neurosity Crown**
- Developer-friendly EEG headset
- Modern API, good documentation
- Very expensive ($1,500+ per unit)
- Designed for developers

**Option 3: Focus on ECG only**
- Your AD8232 fingertip ECG approach is solid
- Cardiac coherence alone is scientifically valid
- Simpler, cheaper, proven reliable
- Add EEG later if opportunity arises

**Option 4: Partner with university**
- Research labs often have Muse access
- Academic collaboration can open doors
- Potential for grant funding
- Co-authorship on research paper

---

## Sample Follow-Up Email (If Approved)

```
Subject: Muse SDK Access - Biometric Coherence Art Installation

Dear Muse Team,

Thank you for approving my SDK access for the biometric coherence art installation project.

I have a few technical questions to ensure successful implementation:

1. Multi-device licensing: Will the SDK support simultaneous connection to two Muse
   headbands from a single application? Are there additional licensing considerations
   for a two-person installation?

2. Data access: Will I have access to both raw EEG waveforms and processed band power
   data (alpha, beta, theta, gamma)? Which would you recommend for real-time
   interpersonal coherence calculation?

3. Latency: What is the typical data transmission latency from headband to application?
   My visualization requires <500ms for responsive feedback.

4. Platform: I'm developing with JavaScript/p5.js for browser-based visualization.
   Does the SDK support WebBluetooth or will I need a native bridge application?

5. Attribution: What are the attribution requirements for a public gallery installation?
   Are there specific logos or text I should include?

6. Support: Is there a developer community, documentation, or technical support channel
   I should join?

I'm excited to integrate Muse into this project and contribute to making neuroscience
accessible through interactive art.

Thank you for your support,

[Your Name]
[Your Contact Information]
[Link to Project]
```

---

## Key Takeaways

**What Muse Team Wants to See:**
1. ✅ Clear, specific project with defined goals
2. ✅ Technical capability (even if learning EEG)
3. ✅ Serious intent to build and deploy
4. ✅ Research or educational component
5. ✅ Appropriate use case (not commercial medical device)
6. ✅ Timeline and planning

**What Weakens Application:**
1. ❌ Vague descriptions ("I want to explore EEG")
2. ❌ Commercial medical claims
3. ❌ No technical background
4. ❌ Unrealistic scope or timeline
5. ❌ Privacy concerns (data harvesting, etc.)
6. ❌ Duplicate/spam applications

**Your Strengths:**
- ✅ Well-defined art installation with clear purpose
- ✅ Existing technical work (visualization system built)
- ✅ Research-backed approach (extensive documentation)
- ✅ Privacy-first design (no data storage)
- ✅ Public benefit (gallery exhibition, educational)
- ✅ Realistic timeline and scope

**You have a strong application. Be confident and detailed in your responses.**

---

## Final Checklist Before Submitting

- [ ] Read Muse SDK Terms and Conditions thoroughly
- [ ] Create/update GitHub repository with current project state
- [ ] Write detailed project description (use Version 1 template above)
- [ ] Prepare portfolio/previous work links
- [ ] Be honest about EEG experience level
- [ ] Emphasize hardware integration experience
- [ ] Proofread all responses for clarity and professionalism
- [ ] Have backup plan ready (OpenBCI, ECG-only, etc.)
- [ ] Screenshot completed form before submitting
- [ ] Note submission date for follow-up tracking

**Good luck! Your project is compelling and well-researched. The Muse team should be excited to support it.**
