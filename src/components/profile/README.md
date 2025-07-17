# Profile Page Documentation

This document describes the comprehensive profile page implementation for MealPrepAI.

## Overview

The profile page provides users with a complete interface to manage their account information, dietary preferences, and security settings. It's built with a tabbed interface for better organization and user experience.

## Components

### 1. Profile Page (`src/app/profile/page.tsx`)

The main profile page component with three tabs:

#### **Basic Information Tab**
- **Username**: Display-only field (cannot be changed)
- **Display Name**: Editable field for user's preferred display name
- **Email**: Editable email address with validation
- **Account Timestamps**: Shows registration and last update dates

#### **Dietary Preferences Tab**
- **Diet Type**: Dropdown selection for dietary restrictions
  - 素食主义 (Vegetarian)
  - 纯素食主义 (Vegan)
  - 生酮饮食 (Keto)
  - 原始人饮食 (Paleo)
  - 地中海饮食 (Mediterranean)
- **Calorie Target**: Optional daily calorie goal (1000-5000 range)
- **Allergies**: Dynamic list of allergens to avoid
- **Dislikes**: Dynamic list of foods the user doesn't like

#### **Account Security Tab**
- **Change Password**: Opens dialog for secure password change
- **Delete Account**: Opens confirmation dialog for account deletion

### 2. Change Password Dialog (`src/components/profile/ChangePasswordDialog.tsx`)

Secure password change interface with:
- **Current Password**: Required for verification
- **New Password**: Minimum 6 characters with validation
- **Confirm Password**: Must match new password
- **Password Visibility Toggle**: Show/hide password fields
- **Comprehensive Validation**: Client-side and server-side validation

### 3. Delete Account Dialog (`src/components/profile/DeleteAccountDialog.tsx`)

Account deletion interface with:
- **Warning Messages**: Clear explanation of data loss
- **Confirmation Text**: User must type "删除我的账户" to confirm
- **Data Overview**: Shows what data will be deleted
- **Account Information**: Displays current username and email

## API Routes

### Profile Management (`/api/auth/profile`)
- **PUT**: Update user profile information
- Supports updating display name, email, and dietary preferences
- Validates email format and handles duplicate email errors

### Change Password (`/api/auth/change-password`)
- **PUT**: Change user password
- Requires current password verification
- Validates new password strength
- Uses bcrypt for secure password hashing

### Delete Account (`/api/auth/delete-account`)
- **DELETE**: Permanently delete user account
- Cascading deletion of all user-related data:
  - Meal plan items
  - Meal plans
  - Collection recipes
  - Collections
  - Favorites
  - Created recipes
  - User account
- Uses database transactions for data integrity

## Features

### 🔒 **Security**
- Password strength validation (minimum 6 characters)
- Current password verification for changes
- Secure session management
- Protected routes with authentication guards

### 🎨 **User Experience**
- Responsive design for all screen sizes
- Loading states and skeleton screens
- Toast notifications for user feedback
- Form validation with clear error messages
- Tabbed interface for organized content

### 📱 **Responsive Design**
- Mobile-friendly layout
- Adaptive grid layouts
- Touch-friendly interactive elements
- Optimized for various screen sizes

### 🍽️ **Dietary Management**
- Dynamic allergen and dislike management
- Visual badges for easy identification
- Add/remove functionality with keyboard support
- Calorie target with reasonable limits

### ⚠️ **Data Safety**
- Confirmation dialogs for destructive actions
- Clear warnings about data loss
- Transaction-based database operations
- Rollback on errors

## Usage Examples

### Basic Profile Update
```typescript
// User updates their display name and email
const result = await updateProfile({
  displayName: "John Doe",
  email: "john.doe@example.com"
});
```

### Dietary Preferences Update
```typescript
// User sets dietary preferences
const result = await updateProfile({
  dietaryPreferences: {
    dietType: 'vegetarian',
    allergies: ['peanuts', 'shellfish'],
    dislikes: ['cilantro', 'mushrooms'],
    calorieTarget: 2000
  }
});
```

### Password Change
```typescript
// User changes password
const response = await fetch('/api/auth/change-password', {
  method: 'PUT',
  body: JSON.stringify({
    currentPassword: 'oldPassword',
    newPassword: 'newSecurePassword'
  })
});
```

## File Structure

```
src/
├── app/
│   └── profile/
│       ├── page.tsx          # Main profile page
│       └── loading.tsx       # Loading skeleton
├── components/
│   └── profile/
│       ├── ChangePasswordDialog.tsx
│       ├── DeleteAccountDialog.tsx
│       ├── index.ts          # Component exports
│       └── README.md         # This file
└── app/api/auth/
    ├── profile/route.ts      # Profile update API
    ├── change-password/route.ts
    └── delete-account/route.ts
```

## Integration

The profile page integrates seamlessly with:
- **Authentication System**: Uses AuthGuard for protection
- **User Context**: Leverages useAuth hook for user data
- **Toast System**: Provides user feedback
- **UI Components**: Uses shadcn/ui component library
- **Database**: Connects to PostgreSQL via Vercel

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Logical tab order
- **Color Contrast**: Meets WCAG guidelines
- **Error Handling**: Clear error messages and validation

## Security Considerations

- **Input Validation**: Both client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **Session Management**: Secure cookie-based sessions
- **Password Security**: bcrypt hashing with salt rounds
- **CSRF Protection**: SameSite cookie attributes
- **Data Sanitization**: Proper input cleaning and validation