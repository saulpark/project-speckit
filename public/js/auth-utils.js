/**
 * Authentication Utilities Module
 * Helper functions for authentication flows
 */

window.SpecKit = window.SpecKit || {};

SpecKit.authUtils = {
  // Password strength meter
  getPasswordStrength(password) {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z\d]/.test(password),
      password.length >= 12
    ];

    strength = checks.filter(Boolean).length;

    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669', '#047857'];

    return {
      score: strength,
      level: levels[strength] || 'Very Weak',
      color: colors[strength] || '#ef4444',
      percentage: Math.min((strength / 5) * 100, 100)
    };
  },

  // Create password strength indicator
  createPasswordStrengthIndicator(inputElement) {
    const indicator = document.createElement('div');
    indicator.className = 'password-strength-indicator';
    indicator.innerHTML = `
      <div class="strength-bar">
        <div class="strength-fill"></div>
      </div>
      <div class="strength-text"></div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .password-strength-indicator {
        margin-top: 0.5rem;
        font-size: 0.875rem;
      }
      .strength-bar {
        width: 100%;
        height: 4px;
        background-color: #e2e8f0;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 0.25rem;
      }
      .strength-fill {
        height: 100%;
        background-color: #ef4444;
        width: 0%;
        transition: all 0.3s ease;
      }
      .strength-text {
        color: #64748b;
      }
    `;
    document.head.appendChild(style);

    inputElement.addEventListener('input', () => {
      const strength = this.getPasswordStrength(inputElement.value);
      const fill = indicator.querySelector('.strength-fill');
      const text = indicator.querySelector('.strength-text');

      fill.style.width = strength.percentage + '%';
      fill.style.backgroundColor = strength.color;
      text.textContent = inputElement.value ? `Password strength: ${strength.level}` : '';
    });

    inputElement.parentNode.insertBefore(indicator, inputElement.nextSibling);
    return indicator;
  },

  // Rate limiting helper
  rateLimitTracker: {
    attempts: {},

    isRateLimited(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
      const now = Date.now();
      const window = this.attempts[key] || [];

      // Filter out attempts outside the window
      const recentAttempts = window.filter(attempt => now - attempt < windowMs);

      // Update the tracker
      this.attempts[key] = recentAttempts;

      return recentAttempts.length >= maxAttempts;
    },

    recordAttempt(key) {
      this.attempts[key] = this.attempts[key] || [];
      this.attempts[key].push(Date.now());
    },

    getRemainingTime(key, windowMs = 15 * 60 * 1000) {
      const window = this.attempts[key];
      if (!window || window.length === 0) return 0;

      const oldestAttempt = Math.min(...window);
      const timeElapsed = Date.now() - oldestAttempt;
      const remaining = windowMs - timeElapsed;

      return Math.max(0, remaining);
    }
  },

  // Format time for display
  formatTime(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds} seconds`;

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} minutes`;

    const hours = Math.ceil(minutes / 60);
    return `${hours} hours`;
  },

  // Email domain validation
  isDisposableEmail(email) {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email'
    ];

    const domain = email.split('@')[1];
    return disposableDomains.includes(domain?.toLowerCase());
  },

  // Check if email is already registered
  async checkEmailAvailability(email) {
    try {
      const data = await SpecKit.auth.apiRequest('/check-email', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return {
        available: data.data.available,
        message: data.data.message
      };
    } catch (error) {
      return {
        available: true, // Assume available on error
        message: 'Unable to check email availability'
      };
    }
  },

  // Setup email availability checker
  setupEmailChecker(emailField) {
    let timeout;

    emailField.addEventListener('input', () => {
      clearTimeout(timeout);

      if (!emailField.value || !SpecKit.utils.isValidEmail(emailField.value)) {
        this.removeEmailFeedback(emailField);
        return;
      }

      timeout = setTimeout(async () => {
        const result = await this.checkEmailAvailability(emailField.value);
        this.showEmailFeedback(emailField, result);
      }, 1000);
    });
  },

  // Show email feedback
  showEmailFeedback(emailField, result) {
    this.removeEmailFeedback(emailField);

    const feedback = document.createElement('div');
    feedback.className = `email-feedback ${result.available ? 'email-available' : 'email-taken'}`;
    feedback.textContent = result.message;

    const style = document.createElement('style');
    style.textContent = `
      .email-feedback {
        margin-top: 0.25rem;
        font-size: 0.875rem;
      }
      .email-available {
        color: #10b981;
      }
      .email-taken {
        color: #ef4444;
      }
    `;
    document.head.appendChild(style);

    emailField.parentNode.insertBefore(feedback, emailField.nextSibling);
  },

  // Remove email feedback
  removeEmailFeedback(emailField) {
    const existing = emailField.parentNode.querySelector('.email-feedback');
    if (existing) {
      existing.remove();
    }
  },

  // Auto-complete prevention
  preventAutoComplete(form) {
    // Add honeypot field
    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'website';
    honeypot.style.display = 'none';
    honeypot.tabIndex = -1;
    honeypot.autoComplete = 'off';

    form.appendChild(honeypot);

    // Check honeypot on submit
    form.addEventListener('submit', (e) => {
      if (honeypot.value) {
        e.preventDefault();
        console.warn('Bot detected via honeypot');
        return false;
      }
    });
  }
};

// Initialize enhanced features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Setup password strength indicators
  const passwordFields = document.querySelectorAll('input[type="password"][id="password"]');
  passwordFields.forEach(field => {
    SpecKit.authUtils.createPasswordStrengthIndicator(field);
  });

  // Setup email availability checking only on registration pages
  if (window.location.pathname.includes('/register') || window.location.pathname.includes('/signup')) {
    const emailFields = document.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
      SpecKit.authUtils.setupEmailChecker(field);
    });
  }

  // Setup bot prevention
  const forms = document.querySelectorAll('form[id*="Form"]');
  forms.forEach(form => {
    SpecKit.authUtils.preventAutoComplete(form);
  });
});