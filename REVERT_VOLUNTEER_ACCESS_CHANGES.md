# How to Revert Volunteer Access Changes

This document explains how to revert the volunteer access restrictions when the next event comes and you want to allow all volunteers to register again.

## Overview

The current implementation restricts volunteer registration access to only 4 team roles:
- Director
- Secretary  
- President
- Vice President

All other volunteers see a "Ticket Sales Closed" message.

## Revert Steps

### 1. Database Changes

**Option A: Make all users active again (if you deactivated some)**
```sql
-- Make all users active
UPDATE users 
SET is_active = true;
```

**Option B: If you want to keep some users inactive, just remove the access restriction**
No database changes needed - just update the frontend code below.

### 2. Frontend Code Changes

#### File: `frontend/src/pages/Registration.tsx`

**Remove the access check block:**
```typescript
// DELETE this entire section (lines 231-278)
// Show access denied message for users without volunteer registration access
if (isAuthenticated() && !hasVolunteerRegistrationAccess()) {
  return (
    // ... entire access denied JSX
  );
}
```

**Remove the auth context import:**
```typescript
// CHANGE THIS:
const { isPresident, isAuthenticated, isLoading, hasVolunteerRegistrationAccess } = useAuth();

// TO THIS:
const { isPresident, isAuthenticated, isLoading } = useAuth();
```

#### File: `frontend/src/contexts/AuthContext.tsx`

**Remove the helper function:**
```typescript
// DELETE this function (lines 138-144)
const hasVolunteerRegistrationAccess = (): boolean => {
  const user = authState.user;
  if (!user) return false;
  
  const allowedRoles = ['Director', 'Secretary', 'President', 'Vice President'];
  return allowedRoles.includes(user.team_role || '');
};
```

**Remove from interface:**
```typescript
// REMOVE this line from AuthContextType interface:
hasVolunteerRegistrationAccess: () => boolean;
```

**Remove from context value:**
```typescript
// REMOVE this line from the context value object:
hasVolunteerRegistrationAccess,
```

#### File: `frontend/src/types/auth.tsx`

**Remove team_role field (optional):**
```typescript
// CHANGE THIS:
export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  team_role?: string;  // REMOVE this line
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// TO THIS:
export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}
```

### 3. Alternative: Modify Allowed Roles

If you want to keep the access control but allow more roles, just update the allowed roles list:

```typescript
// In AuthContext.tsx, update the allowedRoles array:
const allowedRoles = [
  'Director', 
  'Secretary', 
  'President', 
  'Vice President',
  'Alumni Team Member',    // Add these
  'Events Team Member',    // Add these
  'Finance Team Member',   // Add these
  'Marketing Team Member', // Add these
  'Social Media Team Member' // Add these
];
```

### 4. Quick Revert Command

If you want to quickly revert everything, you can use git:

```bash
# Revert all changes to the 3 modified files
git checkout HEAD -- frontend/src/pages/Registration.tsx
git checkout HEAD -- frontend/src/contexts/AuthContext.tsx  
git checkout HEAD -- frontend/src/types/auth.tsx

# Or revert the entire feature if you committed it
git revert <commit-hash>
```

## Verification

After reverting, verify that:

1. All authenticated volunteers can access the registration page
2. No "Ticket Sales Closed" message appears
3. Registration form works normally for all volunteers
4. Dashboard access still works as expected

## Future Considerations

- Keep this document for future events
- Consider making the allowed roles configurable via environment variables
- Think about adding a feature flag to easily toggle access restrictions on/off

---

**Last Updated:** March 13, 2026  
**Purpose:** Document volunteer access restriction changes for future reversion
