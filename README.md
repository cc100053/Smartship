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

## Azure
Updating Your App (CI/CD)
When you push code changes:

1. Rebuild and push new image
cd backend
az acr build --registry $ACR_NAME --image smartship-backend:latest .

2. Update container app to use new image
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image "$ACR_NAME.azurecr.io/smartship-backend:latest"

PowerShell:
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
