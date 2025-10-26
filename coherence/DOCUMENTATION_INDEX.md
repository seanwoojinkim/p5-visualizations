# Coherence Project - Documentation Quick Reference

## 📂 Project Structure

```
coherence/
├── README.md                    ⭐ Start here - Project overview
├── DOCUMENTATION_INDEX.md       📍 You are here
├── docs/
│   ├── README.md               📚 Complete documentation guide
│   ├── research/               🔬 Biometric sensor research (9 reports)
│   └── implementation/         🛠️ Guides and templates
├── src/                        💻 Visualization code
└── index.html                  🌐 Run the visualization
```

---

## 🚀 Quick Start Paths

### Just Want to Run the Visualization?
1. Read: [README.md](README.md) - "Running the Visualization" section
2. Run: `python3 -m http.server 8000`
3. Open: http://localhost:8000

### Want to Understand the Biometric Sensors?
1. Read: [docs/research/PPG_SUMMARY.md](docs/research/PPG_SUMMARY.md) (5 min)
2. Read: [docs/research/SENSOR_DECISION_MATRIX.md](docs/research/SENSOR_DECISION_MATRIX.md) (10 min)
3. Decision: Commercial or DIY?

### Ready to Choose Hardware?
1. Read: [docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md](docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md)
2. **Recommended:** Fingertip ECG (commercial or DIY)
3. Next step: Send inquiry to AliveCor or prototype with AD8232

### Want to Design the Table?
1. Read: [docs/research/BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md](docs/research/BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md)
2. Focus: Ergonomics, materials, user experience
3. Key insight: Treat as ritual object, not medical device

### Looking for Artistic Inspiration?
1. Read: [docs/research/BIOMETRIC_ART_RESEARCH.md](docs/research/BIOMETRIC_ART_RESEARCH.md)
2. Study: Rafael Lozano-Hemmer's Pulse series
3. Learn: Visualization patterns, participant experience

---

## 📄 All Documentation Files

### Main Documentation
- [README.md](README.md) - Project overview, features, controls, code structure
- [docs/README.md](docs/README.md) - Complete documentation index with reading paths

### Research Documents (9 files, ~460KB total)

#### Essential Reading
1. **[PPG_SUMMARY.md](docs/research/PPG_SUMMARY.md)** (9KB)
   - TL;DR guide to fingertip sensors
   - Quick answers to key questions

2. **[SENSOR_DECISION_MATRIX.md](docs/research/SENSOR_DECISION_MATRIX.md)** (14KB)
   - Hardware decision tool
   - Cost calculator and comparisons

3. **[FINGERTIP_ECG_RESEARCH_REPORT.md](docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md)** (77KB) ⭐
   - **Most important research document**
   - Complete ECG sensor analysis
   - Commercial (AliveCor) vs DIY (AD8232)
   - Accuracy, costs, implementation

#### Deep Dive Research
4. **[PPG_HRV_RESEARCH.md](docs/research/PPG_HRV_RESEARCH.md)** (48KB)
   - Scientific analysis of PPG sensors
   - Signal processing techniques
   - Success rates and limitations

5. **[BIOMETRIC_SENSOR_RESEARCH_REPORT.md](docs/research/BIOMETRIC_SENSOR_RESEARCH_REPORT.md)** (61KB)
   - MAX30102 PPG sensor details
   - Temperature and skin tone considerations
   - DIY implementation guide

6. **[BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md](docs/research/BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md)** (41KB)
   - UX and industrial design
   - Ergonomics and materials
   - Accessibility guidelines
   - Creating ritual significance

7. **[BIOMETRIC_ART_RESEARCH.md](docs/research/BIOMETRIC_ART_RESEARCH.md)** (81KB)
   - Art installation precedents
   - Rafael Lozano-Hemmer, Lisa Park, George Khut
   - Visualization design patterns
   - Participant experience insights
   - Ethics and privacy

8. **[BIOMETRIC_RESEARCH.md](docs/research/BIOMETRIC_RESEARCH.md)** (61KB)
   - Real-time signal processing
   - WebBluetooth integration
   - Software libraries and tools
   - Latency optimization

9. **[2025-10-25-biometric-coherence-research.md](docs/research/2025-10-25-biometric-coherence-research.md)**
   - Academic studies on physiological synchrony
   - HRV synchronization between dyads
   - Analysis methods and metrics

### Implementation Documents
10. **[alivecor-inquiry-email.md](docs/implementation/alivecor-inquiry-email.md)**
    - Email templates for AliveCor SDK inquiry
    - Questions about API licensing
    - Follow-up strategy

---

## 🎯 Key Recommendations Summary

### Hardware: Fingertip ECG

**Why?**
- ✅ Millisecond-precise HRV (R² > 0.95 vs chest ECG)
- ✅ Perfect for table integration (Lead I: right hand → left hand)
- ✅ 85-95% success rate
- ✅ Better than PPG for emotional states
- ✅ Affordable: $50 DIY or $158-258 commercial

### Two Paths Forward

| Path | Cost | Pros | Next Step |
|------|------|------|-----------|
| **Commercial** (AliveCor) | $158-258 + license | Professional SDK, >95% success | Send email to KardiaPro@AliveCor.com |
| **DIY** (AD8232) | $50 | Full control, no fees | Order AD8232 modules, start prototyping |

### Installation Design Principles

From table design research:
- Facing each other seating (3.5-4 ft apart)
- Copper/brass electrodes (antimicrobial + beautiful)
- Hand-shaped recesses with clear affordances
- Multi-modal feedback (visual + haptic + audio)
- 3-5 minute session length
- Frame as exploration, not achievement

---

## 📊 Research Statistics

- **Total documentation:** 10 files, ~460KB, >100,000 words
- **Academic papers reviewed:** 40+
- **Sensor systems evaluated:** 15+
- **Art installations studied:** 20+
- **Commercial products analyzed:** 10+
- **Research completed:** October 25, 2025

---

## 🗺️ Recommended Reading Order

### Decision Making (45 minutes)
1. Project README.md (10 min)
2. PPG_SUMMARY.md (5 min)
3. SENSOR_DECISION_MATRIX.md (10 min)
4. FINGERTIP_ECG_RESEARCH_REPORT.md - Executive Summary (10 min)
5. BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md - Key sections (10 min)

### Deep Understanding (4 hours)
1. FINGERTIP_ECG_RESEARCH_REPORT.md (full)
2. BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md (full)
3. BIOMETRIC_ART_RESEARCH.md (full)
4. PPG_HRV_RESEARCH.md (signal processing sections)
5. Implementation guide (alivecor-inquiry-email.md)

### Technical Implementation (3 hours)
1. FINGERTIP_ECG_RESEARCH_REPORT.md (Sections 4-6: DIY implementation)
2. PPG_HRV_RESEARCH.md (signal processing)
3. BIOMETRIC_RESEARCH.md (real-time processing, WebBluetooth)
4. Source code review (src/ directory)

---

## 🎨 Current Visualization Status

**What's Built:**
- ✅ Two-group boid system (1000 boids)
- ✅ Coherence continuum (-1.0 to +1.0)
- ✅ Central attractor with orbital motion
- ✅ Biometric simulation mode (4 sequences)
- ✅ Interactive UI controls
- ✅ Visual feedback (trails, color blending, pulsing)
- ✅ Real-time performance optimization

**What's Next:**
- [ ] Choose hardware (commercial vs DIY)
- [ ] Prototype sensor integration
- [ ] Build/design table
- [ ] Implement real-time biometric input
- [ ] User testing with naive participants
- [ ] Final installation setup

---

## 📞 Next Actions

### Immediate (This Week)
1. **Review research documents** (PPG_SUMMARY + SENSOR_DECISION_MATRIX)
2. **Make hardware decision** (AliveCor vs DIY)
3. **If commercial:** Send email to AliveCor
4. **If DIY:** Order AD8232 modules + ESP32

### Short Term (2-4 Weeks)
1. **Prototype sensor system**
2. **Test signal quality** with diverse users
3. **Design table mockup**
4. **Plan integration architecture**

### Long Term (2-4 Months)
1. **Build production table**
2. **Integrate sensors with visualization**
3. **User testing sessions**
4. **Final installation deployment**

---

## 💡 Quick Reference

**Project Goal:** Interactive art installation measuring and visualizing biometric coherence between two people using fingertip sensors and generative visualization

**Current Status:** Visualization complete, sensor research complete, hardware decision pending

**Key Decision:** Commercial SDK (easier, expensive) vs DIY electronics (cheaper, more work)

**Timeline to Launch:** 2-4 months from hardware choice

**Budget Range:** $500-1,500 depending on path

---

Last updated: October 25, 2025
