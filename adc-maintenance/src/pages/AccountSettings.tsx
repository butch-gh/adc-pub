import { useState } from 'react'
import { toast } from 'sonner'
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { userAccountSettingsApi } from '../lib/maintenance-api'

export function AccountSettings() {
  // Username change state
  const [usernameForm, setUsernameForm] = useState({
    currentUsername: '',
    newUsername: ''
  })
  const [usernameErrors, setUsernameErrors] = useState<{[key: string]: string}>({})
  const [isUsernameSubmitting, setIsUsernameSubmitting] = useState(false)

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({})
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)

  // Username validation
  const validateUsername = (username: string): string | null => {
    if (!username) return 'Username is required'
    if (username.length < 4 || username.length > 20) {
      return 'Username must be between 4 and 20 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    return null
  }

  // Password strength validation
  const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' }
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    const requirements = [hasUppercase, hasLowercase, hasNumber, hasSpecial]
    const metRequirements = requirements.filter(Boolean).length

    if (metRequirements < 4) {
      return {
        isValid: false,
        message: `Password strength: ${metRequirements}/4 requirements met (uppercase, lowercase, number, special character)`
      }
    }

    return { isValid: true, message: 'Strong password' }
  }

  // Handle username form submission
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: {[key: string]: string} = {}

    if (!usernameForm.currentUsername.trim()) {
      errors.currentUsername = 'Current username is required'
    }

    const newUsernameError = validateUsername(usernameForm.newUsername)
    if (newUsernameError) {
      errors.newUsername = newUsernameError
    }

    if (usernameForm.currentUsername === usernameForm.newUsername) {
      errors.newUsername = 'New username must be different from current username'
    }

    setUsernameErrors(errors)

    if (Object.keys(errors).length > 0) return

    setIsUsernameSubmitting(true)

    try {
      await userAccountSettingsApi.changeUserName(usernameForm.currentUsername, usernameForm.newUsername)
      toast.success('Username changed successfully')
      setUsernameForm({ currentUsername: '', newUsername: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change username')
    } finally {
      setIsUsernameSubmitting(false)
    }
  }

  // Handle password form submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: {[key: string]: string} = {}

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }

    const strength = validatePasswordStrength(passwordForm.newPassword)
    if (!strength.isValid) {
      errors.newPassword = strength.message
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password'
    }

    setPasswordErrors(errors)

    if (Object.keys(errors).length > 0) return

    setIsPasswordSubmitting(true)

    try {
      await userAccountSettingsApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  const passwordStrength = validatePasswordStrength(passwordForm.newPassword)
  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword !== ''

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account security settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Change Username Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Change Username</h3>
            </div>
          </div>
          <form onSubmit={handleUsernameSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="currentUsername" className="block text-sm font-medium text-gray-700">
                Current Username
              </label>
              <input
                type="text"
                id="currentUsername"
                value={usernameForm.currentUsername}
                onChange={(e) => setUsernameForm(prev => ({ ...prev, currentUsername: e.target.value }))}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usernameErrors.currentUsername ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your current username"
              />
              {usernameErrors.currentUsername && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {usernameErrors.currentUsername}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700">
                New Username
              </label>
              <input
                type="text"
                id="newUsername"
                value={usernameForm.newUsername}
                onChange={(e) => setUsernameForm(prev => ({ ...prev, newUsername: e.target.value }))}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  usernameErrors.newUsername ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your new username"
              />
              {usernameErrors.newUsername && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {usernameErrors.newUsername}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Username must be 4-20 characters, containing only letters, numbers, and underscores.
              </p>
            </div>

            <button
              type="submit"
              disabled={isUsernameSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUsernameSubmitting ? 'Changing...' : 'Change Username'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your current password"
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
              />
              {passwordForm.newPassword && (
                <div className="mt-1 flex items-center text-sm">
                  {passwordStrength.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={passwordStrength.isValid ? 'text-green-600' : 'text-red-600'}>
                    {passwordStrength.message}
                  </span>
                </div>
              )}
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {passwordErrors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
              />
              {passwordForm.confirmPassword && (
                <div className="mt-1 flex items-center text-sm">
                  {passwordsMatch ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={passwordsMatch ? 'text-green-600' : 'text-red-600'}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPasswordSubmitting || !passwordStrength.isValid || !passwordsMatch}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}