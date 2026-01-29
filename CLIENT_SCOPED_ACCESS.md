# Client-Scoped Access Implementation

## 🏢 Overview

Users are now assigned to clients (companies) and have access scoped to their client's data. This implements multi-tenant isolation at the data level.

## 🔐 Security Model

### User → Client Relationship
- Each `IUser` has a `clientId` field linking them to their company
- Regular users can only access data for their assigned client
- Site admins (`siteAdmin: true`) can access all clients and data

### Data Partitioning
- **Invoices**: PartitionKey = `clientId` (allows efficient client-scoped queries)
- **Clients**: PartitionKey = `clientId`, RowKey = `contactEmail`
- Users can only see invoices where partitionKey matches their clientId

## 📋 API Endpoints Added

### Client Management

**POST /api/client** (Admin only)
```json
{
  "clientId": "company-123",
  "clientName": "Acme Corp",
  "contactEmail": "billing@acme.com",
  "address": "123 Main St",
  "phone": "555-1234"
}
```

**GET /api/clients** (Authenticated)
- Admin: Returns all clients
- Regular user: Returns only their client

**GET /api/client/:clientId** (Authenticated)
- Users can only access their own client
- Admins can access any client

**GET /api/client/:clientId/invoices** (Authenticated)
- Returns all invoices for specified client
- Users can only access their own client's invoices
- Admins can access any client's invoices

**DELETE /api/client/:clientId/:contactEmail** (Admin only)
- Deletes a client record

### Updated Endpoints

**GET /api/invoices** (Authenticated)
- Admin: Returns all invoices
- Regular user: Returns only their client's invoices

**POST /api/invoice** (Admin only)
- Now accepts optional `clientId` field
- Uses `clientId` for partitioning (falls back to `contact` for backwards compatibility)

**GET /api/users** (Admin only)
- Now requires site admin role
- Returns user list without sensitive hash/salt fields

## 🛠️ Implementation Details

### Fixed Security Issues

1. **SQL Injection Prevention**
   - All query parameters now use proper escaping (`replace(/'/g, "''")`)
   - Removed string template injection vulnerabilities

2. **Authorization Checks**
   - All client endpoints verify user's clientId matches requested resource
   - Site admin bypass for management operations

3. **Data Isolation**
   - Invoice queries filtered by clientId automatically
   - Users cannot enumerate other clients' data

### Database Schema

**IUser**
```typescript
{
  email: string;
  clientId: string;  // Links user to their company
  approved: boolean;
  siteAdmin?: boolean;  // Grants full access
  // ... auth fields
}
```

**IClient**
```typescript
{
  partitionKey: clientId;
  rowKey: contactEmail;
  id: string;
  name: string;
  contactEmail: string;
  address: string;
  phone: string;
}
```

**IInvoice**
```typescript
{
  partitionKey: clientId;  // Changed from contact
  rowKey: invoiceId;
  clientId?: string;
  // ... other fields
}
```

## 🧪 Testing Checklist

### Setup
1. Create at least 2 clients via POST /api/client
2. Create users assigned to different clients
3. Create invoices for each client

### Access Control Tests
- [ ] Regular user can only see their client via GET /api/clients
- [ ] Regular user can only access their client's invoices via GET /api/invoices
- [ ] Regular user gets 403 when accessing another client's data
- [ ] Admin can see all clients and invoices
- [ ] Non-admin cannot POST /api/client or DELETE /api/client
- [ ] Non-admin cannot GET /api/users

### Invoice Creation
- [ ] Create invoice with clientId → partitions correctly
- [ ] Create invoice without clientId → uses contact for backwards compatibility
- [ ] Client-scoped invoice appears in GET /api/client/:clientId/invoices

### Edge Cases
- [ ] User with empty/invalid clientId gets appropriate error
- [ ] SQL injection attempts in clientId params are escaped
- [ ] Unapproved users cannot access any endpoints

## 🚀 Migration Notes

### Existing Data
- **Invoices**: Old invoices have `partitionKey = contact` email
  - These will still work but won't be client-scoped
  - To migrate: Update partitionKey to clientId for each invoice

### User Setup
1. Create clients first via POST /api/client
2. Assign users to clients by setting `clientId` field
3. Mark one user as `siteAdmin: true` for administration

### Backwards Compatibility
- Invoice creation without `clientId` still works (uses `contact`)
- Public invoice viewing/payment remains unchanged
- Admin endpoints maintain existing behavior for site admins

## 🎯 Usage Example

### Create a Client
```bash
POST /api/client
Authorization: Bearer <admin-token>
{
  "clientId": "acme-corp",
  "clientName": "Acme Corporation",
  "contactEmail": "billing@acme.com",
  "address": "123 Tech Street",
  "phone": "555-0100"
}
```

### Assign User to Client
When registering, set user's clientId to "acme-corp" (requires database update)

### Create Client-Scoped Invoice
```bash
POST /api/invoice
Authorization: Bearer <admin-token>
{
  "name": "Monthly Services",
  "amount": 500000,
  "contact": "billing@acme.com",
  "clientId": "acme-corp",
  "notes": "January 2026 services"
}
```

### User Accesses Their Invoices
```bash
GET /api/invoices
Authorization: Bearer <user-token>
# Returns only invoices where partitionKey = user.clientId
```

## 📝 Notes

- Public invoice payment flow unchanged (anyone with link can pay)
- Client isolation only affects authenticated admin/user views
- Consider adding client selection UI for admins
- Consider adding user → client assignment interface
