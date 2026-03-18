/**
 * Admin Interface JavaScript
 * Handles all interactive functionality for admin dashboard and user management
 */

class AdminManager {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 20;
    this.searchQuery = '';
    this.statusFilter = '';
    this.roleFilter = '';
    this.sortField = '';
    this.sortDirection = 'desc';
    this.selectedUsers = new Set();

    this.init();
  }

  init() {
    this.bindEvents();

    // Initialize based on current page
    if (window.location.pathname === '/admin') {
      this.initDashboard();
    } else if (window.location.pathname === '/admin/users') {
      this.initUserManagement();
    }
  }

  bindEvents() {
    // Search input with debouncing
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.currentPage = 1;
          this.loadUsers();
        }, 500);
      });

      // Enter key triggers search immediately
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          this.searchQuery = e.target.value;
          this.currentPage = 1;
          this.loadUsers();
        }
      });
    }

    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    const roleFilter = document.getElementById('roleFilter');
    const limitFilter = document.getElementById('limitFilter');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.statusFilter = statusFilter.value;
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        this.roleFilter = roleFilter.value;
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    if (limitFilter) {
      limitFilter.addEventListener('change', () => {
        this.pageSize = parseInt(limitFilter.value);
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeAllModals();
      }
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // =============================================
  // DASHBOARD FUNCTIONALITY
  // =============================================

  initDashboard() {
    console.log('📊 Initializing admin dashboard');
    // Dashboard is mostly server-rendered, just add interactive features
    this.loadRecentActivityIfNeeded();
  }

  async loadDetailedStats() {
    this.showLoading();

    try {
      const response = await fetch('/admin/api/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        this.showStatsModal(result.data.stats);
      } else {
        this.showAlert('Failed to load detailed statistics: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Load stats error:', error);
      this.showAlert('Failed to load detailed statistics. Please try again.', 'error');
    } finally {
      this.hideLoading();
    }
  }

  showStatsModal(stats) {
    const modal = document.getElementById('statsModal');
    const content = document.getElementById('detailedStatsContent');

    content.innerHTML = `
      <div class="stats-detailed-grid">
        <div class="stats-section">
          <h4><i class="fas fa-users"></i> User Statistics</h4>
          <div class="stats-list">
            <div class="stat-item">
              <span class="stat-name">Total Users</span>
              <span class="stat-value">${stats.users.total}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Active Users</span>
              <span class="stat-value">${stats.users.active}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Inactive Users</span>
              <span class="stat-value">${stats.users.inactive}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Admin Users</span>
              <span class="stat-value">${stats.users.admins}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">New Users (Today)</span>
              <span class="stat-value">${stats.users.newToday}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">New Users (This Week)</span>
              <span class="stat-value">${stats.users.newThisWeek}</span>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h4><i class="fas fa-sticky-note"></i> Note Statistics</h4>
          <div class="stats-list">
            <div class="stat-item">
              <span class="stat-name">Total Notes</span>
              <span class="stat-value">${stats.notes.total}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Public Notes</span>
              <span class="stat-value">${stats.notes.public}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Shared Notes</span>
              <span class="stat-value">${stats.notes.shared}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Created Today</span>
              <span class="stat-value">${stats.notes.createdToday}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Created This Week</span>
              <span class="stat-value">${stats.notes.createdThisWeek}</span>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h4><i class="fas fa-chart-line"></i> Activity Statistics</h4>
          <div class="stats-list">
            <div class="stat-item">
              <span class="stat-name">Active Users Today</span>
              <span class="stat-value">${stats.activity.activeUsersToday}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Active Users This Week</span>
              <span class="stat-value">${stats.activity.activeUsersThisWeek}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Average Notes Per User</span>
              <span class="stat-value">${stats.activity.averageNotesPerUser}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  closeStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.style.display = 'none';
  }

  async showRecentActivity() {
    const section = document.getElementById('recentActivitySection');
    section.style.display = 'block';

    // Load initial tab (users)
    this.showActivityTab('users');
  }

  async loadRecentActivityIfNeeded() {
    // Only load if the section is visible
    const section = document.getElementById('recentActivitySection');
    if (section && section.style.display !== 'none') {
      await this.loadRecentActivityData();
    }
  }

  async loadRecentActivityData() {
    try {
      const response = await fetch('/admin/api/activity?days=7');
      const result = await response.json();

      if (result.success) {
        this.displayRecentActivity(result.data.activity);
      } else {
        console.error('Failed to load recent activity:', result.message);
      }
    } catch (error) {
      console.error('Load recent activity error:', error);
    }
  }

  displayRecentActivity(activity) {
    // Display new users
    const usersList = document.getElementById('newUsersList');
    if (usersList && activity.newUsers) {
      if (activity.newUsers.length === 0) {
        usersList.innerHTML = '<div class="no-activity">No new users this week</div>';
      } else {
        usersList.innerHTML = activity.newUsers.map(user => `
          <div class="activity-item">
            <div class="activity-info">
              <div class="activity-title">${user.email}</div>
              <div class="activity-meta">New user registration</div>
            </div>
            <div class="activity-time">${this.formatTimeAgo(user.createdAt)}</div>
          </div>
        `).join('');
      }
    }

    // Display new notes
    const notesList = document.getElementById('newNotesList');
    if (notesList && activity.newNotes) {
      if (activity.newNotes.length === 0) {
        notesList.innerHTML = '<div class="no-activity">No new notes this week</div>';
      } else {
        notesList.innerHTML = activity.newNotes.map(note => `
          <div class="activity-item">
            <div class="activity-info">
              <div class="activity-title">${note.title || 'Untitled Note'}</div>
              <div class="activity-meta">Created by ${note.userId?.email || 'Unknown'}</div>
            </div>
            <div class="activity-time">${this.formatTimeAgo(note.createdAt)}</div>
          </div>
        `).join('');
      }
    }

    // Display recent logins
    const loginsList = document.getElementById('recentLoginsList');
    if (loginsList && activity.recentLogins) {
      if (activity.recentLogins.length === 0) {
        loginsList.innerHTML = '<div class="no-activity">No recent logins this week</div>';
      } else {
        loginsList.innerHTML = activity.recentLogins.map(login => `
          <div class="activity-item">
            <div class="activity-info">
              <div class="activity-title">${login.email}</div>
              <div class="activity-meta">User login</div>
            </div>
            <div class="activity-time">${this.formatTimeAgo(login.lastLoginAt)}</div>
          </div>
        `).join('');
      }
    }
  }

  showActivityTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[onclick="showActivityTab('${tabName}')"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.activity-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.getElementById(`${tabName}Activity`).classList.add('active');

    // Load data if needed
    if (!this.activityDataLoaded) {
      this.loadRecentActivityData();
      this.activityDataLoaded = true;
    }
  }

  // =============================================
  // USER MANAGEMENT FUNCTIONALITY
  // =============================================

  initUserManagement() {
    console.log('👥 Initializing user management');
    this.loadUsers();
  }

  async loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-row">
          <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            Loading users...
          </div>
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams({
        page: this.currentPage.toString(),
        limit: this.pageSize.toString(),
      });

      if (this.searchQuery) params.append('search', this.searchQuery);
      if (this.statusFilter) params.append('status', this.statusFilter);
      if (this.roleFilter) params.append('role', this.roleFilter);

      const response = await fetch(`/admin/api/users?${params}`);
      const result = await response.json();

      if (result.success) {
        this.displayUsers(result.data.users);
        this.updatePagination(result.data.pagination);
        this.updateUserCount(result.data.pagination.totalUsers);
      } else {
        this.showAlert('Failed to load users: ' + result.message, 'error');
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="loading-row">
              <div style="color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                Failed to load users
              </div>
            </td>
          </tr>
        `;
      }
    } catch (error) {
      console.error('Load users error:', error);
      this.showAlert('Failed to load users. Please try again.', 'error');
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-row">
            <div style="color: #ef4444;">
              <i class="fas fa-exclamation-triangle"></i>
              Error loading users
            </div>
          </td>
        </tr>
      `;
    }
  }

  displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-row">
            <div style="color: #6b7280;">
              <i class="fas fa-search"></i>
              No users found
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr data-user-id="${user._id}">
        <td>
          <div class="user-email">
            ${user.email}
          </div>
        </td>
        <td>
          <span class="user-display-name">${user.displayName || '<em>Not set</em>'}</span>
        </td>
        <td>
          <span class="role-badge ${user.role}">
            <i class="fas fa-${user.role === 'admin' ? 'crown' : 'user'}"></i>
            ${user.role}
          </span>
        </td>
        <td>
          <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
            <i class="fas fa-${user.isActive ? 'check-circle' : 'times-circle'}"></i>
            ${user.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <span class="date-display">${this.formatDate(user.createdAt)}</span>
        </td>
        <td>
          <div class="note-stats">
            <span class="note-count">${user.noteCount}</span>
            ${user.publicNotesCount > 0 ? `<small>(${user.publicNotesCount} public)</small>` : ''}
            ${user.sharedNotesCount > 0 ? `<small>(${user.sharedNotesCount} shared)</small>` : ''}
          </div>
        </td>
        <td>
          <span class="last-login">${user.lastLoginAt ? this.formatTimeAgo(user.lastLoginAt) : 'Never'}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-info btn-sm" onclick="adminManager.showUserDetails('${user._id}')">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-${user.isActive ? 'warning' : 'success'} btn-sm"
                    onclick="adminManager.showStatusConfirm('${user._id}', '${user.email}', ${user.isActive})"
                    ${user.role === 'admin' && user.isActive ? 'disabled title="Cannot deactivate admin users"' : ''}>
              <i class="fas fa-${user.isActive ? 'user-times' : 'user-check'}"></i> ${user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  updatePagination(pagination) {
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    if (info) {
      info.textContent = `Showing ${((pagination.currentPage - 1) * pagination.limit) + 1}-${Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of ${pagination.totalUsers} users`;
    }

    if (prevBtn) {
      prevBtn.disabled = !pagination.hasPreviousPage;
    }

    if (nextBtn) {
      nextBtn.disabled = !pagination.hasNextPage;
    }

    if (pageNumbers) {
      const pages = this.generatePageNumbers(pagination.currentPage, pagination.totalPages);
      pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
          return '<span class="page-ellipsis">...</span>';
        }
        return `
          <button class="page-btn ${page === pagination.currentPage ? 'active' : ''}"
                  onclick="adminManager.goToPage(${page})"
                  ${page === pagination.currentPage ? 'disabled' : ''}>
            ${page}
          </button>
        `;
      }).join('');
    }
  }

  generatePageNumbers(current, total) {
    const pages = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 4) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 3) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }

  updateUserCount(count) {
    const userCount = document.getElementById('userCount');
    if (userCount) {
      userCount.textContent = `${count} total users`;
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.loadUsers();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  nextPage() {
    this.currentPage++;
    this.loadUsers();
  }

  // =============================================
  // USER DETAILS AND STATUS MANAGEMENT
  // =============================================

  async showUserDetails(userId) {
    const modal = document.getElementById('userDetailsModal');
    const content = document.getElementById('userDetailsContent');

    content.innerHTML = '<div class="loading">Loading user details...</div>';
    modal.style.display = 'flex';

    try {
      const response = await fetch(`/admin/api/users/${userId}`);
      const result = await response.json();

      if (result.success) {
        const user = result.data.user;
        content.innerHTML = `
          <div class="user-details">
            <div class="detail-section">
              <h4><i class="fas fa-user"></i> Basic Information</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${user.email}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Display Name:</span>
                  <span class="detail-value">${user.displayName || '<em>Not set</em>'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">
                    <span class="role-badge ${user.role}">
                      <i class="fas fa-${user.role === 'admin' ? 'crown' : 'user'}"></i>
                      ${user.role}
                    </span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                      <i class="fas fa-${user.isActive ? 'check-circle' : 'times-circle'}"></i>
                      ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4><i class="fas fa-calendar"></i> Dates</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">${this.formatDate(user.createdAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Last Login:</span>
                  <span class="detail-value">${user.lastLoginAt ? this.formatDate(user.lastLoginAt) : 'Never'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Password Changed:</span>
                  <span class="detail-value">${user.passwordChangedAt ? this.formatDate(user.passwordChangedAt) : 'Never'}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4><i class="fas fa-sticky-note"></i> Note Statistics</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Total Notes:</span>
                  <span class="detail-value">${user.noteCount}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Public Notes:</span>
                  <span class="detail-value">${user.publicNotesCount}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Shared Notes:</span>
                  <span class="detail-value">${user.sharedNotesCount}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div style="color: #ef4444; text-align: center; padding: 20px;">
            <i class="fas fa-exclamation-triangle"></i>
            Failed to load user details: ${result.message}
          </div>
        `;
      }
    } catch (error) {
      console.error('Load user details error:', error);
      content.innerHTML = `
        <div style="color: #ef4444; text-align: center; padding: 20px;">
          <i class="fas fa-exclamation-triangle"></i>
          Error loading user details. Please try again.
        </div>
      `;
    }
  }

  closeUserDetailsModal() {
    const modal = document.getElementById('userDetailsModal');
    modal.style.display = 'none';
  }

  showStatusConfirm(userId, email, isCurrentlyActive) {
    this.statusChangeData = { userId, email, isCurrentlyActive };

    const modal = document.getElementById('statusConfirmModal');
    const userEmail = document.getElementById('statusUserEmail');
    const statusAction = document.getElementById('statusAction');
    const statusWarning = document.getElementById('statusWarning');
    const confirmBtn = document.getElementById('confirmStatusBtn');

    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';

    userEmail.textContent = email;
    statusAction.textContent = action;

    if (isCurrentlyActive) {
      statusWarning.innerHTML = `
        <strong>Warning:</strong> Deactivating this user will:
        <ul>
          <li>Prevent them from logging in</li>
          <li>Keep their notes safe (not deleted)</li>
          <li>Allow admin reactivation later</li>
        </ul>
      `;
      confirmBtn.className = 'btn btn-warning';
      confirmBtn.innerHTML = '<i class="fas fa-user-times"></i> Deactivate User';
    } else {
      statusWarning.innerHTML = `
        <strong>Note:</strong> Activating this user will allow them to log in and access their account again.
      `;
      confirmBtn.className = 'btn btn-success';
      confirmBtn.innerHTML = '<i class="fas fa-user-check"></i> Activate User';
    }

    modal.style.display = 'flex';
  }

  async confirmStatusChange() {
    if (!this.statusChangeData) return;

    const { userId } = this.statusChangeData;

    this.closeStatusConfirmModal();
    this.showLoading();

    try {
      const response = await fetch(`/admin/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        this.showAlert(`User ${result.data.newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
        this.loadUsers(); // Refresh the user list
      } else {
        this.showAlert('Failed to update user status: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Status change error:', error);
      this.showAlert('Failed to update user status. Please try again.', 'error');
    } finally {
      this.hideLoading();
    }
  }

  closeStatusConfirmModal() {
    const modal = document.getElementById('statusConfirmModal');
    modal.style.display = 'none';
    this.statusChangeData = null;
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(dateString);
    }
  }

  showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
      ${message}
    `;

    // Insert at the top of the admin container
    const container = document.querySelector('.admin-container');
    if (container) {
      container.insertBefore(alert, container.firstChild);
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 5000);

    // Scroll to top to show the alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }

  // =============================================
  // SEARCH AND FILTERING
  // =============================================

  searchUsers() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      this.searchQuery = searchInput.value;
      this.currentPage = 1;
      this.loadUsers();
    }
  }

  clearSearch() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      searchInput.value = '';
      this.searchQuery = '';
      this.currentPage = 1;
      this.loadUsers();
    }
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadUsers();
  }

  sortUsers(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.loadUsers();
  }
}

// =============================================
// GLOBAL FUNCTIONS (called from templates)
// =============================================

function loadDetailedStats() {
  adminManager.loadDetailedStats();
}

function closeStatsModal() {
  adminManager.closeStatsModal();
}

function showRecentActivity() {
  adminManager.showRecentActivity();
}

function showActivityTab(tabName) {
  adminManager.showActivityTab(tabName);
}

function searchUsers() {
  adminManager.searchUsers();
}

function clearSearch() {
  adminManager.clearSearch();
}

function applyFilters() {
  adminManager.applyFilters();
}

function sortUsers(field) {
  adminManager.sortUsers(field);
}

function previousPage() {
  adminManager.previousPage();
}

function nextPage() {
  adminManager.nextPage();
}

function closeUserDetailsModal() {
  adminManager.closeUserDetailsModal();
}

function closeStatusConfirmModal() {
  adminManager.closeStatusConfirmModal();
}

function confirmStatusChange() {
  adminManager.confirmStatusChange();
}

// Initialize admin manager when DOM is loaded
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
  adminManager = new AdminManager();
});