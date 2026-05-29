# PitWall DNA — F1 Driver Style Analyser

> Every F1 driver leaves a fingerprint in their telemetry. PitWall DNA extracts it.

PitWall DNA is a full-stack data analysis tool that pulls real Formula 1 telemetry data and turns it into a visual "driving fingerprint" for each driver. It answers the question every fan has: **how is Verstappen's driving actually different from Hamilton's?** Not opinions — numbers, computed directly from the raw data.

---

## What you built

You built three things working together:

### 1. A data pipeline (Python + FastF1)
FastF1 is an open-source library that downloads official F1 session data — the same telemetry that appears on TV broadcasts. For every driver in any session since 2018, it gives you:
- **Speed** sampled ~240 times per second
- **Throttle position** (0–100%)
- **Brake pressure** (0–100%)
- **Gear** (1–8)
- **RPM**
- **DRS** (drag reduction system, open/closed)
- **GPS position** on track

Your pipeline takes this raw data and processes it into something meaningful.

### 2. A REST API (FastAPI)
A web server that exposes your analysis as HTTP endpoints. The frontend calls these endpoints and gets back JSON. FastAPI also auto-generates interactive documentation at `/docs` so you can test every endpoint in the browser.

### 3. A visual frontend (React + TypeScript + D3)
Four visualisations that turn the numbers into something you can actually understand.

---

## How the analysis works

This is the core of the project. Here is exactly what happens when you click "Analyse DNA":

### Step 1 — Load clean laps
Not all laps are useful. The first lap of a race has cold tyres. Laps behind a safety car are slow. In-laps before a pit stop are compromised. Your code filters all of these out using FastF1's `pick_quicklaps()` — it keeps only laps within 107% of the driver's best time.

### Step 2 — Take the N fastest clean laps
A single lap could be a fluke — a moment of wheelspin, a slight lock-up, a twitch under braking. To get the driver's *true* pattern, you take their 3 fastest clean laps (configurable in `config.py`).

### Step 3 — Interpolate onto a fixed grid
This solves a fundamental problem. Monaco is 3.3km per lap, Spa is 7km. A fast lap at Monaco might have 900 telemetry samples, a slow lap at Spa might have 2000. You cannot compare them directly.

The solution: resample every lap onto exactly 500 evenly-spaced **distance** points (not time points — distance, so position on track stays consistent). Think of it like resizing images to the same resolution before comparing them. This is done in `interpolate_to_grid()`.

### Step 4 — Average across laps
Once all 3 laps are on the same 500-point grid, you stack them like layers and take the mean at every point. The result is one smooth signal per channel that represents the driver's *habit*, not any single lap's quirks.

### Step 5 — Compute style dimensions
This is where personality emerges. Eight metrics are computed from the averaged signal:

| Dimension | What it measures | How it's computed |
|---|---|---|
| **Late braker** | How hard they brake inside corners | Mean brake value during high lateral-G zones |
| **Throttle smoothness** | How gradually they apply throttle | 1 minus the normalised standard deviation of throttle gradient |
| **Corner speed** | How much speed they carry through apices | Mean speed during corners divided by session max speed |
| **Brake pressure** | How hard they hit the brakes at peak | Mean of the top 10% brake pressure values |
| **High gear style** | Tendency to run higher gears | Mean gear divided by 8 (the maximum) |
| **DRS aggression** | How often DRS is active | Fraction of lap distance where DRS is open |
| **Trail braking** | Braking while still turning into a corner | Overlap between brake > 10% and high lateral G |
| **Exit power** | How early they get back on throttle | Mean throttle in the 30 samples after each corner apex |

All eight values are normalised to 0–1 so they can be compared across drivers and displayed on a radar chart.

### Step 6 — Detect corners
Corners are identified as **speed minima** in the averaged speed trace. The algorithm finds the valleys (slowest points), puts a window around each one, and those windows become the corner zones used in the corner breakdown.

### Step 7 — Compute corner profiles
For each detected corner, the code computes:
- **Minimum speed** through the apex
- **Peak brake pressure** in the braking zone
- **Throttle application** — what fraction of the exit zone has throttle above 50%
- **Brake point offset** — how early or late the driver starts braking relative to the corner midpoint

### Step 8 — Style scatter (PCA)
When you click "Style Scatter — all drivers", the backend builds DNA profiles for all 20 drivers, takes their 8 style dimension scores and applies **Principal Component Analysis (PCA)** to reduce 8 dimensions down to 2, which can be plotted on an X/Y chart. Drivers who are close together on the chart have genuinely similar driving styles. This is real dimensionality reduction — the same technique used in machine learning.

---

## The four visualisations

### Telemetry Signature
A multi-channel strip chart — like a medical EKG but for a racing driver. Each row is one channel (throttle, brake, speed, gear, lateral G) plotted across the full lap distance. The shape is unique to each driver. Look at the brake spikes — sharp and narrow means hard late braking, wide and gradual means early progressive stops.

### Style Radar
A spider/radar chart with 8 axes, one per style dimension. Each driver's scores form a polygon. Overlaying two drivers shows immediately where they differ. A driver who scores high on "late braker" and "trail braking" but low on "smooth throttle" is an aggressive, instinctive driver. High "corner speed" and "exit power" with lower "brake pressure" suggests a smooth, flowing style.

### Corner Breakdown
A table showing every detected corner on the track with each driver's metrics side by side. The best value for each corner is highlighted in the driver's team colour. You can see exactly which corners a driver dominates and which ones they lose time.

### Style Scatter
All drivers in the session plotted in 2D style space. The axes have no direct label because they're abstract combinations of all 8 style dimensions — but the distances between drivers are meaningful. Hover over any dot to see that driver's top style scores.

---

## Tech stack

### Backend
| Library | Purpose |
|---|---|
| **FastF1** | Downloads and parses official F1 telemetry data |
| **FastAPI** | Web framework that creates the REST API |
| **Uvicorn** | ASGI server that runs FastAPI |
| **Pandas** | Data manipulation — laps and telemetry come back as DataFrames |
| **NumPy** | Numerical computation — interpolation, averaging, PCA |
| **SciPy** | Signal processing — `find_peaks` for corner detection |
| **Pydantic** | Data validation and settings management |

### Frontend
| Library | Purpose |
|---|---|
| **React** | UI component framework |
| **TypeScript** | Type safety — catches mistakes before runtime |
| **Vite** | Build tool and dev server — very fast |
| **Tailwind CSS** | Utility-first styling |
| **D3.js** | Low-level data visualisation — the signature waveform and scatter plot |
| **Zustand** | Global state management — selected session, loaded profiles |
| **Axios** | HTTP client — calls the FastAPI backend |

---

## Project structure

```
pitwall-dna/
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI app, middleware, route registration
│   │   ├── core/
│   │   │   └── config.py           ← All settings (cache dir, thresholds, resolution)
│   │   ├── services/
│   │   │   ├── session_loader.py   ← FastF1 wrapper (load sessions, filter laps)
│   │   │   └── dna_analyzer.py     ← The brain (interpolation, style metrics, corners)
│   │   └── api/routes/
│   │       ├── sessions.py         ← /api/sessions endpoints
│   │       └── dna.py              ← /api/dna endpoints
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api.ts                  ← All backend calls and TypeScript types
        ├── App.tsx                 ← Main layout and page logic
        ├── stores/
        │   └── store.ts            ← Zustand global state
        └── components/
            ├── SessionPicker.tsx   ← Year / round / session / driver selector
            ├── dna/
            │   └── SignatureChart.tsx   ← D3 telemetry waveform
            ├── radar/
            │   └── RadarChart.tsx       ← SVG spider chart
            ├── corner/
            │   └── CornerChart.tsx      ← Corner breakdown table
            └── compare/
                └── ScatterPlot.tsx      ← D3 style scatter plot
```

---

## How to run it

### Prerequisites
- Python 3.11
- Node.js 18+

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

### First run note
The first time you load a session, FastF1 downloads the data from the internet. This takes 1–3 minutes depending on your connection. After that it's cached locally in `backend/f1_cache/` and loads instantly.

---

## Things to explore

- Compare **Verstappen vs Leclerc** at Monaco qualifying — two very different approaches to the same track
- Compare the **same driver across different tracks** — Alonso at Monaco vs Alonso at Monza
- Load the **Style Scatter for a full race** — see if tyre degradation changes driver styles
- Change `MIN_LAPS_FOR_DNA` in `config.py` from 3 to 10 for a more averaged, stable fingerprint

---

## What makes this different

The [f1-race-replay](https://github.com/IAmTomShaw/f1-race-replay) project (the inspiration) is a brilliant race replay visualiser — it shows *where* drivers are on track. PitWall DNA asks a different question: *how* are they driving? It's the difference between watching a replay and reading a driver's mind.

---

*Built with FastF1, FastAPI, React, D3 and a lot of telemetry data.*