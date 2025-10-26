# HRV Coherence Research - Navigation Guide

**Research Completed:** October 25, 2025
**Total Research Documents:** 2 comprehensive reports (2,781 lines)
**Focus:** Real-time ECG-to-coherence processing for interactive art

---

## Documents Overview

### 1. HRV_COHERENCE_ALGORITHM_RESEARCH.md (2,017 lines)
**The comprehensive deep-dive research report**

This is your complete reference for understanding HRV coherence calculation from first principles to production implementation.

**Contents:**
1. **HeartMath Coherence Algorithm** - Industry standard with patent analysis
2. **Alternative Coherence Metrics** - DFA, Sample Entropy, Poincaré, LF/HF
3. **Time Domain Metrics** - RMSSD, SDNN, pNN50 and coherence correlations
4. **Frequency Domain Analysis** - FFT vs Welch, windowing, PSD calculation
5. **Real-Time Implementation** - Complete pipeline from ECG to visualization
6. **JavaScript Libraries** - fft.js, interpolation, Web Serial API
7. **Accuracy vs Simplicity Trade-offs** - Comparison matrices
8. **Recommended Approach** - Optimized for your art installation
9. **Resources** - Academic papers, open-source projects, tutorials
10. **Conclusion** - Next steps and implementation roadmap

**Use this when:**
- Understanding the theory behind coherence
- Making architectural decisions
- Optimizing algorithms
- Validating your implementation
- Troubleshooting accuracy issues
- Citing research for grants/publications

### 2. COHERENCE_IMPLEMENTATION_QUICKSTART.md (764 lines)
**The fast-track implementation guide**

Copy-paste ready code and condensed reference for rapid development.

**Contents:**
- **TL;DR** - Essential formulas and requirements
- **Code Snippets** - Arduino, R-peak detection, coherence calculation, RMSSD, p5.js
- **Installation Steps** - Hardware setup, software dependencies
- **Testing Without Hardware** - Synthetic data generator
- **Troubleshooting** - Common problems and solutions
- **Performance Checklist** - Latency and optimization targets
- **Validation Tests** - How to verify your implementation works
- **Quick Reference** - Key constants and configuration
- **Common Pitfalls** - Mistakes to avoid

**Use this when:**
- Starting implementation (copy-paste code)
- Quick reference during development
- Setting up hardware
- Debugging issues
- Testing with synthetic data

---

## Quick Navigation

### "I want to understand the science"
→ Start with **HRV_COHERENCE_ALGORITHM_RESEARCH.md**
- Section 1: HeartMath Algorithm
- Section 2: Alternative Metrics
- Section 4: Frequency Domain Analysis

### "I want to start coding NOW"
→ Start with **COHERENCE_IMPLEMENTATION_QUICKSTART.md**
- Essential Code Snippets section
- Installation Steps
- Copy the complete classes

### "I need to make architecture decisions"
→ See **HRV_COHERENCE_ALGORITHM_RESEARCH.md**
- Section 7: Accuracy vs Simplicity Trade-offs
- Section 8: Recommended Approach
- Comparison tables

### "My implementation isn't working"
→ See **COHERENCE_IMPLEMENTATION_QUICKSTART.md**
- Quick Troubleshooting section
- Validation Tests
- Common Pitfalls Checklist

### "I need to optimize for latency"
→ See **HRV_COHERENCE_ALGORITHM_RESEARCH.md**
- Section 4.6: Computational Requirements
- Section 5.3: Optimization for <500ms Latency
- Section 5.4: Minimum Viable Implementation

### "I'm choosing between coherence methods"
→ See **HRV_COHERENCE_ALGORITHM_RESEARCH.md**
- Section 2.6: Comparison Table
- Section 7.2: Recommended Implementations by Use Case

---

## Key Research Findings Summary

### HeartMath Coherence Algorithm

**Formula:**
```
Coherence Ratio = Peak Power / (Total Power - Peak Power)
```

**Requirements:**
- Window: 64 seconds (recommended), 30-60s (acceptable for art)
- Update: Every 5 seconds (recommended), 3-5s (acceptable)
- Beats: ~50-80 (optimal), ~30 minimum
- Latency: 5-10s (HeartMath), <100ms computation

**Patent:** US6358201B1 - General principles not patented, specific scoring may be

**Implementation Status:** Can be independently implemented using standard DSP

### Recommended Approach for Interactive Art

**Simplified Coherence Algorithm:**
```javascript
1. Collect RR intervals (45-60 second window)
2. Resample to 4 Hz (linear or cubic spline interpolation)
3. Detrend (remove linear drift)
4. Apply Hanning window
5. Compute FFT (256 points)
6. Find peak in 0.04-0.26 Hz range
7. Calculate coherence ratio: peak/(total-peak)
8. Update every 3-5 seconds
```

**Expected Performance:**
- Latency: 50-100ms (well under 500ms requirement)
- Accuracy: 90%+ correlation with HeartMath
- Data: 45-60 seconds, ~35-50 beats
- Computational: <20ms total pipeline

**Tech Stack:**
- Hardware: AD8232 ECG sensor + Arduino Nano
- Serial: Web Serial API or p5.webserial
- DSP: fft.js for FFT, custom interpolation
- R-Peak Detection: Adaptive threshold (simple) or Pan-Tompkins (robust)
- Visualization: p5.js with smooth transitions

### Alternative Simpler Metrics

**For ultra-low latency or prototyping:**

1. **RMSSD** (Root Mean Square of Successive Differences)
   - Latency: <1ms
   - Data: 10-30 seconds, ~15-20 beats
   - Correlation with coherence: Moderate
   - Use: Complementary metric for activity level

2. **Poincaré SD1/SD2 Ratio**
   - Latency: <5ms
   - Data: 30-60 beats
   - Correlation with coherence: Moderate
   - Use: Fast coherence approximation

3. **LF/HF Ratio**
   - Latency: Same as coherence (uses same FFT)
   - Data: 60 seconds
   - Correlation with coherence: High
   - Use: Alternative to coherence ratio

### Validation Strategy

**Test with:**
1. Coherent breathing (6 breaths/min) → Expect: score 70-100
2. Normal breathing → Expect: score 20-50
3. Breath hold → Expect: score drops
4. Synthetic coherent data → Expect: score 80-100
5. Compare with HeartMath device → Expect: r > 0.7 correlation

---

## Libraries and Dependencies

### Required

**JavaScript/NPM:**
- `fft.js` - Fast FFT implementation (Radix-4)
- `p5.js` - Visualization framework
- `p5.webserial` - Serial communication

**Arduino:**
- Standard Arduino library (no external dependencies)

### Optional

**JavaScript:**
- `cubic-spline` - Better interpolation quality
- `simple-statistics` - Statistical functions
- `spectral-analysis` - Alternative FFT with PSD
- `chart.js` or `d3.js` - Advanced visualizations
- `tone.js` - Audio feedback

**Installation:**
```bash
npm install fft.js
# p5.js loaded via CDN
```

---

## Implementation Roadmap

### Phase 1: MVP (Week 1)
- [ ] Hardware: AD8232 + Arduino setup
- [ ] Serial: Basic communication to p5.js
- [ ] R-Peak: Simple threshold detection
- [ ] Metric: RMSSD calculation
- [ ] Visualization: Circle size = RMSSD
- **Deliverable:** Working real-time HRV display

### Phase 2: Coherence (Week 2)
- [ ] FFT: Implement fft.js pipeline
- [ ] Interpolation: Cubic spline resampling
- [ ] Coherence: Full calculation algorithm
- [ ] Peak Detection: Find 0.1 Hz resonance
- [ ] Visualization: Color = coherence score
- **Deliverable:** Real-time coherence biofeedback

### Phase 3: Polish (Week 3)
- [ ] R-Peak: Upgrade to Pan-Tompkins
- [ ] Artifacts: Rejection of invalid intervals
- [ ] Calibration: Adaptive normalization
- [ ] Smoothing: Transition animations
- [ ] Guide: Breathing pacer at 0.1 Hz
- **Deliverable:** Robust, user-friendly system

### Phase 4: Enhancement (Week 4)
- [ ] Multi-metric: Coherence + RMSSD + peak frequency
- [ ] Error handling: Electrode disconnection, motion
- [ ] Data logging: Save sessions
- [ ] Audio: Sound synthesis from coherence
- [ ] Testing: User studies and refinement
- **Deliverable:** Production-ready art installation

---

## Code Organization Recommendation

```
ecg-coherence-art/
├── arduino/
│   └── ecg_sender/
│       └── ecg_sender.ino
│
├── src/
│   ├── core/
│   │   ├── RPeakDetector.js
│   │   ├── CoherenceCalculator.js
│   │   ├── RMSSDCalculator.js
│   │   └── config.js
│   │
│   ├── utils/
│   │   ├── interpolation.js
│   │   ├── detrend.js
│   │   └── windowing.js
│   │
│   ├── visualization/
│   │   ├── CoherenceVisual.js
│   │   ├── BreathingPacer.js
│   │   └── InfoDisplay.js
│   │
│   └── sketch.js (p5.js main file)
│
├── test/
│   ├── synthetic-data.js
│   └── validation.js
│
├── public/
│   └── index.html
│
├── package.json
└── README.md
```

---

## Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **Total Latency** | <100ms | <500ms | <1000ms |
| **R-Peak Detection** | <10ms | <50ms | <100ms |
| **FFT Computation** | <5ms | <10ms | <20ms |
| **Update Frequency** | 3-5s | 5-10s | 10-15s |
| **Window Duration** | 60s | 45-60s | 30-45s |
| **Minimum Beats** | 50 | 30-40 | 20-25 |
| **Frame Rate** | 60fps | 30fps | 15fps |
| **Serial Baud** | 115200 | 57600 | 9600 |

---

## Resources

### Academic Papers (Key Citations)

1. McCraty, R., et al. (1996). "Cardiac coherence: A new, noninvasive measure of autonomic nervous system order." *Alternative Therapies in Health and Medicine*, 2(1), 52-65.

2. Shaffer, F., et al. (2022). "Following the Rhythm of the Heart: HeartMath Institute's Path to HRV Biofeedback." *Applied Psychophysiology and Biofeedback*, 47(4), 305-316.

3. Pan, J., & Tompkins, W. J. (1985). "A real-time QRS detection algorithm." *IEEE Transactions on Biomedical Engineering*, 32(3), 230-236.

### Open-Source Projects (Reference Implementations)

**Python:**
- HeartPy: https://github.com/paulvangentcom/heartrate_analysis_python
- pyHRV: https://github.com/PGomes92/pyhrv
- NeuroKit2: https://github.com/neuropsychology/NeuroKit
- py-ecg-detectors: https://github.com/berndporr/py-ecg-detectors

**JavaScript:**
- fft.js: https://github.com/indutny/fft.js
- p5.webserial: https://github.com/gohai/p5.webserial

**Arduino:**
- AD8232 Examples: https://github.com/sparkfun/AD8232_Heart_Rate_Monitor

### Learning Resources

- Web Serial API Guide: https://web.dev/serial/
- p5.js Serial Tutorial: https://makeabilitylab.github.io/physcomp/communication/p5js-serial.html
- FFT Basics: https://thebreakfastpost.com/2015/10/18/ffts-in-javascript/
- HeartMath Institute: https://www.heartmath.org/research/

---

## FAQ

**Q: Can I use PPG (photoplethysmography) instead of ECG?**
A: Yes, but with caveats. PPG can calculate HRV and coherence, but is less accurate for R-peak detection. ECG is recommended for art installations requiring precision.

**Q: Do I need FDA approval for this?**
A: No, if it's purely for artistic/educational purposes, not medical diagnosis or treatment. Disclaimer: "This is an art installation, not a medical device."

**Q: How accurate is the simplified coherence vs. HeartMath?**
A: Expected 90-95% correlation with proper implementation. Sufficient for biofeedback art.

**Q: Can multiple people use it simultaneously?**
A: Yes, but you need separate ECG sensors and Arduino boards per person. The JavaScript code can handle multiple serial connections.

**Q: What if the coherence score seems random?**
A: Check: (1) Electrode placement, (2) User movement, (3) Artifact rejection, (4) Window duration (may be too short), (5) Breathing instruction (show them how to achieve coherence).

**Q: How do I know if it's working correctly?**
A: Use the validation tests with coherent breathing (6 breaths/min) and synthetic data. Compare with HeartMath device if available.

**Q: What's the minimum viable implementation?**
A: Arduino ECG → Simple R-peak detection → RMSSD calculation → p5.js circle visualization. Can be built in 1-2 days.

**Q: Should I implement Pan-Tompkins or use simple thresholding?**
A: Start with simple adaptive thresholding for MVP. Upgrade to Pan-Tompkins if you experience too many false peaks or missed beats.

**Q: How do I handle multiple browsers/devices?**
A: Web Serial API requires user permission per device. For installations, use a single dedicated browser/device. For multi-user, each needs their own.

---

## Next Steps

1. **Read** the Quickstart Guide for implementation details
2. **Set up** AD8232 + Arduino hardware
3. **Test** with synthetic data first (no hardware needed)
4. **Build** MVP with RMSSD in 1-2 days
5. **Upgrade** to full coherence calculation
6. **Refine** visualization and user experience
7. **Validate** with breathing tests and HeartMath comparison
8. **Deploy** at your art installation

---

## Contact & Contributions

This research was compiled specifically for the **Coherence Interactive Art Installation** project.

**Research Date:** October 25, 2025
**Research Scope:** 40+ web sources, 4+ academic papers, 20+ technical documents
**Total Lines:** 2,781 lines of documentation and code examples
**Implementation Time:** Estimated 3-4 weeks for full system
**Hardware Cost:** ~$50-100 (AD8232 + Arduino + electrodes)

For questions, refer to the troubleshooting sections in both documents or consult the cited academic papers and open-source projects.

**Good luck with your installation!**
