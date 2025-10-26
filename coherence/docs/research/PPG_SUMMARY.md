# Fingertip PPG for HRV: Quick Reference Summary

## TL;DR - Can We Use Fingertip PPG Sensors?

**YES, BUT...**

Expected success rate: **70-85%** in real-world art installation conditions.

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **PPG vs ECG Correlation** | 0.82-0.99 (at rest) |
| **IBI Accuracy (MAE)** | 4-7 ms (optimal), 10-15 ms (typical) |
| **Success Rate (Optimal)** | 80-90% |
| **Success Rate (Real-World Art)** | 70-85% |
| **Success Rate (Challenging)** | 50-70% |
| **Time to Stable Signal** | 2-3 minutes |
| **Failure Rate** | 15-30% |

---

## Critical Requirements

### For PPG to Work:

✅ **Stationary contact** (seated, hand on stable surface)
✅ **2-3 minute calibration** period (not instant)
✅ **Room temperature >20°C** (68°F)
✅ **Proper contact pressure** (20-30 mmHg, gentle touch)
✅ **Green LED (525nm)** with auto-gain control
✅ **100-125 Hz sampling** rate
✅ **Butterworth bandpass filter** (0.5-4 Hz)
✅ **Graceful failure handling** for 15-30% of participants

### Deal-Breakers (PPG Won't Work):

❌ **Movement required** (walking, dancing, active installation)
❌ **Quick interactions** (<2 minutes)
❌ **Cold environments** (<18°C)
❌ **100% success rate needed**
❌ **Medical-grade accuracy required**

---

## Failure Modes

**Who Will Have Problems:**

1. **Cold hands** (vasoconstriction) - 30-40% of failures
2. **Movement/fidgeting** - 20-30% of failures
3. **Poor circulation** (elderly, Raynaud's, diabetes) - 20-30% of failures
4. **Very dark skin** + poor sensor (without auto-gain) - 10-20% of failures
5. **Technical issues** - 10-20% of failures

---

## Recommended Solutions

### Option A: Pure Fingertip PPG (Budget: ~$70)

**Pros:**
- Low cost
- Non-intimate contact
- Full control
- Visually engaging

**Cons:**
- 70-85% success rate
- 40-60 hours development
- Requires stillness
- Variable quality

**When to Choose:**
- Budget <$100
- Non-intimate contact essential
- Aesthetic of fingertip sensor critical
- Failure handling acceptable

---

### Option B: Pure Chest ECG - Polar H10 (Budget: ~$180)

**Pros:**
- 95%+ success rate
- Gold standard accuracy
- Participant can move
- 20-30 hours development

**Cons:**
- Intimate contact (chest strap)
- Higher cost
- Private changing area needed

**When to Choose:**
- >90% success rate required
- Accuracy paramount
- Budget allows $90+/unit
- Intimate contact acceptable

---

### Option C: HYBRID PPG + ECG (Budget: ~$250) ⭐ RECOMMENDED

**System:**
- Polar H10 chest strap for HRV measurement (accuracy)
- MAX30102 fingertip sensor for visual pulse waveform (aesthetics)
- Visualization uses fingertip aesthetics
- Coherence calculation uses chest strap data

**Pros:**
- 95%+ success rate (from ECG)
- Engaging interaction (fingertip visual)
- Best of both worlds
- Professional quality

**Cons:**
- Higher cost
- Still requires chest strap placement
- More complex system

**When to Choose:**
- Public art installation
- Need both accuracy AND engagement
- Budget allows
- Best overall solution

---

## Technical Stack (PPG)

```
Hardware:
- MAX30102 (green 525nm + infrared 880nm LEDs)
- ESP32 microcontroller
- Fingertip clip (transmission mode)

Software:
- 100 Hz sampling
- Butterworth bandpass filter (0.5-4 Hz)
- Adaptive peak detection (60% threshold)
- Skewness-based quality assessment
- 30-second sliding window RMSSD
- WebSocket → Browser visualization

Timeline:
- Assembly: 1-2 weeks
- Development: 2-3 weeks
- Calibration: 1-2 weeks
- User testing: 1-2 weeks
Total: 6-9 weeks
```

---

## Interaction Design Requirements

### Calibration Timeline:
```
0-10s:   Finger placement + contact optimization
10-30s:  Signal quality check + adjustments
30-120s: HRV baseline calibration (engaging animation)
120s+:   Real-time coherence measurement
```

### Progressive Disclosure:
1. **Pulse waveform** (immediate, always visible)
2. **Heart rate** (10-30s, if signal quality OK)
3. **HRV coherence** (2+ min, if baseline stable)
4. **Interpersonal synchrony** (if both participants stable)

### Graceful Failure Handling:
- 🟢 EXCELLENT → Show coherence
- 🟡 GOOD → Show heart rate, calibrating
- 🟠 FAIR → "Adjust finger position"
- 🔴 POOR → Instructions + alternative mode

### Alternative Modes (If Signal Fails):
- Show aggregate coherence from other participants
- Educational content about why signal failed
- Offer hand warming + retry
- Observe others' coherence visualization

---

## Environmental Requirements

**Room Setup:**
- Temperature: >20°C (68°F) required
- Seating: Stable chairs with armrest or table
- Lighting: Controlled (not excessive ambient)
- Air flow: Minimal (away from HVAC vents)
- Noise: Low (reduce stress/movement)

**Participant Preparation:**
- Pre-installation: Hand warming if cold
- Instructions: Video showing proper technique
- Expectations: "2-3 minute experience"
- Consent: Clear biometric data explanation

---

## Cost Comparison

| System | Hardware | Development | Total | Success Rate |
|--------|----------|-------------|-------|--------------|
| **DIY PPG** | $70 | $2000-3000 | $2070-3070 | 70-85% |
| **Polar H10** | $180 | $1000-1500 | $1180-1680 | 95%+ |
| **Hybrid** | $250 | $1500-2000 | $1750-2250 | 95%+ |

---

## Scientific Accuracy Summary

### PPG Strengths:
- ✅ Excellent at rest (r = 0.94-0.99 with ECG)
- ✅ Time-domain HRV reliable (RMSSD, SDNN)
- ✅ Acceptable for biofeedback/art
- ✅ Non-invasive, familiar to users
- ✅ Low cost at scale

### PPG Weaknesses:
- ❌ Motion artifacts (primary failure mode)
- ❌ Individual variation (skin, temperature, circulation)
- ❌ Slower than ECG (2-3 min stabilization)
- ❌ Environmental sensitivity
- ❌ 70-85% success rate (not universal)

### PPG vs ECG Quick Comparison:

| Factor | PPG (Fingertip) | ECG (Chest) |
|--------|-----------------|-------------|
| Accuracy | 82-99% correlation | 99%+ (gold standard) |
| Success Rate | 70-85% | 95-98% |
| Motion Tolerance | Poor | Excellent |
| Comfort | High | Moderate |
| Cost | $5-15 | $90 |
| Setup Time | 2-3 min | 1 min |
| Mobility | None | High |
| Public Acceptance | High | Lower |

---

## Final Recommendation

### For Interpersonal Coherence Art Installation:

**Best Approach: HYBRID**
1. Use Polar H10 chest straps for HRV measurement (accuracy + reliability)
2. Use MAX30102 fingertip sensors for visual/tactile interaction (aesthetics)
3. Combine data streams for best of both worlds

**Why Hybrid Wins:**
- 95%+ success rate (from ECG accuracy)
- Engaging fingertip interaction point (visual pulse waveform)
- Professional-grade coherence measurement
- Participant sees/feels their pulse at fingertip
- Actual HRV from reliable chest measurement
- Only ~$70 more than pure ECG approach

**If Budget Constrained:**
- Pure PPG viable with 70-85% success rate
- MUST implement graceful failure handling
- MUST accept 15-30% won't get usable signals
- MUST design for stationary, seated, 5-10 min interaction

**If Accuracy Critical:**
- Pure ECG (Polar H10)
- Accept chest strap intimacy
- Provide private changing area
- 95%+ success rate guaranteed

---

## Next Steps

### Before Committing to PPG:

1. **Prototype Phase:**
   - Build 1 MAX30102 + ESP32 sensor (~$15)
   - Test with 5-10 diverse participants
   - Measure actual success rate in your environment
   - Assess time to stable signal

2. **Decision Criteria:**
   - If success rate >75% → PPG viable
   - If success rate <70% → Consider ECG or hybrid
   - If time to stable >3 min → Reconsider interaction design

3. **Pilot Testing:**
   - Test in actual gallery space (temperature, seating)
   - Try with cold-handed participants
   - Test with diverse skin tones
   - Validate graceful failure modes

4. **Procurement Decision:**
   - PPG: Order MAX30102 sensors + ESP32 boards
   - ECG: Order 2× Polar H10 ($180)
   - Hybrid: Order both ($250)

### Timeline:
- **Week 1-2:** Research complete ✅ (this document)
- **Week 3-4:** Prototype + initial testing
- **Week 5-6:** Build production units
- **Week 7-8:** Software development + integration
- **Week 9-10:** User testing + refinement
- **Week 11-12:** Deployment preparation

---

## Key Takeaway

**Fingertip PPG CAN measure HRV for art installations, but it's not a drop-in replacement for ECG.**

Success requires:
- Realistic expectations (70-85% success, not 100%)
- Careful interaction design (2-3 min calibration)
- Environmental control (warm, stable, seated)
- Graceful failure handling (alternatives for 15-30%)
- Sophisticated signal processing (filtering, quality assessment)

**For best results in public art: Use hybrid approach** (ECG for measurement + PPG for aesthetics).

---

**Full Technical Report:** See `/workspace/coherence/PPG_HRV_RESEARCH.md`
**Consumer Hardware Guide:** See `/workspace/coherence/BIOMETRIC_RESEARCH.md`
