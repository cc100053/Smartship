# SmartShip Deployment Runbook

Last updated: 2026-03-05

## Scope
- Frontend production domain: `https://smartship.vercel.app`
- Backend: Azure Container Apps (`smartship-backend`)

## One-time assumptions
- GitHub remote: `origin`
- Production branch: `master`
- Azure resources:
  - `ACR_NAME=smartshipacr`
  - `RESOURCE_GROUP=smartship-rg`
  - `BACKEND_APP=smartship-backend`

## A. Frontend deploy (production)
1. Make sure feature branch is ready:
```bash
git checkout animation-feature
git status
```
2. Merge to production branch and push:
```bash
git checkout master
git merge --no-ff animation-feature
git push origin master
```
3. Verify Vercel deployment status for pushed commit:
```bash
git rev-parse --short HEAD
curl -sS "https://api.github.com/repos/cc100053/Smartship/commits/$(git rev-parse --short HEAD)/status" | jq .
```
- `context: "Vercel"` + `state: "success"` means production frontend is live.

## B. Backend deploy (Azure)
1. Use commit tag for immutable release:
```bash
COMMIT_SHA="$(git rev-parse --short HEAD)"
```
2. Ensure production cookie mode is active:
- Do **not** set `SPRING_PROFILES_ACTIVE=local` on Azure.
- Production/default backend config now expects cross-site HTTPS and emits session cookies as `SameSite=None; Secure`.
2. Build and push image:
```bash
cd backend
az acr build --registry smartshipacr \
  --image smartship-backend:latest \
  --image "smartship-backend:${COMMIT_SHA}" .
cd ..
```
3. Update container app to commit image:
```bash
az containerapp update \
  --name smartship-backend \
  --resource-group smartship-rg \
  --image "smartshipacr.azurecr.io/smartship-backend:${COMMIT_SHA}"
```
4. Verify active revision and image:
```bash
az containerapp show \
  --name smartship-backend \
  --resource-group smartship-rg \
  --query "{image:properties.template.containers[0].image,latestRevisionName:properties.latestRevisionName,runningStatus:properties.runningStatus}" \
  -o json
```

## C. Post-deploy smoke checks
1. CORS preflight:
```bash
curl -i -X OPTIONS "https://smartship-backend.agreeablemeadow-deb59e6e.japaneast.azurecontainerapps.io/api/products" \
  -H "Origin: https://smartship.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type"
```
- Expect `HTTP/2 200` and `access-control-allow-origin: https://smartship.vercel.app`.

2. Products API:
```bash
curl -i "https://smartship-backend.agreeablemeadow-deb59e6e.japaneast.azurecontainerapps.io/api/products" \
  -H "Origin: https://smartship.vercel.app"
```
- Expect `HTTP/2 200` with JSON body.

3. Auth cookie attributes:
```bash
curl -i "https://smartship-backend.agreeablemeadow-deb59e6e.japaneast.azurecontainerapps.io/api/auth/login-or-register" \
  -X POST \
  -H "Origin: https://smartship.vercel.app" \
  -H "Content-Type: application/json" \
  --data '{"loginId":"cookie-check","password":"cookie-check"}'
```
- Expect `set-cookie` to include both `SameSite=None` and `Secure`.

## D. Known pitfalls and fixes
1. Frontend works locally but not in deployed site:
- Check frontend build-time `VITE_API_URL`.
- Preview deployments and production deployments can point to different backend URLs.

1.5. Login succeeds but `/api/me/products` returns `401` immediately after:
- Root cause is usually a session cookie mismatch for cross-site deployment.
- Production backend must **not** run with `SPRING_PROFILES_ACTIVE=local`.
- Confirm the login response `Set-Cookie` includes `SameSite=None; Secure`.

2. CORS blocked on production:
- Ensure backend env contains:
  - `FRONTEND_URL=https://smartship.vercel.app`
  - `FRONTEND_EXTRA_ORIGINS=https://*.vercel.app`

3. `/api/products` returns 500 on Supabase pooler:
- Ensure backend `DB_URL` includes `prepareThreshold=0`, for example:
```text
jdbc:postgresql://aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
```

4. Local frontend accidentally hitting remote backend:
- Keep `frontend/.env.local`:
```text
VITE_API_URL=http://localhost:8080
```
