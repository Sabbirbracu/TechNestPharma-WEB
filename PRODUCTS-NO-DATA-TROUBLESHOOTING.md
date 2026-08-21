# Products Page Not Showing Data - Troubleshooting Guide

## Issue
Your backend API is ready and working, but the Products page shows no data or shows authentication errors.

## Root Cause
**The Products page requires authentication.** Your backend API `/api/v1/products/*` endpoints return:
```json
{"detail":"Not authenticated","code":"authentication_error"}
```

This is expected behavior for a secure application.

## Solution: You Need to Log In First!

### Step 1: Check if Backend Has User Accounts

Your backend needs at least one user account. Check if you have created a user:

**Option A: Create a user via API (if registration endpoint exists)**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "full_name": "Admin User"
  }'
```

**Option B: Create a user via database script**
If your backend uses a database seeding script or admin creation command, run it:
```bash
# Example for Python/FastAPI backends
cd /path/to/backend
python scripts/create_admin.py

# Or using Alembic/SQLAlchemy
python -m alembic upgrade head
python scripts/seed_users.py
```

**Option C: Check backend documentation**
Look in your backend code for:
- `scripts/` folder
- `seeds/` folder  
- `README.md` for setup instructions
- Database migration files

### Step 2: Log In Through the Frontend

Once you have a user account:

1. **Open your browser** and go to: http://localhost:3000
2. **You should see a login page** or a "Sign In" button
3. **Enter your credentials** (the email/password you created)
4. **After successful login**, navigate to the Products page

### Step 3: Verify Authentication in Browser

Open browser DevTools (F12) and check:

**Console Tab**: Look for:
- ✅ No authentication errors
- ✅ API calls returning data (200 status)
- ❌ "Not authenticated" errors → You need to log in
- ❌ CORS errors → Check backend CORS configuration
- ❌ Network errors → Backend might not be running

**Network Tab**: 
1. Filter by "XHR" or "Fetch"
2. Look for requests to `/api/v1/products`
3. Check the response:
   - **Status 401** → Not authenticated (need to log in)
   - **Status 200** → Success! Check response data
   - **Status 500** → Backend error (check backend logs)

**Application Tab**:
- Check `localStorage` for access tokens
- Check `Cookies` for refresh tokens

## Common Scenarios

### Scenario 1: No Login Page Shows Up
**Symptom**: You go to http://localhost:3000 and see the Products page immediately, but it's empty.

**Solution**: The app might not be redirecting unauthenticated users properly. Check:
```typescript
// In src/components/require-auth.tsx
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  
  if (status === "loading") {
    return <LoadingScreen />;
  }
  
  if (status === "unauthenticated") {
    // Should redirect to login
    return <Navigate to="/login" />;
  }
  
  return children;
}
```

### Scenario 2: Login Page Exists But Can't Log In
**Symptom**: You enter credentials but get "Invalid email or password"

**Possible causes**:
1. **No user accounts exist** → Create one (see Step 1 above)
2. **Wrong credentials** → Double-check email/password
3. **Backend not running** → Start the backend
4. **Database not initialized** → Run migrations

**Check backend logs**:
```bash
# If your backend is running in a terminal, check the logs
# Look for errors like:
- "User not found"
- "Database connection error"
- "Migration pending"
```

### Scenario 3: Logged In But Still No Data
**Symptom**: You successfully log in, but Products page is empty

**Debugging steps**:

1. **Check if products exist in database**:
```bash
# Test the API directly with authentication
# First, log in and get a token:
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}' \
  | jq -r '.access_token')

# Then call the products API:
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/products
```

2. **If products list is empty** `{"items":[],"total":0}`:
   - Your database has no products
   - You need to import data (use the "Import Products" button in UI)
   - Or seed the database with sample data

3. **If you get data from curl but not in UI**:
   - Check browser console for JavaScript errors
   - Clear browser cache and reload
   - Check if the access token is being set correctly

### Scenario 4: CORS Errors
**Symptom**: Browser console shows CORS errors

**Solution**: Update backend CORS configuration to allow `http://localhost:3000`:

```python
# In your FastAPI backend (usually main.py or app.py)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Backend is running (`curl http://localhost:8000/health` returns `{"status":"ok"}`)
- [ ] Frontend is running (can access http://localhost:3000)
- [ ] At least one user account exists in the database
- [ ] Can successfully log in through the UI
- [ ] After login, browser DevTools shows no authentication errors
- [ ] API calls in Network tab return 200 status (not 401)
- [ ] Products exist in the database (check via direct API call or database query)

## Testing the Full Flow

Here's a complete test to verify everything works:

### 1. Test Backend Health
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

### 2. Test Login (with your credentials)
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' \
  | jq
```
**Expected**: JSON with `access_token`, `refresh_token`, and `user` object

### 3. Test Products Stats
```bash
# Use the token from step 2
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/v1/products/stats \
  | jq
```
**Expected**: 
```json
{
  "buckets": [
    {"key": "total", "label": "Total Products", "count": 2487, ...},
    {"key": "api", "label": "API", "count": 1248, ...},
    ...
  ],
  "window_days": 30
}
```

### 4. Test Products List
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:8000/api/v1/products?page=1&size=10" \
  | jq
```
**Expected**: JSON with `items` array containing products

## If Data Still Doesn't Show

### Check the ProductStatsCards Component

The stats cards might be failing silently. Let's add error handling:

```typescript
// In src/components/products/product-stats-cards.tsx
export function ProductStatsCards() {
  const { data, isLoading, error } = useProductStats();

  // Add this error check:
  if (error) {
    console.error("Stats error:", error);
    return (
      <div className="rounded-xl border border-destructive/60 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">
          Failed to load statistics: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingSkeleton />;
  }

  return <StatsDisplay data={data} />;
}
```

### Check the ProductsTable Component

Similarly, add error display:

```typescript
// In src/components/products/products-table.tsx
export function ProductsTable() {
  const { data, isFetching, error } = useProducts(params);
  
  // Add this check:
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-destructive/60 bg-card p-8 text-center">
        <h3 className="text-lg font-semibold text-destructive">
          Failed to load products
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
  
  // Rest of component...
}
```

## Summary

**The most likely issue**: You need to create a user account and log in.

**Steps to resolve**:
1. Create a user account in the backend database
2. Log in through the frontend UI at http://localhost:3000
3. Navigate to the Products page
4. If still empty, check if products exist in the database
5. If products exist but don't show, check browser console for errors

**Need help?** Check:
- Backend logs for errors
- Browser DevTools Console tab
- Browser DevTools Network tab (filter by XHR/Fetch)
- Database to verify data exists
