# Email to AliveCor SDK Inquiry

## Draft Email

**To:** KardiaPro@AliveCor.com
**Subject:** SDK/API Access Inquiry for Interactive Art Installation

---

Dear AliveCor Team,

I am developing an interactive art installation that visualizes interpersonal biometric coherence between two people in real-time, and I believe the KardiaMobile platform would be an excellent fit for this project.

**Project Overview:**

The installation is a table-based interactive experience where two participants sit facing each other and place their hands on biometric sensors. Their heart rate variability (HRV) and interpersonal synchrony are measured and visualized in real-time through a generative visual system (using p5.js) that responds to their physiological coherence.

The visualization uses organic metaphors—such as synchronized koi fish—to represent the degree of alignment between participants' cardiac rhythms, creating a contemplative shared experience that makes physiological connection visible and tangible.

**Technical Requirements:**

For this installation, I require:
- Real-time ECG waveform or inter-beat interval (IBI) data streaming
- Simultaneous data acquisition from 2 KardiaMobile devices
- Low latency (<500ms) for responsive visualization
- Access to raw data (300 samples/second as documented in your SDK)
- Ability to integrate with custom visualization software

**SDK/API Questions:**

1. Is the KardiaMobile SDK available for art installation use cases?
2. What are the licensing terms and costs for a non-medical, public art context?
3. Can the SDK support simultaneous connection to multiple devices (2+)?
4. What platforms are supported? (I'm working with browser-based JavaScript/p5.js, but can adapt)
5. What is the typical data latency from sensor to application?
6. Are there any restrictions on how the data can be visualized or displayed?

**Installation Context:**

- **Type:** Public interactive art installation
- **Duration:** Temporary exhibition (3-6 months initially)
- **Location:** Gallery/museum setting
- **Use case:** Non-medical, wellness/contemplative experience
- **Target audience:** General public (walk-up, self-service interaction)
- **Privacy:** Real-time processing only, no data storage or cloud upload

**Budget Considerations:**

As an independent art project, I'm working with limited funding. Understanding the SDK licensing costs upfront would help me determine if KardiaMobile is feasible, or if I should pursue a DIY ECG solution (which would be less reliable and more time-intensive).

I greatly appreciate AliveCor's work in making cardiac monitoring accessible, and I believe your technology would significantly elevate this project's quality and participant experience.

Would you be able to provide information about SDK access for this type of application? I'm happy to discuss the project in more detail or provide additional information as needed.

Thank you for your time and consideration.

Best regards,

[Your Name]
[Your Title/Role]
[Contact Information]
[Portfolio/Project Website if available]

---

## Alternative Version (More Concise)

**To:** KardiaPro@AliveCor.com
**Subject:** SDK Access for Real-Time Biometric Art Installation

---

Hello,

I'm developing an interactive art installation that measures and visualizes heart rate synchrony between two people in real-time. I'm interested in using KardiaMobile devices and would like to inquire about SDK access.

**Project Summary:**
- Interactive table installation for galleries/museums
- Two participants place hands on sensors simultaneously
- Real-time HRV/coherence data drives generative visual artwork
- Non-medical wellness/contemplative experience
- Public, walk-up installation (3-6 months duration)

**Technical Needs:**
- Real-time ECG/IBI data streaming from 2 devices simultaneously
- Raw data access (300 Hz waveform or IBI)
- Low latency (<500ms)
- Integration with custom p5.js visualization

**Questions:**
1. Is SDK licensing available for public art installations?
2. What are the licensing costs?
3. Does the SDK support multiple simultaneous devices?
4. What platforms are supported?
5. Are there restrictions on data visualization?

**Budget:** Independent art project with limited funding—SDK costs will determine feasibility vs. DIY approach.

Would appreciate any guidance you can provide. Happy to discuss further.

Thank you,

[Your Name]
[Contact Information]

---

## Tips for Sending

**Before sending:**
1. Add your actual contact information
2. Include link to your portfolio or previous work if available
3. Consider attaching a visual mockup of the installation concept
4. Mention any institutional affiliation (university, gallery, etc.) if applicable

**Follow-up strategy:**
- If no response in 1 week, send polite follow-up
- If no response in 2 weeks, consider calling AliveCor directly
- If licensing is prohibitively expensive or unavailable, pivot to DIY solution

**Questions to ask if they respond positively:**
- Can we do a trial/proof-of-concept with academic/research pricing?
- Is there a one-time licensing fee vs. ongoing subscription?
- Do they offer support for non-commercial/art installations?
- Are there any grant programs or sponsorship opportunities?

---

## Backup Plan if AliveCor Doesn't Work Out

If AliveCor SDK is unavailable or too expensive, the research documents show the DIY AD8232 approach is very viable:
- $50 total cost for two-person system
- Full data control
- Real-time streaming via ESP32 + WebSocket
- 85-95% success rate (vs. AliveCor's >95%)
- Complete customization freedom

Both paths are valid—AliveCor is easier/more reliable, DIY is more affordable/flexible.
