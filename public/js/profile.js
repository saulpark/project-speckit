/**
 * Profile Management JavaScript
 * Handles profile updates, password changes, and account management
 */

class ProfileManager {
  constructor() {
    this.initializeEventListeners();
    this.initializePasswordValidation();
    this.loadProfileData();
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
    }

    // Password change form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
    }


    // Password strength checking
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', this.checkPasswordStrength.bind(this));
      newPasswordInput.addEventListener('input', this.validatePasswordRequirements.bind(this));
    }

    // Password confirmation matching
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', this.checkPasswordMatch.bind(this));
    }

    // Display name character counter
    const displayNameInput = document.getElementById('displayName');
    if (displayNameInput) {
      this.addCharacterCounter(displayNameInput, 50);
    }
  }

  /**
   * Initialize password validation
   */
  initializePasswordValidation() {
    this.passwordRequirements = {
      length: { test: (pwd) => pwd.length >= 8, element: 'req-length' },
      uppercase: { test: (pwd) => /[A-Z]/.test(pwd), element: 'req-uppercase' },
      lowercase: { test: (pwd) => /[a-z]/.test(pwd), element: 'req-lowercase' },
      number: { test: (pwd) => /\d/.test(pwd), element: 'req-number' },
      special: { test: (pwd) => /[@$!%*?&]/.test(pwd), element: 'req-special' }
    };
  }

  /**
   * Load initial profile data
   */
  async loadProfileData() {
    try {
      const response = await fetch('/profile/api', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load profile data');
      }

      const data = await response.json();
      if (data.success) {
        this.populateProfileData(data.data.profile);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      this.showAlert('error', 'Failed to load profile data');
    }
  }

  /**
   * Populate form with profile data
   */
  populateProfileData(profile) {
    const displayNameInput = document.getElementById('displayName');
    if (displayNameInput && profile.displayName) {
      displayNameInput.value = profile.displayName;
    }
  }

  /**
   * Handle profile update form submission
   */
  async handleProfileUpdate(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const displayName = formData.get('displayName')?.trim() || null;

    this.setFormLoading(form, true);

    try {
      const response = await fetch('/profile/api', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ displayName })
      });

      const data = await response.json();

      if (data.success) {
        this.showAlert('success', 'Profile updated successfully!');
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      this.showAlert('error', error.message || 'Failed to update profile');
    } finally {
      this.setFormLoading(form, false);
    }
  }

  /**
   * Handle password change form submission
   */
  async handlePasswordChange(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      this.showAlert('error', 'New passwords do not match');
      return;
    }

    // Check password strength
    const strength = this.calculatePasswordStrength(newPassword);
    if (strength.score < 3) {
      this.showAlert('error', 'Password is too weak. Please choose a stronger password.');
      return;
    }

    this.setFormLoading(form, true);

    try {
      const response = await fetch('/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showAlert('success', 'Password changed successfully! You will be logged out.');

        // Clear the form
        form.reset();

        // Redirect to login after a brief delay
        setTimeout(() => {
          window.location.href = '/auth/login?passwordChanged=true';
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to change password');
      }

    } catch (error) {
      console.error('Error changing password:', error);
      this.showAlert('error', error.message || 'Failed to change password');
    } finally {
      this.setFormLoading(form, false);
    }
  }


  /**
   * Check password strength and update meter
   */
  checkPasswordStrength(event) {
    const password = event.target.value;
    const strength = this.calculatePasswordStrength(password);

    const fillElement = document.getElementById('strength-fill');
    const textElement = document.getElementById('strength-text');

    if (fillElement && textElement) {
      // Remove all strength classes
      fillElement.className = 'strength-fill';

      if (password.length === 0) {
        textElement.textContent = 'Enter password';
        return;
      }

      // Add appropriate strength class and text
      const strengthLevels = [
        { class: 'strength-weak', text: 'Very Weak' },
        { class: 'strength-weak', text: 'Weak' },
        { class: 'strength-fair', text: 'Fair' },
        { class: 'strength-good', text: 'Good' },
        { class: 'strength-strong', text: 'Strong' },
        { class: 'strength-very-strong', text: 'Very Strong' }
      ];

      const level = strengthLevels[strength.score] || strengthLevels[0];
      fillElement.classList.add(level.class);
      textElement.textContent = level.text;
    }
  }

  /**
   * Calculate password strength score
   */
  calculatePasswordStrength(password) {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    // Bonus for character variety
    const uniqueChars = new Set(password.split('')).size;
    if (uniqueChars > password.length * 0.7) score++;

    return {
      score: Math.min(score, 5),
      feedback
    };
  }

  /**
   * Validate password requirements and update UI
   */
  validatePasswordRequirements(event) {
    const password = event.target.value;

    for (const [key, requirement] of Object.entries(this.passwordRequirements)) {
      const element = document.getElementById(requirement.element);
      if (element) {
        if (requirement.test(password)) {
          element.classList.add('valid');
        } else {
          element.classList.remove('valid');
        }
      }
    }
  }

  /**
   * Check if passwords match
   */
  checkPasswordMatch() {
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const feedback = document.getElementById('password-match');

    if (feedback) {
      if (confirmPassword.length === 0) {
        feedback.textContent = '';
        feedback.className = 'password-feedback';
      } else if (newPassword === confirmPassword) {
        feedback.textContent = 'Passwords match ✓';
        feedback.className = 'password-feedback match';
      } else {
        feedback.textContent = 'Passwords do not match ✗';
        feedback.className = 'password-feedback no-match';
      }
    }
  }

  /**
   * Add character counter to input field
   */
  addCharacterCounter(input, maxLength) {
    const counter = document.createElement('small');
    counter.className = 'character-counter';
    counter.style.color = '#6c757d';
    counter.style.fontSize = '0.75rem';
    counter.style.marginTop = '0.25rem';

    const updateCounter = () => {
      const current = input.value.length;
      counter.textContent = `${current}/${maxLength} characters`;

      if (current > maxLength * 0.9) {
        counter.style.color = '#dc3545';
      } else if (current > maxLength * 0.7) {
        counter.style.color = '#fd7e14';
      } else {
        counter.style.color = '#6c757d';
      }
    };

    input.addEventListener('input', updateCounter);
    input.parentNode.appendChild(counter);
    updateCounter();
  }

  /**
   * Set form loading state
   */
  setFormLoading(form, loading) {
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, textarea, select');

    if (loading) {
      submitButton?.classList.add('loading');
      inputs.forEach(input => input.disabled = true);
      this.showLoading(true);
    } else {
      submitButton?.classList.remove('loading');
      inputs.forEach(input => input.disabled = false);
      this.showLoading(false);
    }
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show alert message
   */
  showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;

    const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    alert.innerHTML = `<i class="${icon}"></i> ${message}`;

    // Insert at the top of profile container
    const container = document.querySelector('.profile-container');
    const header = document.querySelector('.profile-header');

    if (container && header) {
      container.insertBefore(alert, header.nextSibling);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);

    // Scroll to top to show alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


// Handlebars helpers for the template
if (typeof Handlebars !== 'undefined') {
  // Helper for calculating days ago
  Handlebars.registerHelper('calculateDaysAgo', function(date) {
    if (!date) return 0;
    const now = new Date();
    const past = new Date(date);
    const diffTime = Math.abs(now - past);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });

  // Helper for date formatting
  Handlebars.registerHelper('formatDate', function(date, format) {
    if (!date) return 'Never';

    const d = new Date(date);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (format && format.includes('h:mm A')) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }

    return d.toLocaleDateString('en-US', options);
  });

  // Helper for equality check
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
}

// Initialize profile manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.profile-container')) {
    new ProfileManager();
  }
});


// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileManager;
}