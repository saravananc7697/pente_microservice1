/**
 * Centralized Messages Constants
 * ALL error, success, and log messages should be defined here
 */

export const ERROR_MESSAGES = {
  // User-related errors
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',

  // Admin-related errors
  ADMIN_NOT_FOUND: 'Admin user not found',
  ADMIN_ALREADY_EXISTS: 'Admin user with this email already exists',
  ADMIN_CREATION_FAILED: 'Failed to create admin user',
  ADMIN_UPDATE_FAILED: 'Failed to update admin user',
  ADMIN_SELF_SUSPEND: 'You cannot suspend your own account',
  ADMIN_ALREADY_SUSPENDED: 'Admin user is already suspended',
  ADMIN_INSUFFICIENT_PERMISSIONS:
    'Insufficient permissions to suspend this admin',
  ADMIN_SELF_REACTIVATE: 'You cannot reactivate your own account',
  ADMIN_ALREADY_ACTIVE: 'Admin user is already active',
  ADMIN_INSUFFICIENT_PERMISSIONS_REACTIVATE:
    'Insufficient permissions to reactivate this admin',
  AUTH_SERVICE_SIGNUP_FAILED: 'Failed to create user in auth service',
  AUTH_SERVICE_UNAVAILABLE: 'Auth service is currently unavailable',
  AUTH_SERVICE_VALIDATION_ERROR: 'Auth service validation failed',
  RESET_LINK_SEND_FAILED: 'Failed to send password reset link',

  // General errors
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  VALIDATION_ERROR: 'Validation failed',
};

export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESSFUL: 'Login successful',
  LOGOUT_SUCCESSFUL: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',

  // Admin management
  ADMIN_CREATED: 'Admin user created successfully',
  ADMIN_UPDATED: 'Admin user updated successfully',
  ADMIN_DELETED: 'Admin user deleted successfully',
  ADMIN_SUSPENDED: 'Admin suspended successfully',
  ADMIN_REACTIVATED: 'Admin reactivated successfully',
  RESET_LINK_SENT: 'Password reset link sent successfully',

  // General
  OPERATION_SUCCESSFUL: 'Operation completed successfully',
};

export const LOG_MESSAGES = {
  // Authentication
  TOKEN_VALIDATED: 'Token validated successfully',
  TOKEN_EXPIRED: 'Token has expired',

  // Admin operations
  ADMIN_CREATION_ATTEMPT: 'Attempting to create admin user',
  ADMIN_CREATED_SUCCESS: 'Admin user created successfully',
  ADMIN_CREATION_ERROR: 'Error creating admin user',
  ADMIN_UPDATE_ATTEMPT: 'Attempting to update admin user',
  ADMIN_UPDATED_SUCCESS: 'Admin user updated successfully',
  ADMIN_UPDATE_ERROR: 'Error updating admin user',
  ADMIN_SUSPEND_ATTEMPT: 'Attempting to suspend admin user',
  ADMIN_SUSPENDED_SUCCESS: 'Admin user suspended successfully',
  ADMIN_REACTIVATE_ATTEMPT: 'Attempting to reactivate admin user',
  ADMIN_REACTIVATED_SUCCESS: 'Admin user reactivated successfully',
  RESET_LINK_SEND_ATTEMPT: 'Attempting to send password reset link',
  RESET_LINK_SENT_SUCCESS: 'Password reset link sent successfully',
  AUTH_SERVICE_CALL_ATTEMPT: 'Calling auth service API',
  AUTH_SERVICE_CALL_SUCCESS: 'Auth service API call successful',
  AUTH_SERVICE_CALL_ERROR: 'Auth service API call failed',

  // General
  REQUEST_RECEIVED: 'Request received',
  RESPONSE_SENT: 'Response sent',
};
