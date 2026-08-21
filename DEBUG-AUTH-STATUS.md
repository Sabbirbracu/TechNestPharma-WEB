# Debug: Authentication Status

## Quick Check

Open your browser and navigate to: **http://localhost:3000**

## What You Should See

### Scenario 1: Not Logged In ✅ EXPECTED
- You should see a **login page** or **sign-in dialog**
- OR you might be redirected to a login page
- This is correct behavior - you need to log in first!

### Scenario 2: Logged In ✅ GOOD
- You see the Products page with data
- Stats cards show product counts
- Table shows product list
- Everything works!

### Scenario 3: Logged In But No Data ⚠️ NEEDS INVESTIGATION  
- You see the Products page layout
- Stats cards show "0" or loading spinners
- Table is empty or shows "No products found"
- This means you're authenticated but have no products in the database

### Scenario 4: Error Messages ❌ PROBLEM
- Red error boxes appear
- Console shows authentication errors
- "Failed to load" messages
- This needs troubleshooting

## How to Log In

### Option 1: Through the UI (Recommended)
1. Look for a "Sign In" or "Login" button
2. Usually in the top-right corner or center of the page
3. Enter your credentials
4. Click "Sign In"

### Option 2: Create a Test User (If No Account Exists)

You need to create a user account in your backend. Here are common methods:

**Method A: Using Backend CLI/Script**
```bash
# Navigate to your backend directory
cd /path/to/backend

# Look for user creation scripts:
python scripts/create_admin.py
# OR
python manage.py createsuperuser
# OR
python -m app.scripts.create_user
```

**Method B: Using Database Directly** (if you know how to access your database)
```sql
-- Example for PostgreSQL
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@example.com',
  -- You need to hash the password using your backend's hashing method
  'hashed_password_here',
  'Admin User',
  'owner',
  true
);
```

**Method C: Check Backend README**
Your backend should have setup instructions. Look for:
- `/backend/README.md`
- `/api/README.md`
- Documentation folder

## Testing Authentication with cURL

### 1. Test Health Endpoint (No Auth Required)
```bash
curl http://localhost:8000/health
```
**Expected**: `{"status":"ok"}`

### 2. Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**If successful**, you'll get:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "your-email@example.com",
    "full_name": "Your Name",
    "role": "owner"
  }
}
```

**If failed**, you'll get:
```json
{"detail":"Invalid email or password","code":"authentication_error"}
```
This means either:
- No user with that email exists
- Password is incorrect
- You need to create a user account first

### 3. Test Products API with Token
```bash
# Use the access_token from step 2
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  http://localhost:8000/api/v1/products/stats
```

**If successful**, you'll see product statistics
**If failed with 401**, the token is invalid or expired

## Browser Console Debugging

1. **Open DevTools**: Press `F12` or right-click → Inspect
2. **Go to Console tab**
3. **Look for errors**:
   - `Not authenticated` → Need to log in
   - `CORS error` → Backend CORS configuration issue
   - `Network error` → Backend not running
   - `Failed to fetch` → Connection problem

4. **Go to Network tab**
5. **Reload the page**
6. **Filter by "Fetch/XHR"**
7. **Click on `/api/v1/products/stats` request**
8. **Check the response**:
   - Status 401 → Authentication required (need to log in)
   - Status 200 → Success! (should show data)
   - Status 500 → Backend error (check backend logs)

## Common Issues and Solutions

### Issue: "Not authenticated" Error
**Solution**: Log in through the UI

### Issue: No Login Page Shows Up
**Solution**: Check if `RequireAuth` component is working. The app should automatically show a login dialog or redirect to login.

### Issue: Can't Log In - "Invalid email or password"
**Solution**: 
1. Create a user account in the backend
2. Check email/password spelling
3. Verify backend is running
4. Check backend logs for errors

### Issue: Logged In But No Products
**Solution**:
1. Your database is empty
2. Import products using the "Import Products" button
3. Or seed the database with sample data

### Issue: Backend Not Running
**Solution**:
```bash
# Navigate to backend directory
cd /path/to/backend

# Start the backend (common commands):
python main.py
# OR
uvicorn app.main:app --reload
# OR
python -m uvicorn app.main:app --reload --port 8000
```

## Next Steps

1. **Check if you're logged in**: Look for your name/email in the top-right corner
2. **If not logged in**: Look for a "Sign In" button and click it
3. **If no user exists**: Create one using backend scripts or documentation
4. **If logged in but no data**: Import products or check if database has data
5. **If errors persist**: Check the troubleshooting guide in PRODUCTS-NO-DATA-TROUBLESHOOTING.md

## Quick Login Test

Try these common default credentials (if your backend has seed data):

```
Email: admin@example.com
Password: admin123

Email: admin@test.com
Password: admin

Email: test@example.com  
Password: password
```

**Note**: These are just examples. Your actual credentials depend on how your backend was set up.
