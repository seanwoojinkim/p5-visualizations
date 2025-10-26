# Sensor System Decision Matrix
## For Interpersonal Coherence Art Installation

**Purpose:** Help choose between PPG, ECG, or Hybrid sensor systems based on project priorities.

---

## Quick Decision Tool

### Answer These Questions:

**1. What's your budget per participant?**
- **<$50:** → Pure PPG (DIY)
- **$50-150:** → Pure ECG or Commercial PPG
- **$150+:** → Hybrid or Professional

**2. What's your minimum acceptable success rate?**
- **60-70%:** → PPG acceptable
- **70-85%:** → PPG with extensive testing
- **85-95%:** → ECG or Hybrid
- **95%+:** → ECG only

**3. Can participants wear chest straps?**
- **Yes, private space available:** → ECG viable
- **Maybe, but awkward:** → Hybrid best
- **No, too intimate for public:** → PPG only option

**4. How long will participants interact?**
- **<2 minutes:** → PPG NOT suitable (use ECG)
- **2-5 minutes:** → PPG marginal (need engaging calibration)
- **5-10 minutes:** → PPG ideal window
- **10+ minutes:** → Either works (PPG may drift)

**5. Can participants sit still?**
- **Yes, seated installation:** → PPG viable
- **Maybe, standing but stable:** → PPG marginal
- **No, mobile/walking:** → PPG NOT suitable, use ECG

**6. What's your development timeline?**
- **<4 weeks:** → ECG (faster, proven)
- **4-8 weeks:** → PPG (needs development)
- **8+ weeks:** → Hybrid (most complex)

**7. Is intimate chest contact acceptable?**
- **Yes:** → ECG is best option
- **No:** → PPG only option
- **Neutral:** → Consider hybrid

---

## Detailed Comparison Matrix

### Technical Performance

| Criterion | PPG (DIY) | PPG (Commercial) | ECG (Polar H10) | Hybrid |
|-----------|-----------|------------------|-----------------|--------|
| **IBI Accuracy (MAE)** | 10-15 ms | 5-10 ms | <2 ms | <2 ms |
| **HRV Correlation** | 0.85-0.95 | 0.90-0.99 | 0.99+ | 0.99+ |
| **Success Rate (Optimal)** | 75-85% | 80-90% | 95-98% | 95-98% |
| **Success Rate (Real)** | 65-80% | 70-85% | 90-95% | 90-95% |
| **Motion Tolerance** | Poor | Poor | Excellent | Excellent |
| **Time to Stable** | 2-3 min | 2-3 min | 1 min | 2-3 min |
| **Sampling Rate** | 100 Hz | 125-500 Hz | 1000 Hz | 1000 Hz (ECG) |
| **Signal Quality** | Variable | Good | Excellent | Excellent |

### Cost Analysis (2-Person System)

| Item | PPG (DIY) | PPG (Commercial) | ECG | Hybrid |
|------|-----------|------------------|-----|--------|
| **Hardware** | $70 | $500 | $180 | $250 |
| **Development** | $2000-3000 | $1000-1500 | $1000-1500 | $1500-2000 |
| **Testing** | $100 | $50 | $50 | $100 |
| **Total** | $2170-3170 | $1550-2050 | $1230-1730 | $1850-2350 |
| **Per Participant** | $1085-1585 | $775-1025 | $615-865 | $925-1175 |

### User Experience

| Factor | PPG (DIY) | PPG (Commercial) | ECG | Hybrid |
|--------|-----------|------------------|-----|--------|
| **Comfort** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Setup Ease** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Intimacy** | Low | Low | High | Medium |
| **Visual Interest** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mobility** | None | None | High | Medium |
| **Public Acceptance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### Development Requirements

| Aspect | PPG (DIY) | PPG (Commercial) | ECG | Hybrid |
|--------|-----------|------------------|-----|--------|
| **Hardware Assembly** | High | None | None | Medium |
| **Programming** | High | Medium | Low | Medium |
| **Signal Processing** | High | Medium | Low | Medium |
| **Testing Iterations** | 3-5 | 2-3 | 1-2 | 2-4 |
| **Documentation** | Create | Exists | Extensive | Mixed |
| **Timeline** | 8-12 weeks | 6-8 weeks | 4-6 weeks | 8-10 weeks |

### Reliability and Maintenance

| Factor | PPG (DIY) | PPG (Commercial) | ECG | Hybrid |
|--------|-----------|------------------|-----|--------|
| **Failure Rate** | 20-35% | 15-30% | 5-10% | 5-10% |
| **Robustness** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Battery Life** | N/A (USB) | 8-12 hrs | 400 hrs | Mixed |
| **Support** | DIY | Good | Excellent | Mixed |
| **Replacement** | Easy/$15 | Medium/$250 | Easy/$90 | Medium |

---

## Scenario-Based Recommendations

### Scenario 1: Gallery Exhibition (Controlled Environment)

**Context:**
- Indoor gallery, temperature controlled (20-22°C)
- Seated installation with comfortable chairs
- 5-10 minute participant sessions
- Budget: $2000 total
- Timeline: 8 weeks

**Recommendation: PPG (DIY) or Hybrid**

**Why:**
- Controlled environment maximizes PPG success rate
- Seated, stable interaction ideal for fingertip sensors
- Budget allows for quality implementation
- Timeline sufficient for development
- Gallery aesthetics favor visible fingertip sensor

**Risk Mitigation:**
- Prototype extensively before deployment
- Have backup plan if success rate <75%
- Consider hybrid if intimate contact acceptable

---

### Scenario 2: Museum Permanent Installation

**Context:**
- Long-term deployment (months to years)
- High daily throughput (50-100 participants/day)
- Diverse participant demographics
- Budget: $5000+
- Reliability paramount

**Recommendation: ECG (Polar H10) or Hybrid**

**Why:**
- Reliability essential for permanent installation
- Cannot afford 20-30% failure rate with high throughput
- Maintenance/support critical (Polar ecosystem mature)
- Diverse demographics favor ECG robustness
- Budget allows professional solution

**Implementation:**
- Private changing area for chest strap placement
- Attendant to assist with proper fit
- Backup units for battery replacement
- Professional-grade accuracy expected by museum visitors

---

### Scenario 3: Festival/Outdoor Event

**Context:**
- Temporary installation (1-3 days)
- Outdoor or semi-outdoor environment
- Variable temperatures (potentially cold)
- Quick interactions (<5 minutes)
- Budget: $500-1000

**Recommendation: ECG (Polar H10)**

**Why:**
- Outdoor = cold hands = PPG failure
- Variable environment challenges PPG reliability
- Quick interactions = less time for PPG calibration
- Temporary deployment = reliability over development
- ECG faster setup per participant

**Alternative:**
- If chest strap too intimate for festival setting, reconsider interaction design
- Consider alternative biometrics (respiration, GSR) that work outdoors

---

### Scenario 4: Research Study + Art

**Context:**
- Both artistic and research goals
- Need publishable data
- Budget: $3000-5000
- IRB approval required
- Timeline: 12+ weeks

**Recommendation: Hybrid (ECG + PPG)**

**Why:**
- Research requires ECG gold standard
- Art benefits from visual fingertip interaction
- Budget supports both systems
- Timeline allows complex development
- Can compare PPG vs ECG in publication
- IRB more likely to approve ECG accuracy

**Data Collection:**
- Simultaneous ECG + PPG recording
- Validate PPG accuracy against ECG
- Publication: "Art Installation Using Validated PPG HRV Measurement"

---

### Scenario 5: Budget Workshop/Prototype

**Context:**
- Educational workshop or maker faire
- Tight budget (<$500)
- DIY aesthetic appropriate
- Participants expect experimentation
- Failure is learning opportunity

**Recommendation: PPG (DIY)**

**Why:**
- Budget constraints eliminate ECG option
- Educational value in building/understanding PPG
- Participants tolerant of variability
- DIY aesthetic fits workshop context
- Can build multiple units for many participants

**Approach:**
- Transparent about limitations
- "Sometimes works, sometimes doesn't - that's biometric sensing!"
- Focus on signal processing education
- Participants see raw waveforms, understand challenges

---

### Scenario 6: Intimate/Therapeutic Setting

**Context:**
- Couples therapy, relationship workshops
- Private, safe space
- Deep engagement (20+ minutes)
- Small group (2-4 people)
- Budget: moderate ($1000-2000)

**Recommendation: ECG (Polar H10)**

**Why:**
- Intimate setting makes chest strap acceptable
- Long duration allows full HRV analysis
- Small group = fewer units needed
- Therapeutic context requires accuracy
- Participants committed to process

**Benefits:**
- Can measure during movement (conversation, embracing)
- 20+ minute sessions enable deep HRV analysis
- Therapist can trust data for clinical insights

---

## Weighted Decision Calculator

### Assign Priorities (1-5 scale):

| Priority | Weight (1-5) | PPG Score | ECG Score | Hybrid Score |
|----------|--------------|-----------|-----------|--------------|
| **Accuracy** | ___ | 3 | 5 | 5 |
| **Success Rate** | ___ | 3 | 5 | 5 |
| **Budget** | ___ | 5 | 3 | 2 |
| **Comfort/Non-Intimate** | ___ | 5 | 2 | 4 |
| **Visual Engagement** | ___ | 5 | 2 | 5 |
| **Development Speed** | ___ | 2 | 5 | 3 |
| **Reliability** | ___ | 3 | 5 | 5 |
| **Mobility** | ___ | 1 | 5 | 3 |

**How to Use:**
1. Assign weight (1-5) for each priority based on your project
2. Multiply each score by your weight
3. Sum weighted scores for each system
4. Highest score = recommended system

**Example (Gallery Exhibition):**
- Accuracy (3): PPG=9, ECG=15, Hybrid=15
- Success Rate (4): PPG=12, ECG=20, Hybrid=20
- Budget (5): PPG=25, ECG=15, Hybrid=10
- Comfort (4): PPG=20, ECG=8, Hybrid=16
- Visual (5): PPG=25, ECG=10, Hybrid=25
- Speed (2): PPG=4, ECG=10, Hybrid=6
- Reliability (3): PPG=9, ECG=15, Hybrid=15
- Mobility (1): PPG=1, ECG=5, Hybrid=3

**Totals:** PPG=105, ECG=98, Hybrid=110 → **Hybrid wins**

---

## Risk Assessment

### PPG (DIY) Risks

**High Risk:**
- ⚠️ Success rate may be <70% in real deployment
- ⚠️ Development time may exceed 8 weeks
- ⚠️ Signal quality highly variable

**Medium Risk:**
- ⚠️ Skin tone bias not fully mitigated
- ⚠️ Cold environment reduces success
- ⚠️ Participant frustration if signal fails

**Low Risk:**
- ⚠️ Hardware failure (cheap to replace)
- ⚠️ Aesthetic integration

**Mitigation:**
- Extensive pilot testing before deployment
- Graceful failure modes designed from start
- Backup plan to switch to ECG if needed

---

### ECG (Polar H10) Risks

**High Risk:**
- ⚠️ Intimate contact may deter participants
- ⚠️ Requires private changing area (space/logistics)

**Medium Risk:**
- ⚠️ Participant discomfort with chest strap
- ⚠️ Higher per-unit cost limits scaling

**Low Risk:**
- ⚠️ Technical reliability (Polar well-proven)
- ⚠️ Battery replacement logistics
- ⚠️ Visual interest (strap hidden under clothing)

**Mitigation:**
- Clear communication about chest strap beforehand
- Attendant to assist with fitting
- Option to participate without sensor (observation mode)

---

### Hybrid Risks

**High Risk:**
- ⚠️ Most complex system (both PPG + ECG)
- ⚠️ Development time longest (8-10 weeks)

**Medium Risk:**
- ⚠️ Highest cost ($250/pair)
- ⚠️ Two systems = two failure modes

**Low Risk:**
- ⚠️ Accuracy (backed by ECG)
- ⚠️ Engagement (backed by PPG)

**Mitigation:**
- Phased development: Start with ECG, add PPG visuals later
- Use PPG for aesthetics only (ECG for all measurements)
- Extensive integration testing

---

## Final Decision Framework

### Ask Yourself:

**1. What's the ONE thing that CANNOT fail?**
- **Accuracy:** → ECG or Hybrid
- **Budget:** → PPG
- **Comfort:** → PPG or Hybrid
- **Reliability:** → ECG or Hybrid
- **Visual Aesthetics:** → PPG or Hybrid

**2. What's your tolerance for participant failure?**
- **Very low (<10%):** → ECG
- **Low (10-20%):** → Hybrid
- **Moderate (20-30%):** → PPG (DIY or Commercial)

**3. What's your development capacity?**
- **Low (want turnkey):** → ECG (Polar H10)
- **Medium (some custom work):** → Commercial PPG or Hybrid
- **High (full DIY):** → PPG (DIY)

**4. What's the participant journey?**
- **Quick try (<2 min):** → ECG only
- **Moderate (2-5 min):** → Any (PPG needs engaging calibration)
- **Long (5+ min):** → Any works well

---

## Summary Recommendations by Priority

### If ACCURACY is paramount:
1. **ECG (Polar H10)** - Gold standard
2. Hybrid - ECG backup with PPG aesthetics
3. Commercial PPG (HeartMath) - Validated
4. DIY PPG - Last resort

### If BUDGET is paramount:
1. **DIY PPG** - $70 hardware
2. ECG (Polar H10) - $180 hardware
3. Commercial PPG - $500 hardware
4. Hybrid - $250+ hardware

### If COMFORT/NON-INTIMATE is paramount:
1. **PPG (any)** - Fingertip only
2. Hybrid - Fingertip interaction, chest measurement
3. ECG - Requires chest strap

### If RELIABILITY is paramount:
1. **ECG (Polar H10)** - 95%+ success
2. Hybrid - 90-95% success
3. Commercial PPG - 80-90% success
4. DIY PPG - 70-85% success

### If VISUAL ENGAGEMENT is paramount:
1. **Hybrid** - Fingertip visual + ECG accuracy
2. PPG (any) - Direct fingertip sensor visibility
3. ECG - Hidden under clothing

### If DEVELOPMENT SPEED is paramount:
1. **ECG (Polar H10)** - 4-6 weeks
2. Commercial PPG - 6-8 weeks
3. Hybrid - 8-10 weeks
4. DIY PPG - 8-12 weeks

---

## The Bottom Line

### For Public Art Installations:

**Most Installations Should Choose: HYBRID**

**Why:**
- Balances accuracy (ECG) with engagement (PPG)
- 90-95% success rate acceptable for public
- Fingertip sensor provides visual/tactile focus
- ECG ensures reliable coherence measurement
- Only $70 more than pure ECG approach
- Best overall value proposition

**When to Choose Pure PPG:**
- Budget absolutely constrained (<$100)
- Chest strap completely unacceptable
- Willing to accept 70-85% success rate
- Have development capacity (40-60 hours)
- Failure is gracefully handled

**When to Choose Pure ECG:**
- Accuracy/reliability paramount (>90% success required)
- Budget allows ($180+)
- Intimate contact acceptable
- Fast deployment needed (4-6 weeks)
- Mobility desired

---

**Next Step:** Read full technical details in `/workspace/coherence/PPG_HRV_RESEARCH.md`
