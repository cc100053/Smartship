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

3) Load the variables before running the backend (bash):
```bash
set -a
source .env
set +a
```

## Docker
docker-compose up --build

## Deployment

### Frontend (Vercel)
The frontend is hosted on Vercel and connected to GitHub.
*   **Auto-Deploy**: Just push to the `master` branch. Vercel automatically deploys changes from the `frontend/` directory.

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

## Run backend
```bash
cd backend
./mvnw spring-boot:run
```

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

Optional API override (Vite):
```bash
VITE_API_URL=http://localhost:8080 npm run dev
```

## IDE run config
If you run from an IDE, set `DB_USER` and `DB_PASSWORD` in the Run/Debug environment variables.
