/**
 * Test script for authentication system
 * This file can be used to test the authentication functions
 */

import { registerUser, loginUser, getUserById, updateUserProfile, changeUserPassword } from './auth';
import type { DietaryPreferences } from '@/types/database.types';

export async function testAuthenticationSystem() {
  console.log('🧪 Testing Authentication System...');
  
  try {
    // Test 1: User Registration
    console.log('\n1. Testing User Registration...');
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'testpassword123',
      displayName: 'Test User',
      dietaryPreferences: {
        dietType: 'vegetarian' as const,
        allergies: ['nuts'],
        dislikes: ['mushrooms'],
        calorieTarget: 2000
      } as DietaryPreferences
    };

    const registerResult = await registerUser(
      testUser.username,
      testUser.email,
      testUser.password,
      testUser.displayName,
      testUser.dietaryPreferences
    );

    if (registerResult.success) {
      console.log('✅ User registration successful:', registerResult.userId);
    } else {
      console.log('❌ User registration failed:', registerResult.error);
      return;
    }

    // Test 2: User Login
    console.log('\n2. Testing User Login...');
    const loginResult = await loginUser(testUser.username, testUser.password);
    
    if (loginResult.success && loginResult.user) {
      console.log('✅ User login successful:', loginResult.user.username);
      console.log('   User ID:', loginResult.user.id);
      console.log('   Email:', loginResult.user.email);
      console.log('   Display Name:', loginResult.user.displayName);
      console.log('   Dietary Preferences:', loginResult.user.dietaryPreferences);
    } else {
      console.log('❌ User login failed:', loginResult.error);
      return;
    }

    const userId = loginResult.user!.id;

    // Test 3: Get User by ID
    console.log('\n3. Testing Get User by ID...');
    const user = await getUserById(userId);
    
    if (user) {
      console.log('✅ Get user by ID successful:', user.username);
    } else {
      console.log('❌ Get user by ID failed');
      return;
    }

    // Test 4: Update User Profile
    console.log('\n4. Testing Update User Profile...');
    const updateResult = await updateUserProfile(userId, {
      displayName: 'Updated Test User',
      dietaryPreferences: {
        ...testUser.dietaryPreferences,
        calorieTarget: 2200
      }
    });

    if (updateResult.success) {
      console.log('✅ User profile update successful');
      
      // Verify the update
      const updatedUser = await getUserById(userId);
      if (updatedUser) {
        console.log('   Updated Display Name:', updatedUser.displayName);
        console.log('   Updated Calorie Target:', updatedUser.dietaryPreferences.calorieTarget);
      }
    } else {
      console.log('❌ User profile update failed:', updateResult.error);
    }

    // Test 5: Change Password
    console.log('\n5. Testing Change Password...');
    const newPassword = 'newpassword123';
    const changePasswordResult = await changeUserPassword(userId, testUser.password, newPassword);

    if (changePasswordResult.success) {
      console.log('✅ Password change successful');
      
      // Test login with new password
      const newLoginResult = await loginUser(testUser.username, newPassword);
      if (newLoginResult.success) {
        console.log('✅ Login with new password successful');
      } else {
        console.log('❌ Login with new password failed');
      }
    } else {
      console.log('❌ Password change failed:', changePasswordResult.error);
    }

    // Test 6: Test duplicate username/email
    console.log('\n6. Testing Duplicate Registration...');
    const duplicateResult = await registerUser(
      testUser.username,
      'different@example.com',
      'password123'
    );

    if (!duplicateResult.success) {
      console.log('✅ Duplicate username properly rejected:', duplicateResult.error);
    } else {
      console.log('❌ Duplicate username should have been rejected');
    }

    // Test 7: Test invalid login
    console.log('\n7. Testing Invalid Login...');
    const invalidLoginResult = await loginUser(testUser.username, 'wrongpassword');
    
    if (!invalidLoginResult.success) {
      console.log('✅ Invalid login properly rejected:', invalidLoginResult.error);
    } else {
      console.log('❌ Invalid login should have been rejected');
    }

    console.log('\n🎉 Authentication system tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for potential use in API routes or other testing scenarios
export default testAuthenticationSystem;