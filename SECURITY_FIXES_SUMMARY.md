# Security Fixes Applied

## Changes Made

### 1. CORS Hardening
**Files**: `server/src/index.ts`
- Changed from "allow all" to explicit allowlist
- Blocked unknown origins with error response
- Removed `credentials: true` to prevent CSRF
- Added `VITE_FRONTEND_ORIGIN` env var support

### 2. Protected Admin Endpoints  
**Files**: `server/src/index.ts`
- `/api/invoices` (GET) - now requires `jwtCheck` (Azure AD token)
- `/api/invoice` (POST create) - now requires `jwtCheck`
- `/api/email` (GET) - now requires `jwtCheck` + removed email exposure
- `/api/clients/*` - already had `jwtCheck`
- `/api/users` (GET) - removed `hash`/`salt` from response

### 3. Invoice Security
**Files**: `server/src/index.ts`, `server/src/invoiceHelper.ts`
- Invoice IDs changed from `inv-${Date.now()}` to `inv-${crypto.randomUUID()}`
- `/api/invoice/create-payment-intent` validates amount against invoice
- Payment intent metadata validation added
- `finalizePayment` validates PI matches invoice

### 4. Authentication Hardening
**Files**: `server/src/authHelper.ts`
- Login enforces `approved` field check
- Email normalized on registration (lowercase, trimmed)
- User partitionKey fixed to 'user' for consistency

### 5. Removed Sensitive Logging
**Files**: `server/src/index.ts`
- Removed request header/body logging on `/api/invoice`
- Removed token logging on `/api/approveUser`

## Testing

### Automated Tests
Run: `node test-security.js` from `server/` directory

Tests:
- CORS blocks unknown origins
- Protected endpoints return 401/403
- Public endpoints work without auth
- User registration works
- Login fails for unapproved users

### Manual Testing Required

1. **Invoice ID Format**
   - Create new invoice via admin panel
   - Verify ID format is `inv-{UUID}` not `inv-{timestamp}`

2. **User Approval Flow**
   - Register new user
   - Try to login → should get "Account not approved"
   - Approve via admin panel
   - Login again → should succeed

3. **Payment Flow End-to-End**
   - Create invoice
   - Open invoice URL (public access)
   - Complete payment
   - Verify payment intent metadata validated

4. **Users API**
   - Call `/api/users` with valid Azure AD token
   - Verify response excludes `hash` and `salt` fields

5. **CORS in Browser**
   - Open client at http://localhost:3000
   - Verify no CORS errors in console
   - Try accessing from different origin → should block

## Azure Configuration

### Required in Azure App Service Settings:
- `VITE_FRONTEND_ORIGIN` = `rudyardtechnologies.com` (no https://)
- `AZURE_TENANT_ID` = (your tenant ID)
- `RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID` = (your app reg ID)
- `JWT_SECRET` = (your secret for custom auth)
- `ADMIN_EMAIL` = (admin email for approvals)

### Azure App Service CORS:
- **Disable/clear** CORS in Azure Portal (handled by Express now)

### Azure AD App Registration:
- Set `requestedAccessTokenVersion` = `2` in manifest
- Verify scope: `access_as_client` exists
- Application ID URI: `api://{CLIENT_ID}`

## Security Risk Status

| Risk | Before | After | Status |
|------|--------|-------|--------|
| CORS allow-all | High | Fixed | Allowlist only |
| Predictable invoice IDs | High | Fixed | UUID-based |
| Public invoice list | High | Fixed | Auth required |
| Payment manipulation | High | Fixed | Server validates |
| Password hash exposure | Medium | Fixed | Filtered out |
| Unapproved login | Medium | Fixed | Checked at login |
| Sensitive logging | Low | Fixed | Removed |
| XSS via localStorage | Medium | Remains | Consider httpOnly cookies |
| Low PBKDF2 iterations | Low | Remains | Consider increasing to 100k+ |

## Deployment Checklist

- [ ] Update `VITE_FRONTEND_ORIGIN` in Azure App Service
- [ ] Clear/disable Azure CORS settings
- [ ] Deploy server changes
- [ ] Deploy client changes (if any)
- [ ] Test one invoice payment end-to-end in production
- [ ] Monitor Application Insights for auth errors
- [ ] Verify existing approved users can still login

## Notes

- **Public endpoints remain public** (invoices can be viewed/paid by anyone with link)
- **Admin endpoints** now require Azure AD tokens
- **Custom auth** (`/api/login`) uses JWT_SECRET for non-Azure AD flows
- Invoice access relies on URL secrecy (UUID makes enumeration infeasible)
