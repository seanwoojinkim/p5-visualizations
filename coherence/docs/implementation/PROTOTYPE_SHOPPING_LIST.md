# Biometric Coherence Prototype - Complete Shopping List

**Last Updated:** 2025-10-26
**Configuration:** Two-person fingertip ECG system
**Approach:** Adafruit ESP32-S3 Feather + AD8232 ECG front-end

---

## 📦 Complete Bill of Materials (BOM)

### Option 1: Quick Start (SparkFun AD8232 Modules) - RECOMMENDED FOR PROTOTYPING

**Total Cost: ~$135-165** (two-person system, ready in 1-2 weeks)

#### Microcontrollers (2x required - one per person)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Adafruit ESP32-S3 Feather with Stacking Headers (#5477) | 2 | $12.50 | $25.00 | Adafruit | https://www.adafruit.com/product/5477 |
| USB-C Cable (if you don't have) | 2 | $3-5 | $6-10 | Amazon/Adafruit | Any USB-C data cable |

**Why this board:**
- 3.3V output (perfect for AD8232 2.0-3.5V range)
- Built-in WiFi + Bluetooth
- Battery support (JST connector)
- STEMMA QT connector for future expansion
- 12-bit ADC (more than sufficient for ECG)

#### ECG Sensor Modules (2x required - one per person)

**Option A: SparkFun AD8232 Single Lead Heart Rate Monitor** (Easiest)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| SparkFun AD8232 Single Lead Heart Rate Monitor | 2 | $19.95 | $39.90 | SparkFun | https://www.sparkfun.com/products/12650 |
| Sensor Cable - 3 conductor (included with SparkFun) | 2 | Included | $0 | - | - |

**Pros:**
- ✅ All passive components pre-soldered
- ✅ Clean layout, good documentation
- ✅ Includes electrode cable
- ✅ Proven design, community support
- ✅ No soldering required (header pins optional)

**Option B: Generic AD8232 Module from Amazon** (Cheaper, riskier)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Generic AD8232 ECG Module | 2 | $8-12 | $16-24 | Amazon | Search "AD8232 ECG module" |
| Electrode cable (may need separate) | 2 | $3-5 | $6-10 | Amazon | 3.5mm to snap connectors |

**Pros:**
- ✅ Much cheaper ($24 vs $40)
- ✅ Same AD8232 chip

**Cons:**
- ⚠️ Variable quality control
- ⚠️ Less documentation
- ⚠️ May have incorrect passive component values

**Recommendation:** Use SparkFun for first prototype. Once working, consider Amazon modules for cost reduction.

#### Electrodes (2 sets - one per person)

**Option A: Reusable Snap Electrodes** (For prototyping/testing)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Reusable ECG snap electrodes (pack of 10) | 1 pack | $12-18 | $12-18 | Amazon | Search "reusable ECG electrodes snap" |
| Electrode gel | 1 bottle | $8-12 | $8-12 | Amazon | "Electrode gel" or "ECG gel" |

**Pros:**
- ✅ Perfect for testing and development
- ✅ Reusable (100+ uses with care)
- ✅ High-quality signal
- ✅ Standard snap connectors

**Cons:**
- ⚠️ Requires gel (messy)
- ⚠️ Not practical for walk-up installation

**Option B: Disposable Adhesive Electrodes** (Alternative for testing)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Disposable ECG electrodes with snaps (50-pack) | 1 pack | $10-15 | $10-15 | Amazon | "Disposable ECG electrodes" |

**Pros:**
- ✅ Pre-gelled, ready to use
- ✅ Very clean signal
- ✅ Standard medical-grade

**Cons:**
- ⚠️ Single-use (expensive long-term)
- ⚠️ Not suitable for final installation

**For Final Table Installation:** You'll fabricate custom brass/copper electrodes (see Materials section below)

#### Breadboarding & Prototyping

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Half-size breadboard | 2 | $4-6 | $8-12 | Amazon/Adafruit | Standard 400-point breadboard |
| Jumper wire kit (M/M, M/F, F/F) | 1 kit | $8-12 | $8-12 | Amazon | Assorted lengths |
| USB power bank (for wireless testing) | 1-2 | $15-25 | $15-25 | Amazon | Any 5V USB battery pack |

#### Total for Option 1 (Quick Start):
- **Minimum:** $135 (SparkFun modules + disposable electrodes)
- **Recommended:** $155 (SparkFun + reusable electrodes + gel + power bank)
- **Timeline:** 1-2 weeks (shipping time)

---

### Option 2: DIY AD8232 Build (Custom PCB/Breadboard)

**Total Cost: ~$90-110** (cheaper but requires soldering and electronics work)

**⚠️ Only recommended if:**
- You're comfortable with electronics and have soldering equipment
- You want maximum customization
- Budget is very tight

#### Core Components (per person)

| Item | Qty | Unit Price | Total | Vendor | Link |
|------|-----|-----------|-------|--------|------|
| Adafruit ESP32-S3 Feather | 2 | $12.50 | $25.00 | Adafruit | #5477 |
| AD8232 IC (LFCSP-20 package) | 2 | $5-8 | $10-16 | Digi-Key/Mouser | Analog Devices AD8232 |
| LFCSP-20 to DIP breakout PCB | 2 | $3-5 | $6-10 | Amazon | 20-pin QFN adapter |

#### Passive Components (per person, buy in bulk)

| Component | Value | Qty per Person | Recommended Pack | Cost |
|-----------|-------|---------------|-----------------|------|
| Resistor | 10 MΩ (1%) | 2 | 25-pack | $3-5 |
| Resistor | 180 kΩ (1%) | 2 | 25-pack | $3-5 |
| Resistor | 100 kΩ (1%) | 2 | 25-pack | $3-5 |
| Resistor | 22 kΩ (1%) | 1 | 25-pack | $3-5 |
| Capacitor (ceramic) | 0.1 µF (50V) | 2 | 25-pack | $3-5 |
| Capacitor (ceramic) | 1 nF (50V) | 1 | 25-pack | $3-5 |
| Capacitor (ceramic) | 0.22 µF (50V) | 1 | 25-pack | $3-5 |
| Capacitor (film) | 0.33 µF (50V) | 1 | 10-pack | $5-8 |

**Or buy a resistor/capacitor kit:** $15-25 (covers all values)

#### Additional DIY Materials

| Item | Qty | Unit Price | Total | Vendor |
|------|-----|-----------|-------|--------|
| Soldering iron + solder | 1 | $25-50 | $25-50 | Amazon |
| Multimeter | 1 | $15-25 | $15-25 | Amazon |
| Helping hands/PCB holder | 1 | $10-15 | $10-15 | Amazon |

**Total for Option 2 (DIY):**
- **Parts only:** $90-110 (assumes you have tools)
- **With tools:** $155-200
- **Timeline:** 2-3 weeks (learning curve + debugging)

**Recommendation:** Unless you're an experienced electronics hobbyist, **start with Option 1 (SparkFun modules)**. You can always build custom modules later once you've proven the concept.

---

## 🔨 Electrode Materials (For Final Table Installation)

**Note:** Use reusable/disposable electrodes for prototyping. Build custom electrodes only after validating the system works.

### Brass/Copper Electrode Fabrication

| Item | Qty | Unit Price | Total | Vendor | Notes |
|------|-----|-----------|-------|--------|-------|
| Brass sheet (24 gauge, 6"×6") | 2 sheets | $8-12 | $16-24 | Hardware store | Enough for 4 hand-shaped electrodes |
| Conductive copper tape (1" wide) | 1 roll | $10-15 | $10-15 | Amazon | For wiring from electrode to module |
| Ring terminals (6-10 AWG) | 10-pack | $5-8 | $5-8 | Hardware store | Crimp onto copper tape, screw to brass |
| Wire (stranded, 22 AWG) | 10 ft | $5-10 | $5-10 | Electronics/hardware | Connect ring terminals to sensor |
| 3.5mm snap connectors (for cable) | 4-6 | $2-3 each | $8-18 | Amazon | "ECG snap button" |
| Sandpaper (220 grit) | 1 sheet | $2-3 | $2-3 | Hardware store | Polish electrode surface |
| Metal polish/cleaner | 1 bottle | $5-8 | $5-8 | Hardware store | Keep electrodes clean |
| Clear coat sealant | 1 can | $8-12 | $8-12 | Hardware store | Prevent oxidation (optional) |

**Tools needed:**
- Metal shears or heavy scissors (cut brass sheet)
- Drill + small drill bit (for mounting holes)
- Screwdriver
- Crimp tool (for ring terminals)

**Total Electrode Materials:** $60-100

**Alternative:** Stainless steel sheet (more durable, harder to work with)

---

## 🖥️ Software Development Setup

**All free:**

| Item | Cost | Link | Purpose |
|------|------|------|---------|
| Arduino IDE | Free | https://www.arduino.cc/en/software | Program ESP32 |
| ESP32 board definitions | Free | Via Arduino Boards Manager | ESP32-S3 support |
| USB-C cable (data) | $3-5 | Any electronics vendor | Upload code to Feather |
| VS Code (optional) | Free | https://code.visualstudio.com/ | Better code editor + PlatformIO |
| PlatformIO (optional) | Free | https://platformio.org/ | Advanced ESP32 development |

**Libraries needed (all free via Arduino Library Manager):**
- `ESP32` core
- `WiFi` (built-in)
- `WebServer` (built-in)
- `ArduinoJson` (for data formatting)

---

## 📊 Cost Summary

### Minimum Viable Prototype (Proof of Concept)
**Goal:** Validate ECG signal quality from fingertips

| Component | Cost |
|-----------|------|
| 2× ESP32-S3 Feather | $25 |
| 2× SparkFun AD8232 modules | $40 |
| 1× Disposable electrode pack | $10-15 |
| Breadboards + jumper wires | $15-20 |
| USB cables | $6-10 |
| **TOTAL** | **$96-110** |

**Timeline:** 1-2 weeks
**What you can test:** ECG signal quality, R-peak detection, HRV calculation

---

### Recommended Development Kit
**Goal:** Full prototype with wireless streaming and multiple test sessions

| Component | Cost |
|-----------|------|
| 2× ESP32-S3 Feather | $25 |
| 2× SparkFun AD8232 modules | $40 |
| Reusable electrodes + gel | $20-30 |
| Breadboards + wires | $15-20 |
| USB power banks | $20-40 |
| USB cables | $6-10 |
| **TOTAL** | **$126-165** |

**Timeline:** 1-2 weeks
**What you can test:** Everything above + wireless data streaming, multi-session testing, coherence algorithm tuning

---

### Full Table Installation (Future)
**Goal:** Production-ready public installation

| Component | Cost |
|-----------|------|
| Electronics (above) | $150 |
| Custom brass electrodes | $60-100 |
| Table materials (wood, etc.) | $200-400 |
| Display (monitor/projector) | $150-500 |
| **TOTAL** | **$560-1,150** |

**Timeline:** 2-4 months
**What you can do:** Public installation, walk-up use, gallery exhibition

---

## 🛒 Recommended Vendors

### Electronics Components
1. **Adafruit** (https://www.adafruit.com)
   - ESP32-S3 Feather
   - Breadboards, cables, accessories
   - Excellent documentation and support
   - Flat-rate shipping ($9.99 USA)

2. **SparkFun** (https://www.sparkfun.com)
   - AD8232 ECG modules
   - Great tutorials and community
   - Flat-rate shipping ($8.95 USA)

3. **Amazon**
   - Generic AD8232 modules (cheaper, variable quality)
   - Electrodes (reusable and disposable)
   - Jumper wires, breadboards
   - USB cables and power banks
   - Fast shipping with Prime

4. **Digi-Key / Mouser** (for DIY build)
   - AD8232 ICs
   - Precision resistors/capacitors
   - Professional-grade components
   - Higher minimum orders

### Hardware Materials
1. **Local Hardware Store** (Ace, Home Depot, Lowe's)
   - Brass/copper sheet metal
   - Wire, connectors, ring terminals
   - Sandpaper, metal polish
   - Tools

2. **McMaster-Carr** (https://www.mcmaster.com)
   - Precision brass sheet
   - Stainless steel sheet
   - Industrial-grade materials
   - Fast shipping, excellent specs

3. **Amazon**
   - Copper tape
   - ECG snap connectors
   - Small hardware items

---

## 📝 Recommended Purchase Order

### Phase 1: Validate Concept (Week 1)
**Goal:** Prove you can get clean ECG signal from fingertips

**Buy now:**
1. 2× Adafruit ESP32-S3 Feather (#5477) - $25
2. 2× SparkFun AD8232 modules - $40
3. 1× Disposable electrode pack (50ct) - $10-15
4. 1× Breadboard kit with jumper wires - $15
5. 2× USB-C cables (if needed) - $6-10

**Total: ~$96-105**

**Order from:**
- Adafruit: Feather boards
- SparkFun: AD8232 modules
- Amazon: Electrodes, breadboards, cables

---

### Phase 2: Development & Testing (Week 2-3)
**Goal:** Get wireless streaming working, test HRV algorithms

**Buy after Phase 1 success:**
1. Reusable ECG electrodes + gel - $20-30
2. 2× USB power banks - $20-40
3. Longer/better jumper wires - $10-15

**Total: ~$50-85**

**What you'll have:**
- Fully wireless two-person ECG system
- Ability to move around and test different positions
- Reusable electrodes for extended testing sessions

---

### Phase 3: Custom Electrodes (Week 4-6)
**Goal:** Build table-integrated electrodes

**Buy after Phase 2 success:**
1. Brass sheet metal - $16-24
2. Copper tape + connectors - $20-40
3. Hardware (screws, ring terminals, wire) - $15-25
4. Polish/sealant - $15-20

**Total: ~$66-109**

---

## 🎯 My Specific Recommendation for You

**Start with this exact order:**

### Order 1: Adafruit
- [ ] 2× ESP32-S3 Feather with Stacking Headers (#5477) - $25.00
- [ ] 1× Half-size breadboard (if needed) - $4.95
- [ ] Shipping: $9.99
- **Subtotal: ~$40**

### Order 2: SparkFun
- [ ] 2× AD8232 Single Lead Heart Rate Monitor (SEN-12650) - $39.90
- [ ] Shipping: $8.95
- **Subtotal: ~$49**

### Order 3: Amazon (Prime shipping)
- [ ] 1× Disposable ECG electrodes 50-pack - $12
- [ ] 1× Jumper wire kit (M/M, M/F, F/F) - $10
- [ ] 2× USB-C cables (3ft) - $8
- [ ] 1× Multimeter (if you don't have) - $18
- **Subtotal: ~$48**

**Grand Total: ~$137**

**What you'll be able to do:**
1. ✅ Read ECG signals from both people simultaneously
2. ✅ Detect R-peaks and calculate heart rate
3. ✅ Calculate HRV metrics (RMSSD, SDNN)
4. ✅ Stream data wirelessly to your laptop
5. ✅ Integrate with p5.js visualization
6. ✅ Test coherence algorithms with real data

**What you WON'T need yet:**
- ❌ Custom brass electrodes (use disposable for now)
- ❌ Table construction (test on desk)
- ❌ Production-grade anything

---

## ⚡ Quick Start Checklist

Once parts arrive:

**Day 1: Setup**
- [ ] Install Arduino IDE
- [ ] Install ESP32 board definitions
- [ ] Test USB connection to Feather
- [ ] Upload "Blink" test sketch

**Day 2: First ECG Signal**
- [ ] Connect AD8232 to Feather via breadboard
  - `AD8232 OUTPUT` → `Feather A0 (analog input)`
  - `AD8232 3.3V` → `Feather 3.3V`
  - `AD8232 GND` → `Feather GND`
  - `AD8232 LO+` → `Feather GPIO 5`
  - `AD8232 LO-` → `Feather GPIO 6`
- [ ] Attach electrodes to yourself (RA = right hand, LA = left hand)
- [ ] Run simple analog read sketch
- [ ] View ECG waveform in Arduino Serial Plotter

**Day 3-5: R-Peak Detection**
- [ ] Implement Pan-Tompkins algorithm (see research docs)
- [ ] Tune threshold values
- [ ] Calculate inter-beat intervals (IBI)
- [ ] Calculate heart rate

**Day 6-7: Wireless Streaming**
- [ ] Create WebSocket server on ESP32
- [ ] Stream IBI data to laptop
- [ ] Test with p5.js sketch receiving data

**Week 2: Two-Person System**
- [ ] Set up second ESP32 + AD8232
- [ ] Synchronize data streams
- [ ] Calculate cross-correlation
- [ ] Map to coherence parameter (-1.0 to +1.0)
- [ ] Connect to your existing visualization!

---

## 📚 Reference Documentation

All the technical details you need are already in your research docs:

1. **Hardware Setup:** `/workspace/coherence/docs/research/FINGERTIP_ECG_RESEARCH_REPORT.md`
   - Section 4: DIY Implementation Guide
   - Section 5: Circuit design
   - Section 6: Electrode fabrication

2. **Signal Processing:** `/workspace/coherence/docs/research/ECG_R_PEAK_DETECTION_RESEARCH_REPORT.md`
   - Pan-Tompkins algorithm
   - ESP32 implementation
   - Code examples

3. **HRV Calculation:** `/workspace/coherence/docs/research/HRV_COHERENCE_ALGORITHM_RESEARCH.md`
   - HeartMath coherence algorithm
   - RMSSD calculation
   - Real-time FFT

4. **Coherence Metrics:** `/workspace/coherence/docs/research/COMBINED_COHERENCE_SYNCHRONY_METRICS.md`
   - Quality-weighted formula
   - Cross-correlation
   - Mapping to -1.0 to +1.0

5. **Quick Reference:** `/workspace/coherence/docs/research/COHERENCE_IMPLEMENTATION_QUICKSTART.md`
   - Copy-paste ready code
   - Complete implementation pipeline

---

## 💡 Tips for Success

**Start Simple:**
- Test with one person first (just heart rate)
- Add complexity incrementally
- Use serial monitor extensively for debugging

**Signal Quality:**
- Clean hands before testing (no oils/lotions)
- Firm electrode contact
- Keep wires away from power supplies (60 Hz noise)
- Ground yourself to reduce static

**Common Issues:**
- **No signal:** Check electrode contact, verify connections
- **Noisy signal:** Add 60 Hz notch filter, improve grounding
- **Inconsistent R-peaks:** Tune threshold, check sampling rate
- **WiFi interference:** Move ESP32 away from router, use shielded cables

**Money-Saving Tips:**
- Start with disposable electrodes ($12 for 50)
- Use Amazon for commodity items (cables, wires)
- Buy brass sheet locally (hardware store cheaper than online)
- Share parts with a friend (buy in bulk)

---

## 🎉 You're Ready!

With the recommended $137 order, you'll have everything needed to:

1. ✅ Validate fingertip ECG approach
2. ✅ Build functional two-person prototype
3. ✅ Integrate with your existing visualization
4. ✅ Test all coherence algorithms
5. ✅ Demo to friends/gallery curators

**The expensive parts come later:**
- Custom table construction ($200-400)
- Display hardware ($150-500)
- Professional fabrication (optional)

But first, prove the concept works. Then build it beautifully.

---

**Questions? Check the research docs or ask!**

**Ready to order? Start with:**
1. Adafruit ESP32-S3 Feather (×2)
2. SparkFun AD8232 (×2)
3. Amazon electrode pack
