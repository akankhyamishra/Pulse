# PULSE — AI-Powered Music Streaming Platform

> A full-stack microservices music app with AI DJ, hum-to-search, mood rooms, and real-time recommendations.

**Live:** [pulse-frontend.onrender.com](https://pulse-frontend.onrender.com) &nbsp;|&nbsp; **Backend:** [pulse-user-service.onrender.com](https://pulse-user-service.onrender.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│          (Vite · TypeScript · Tailwind · Framer)        │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
   ┌───────────────────┐   ┌──────────────────────┐
   │   User Service    │   │     AI Service        │
   │  Node · Express   │   │  Python · FastAPI     │
   │  MongoDB · Redis  │   │  Qdrant · LangGraph   │
   │  RabbitMQ · JWT   │   │  CrewAI · Gemini      │
   └───────────────────┘   └──────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **AI DJ** | LangGraph stateful agent + CrewAI 4-agent ranking pipeline for personalized recommendations |
| **Hum to Search** | Record a melody → librosa extracts MFCC/chromagram embeddings → Qdrant vector nearest-neighbor match |
| **Screenshot Search** | Upload any screenshot → Gemini Vision OCR → song identification |
| **Natural Language Search** | Text query → Gemini + iTunes API → matched tracks |
| **Mood Rooms** | Join curated listening rooms (Chill, Party, Focus, Romantic, Workout) |
| **Weather Playlists** | WMO weather code → mood → auto-generated iTunes playlist |
| **Trending Predictor** | YouTube + Reddit social signals → predicted trending songs |
| **Custom Playlists** | Create, rename, delete playlists and add/remove songs |
| **Artist Follow** | Follow artists and view their profiles |
| **Listening History** | Full listen log with per-song stats |
| **Saved Albums** | Save/unsave full albums to your library |
| **Secure Auth** | JWT via httpOnly cookies — XSS-proof, no localStorage tokens |

---

## Tech Stack

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion (animations, spring physics)
- React Router DOM v7
- Axios (`withCredentials: true` for cookie auth)

### User Service (Node.js)
- Express + TypeScript
- MongoDB + Mongoose
- JWT — httpOnly cookie auth (bcrypt cost-12)
- Redis (ioredis) — playlist + session caching
- RabbitMQ (amqplib) — event-driven inter-service messaging
- cookie-parser + CORS with credential-aware allowlist

### AI Service (Python)
- FastAPI + Uvicorn
- Google Gemini API (Vision + text)
- Qdrant Cloud — vector database for audio embeddings
- LangGraph — stateful multi-step AI DJ agent graph
- CrewAI — 4-agent song ranking pipeline
- librosa + NumPy + SciPy — audio feature extraction
- YouTube Data API v3 — trending video feed
- iTunes RSS API — playlist generation
- Cloudinary — screenshot image storage

### Infrastructure
- Docker + Docker Compose (local dev)
- Render (production — Blueprint deploy)
- MongoDB Atlas
- Qdrant Cloud (free tier)
- CloudAMQP / LavinMQ (RabbitMQ free tier)

---

## Getting Started (Local)

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone and set up env files

```bash
git clone https://github.com/your-username/pulse.git
cd pulse
```

Copy and fill in env files:
```bash
cp "user service/.env.example" "user service/.env"
cp ai-service/.env.example ai-service/.env
```

### 2. Run everything with Docker Compose

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| User Service | http://localhost:5000 |
| AI Service | http://localhost:8001 |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |

### 3. Index songs into Qdrant (first run only)

```bash
curl -X POST http://localhost:8001/api/ai/index
```

---

## Environment Variables

### User Service (`user service/.env`)

| Key | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SEC` | JWT signing secret (min 32 chars) |
| `REDIS_URL` | Redis connection URL |
| `AMQP_URL` | RabbitMQ AMQP URL |
| `CLIENT_URL` | Frontend origin (for CORS) |
| `PORT` | Server port (default 5000) |

### AI Service (`ai-service/.env`)

| Key | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `QDRANT_URL` | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `REDIS_URL` | Redis URL (DJ session history) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `CLOUDINARY_*` | Cloudinary cloud name, API key, secret |

---

## AI Service Endpoints

```
POST /api/ai/hum-search         — audio file → matched songs (Qdrant)
POST /api/ai/nl-search          — text query → songs (Gemini + iTunes)
POST /api/ai/screenshot-search  — image → song (Gemini Vision)
POST /api/ai/dj/chat            — AI DJ message → response + tracks
GET  /api/ai/dj/session         — load DJ conversation history
GET  /api/ai/weather-music      — WMO code → mood playlist
GET  /api/ai/room-playlist/:id  — curated Mood Room playlist
GET  /api/ai/trending           — trending song predictions
GET  /api/ai/trending-videos    — trending video feed
POST /api/ai/index              — bulk index songs into Qdrant
```

---

## Deployment (Render)

Push to GitHub — Render reads `render.yaml` and creates all services automatically.

**External services needed (all have free tiers):**
- [MongoDB Atlas](https://cloud.mongodb.com) — database
- [Qdrant Cloud](https://cloud.qdrant.io) — vector DB
- [CloudAMQP](https://cloudamqp.com) — RabbitMQ (LavinMQ free plan)

After deploy, re-index Qdrant:
```bash
curl -X POST https://pulse-ai-service.onrender.com/api/ai/index
```

---

## Project Structure

```
pulse/
├── frontend/               # React 19 SPA
│   ├── src/pages/          # All page components
│   ├── src/context/        # UserContext, SongContext
│   ├── Dockerfile
│   └── nginx.conf
├── user service/           # Node.js REST API
│   ├── src/
│   │   ├── controller.ts   # All route handlers
│   │   ├── middleware.ts   # JWT auth (cookie + Bearer)
│   │   ├── model.ts        # Mongoose user schema
│   │   └── route.ts        # Express router
│   └── Dockerfile
├── ai-service/             # Python FastAPI AI service
│   ├── main.py             # FastAPI app + all routes
│   ├── dj_agent.py         # LangGraph + CrewAI DJ agent
│   ├── hum.py              # Audio embedding + Qdrant search
│   ├── screenshot_search.py
│   ├── nl_search.py
│   ├── weather_music.py
│   ├── trending.py
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml      # Local dev (all services)
└── render.yaml             # Render Blueprint (production)
```

---

## License

MIT
