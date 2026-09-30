# Aether

Air quality trends, a PM2.5 forecast, and a plain-language 7-day plan for Indian cities.

This is a student project for a CSE viva and placement demo. Current readings and about 90 days of history come from the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS model). The server refreshes every 10 minutes, and the page polls every minute. This is model analysis, not an official CPCB station feed. The plan is **not medical advice**. If the feed is down, the last saved series stays in SQLite.

## What you can show

- Twelve cities with daily fused PM2.5, PM10, NO2, SO2, CO, and O3
- Two stored sources per day: ground monitor and satellite estimate (65/35 fusion)
- Indian-style AQI category from pollutant sub-indices
- Short-term trend (rising, falling, steady)
- SARIMAX forecast of PM2.5 with a prediction interval, cached after the first fit
- A rules-and-forecast planning agent: guests see a two-line summary, logged-in users get the full plan
- JWT login, city watches, threshold alerts, and a PDF report
- Animated React UI: page transitions, staggered cards, AQI ring, count-up numbers

```mermaid
flowchart LR
  sources[Ground and satellite rows] --> fusion[65/35 fusion and AQI]
  fusion --> api[FastAPI]
  api --> forecast[SARIMAX or moving average]
  forecast --> plan[Planning agent]
  api --> ui[React UI]
  plan --> pdf[PDF report]
```

## Why this is more than a CRUD dashboard

The interesting part is the pipeline: two source tables, a fused daily series, a time-series model, and a planner that only speaks from those numbers. There is no paid LLM. The planner is deterministic so a demo never depends on an API key.

SARIMAX uses order `(1,1,1)` and weekly seasonality `(1,0,1,7)` on the last 180 fused PM2.5 points. If the fit fails, the API says so and returns a 14-day moving average with a widening band.

## Run

Python 3.11+ and Node 20+ are required. SQLite is the default, so MySQL is not required.

```bat
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --port 8000
```

In a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Demo login, also printed on the login screen:

- `analyst@aether.dev`
- `Analyst@123`

Delhi is already on that account’s watchlist at AQI 200.

Tests:

```bat
.venv\Scripts\python -m pytest backend
```

## Deploy

The Docker image builds the React app and serves it from the API, so one host is enough.

On Render, open [this deploy link](https://render.com/deploy?repo=https://github.com/ankitbhowmik59134-ux/aether) after the GitHub repo exists, then create the web service. The free instance sleeps when idle; the first open can take a minute while live readings load.

## Optional MySQL

Set `DATABASE_URL` before starting the API, for example:

```text
mysql+pymysql://user:password@localhost:3306/aether
```

Install `pymysql` in that environment. Tables are created on startup.

## API

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/register` | no |
| POST | `/api/auth/login` | no |
| GET | `/api/me` | yes |
| GET | `/api/cities` | no |
| GET | `/api/cities/{id}` | no |
| GET | `/api/cities/{id}/series?days=90&pollutant=pm25` | no |
| GET | `/api/cities/{id}/forecast?horizon=7` | no |
| GET | `/api/cities/{id}/plan` | optional, changes the tier |
| GET | `/api/cities/{id}/report.pdf` | yes |
| GET | `/api/compare?left=&right=&days=90` | no |
| GET, POST, DELETE | `/api/watches` | yes |
| GET | `/api/alerts` | yes |

## Interview lines

- Fusion is explicit and stored, so you can explain the data model without hand-waving.
- The forecast is cached in memory by city, last date, and horizon.
- Guest versus member access is a product rule, not a prompt to a chatbot.
- Limits: seeded data, one pollutant in the forecast, no live sensors, and the plan is a heuristic.
