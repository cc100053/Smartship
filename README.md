# SmartShip

## Environment variables
This project reads database credentials from environment variables.

1) Copy the template:
```bash
cp .env.example .env
```

2) Edit `.env` with your actual Supabase credentials.

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
The frontend is hosted on Vercel and connected to the GitHub repository.
*   **Auto-Deploy**: Just push to the `master` branch on GitHub. Vercel will automatically detect changes in the `frontend/` directory and deploy them.

### Backend (Azure Container Apps)
The backend is hosted on Azure Container Apps. You need to manually build and update the image when you change backend code.

**Prerequisites:**
*   Azure CLI installed (`az login`)
*   Variables set:
    ```bash
    ACR_NAME="your_acr_name"           # e.g. smartshipacr
    RESOURCE_GROUP="your_rg_name"      # e.g. smartship-rg
    BACKEND_APP="smartship-backend"    # Container App name
    ```

**Update Steps:**
```bash
# 1. Build and push to Azure Container Registry (ACR)
cd backend
az acr build --registry $ACR_NAME --image smartship-backend:latest .

# 2. Tell Azure to restart the app with the new image
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
