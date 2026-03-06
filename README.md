# SmartShip

## Environment variables
This project reads database credentials from environment variables.

1) Copy the template:
```bash
cp .env.example .env
```

2) Edit `.env` with your actual Supabase credentials.
- `DB_USER` should match Supabase pooler format (usually `postgres.<project-ref>`).
- If backend startup logs show `FATAL: Tenant or user not found`, re-check `DB_USER` / `DB_PASSWORD`.
- Optional stability tuning is available via `DB_*` pool/timeout vars and `RATE_LIMIT_*` vars in `.env.example`.

3) Load the variables before running the backend (bash):
```bash
set -a
source .env
set +a
```

## Docker
`docker-compose up --build`

> **Note:** The current Docker setup is configured for a **production-style build**. This means if you change a file, **it will not auto-refresh**. You must rebuild the containers (`docker-compose up --build`) to see the updates.

### Option 1: Run locally without Docker (Recommended for active development)
To get automatic refreshing (hot-reloading) while writing code, run the servers locally on your machine instead of Docker:

**1. Backend** (Auto-recompiles on change):

Use the helper script at the project root — it auto-loads `.env` for you:

**Mac / Linux:**
```bash
./run-backend.sh
```

**Windows:**
```powershell
.\run-backend.ps1
```

**2. Frontend** (Instant hot-reload):
```bash
cd frontend
npm install
npm run dev
```

### Extended Viewer (`#/viewer`)
For exhibition/secondary-display mode, open a second browser window to:

`http://localhost:5173/#/viewer`

- Keep `http://localhost:5173` on the main screen for normal operation.
- Move the `#/viewer` window to the external display/projector and use fullscreen (F11).
- The viewer updates in real time from the main screen.

### Stats Dashboard (`#/stats`)
For the live impact / exhibition stats screen, open:

`http://localhost:5173/#/stats`

- Keep `http://localhost:5173` on the main screen and use `#/stats` on a second display if you want a dedicated dashboard.
- The dashboard shows four cumulative metrics:
  - `Total Calculations`
  - `Estimated Yen Saved`
  - `Estimated CO2e Saved`
  - `Items Packed`
- A stats event is recorded only when a formal `計算運費` action succeeds (`cart` and `manual` both count).
- The dashboard polls `GET /api/stats/summary` every 2 seconds.
- `Estimated CO2e Saved` is a lightweight showcase estimate, not a logistics-grade emissions model.

*(Only use `docker-compose up --build` when you want to test the final packaged application.)*

## Deployment
Detailed step-by-step runbook: `docs/deployment_runbook.md`

### Frontend (Vercel)
The frontend is hosted on Vercel and connected to GitHub.
*   **Auto-Deploy**: Just push to the `master` branch. Vercel automatically deploys changes from the `frontend/` directory.
*   **API Path**: Production frontend now expects same-origin `/api/*` requests via Vercel rewrite, not a browser-visible cross-site backend base URL.

### Backend (Azure Container Apps)
The backend is hosted on Azure. You must manually build and update the image.

**1. Set Variables (Run in Terminal)**
Run these lines in your terminal before the update commands.
```bash
# Replace with your actual names
ACR_NAME="your_registry_name"       # e.g. smartshipacr
RESOURCE_GROUP="your_resource_group" # e.g. smartship-rg
BACKEND_APP="smartship-backend"      # Container App name
```

**2. Update Steps**
```bash
# Build & Push Image
cd backend
az acr build --registry $ACR_NAME --image smartship-backend:latest .

# Update App
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --image "$ACR_NAME.azurecr.io/smartship-backend:latest"
```

### PowerShell (Local Dev)
```powershell
$env:DB_USER="postgres.bjsizwtgzjeaobdmpndz"
$env:DB_PASSWORD="your_actual_password"
```

### Optional API override (Vite):
```bash
VITE_API_URL=http://localhost:8080 npm run dev
```

### Auth
- The app now uses:
  - short-lived access token in frontend memory
  - refresh token in an HTTP-only cookie
- Local development defaults to same-origin `/api` proxying through Vite, so you usually do not need `VITE_API_URL` for auth flows.

## Health endpoint
- Readiness: `GET /actuator/health/readiness`

## IDE run config
If you run from an IDE, set `DB_USER` and `DB_PASSWORD` in the Run/Debug environment variables.
