# Coherence Art Installation - Research Documentation Index

**Project:** Interpersonal Coherence Interactive Art Installation
**Research Period:** October 2025
**Status:** Research Phase Complete

---

## Quick Navigation

### 🚀 Start Here:
1. **[PPG_SUMMARY.md](PPG_SUMMARY.md)** - 5-minute read with key findings and recommendations
2. **[SENSOR_DECISION_MATRIX.md](SENSOR_DECISION_MATRIX.md)** - Choose which sensor system to use

### 📊 Deep Dives:
3. **[PPG_HRV_RESEARCH.md](PPG_HRV_RESEARCH.md)** - Complete scientific analysis of PPG for HRV (48KB, comprehensive)
4. **[BIOMETRIC_RESEARCH.md](BIOMETRIC_RESEARCH.md)** - Hardware options and real-time processing (60KB)

---

## Document Summaries

### PPG_SUMMARY.md (Quick Reference)
**Read Time:** 5 minutes
**Purpose:** Executive summary of PPG viability for art installations

**Contains:**
- TL;DR: Can we use fingertip PPG? (YES, BUT...)
- Key numbers (success rates, accuracy, costs)
- Critical requirements and deal-breakers
- Three system options (PPG, ECG, Hybrid)
- Final recommendations
- Quick decision criteria

**When to Read:** First document to read for high-level understanding

---

### SENSOR_DECISION_MATRIX.md (Decision Tool)
**Read Time:** 10 minutes
**Purpose:** Help choose between PPG, ECG, or Hybrid systems

**Contains:**
- Quick decision tool (7 questions)
- Detailed comparison matrices
- Scenario-based recommendations (6 scenarios)
- Weighted decision calculator
- Risk assessment for each system
- Final decision framework

**When to Read:** After understanding basics, ready to make system choice

---

### PPG_HRV_RESEARCH.md (Comprehensive Technical)
**Read Time:** 45-60 minutes
**Purpose:** Complete scientific analysis and implementation guide

**Contains 16 Sections:**
1. PPG vs ECG accuracy comparison (quantitative data)
2. Fingertip PPG reliability and signal quality
3. Signal processing pipeline (filtering, peak detection)
4. Individual variation and bias (skin tone, temperature)
5. Sensor design and configuration
6. Interpersonal synchrony measurement
7. Validated commercial systems
8. Expected success and failure rates
9. Graceful failure handling strategies
10. Comparison: Fingertip PPG vs Chest ECG
11. Recommendations for art installation
12. Signal processing code examples
13. Testing and validation protocol
14. Cost-benefit analysis
15. Conclusions and final recommendations
16. References (2020-2025 academic papers)

**When to Read:** During implementation phase, need technical details

---

### BIOMETRIC_RESEARCH.md (Hardware & Software)
**Read Time:** 30-45 minutes
**Purpose:** Consumer hardware options and real-time processing techniques

**Contains 9 Sections:**
1. Hardware Options (Polar H10, Wahoo TICKR, Apple Watch, Fitbit, DIY sensors)
2. Software Libraries (JavaScript, Python, desktop software)
3. Real-Time Processing Pipelines (4 architectures)
4. Real-Time HRV Analysis Techniques (sliding windows, metrics)
5. Example Code and Projects (complete working examples)
6. Technical Challenges and Solutions
7. Privacy and Ethical Considerations (GDPR compliance)
8. Complete System Recommendations (3 setups)
9. Appendix and Glossary

**When to Read:** Need to understand hardware options and software architecture

---

### BIOMETRIC_ART_RESEARCH.md
**Read Time:** 60+ minutes
**Purpose:** Art context-specific research (broader than just sensors)

**Note:** This is an earlier comprehensive research document covering art installations, biometric sensing, and design considerations beyond just PPG vs ECG technical comparison.

---

### BIOMETRIC_SENSOR_RESEARCH_REPORT.md
**Read Time:** 45 minutes
**Purpose:** Sensor comparison research report

**Note:** Earlier research comparing various biometric sensors. Some overlap with PPG_HRV_RESEARCH.md but less focused on PPG specifically.

---

### BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md
**Read Time:** 30 minutes
**Purpose:** Physical installation design (table/interface)

**Note:** Research on physical design considerations for biometric sensing tables and interaction points.

---

## Recommended Reading Paths

### Path 1: Quick Decision (30 minutes total)
1. **PPG_SUMMARY.md** (5 min) - Understand basics
2. **SENSOR_DECISION_MATRIX.md** (10 min) - Choose system
3. Skim **PPG_HRV_RESEARCH.md** sections 1, 8, 11 (15 min) - Validation

**Outcome:** System choice with confidence

---

### Path 2: Implementation Ready (2 hours total)
1. **PPG_SUMMARY.md** (5 min) - Quick overview
2. **SENSOR_DECISION_MATRIX.md** (10 min) - Choose system
3. **PPG_HRV_RESEARCH.md** complete (60 min) - Technical depth
4. **BIOMETRIC_RESEARCH.md** sections 1-3, 5 (45 min) - Implementation details

**Outcome:** Ready to prototype with technical understanding

---

### Path 3: Complete Understanding (4+ hours)
1. **PPG_SUMMARY.md** (5 min)
2. **SENSOR_DECISION_MATRIX.md** (10 min)
3. **PPG_HRV_RESEARCH.md** complete (60 min)
4. **BIOMETRIC_RESEARCH.md** complete (45 min)
5. **BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md** (30 min)
6. **BIOMETRIC_ART_RESEARCH.md** (60+ min)

**Outcome:** Expert-level understanding of all aspects

---

## Key Research Findings (Cross-Document)

### Scientific Accuracy
- **PPG vs ECG correlation:** 0.82-0.99 (at rest, healthy subjects)
- **IBI accuracy:** 4-7 ms MAE (optimal PPG), <2 ms (ECG)
- **Success rate:** 70-85% (PPG real-world), 95%+ (ECG)
- **Source:** PPG_HRV_RESEARCH.md Section 1

### Hardware Recommendations
- **Best ECG:** Polar H10 ($90) - gold standard accuracy
- **Best DIY PPG:** MAX30102 + ESP32 ($15-20) - proven, affordable
- **Best Commercial PPG:** HeartMath Inner Balance ($249) - validated
- **Source:** BIOMETRIC_RESEARCH.md Section 1

### Software Stack
- **Browser:** Web Bluetooth API + p5.js (no backend needed)
- **Python:** HeartPy (PPG/ECG analysis)
- **Real-time:** WebSocket for streaming
- **HRV Analysis:** 30-second sliding window RMSSD
- **Source:** BIOMETRIC_RESEARCH.md Sections 2-3

### Critical Design Decisions
- **Interaction Time:** Minimum 2-3 minutes for HRV calibration
- **Environmental:** Room temperature >20°C (68°F) required
- **Positioning:** Seated, stationary hand placement essential for PPG
- **Failure Handling:** Graceful degradation for 15-30% of participants
- **Source:** PPG_HRV_RESEARCH.md Sections 8-9

### Cost Analysis
- **DIY PPG:** $70 hardware + $2000-3000 development = $2070-3070
- **Pure ECG:** $180 hardware + $1000-1500 development = $1180-1680
- **Hybrid:** $250 hardware + $1500-2000 development = $1750-2250
- **Source:** SENSOR_DECISION_MATRIX.md Cost Analysis section

### Final Recommendation
**HYBRID SYSTEM (ECG + PPG)**
- Polar H10 chest strap for accurate HRV measurement
- MAX30102 fingertip sensor for visual pulse waveform
- Best balance: 95%+ success rate + engaging interaction
- Cost: ~$250 for 2-person system
- **Source:** PPG_SUMMARY.md, SENSOR_DECISION_MATRIX.md

---

## Research Methodology

### Sources Analyzed
- **Academic Papers:** 40+ peer-reviewed studies (2020-2025)
- **Commercial Products:** 8 sensor systems evaluated
- **Technical Specs:** 5 sensor datasheets analyzed
- **Real-World Deployments:** 6 art installation case studies

### Search Queries Performed
1. PPG vs ECG for HRV (accuracy comparison)
2. Fingertip PPG reliability and signal quality
3. Inter-beat interval extraction from PPG
4. Motion compensation algorithms
5. Skin tone bias in PPG sensors
6. Interpersonal physiological synchrony
7. Signal quality metrics (SQI)
8. Sampling rate requirements
9. Peak detection algorithms
10. Commercial sensor validation studies

### Key Databases
- PubMed / PMC (biomedical research)
- IEEE Xplore (engineering papers)
- Nature / Frontiers (open access journals)
- ArXiv (preprints)
- Manufacturer technical documentation

---

## Action Items (Post-Research)

### Immediate Next Steps (Week 1-2):
- [ ] Review all research documents
- [ ] Complete SENSOR_DECISION_MATRIX weighted calculator
- [ ] Choose system (PPG, ECG, or Hybrid)
- [ ] Order prototype hardware
- [ ] Set up development environment

### Prototyping Phase (Week 3-4):
- [ ] Build 1-2 sensor units
- [ ] Test signal quality with 5-10 diverse participants
- [ ] Measure actual success rate in intended environment
- [ ] Validate time to stable signal
- [ ] Test graceful failure modes

### Development Phase (Week 5-8):
- [ ] Implement signal processing pipeline
- [ ] Build real-time visualization
- [ ] Integrate WebBluetooth or WebSocket
- [ ] Develop HRV analysis algorithms
- [ ] Create interpersonal synchrony calculations

### Testing Phase (Week 9-10):
- [ ] User testing with 20+ participants
- [ ] Refine based on feedback
- [ ] Validate success rates match predictions
- [ ] Test in actual installation environment
- [ ] Iterate on failure handling

### Deployment Preparation (Week 11-12):
- [ ] Finalize hardware build
- [ ] Prepare consent forms (GDPR compliance)
- [ ] Create instruction materials
- [ ] Train attendants (if applicable)
- [ ] Set up backup systems
- [ ] Deploy!

---

## Questions or Need Clarification?

### Technical Questions:
- See **PPG_HRV_RESEARCH.md** Section 16 (References)
- Academic papers cited throughout
- Manufacturer datasheets available

### Implementation Questions:
- See **BIOMETRIC_RESEARCH.md** Section 5 (Example Code)
- Complete working examples provided
- GitHub repositories linked

### Design Questions:
- See **BIOMETRIC_TABLE_DESIGN_RESEARCH_REPORT.md**
- Physical installation considerations
- Interaction design patterns

### Decision Questions:
- Use **SENSOR_DECISION_MATRIX.md** weighted calculator
- Compare scenarios to your use case
- Risk assessment for each option

---

## Document Change Log

| Document | Created | Last Updated | Version |
|----------|---------|--------------|---------|
| PPG_HRV_RESEARCH.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |
| PPG_SUMMARY.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |
| SENSOR_DECISION_MATRIX.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |
| BIOMETRIC_RESEARCH.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |
| BIOMETRIC_ART_RESEARCH.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |
| RESEARCH_INDEX.md | Oct 25, 2025 | Oct 25, 2025 | 1.0 |

---

## Project Status

**Research Phase:** ✅ COMPLETE
**Next Phase:** Prototype Development
**Decision Needed:** Choose sensor system (PPG, ECG, or Hybrid)
**Estimated Timeline to Deployment:** 8-12 weeks from system choice

---

**Last Updated:** October 25, 2025
**Repository:** /workspace/coherence/
**Contact:** Research compilation for Coherence Art Installation
