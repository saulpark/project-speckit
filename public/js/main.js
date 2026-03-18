/**
 * Project SpecKit - Main JavaScript
 * Client-side functionality for authentication system
 */

// Main application namespace
window.SpecKit = window.SpecKit || {};

// Configuration
SpecKit.config = {
  apiBaseUrl: '/auth',
  tokenKey: 'speckit_token',
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  maxRetries: 3
};

// Utility functions
SpecKit.utils = {
  // Get CSRF token from meta tag or server response
  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      return meta.getAttribute('content');
    }

    // Try to get from response header (if set during page load)
    const xhr = new XMLHttpRequest();
    xhr.open('GET', window.location.pathname, false);
    xhr.send();
    return xhr.getResponseHeader('X-CSRF-Token');
  },

  // Refresh CSRF token
  async refreshCSRFToken() {
    try {
      const response = await fetch(window.location.pathname);
      const token = response.headers.get('X-CSRF-Token');
      if (token) {
        // Update meta tag if it exists
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
          meta.setAttribute('content', token);
        } else {
          // Create meta tag if it doesn't exist
          const newMeta = document.createElement('meta');
          newMeta.name = 'csrf-token';
          newMeta.content = token;
          document.head.appendChild(newMeta);
        }
        return token;
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
    return null;
  },

  // Local storage helpers
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Storage set error:', error);
        return false;
      }
    },

    get(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Storage get error:', error);
        return null;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Storage remove error:', error);
        return false;
      }
    }
  },

  // Show/hide loading state
  showLoading(element, text = 'Loading...') {
    const original = element.innerHTML;
    element.setAttribute('data-original-content', original);
    element.innerHTML = `
      <span class="spinner" style="display: inline-block; width: 1em; height: 1em; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5em;"></span>
      ${text}
    `;
    element.disabled = true;
  },

  hideLoading(element) {
    const original = element.getAttribute('data-original-content');
    if (original) {
      element.innerHTML = original;
      element.removeAttribute('data-original-content');
    }
    element.disabled = false;
  },

  // Show alerts
  showAlert(message, type = 'info', container = null) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
      <span>${message}</span>
      <button type="button" class="alert-close" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2em; cursor: pointer;">&times;</button>
    `;

    const targetContainer = container || document.querySelector('.auth-card') || document.body;
    targetContainer.insertBefore(alertElement, targetContainer.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertElement.parentElement) {
        alertElement.remove();
      }
    }, 5000);
  },

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password strength validation
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // JWT utilities for client-side token management
  jwt: {
    // Decode JWT token without verification (client-side only)
    decode(token) {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          return null;
        }

        const payload = parts[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded;
      } catch (error) {
        console.error('JWT decode error:', error);
        return null;
      }
    },

    // Check if token is expired
    isExpired(token) {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    },

    // Get token expiration date
    getTokenExpiration(token) {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    }
  }
};

// Authentication module
SpecKit.auth = {
  currentUser: null,
  token: null,

  // Initialize authentication state
  async init() {
    this.token = SpecKit.utils.storage.get(SpecKit.config.tokenKey);
    await this.checkAuthenticationStatus();

    // Set up logout button handlers
    this.setupLogoutButtons();
  },

  // Setup logout button functionality
  setupLogoutButtons() {
    const logoutButtons = document.querySelectorAll('[data-logout]');
    logoutButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();

        // Show confirmation if needed
        const needsConfirm = button.getAttribute('data-confirm') === 'true';
        if (needsConfirm && !confirm('Are you sure you want to logout?')) {
          return;
        }

        // Disable button during logout
        const originalText = button.textContent;
        button.textContent = 'Logging out...';
        button.disabled = true;

        try {
          await this.performLogout();
        } finally {
          button.textContent = originalText;
          button.disabled = false;
        }
      });
    });
  },

  // Make authenticated API request
  async apiRequest(endpoint, options = {}) {
    const url = `${SpecKit.config.apiBaseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add authorization header if token exists
    if (this.token) {
      defaultOptions.headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add CSRF token if available
    const csrfToken = SpecKit.utils.getCSRFToken();
    if (csrfToken) {
      defaultOptions.headers['X-CSRF-Token'] = csrfToken;
    }

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // Login user
  async login(email, password, rememberMe = false) {
    try {
      const data = await this.apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe })
      });

      if (data.success && data.data.token) {
        this.token = data.data.token;
        this.currentUser = data.data.user;

        SpecKit.utils.storage.set(SpecKit.config.tokenKey, this.token);

        return {
          success: true,
          user: this.currentUser,
          message: data.message
        };
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Register user
  async register(email, password) {
    try {
      const data = await this.apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.success) {
        return {
          success: true,
          user: data.data.user,
          message: data.message
        };
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Logout user
  async logout() {
    try {
      if (this.token) {
        await this.apiRequest('/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      this.token = null;
      this.currentUser = null;
      SpecKit.utils.storage.remove(SpecKit.config.tokenKey);
    }
  },

  // Verify current token
  async verifyToken() {
    if (!this.token) return false;

    try {
      const data = await this.apiRequest('/me');
      if (data.success && data.data.user) {
        this.currentUser = data.data.user;
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.logout();
      return false;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.token && this.currentUser);
  },

  // Update UI for authenticated state
  updateUIForAuthentication(user) {
    this.currentUser = user;

    // Update page elements if they exist
    const userDisplays = document.querySelectorAll('[data-user-email]');
    userDisplays.forEach(el => {
      el.textContent = user.email;
    });

    const userNames = document.querySelectorAll('[data-user-name]');
    userNames.forEach(el => {
      el.textContent = user.email.split('@')[0]; // Use email prefix as name
    });

    // Show/hide authentication elements
    const authElements = document.querySelectorAll('[data-auth="true"]');
    const noAuthElements = document.querySelectorAll('[data-auth="false"]');

    authElements.forEach(el => {
      el.style.display = 'block';
    });

    noAuthElements.forEach(el => {
      el.style.display = 'none';
    });

    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { authenticated: true, user }
    }));
  },

  // Update UI for unauthenticated state
  updateUIForLogout() {
    this.currentUser = null;

    // Hide/show authentication elements
    const authElements = document.querySelectorAll('[data-auth="true"]');
    const noAuthElements = document.querySelectorAll('[data-auth="false"]');

    authElements.forEach(el => {
      el.style.display = 'none';
    });

    noAuthElements.forEach(el => {
      el.style.display = 'block';
    });

    // Clear user displays
    const userDisplays = document.querySelectorAll('[data-user-email], [data-user-name]');
    userDisplays.forEach(el => {
      el.textContent = '';
    });

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { authenticated: false, user: null }
    }));
  },

  // Enhanced logout with UI updates
  async performLogout() {
    try {
      await this.logout();
      this.updateUIForLogout();
      SpecKit.utils.showAlert('You have been logged out successfully', 'success');

      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      SpecKit.utils.showAlert('Logout completed (with errors)', 'warning');
      this.updateUIForLogout();
    }
  },

  // Check authentication on page load
  async checkAuthenticationStatus() {
    if (!this.token) {
      this.updateUIForLogout();
      return false;
    }

    try {
      const isValid = await this.verifyToken();
      if (isValid) {
        this.updateUIForAuthentication(this.currentUser);
        return true;
      } else {
        this.updateUIForLogout();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      this.updateUIForLogout();
      return false;
    }
  }
};

// Form handling
SpecKit.forms = {
  // Initialize form handlers
  init() {
    this.setupLoginForm();
    this.setupRegisterForm();
    this.setupValidation();
  },

  // Setup login form
  setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const emailField = loginForm.querySelector('#email');
      const passwordField = loginForm.querySelector('#password');
      const rememberField = loginForm.querySelector('#rememberMe');

      // Clear previous alerts
      document.querySelectorAll('.alert').forEach(alert => alert.remove());

      // Validate inputs
      if (!emailField.value || !passwordField.value) {
        SpecKit.utils.showAlert('Please fill in all fields', 'error');
        return;
      }

      if (!SpecKit.utils.isValidEmail(emailField.value)) {
        SpecKit.utils.showAlert('Please enter a valid email address', 'error');
        return;
      }

      // Show loading
      SpecKit.utils.showLoading(submitBtn, 'Signing in...');

      try {
        const result = await SpecKit.auth.login(
          emailField.value,
          passwordField.value,
          rememberField?.checked || false
        );

        if (result.success) {
          SpecKit.utils.showAlert('Login successful! Redirecting...', 'success');

          // Update authentication state
          SpecKit.auth.updateUIForAuthentication(result.user);

          // Redirect to dashboard or intended page
          const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1500);
        } else {
          SpecKit.utils.showAlert(result.error || 'Login failed', 'error');
        }
      } catch (error) {
        SpecKit.utils.showAlert('An error occurred. Please try again.', 'error');
      } finally {
        SpecKit.utils.hideLoading(submitBtn);
      }
    });
  },

  // Setup register form
  setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const emailField = registerForm.querySelector('#email');
      const passwordField = registerForm.querySelector('#password');
      const confirmPasswordField = registerForm.querySelector('#confirmPassword');

      // Clear previous alerts
      document.querySelectorAll('.alert').forEach(alert => alert.remove());

      // Validate inputs
      if (!emailField.value || !passwordField.value) {
        SpecKit.utils.showAlert('Please fill in all fields', 'error');
        return;
      }

      if (!SpecKit.utils.isValidEmail(emailField.value)) {
        SpecKit.utils.showAlert('Please enter a valid email address', 'error');
        return;
      }

      // Validate password strength
      const passwordValidation = SpecKit.utils.validatePassword(passwordField.value);
      if (!passwordValidation.isValid) {
        SpecKit.utils.showAlert(passwordValidation.errors.join('<br>'), 'error');
        return;
      }

      // Check password confirmation
      if (confirmPasswordField && confirmPasswordField.value !== passwordField.value) {
        SpecKit.utils.showAlert('Passwords do not match', 'error');
        return;
      }

      // Show loading
      SpecKit.utils.showLoading(submitBtn, 'Creating account...');

      try {
        const result = await SpecKit.auth.register(emailField.value, passwordField.value);

        if (result.success) {
          SpecKit.utils.showAlert('Registration successful! Please log in.', 'success');

          // Pre-fill email in login form
          const loginUrl = '/auth/login?email=' + encodeURIComponent(emailField.value);
          setTimeout(() => {
            window.location.href = loginUrl;
          }, 2000);
        } else {
          SpecKit.utils.showAlert(result.error || 'Registration failed', 'error');
        }
      } catch (error) {
        SpecKit.utils.showAlert('An error occurred. Please try again.', 'error');
      } finally {
        SpecKit.utils.hideLoading(submitBtn);
      }
    });
  },

  // Setup real-time validation
  setupValidation() {
    // Email validation
    const emailFields = document.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
      field.addEventListener('blur', () => {
        if (field.value && !SpecKit.utils.isValidEmail(field.value)) {
          field.classList.add('is-invalid');
        } else {
          field.classList.remove('is-invalid');
        }
      });
    });

    // Password validation
    const passwordFields = document.querySelectorAll('input[type="password"][id="password"]');
    passwordFields.forEach(field => {
      field.addEventListener('input', () => {
        const validation = SpecKit.utils.validatePassword(field.value);
        if (field.value && !validation.isValid) {
          field.classList.add('is-invalid');
        } else {
          field.classList.remove('is-invalid');
        }
      });
    });

    // Password confirmation
    const confirmFields = document.querySelectorAll('#confirmPassword');
    confirmFields.forEach(field => {
      field.addEventListener('input', () => {
        const passwordField = document.querySelector('#password');
        if (field.value && passwordField && field.value !== passwordField.value) {
          field.classList.add('is-invalid');
        } else {
          field.classList.remove('is-invalid');
        }
      });
    });
  }
};

// Mobile Navigation
window.toggleMobileMenu = function() {
  const navMenu = document.querySelector('.nav-menu');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn i');

  if (navMenu) {
    navMenu.classList.toggle('active');

    // Toggle icon between hamburger and close
    if (mobileMenuBtn) {
      if (navMenu.classList.contains('active')) {
        mobileMenuBtn.className = 'fas fa-times';
      } else {
        mobileMenuBtn.className = 'fas fa-bars';
      }
    }
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await SpecKit.auth.init();
  SpecKit.forms.init();

  // Pre-fill login form email from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  if (emailParam) {
    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = emailParam;
      const passwordField = document.getElementById('password');
      if (passwordField) {
        passwordField.focus();
      }
    }
  }
});