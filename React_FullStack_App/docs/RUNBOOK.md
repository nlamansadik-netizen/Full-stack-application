# 1) Runbook

## Prerequisites Checks
```bash
node -v
npm -v
python3 --version
python3 -m pip --version
docker --version
docker compose version
```
Note: all commands should return a version number.

## Clone + Enter Repo
```bash
git clone <YOUR_REPO_URL>
cd React_FullStack_App
```
Note: run the next commands from repo root unless stated otherwise.

## Environment Setup
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```
Note: backend reads `.env`; frontend reads `frontend/.env.local`.

### Environment Variables (brief)
- `MONGO_URI`: MongoDB connection string used by FastAPI.
- `MONGO_DB_NAME`: database name for this app.
- `JWT_SECRET`: signing key for JWT tokens.
- `JWT_ALGORITHM`: JWT signing algorithm (`HS256`).
- `JWT_EXPIRE_MINUTES`: token lifetime.
- `SEED_USER_USERNAME`: startup demo user.
- `SEED_USER_PASSWORD`: startup demo password.
- `CORS_ORIGINS`: allowed frontend origins for browser requests.
- `VITE_API_BASE_URL`: frontend target API base URL.

## Backend Setup (Python)
```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r backend/requirements.txt
```
Note: keep this shell for backend commands.

## Frontend Setup (Node)
```bash
cd frontend
npm install
cd ..
```
Note: installs React/Vite dependencies.

## Start Services

### 1) Start MongoDB (Docker)
```bash
docker compose up -d mongo
docker compose ps
```
Note: container `intern-mongo` should be running.

### 2) Start Backend (terminal 1)
```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --reload-dir backend
```
Note: backend base URL is `http://localhost:8000`.

### 3) Start Frontend (terminal 2)
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```
Note: open UI at `http://localhost:5173`.

## Validation Commands

### Health
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

### Register
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
```
Expected: `201 Created` with user id and username.

### Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
```
Expected: `200 OK` with `access_token`.

### Save JWT to variable
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | jq -r '.access_token')
echo "$TOKEN"
```
Note: requires `jq`.

### Protected endpoint
```bash
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer $TOKEN"
```
Expected: current user details.

### Story create + retrieve + edit
```bash
STORY=$(curl -s -X POST http://localhost:8000/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"First","description":"My first story","category":"Learning"}')

STORY_ID=$(echo "$STORY" | jq -r '.id')
echo "$STORY_ID"

curl http://localhost:8000/api/stories/$STORY_ID \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:8000/api/stories/$STORY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"First (Edited)","description":"Updated text","category":"Learning"}'
```
Note: only stories created by this user are accessible.

## Stop / Reset Commands

### Stop frontend/backend
```bash
# In each dev terminal, press:
# Ctrl + C
```

### Stop Mongo container
```bash
docker compose down
```

### Reset database data (only when needed)
```bash
docker compose down -v
docker compose up -d mongo
```
Note: this deletes Mongo volume data.

### Kill stuck ports
```bash
lsof -ti :8000 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```
Note: use only if a process did not exit cleanly.

## Optional one-liners
```bash
alias app-mongo-up='docker compose up -d mongo'
alias app-mongo-down='docker compose down'
alias app-api='source .venv/bin/activate && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --reload-dir backend'
alias app-ui='cd frontend && npm run dev -- --host 0.0.0.0 --port 5173'
```
