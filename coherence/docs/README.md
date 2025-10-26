# Coherence Biometric Art Installation - Documentation

This directory contains comprehensive research and documentation for the interactive biometric coherence art installation project.

## 📚 Documentation Structure

```
docs/
├── README.md (this file)
├── research/           # Academic research and sensor analysis
└── implementation/     # Practical guides and templates
```

---

## 🔬 Research Documents

### Quick Start Guides

**Start here if you're new to the project:**

1. **[PPG_SUMMARY.md](research/PPG_SUMMARY.md)** (9KB)
   - Quick reference for fingertip PPG sensors
   - TL;DR answers to key questions
   - Read first: 5 minutes

2. **[SENSOR_DECISION_MATRIX.md](research/SENSOR_DECISION_MATRIX.md)** (14KB)
   - Decision tool for choosing sensor system
   - Cost calculator and comparison tables
   - Use this to make your hardware choice
   - Read second: 10 minutes

### Comprehensive Research Reports

**Deep dives into specific technologies:**

3. **[FINGERTIP_ECG_RESEARCH_REPORT.md](research/FINGERTIP_ECG_RESEARCH_REPORT.md)** (77KB) ⭐ RECOMMENDED
   - Complete analysis of fingertip ECG sensors
   - Commercial products (AliveCor, Wellue) vs DIY (AD8232)
   - Accuracy comparison: fingertip ECG vs chest ECG vs PPG
   - Table integration design recommendations
   - HRV measurement reliability
   - **Conclusion:** Fingertip ECG is the best solution for table installations

4. **[PPG_HRV_RESEARCH.md](research/PPG_HRV_RESEARCH.md)** (48KB)
   - Scientific analysis of fingertip PPG for HRV measurement
   - Accuracy data and validation studies
   - Signal processing techniques
   - Success rates and limitations
   - Real-time implementation guide

5. **[BIOMETRIC_SENSOR_RESEARCH_REPORT.md](research/BIOMETRIC_SENSOR_RESEARCH_REPORT.md)** (61KB)
   - Comprehensive sensor hardware comparison
   - MAX30102 PPG sensors (DIY approach)
   - Temperature and skin tone considerations
   - Cost breakdowns and timelines
   - Implementation checklist

6. **[BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md](research/BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md)** (41KB)
   - User experience and industrial design
   - Ergonomics for table-integrated sensors
   - Material recommendations
   - Accessibility guidelines
   - Creating ritual significance
   - Hygiene protocols for public installations

### Contextual Research

7. **[BIOMETRIC_ART_RESEARCH.md](research/BIOMETRIC_ART_RESEARCH.md)** (81KB)
   - Existing biometric art installations
   - Design patterns for coherence visualization
   - Rafael Lozano-Hemmer's Pulse series
   - Participant experience insights
   - Ethical and privacy considerations

8. **[BIOMETRIC_RESEARCH.md](research/BIOMETRIC_RESEARCH.md)** (61KB)
   - Real-time biometric signal processing
   - Software libraries and tools
   - WebBluetooth integration
   - Data streaming architectures
   - Latency optimization

9. **[2025-10-25-biometric-coherence-research.md](research/2025-10-25-biometric-coherence-research.md)**
   - Academic studies on interpersonal physiological synchrony
   - Heart rate variability synchronization
   - Practical sensor recommendations
   - Analysis methods and metrics

---

## 🛠️ Implementation Documents

### Templates & Guides

10. **[alivecor-inquiry-email.md](implementation/alivecor-inquiry-email.md)**
    - Email templates for AliveCor SDK inquiry
    - Questions to ask about API licensing
    - Follow-up strategy
    - Backup plan if commercial solution doesn't work

---

## 🎯 Recommended Reading Path

### For Quick Decision Making (30 minutes):
1. PPG_SUMMARY.md
2. SENSOR_DECISION_MATRIX.md
3. FINGERTIP_ECG_RESEARCH_REPORT.md (Executive Summary only)

### For Complete Understanding (3-4 hours):
1. PPG_SUMMARY.md
2. FINGERTIP_ECG_RESEARCH_REPORT.md (full)
3. BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md
4. BIOMETRIC_ART_RESEARCH.md
5. Implementation guide (alivecor-inquiry-email.md)

### For Technical Implementation (2-3 hours):
1. FINGERTIP_ECG_RESEARCH_REPORT.md (Sections 4-6)
2. PPG_HRV_RESEARCH.md (signal processing sections)
3. BIOMETRIC_RESEARCH.md (real-time processing)
4. BIOMETRIC_SENSOR_RESEARCH_REPORT.md (if using PPG instead of ECG)

---

## 📊 Key Findings Summary

### Sensor Recommendation: **Fingertip ECG**

**Why Fingertip ECG wins:**
- ✅ Millisecond-precise HRV measurement (R² > 0.95 vs chest ECG)
- ✅ Perfect for table integration (Lead I: right hand → left hand)
- ✅ 85-95% success rate with naive users
- ✅ Better than PPG for stress/emotional states
- ✅ Affordable: DIY $50 or commercial $158-258

**Two viable paths:**

| Approach | Cost | Success Rate | Pros | Cons |
|----------|------|--------------|------|------|
| **Commercial (AliveCor)** | $158-258 + SDK license | 95%+ | Professional, reliable, SDK support | Unknown licensing costs |
| **DIY (AD8232)** | $50 total | 85-95% | Full control, no fees, customizable | Requires electronics work |

### Installation Design Principles

From BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md:
- **Treat as ritual object, not medical device**
- Hand-shaped recesses with material differentiation
- Copper/brass electrodes (antimicrobial + beautiful)
- Multi-modal feedback (visual + haptic + audio)
- Facing each other seating (3.5-4 feet apart)
- Sacred geometry and mandala patterns

### User Experience

From BIOMETRIC_ART_RESEARCH.md:
- 3-5 minute optimal session length
- 2-3 minute calibration period acceptable
- Frame as "exploration" not "achievement"
- Beautiful in all states (no "failure" visualization)
- Immediate feedback essential (<200ms latency)

---

## 📈 Research Statistics

- **Total documentation:** ~460KB (>100,000 words)
- **Academic papers reviewed:** 40+
- **Sensor systems evaluated:** 15+
- **Art installations studied:** 20+
- **Commercial products analyzed:** 10+

---

## 🔄 Document Version Control

All documents were created on **October 25, 2025** during comprehensive biometric research phase.

Last updated: 2025-10-25

---

## 📧 Next Steps

1. **Read PPG_SUMMARY.md and SENSOR_DECISION_MATRIX.md** (15 min)
2. **Choose sensor approach:** Commercial vs DIY
3. **If commercial:** Send inquiry email to AliveCor (template in implementation/)
4. **If DIY:** Review FINGERTIP_ECG_RESEARCH_REPORT.md Section 4 (DIY implementation)
5. **Design table:** Review BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md
6. **Plan visualization:** Review BIOMETRIC_ART_RESEARCH.md for design inspiration

---

## 🤝 Contributing

This documentation is living and will be updated as the project progresses. Key areas for future additions:
- [ ] Actual implementation guide after sensor choice
- [ ] Build log with photos and troubleshooting
- [ ] Participant testing results
- [ ] Code examples and integration guides
- [ ] Final installation documentation

---

## 📝 License & Attribution

This research compilation is for the coherence biometric art installation project. Academic papers and commercial products referenced remain property of their respective authors and organizations.
