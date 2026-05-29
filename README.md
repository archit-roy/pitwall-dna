# PitWall DNA

**F1 telemetry analysis for people who think lap times don't tell the whole story.**

I built this because I was tired of watching F1 and only getting opinions. "Verstappen brakes late." "Hamilton is smooth." Cool — but *how* late? *How* smooth? By how much, at which corner, compared to who?

PitWall DNA pulls real telemetry from actual F1 sessions and turns it into a visual fingerprint for every driver. Not simulated data. Not estimates. The same sensor readings that appear on the pit wall screens — throttle position, brake pressure, speed, gear, lateral G — sampled 240 times per second, processed, and rendered into something you can actually read.

---

## What it does

Pick any F1 session from 2018 onwards. Pick any drivers. Hit analyse. You get:

### Telemetry Signature
A multi-channel waveform of the driver's entire lap — throttle, brake, speed, gear and lateral G plotted across every metre of the track. Like an EKG, but for a racing driver. No two drivers look the same.

### Style Radar
Eight driving style dimensions scored from the telemetry and rendered as a radar chart. Overlay two drivers and you can see exactly where their styles diverge — who brakes harder, who carries more corner speed, who gets on the throttle earlier on exit.

### Corner Breakdown
Every corner on the track, with each driver's minimum speed, peak brake pressure and throttle exit side by side. The corner where one driver consistently beats another is right there in the table.

### Style Scatter
All 20 drivers in a session mapped into 2D style space using PCA. Drivers who are close together drive similarly. Drivers far apart are genuinely different. Hover over any dot and see their full style profile.

---

## How the analysis actually works

### The problem with raw telemetry
A lap at Monaco produces different data than a lap at Spa — different length, different number of samples, different speed ranges. You can't just compare the raw numbers.

The fix: every lap gets resampled onto a fixed 500-point distance grid. Every lap, every track, every driver — same resolution. Then the 3 fastest clean laps per driver get averaged together to smooth out single-lap anomalies. What's left is the driver's *habit*, not a fluke.

### The 8 style dimensions

| Dimension | What it actually measures |
|---|---|
| **Late braker** | Mean brake pressure specifically inside corners (high lateral G zones) |
| **Throttle smoothness** | How consistent the rate of throttle change is — jerky vs progressive |
| **Corner speed** | Mean speed through apex zones relative to the session maximum |
| **Brake pressure** | Average of the top 10% hardest brake inputs |
| **High gear style** | Mean gear across the lap normalised to 8 — reflects downforce vs power preference |
| **DRS aggression** | Fraction of lap distance where DRS is open |
| **Trail braking** | How much brake overlap there is while the car is still turning |
| **Exit power** | Mean throttle in the 30 samples after each corner apex |

### Corner detection
Corners are found as speed minima in the averaged lap trace. The algorithm finds the valleys, puts a window around each one, and those windows define the corner zones used across all metrics and the corner breakdown table.

### The scatter plot
Takes all 20 drivers' 8 style scores, applies PCA (Principal Component Analysis) to compress 8 dimensions into 2, and plots the result. The axes don't have clean labels because they're abstract combinations of all 8 dimensions — but the distances between drivers are mathematically meaningful.

---

## Stack

**Backend** — Python, FastAPI, FastF1, Pandas, NumPy, SciPy

**Frontend** — React, TypeScript, Vite, Tailwind CSS, D3.js, Zustand

---

## Running it locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Runs at `http://localhost:8000` — interactive API docs at `/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`

> First load of any session takes 1–3 minutes while FastF1 downloads the data. After that it's cached locally and instant.

---

## Things worth trying

- **Verstappen vs Leclerc at Monaco Qualifying** — two completely different approaches to the same 78 corners
- **Hamilton vs Russell at the same race** — same car, different drivers, see how much style shows through
- **Load the full session scatter** — find out which drivers are genuinely similar and which ones are outliers
- **Compare the same driver across seasons** — does their style change as the car changes?

---

## Project structure

```
pitwall-dna/
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI app entry point
│   │   ├── core/config.py          ← Settings and thresholds
│   │   ├── services/
│   │   │   ├── session_loader.py   ← FastF1 wrapper
│   │   │   └── dna_analyzer.py     ← All the analysis logic
│   │   └── api/routes/
│   │       ├── sessions.py
│   │       └── dna.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api.ts                  ← Backend calls + TypeScript types
        ├── App.tsx                 ← Main layout
        ├── stores/store.ts         ← Global state (Zustand)
        └── components/
            ├── SessionPicker.tsx
            ├── dna/SignatureChart.tsx
            ├── radar/RadarChart.tsx
            ├── corner/CornerChart.tsx
            └── compare/ScatterPlot.tsx
```

---

*Data via [FastF1](https://github.com/theOehrly/Fast-F1). Inspired by [f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay).*