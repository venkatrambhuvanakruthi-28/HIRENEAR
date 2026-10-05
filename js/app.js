/**
 * HireNear — Main Application Logic
 * Modern, responsive mobile-first local job marketplace with explainable AI matching.
 */

import { StorageService, AuthService, JobService, ApplicationService, ChatService, NotificationService, TrustSafetyService } from './services.js';
import { AIMatchingEngine } from './ai-matching.js';
import { INITIAL_CATEGORIES, COMMUNITY_GUIDELINES } from './data.js';

// Application State
const state = {
  currentUser: null,
  activeTab: 'home', // 'home' | 'search' | 'saved' | 'applications' | 'messages' | 'profile' | 'admin' | 'myjobs'
  deviceMode: 'mobile', // 'mobile' | 'desktop'
  selectedCategory: 'all',
  selectedJobType: '',
  searchQuery: '',
  maxDistanceKm: 25,
  minSalary: 0,
  quickFilter: 'all',
  activeConversation: null, // For messaging
  selectedJobForDetails: null,
  selectedCandidateForDetails: null
};

// Available Indian Localities with coordinates
const POPULAR_LOCALITIES = [
  { name: "Kukatpally, Hyderabad", area: "West Zone (JNTU / Metro Corridor)" },
  { name: "Gachibowli, Hyderabad", area: "Financial District / IT Corridor" },
  { name: "Madhapur, Hyderabad", area: "Hitec City / Ayyappa Society" },
  { name: "Miyapur, Hyderabad", area: "Metro Terminal / Allwyn Colony" },
  { name: "Secunderabad", area: "Clock Tower / Railway Hub" },
  { name: "Begumpet, Hyderabad", area: "Central Zone / Prakash Nagar" },
  { name: "Uppal, Hyderabad", area: "East Zone / Stadium Road" },
  { name: "Dilsukhnagar, Hyderabad", area: "South-East / Commercial Market" },
  { name: "Kondapur, Hyderabad", area: "Cyberabad / Botanical Garden" },
  { name: "Banjara Hills, Hyderabad", area: "Central Upscale / Road No. 12" }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  StorageService.init();
  state.currentUser = AuthService.getCurrentUser();
  setupEventListeners();
  setupDeviceControls();
  renderApp();
  updateNotifBadge();
  if (window.lucide) window.lucide.createIcons();
});

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'error') iconName = 'x-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 ${type === 'success' ? 'text-teal-400' : type === 'warning' ? 'text-amber-400' : type === 'error' ? 'text-rose-400' : 'text-blue-400'}"></i>
    <span class="flex-1">${message}</span>
  `;
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Device View Toggle (Mobile Mockup vs Responsive Desktop)
function setupDeviceControls() {
  const btnMobile = document.getElementById('btnModeMobile');
  const btnDesktop = document.getElementById('btnModeDesktop');
  const viewport = document.getElementById('appViewport');

  btnMobile.addEventListener('click', () => {
    state.deviceMode = 'mobile';
    viewport.className = 'app-viewport-container mode-mobile';
    btnMobile.classList.add('active-mode');
    btnDesktop.classList.remove('active-mode');
  });

  btnDesktop.addEventListener('click', () => {
    state.deviceMode = 'desktop';
    viewport.className = 'app-viewport-container mode-desktop';
    btnDesktop.classList.add('active-mode');
    btnMobile.classList.remove('active-mode');
  });

  // Role Switch Buttons
  document.getElementById('switchSeekerBtn').addEventListener('click', () => {
    AuthService.setCurrentUser('seeker-1');
    state.currentUser = AuthService.getCurrentUser();
    state.activeTab = 'home';
    renderApp();
    showToast("Switched to Job Seeker: Rahul Sharma", "info");
  });

  document.getElementById('switchEmployerBtn').addEventListener('click', () => {
    AuthService.setCurrentUser('employer-1');
    state.currentUser = AuthService.getCurrentUser();
    state.activeTab = 'home';
    renderApp();
    showToast("Switched to Employer: Priya Reddy (ABC Learning)", "info");
  });

  document.getElementById('switchAdminBtn').addEventListener('click', () => {
    AuthService.setCurrentUser('admin-1');
    state.currentUser = AuthService.getCurrentUser();
    state.activeTab = 'admin';
    renderApp();
    showToast("Switched to Trust & Safety Admin Desk", "warning");
  });

  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    if (confirm("Reset all jobs, applications, and messages to initial realistic demo data?")) {
      StorageService.resetAll();
      state.currentUser = AuthService.getCurrentUser();
      state.activeTab = 'home';
      renderApp();
      showToast("Data reset to default demo state successfully!", "success");
    }
  });
}

function updateNotifBadge() {
  const notifs = NotificationService.getNotifications(state.currentUser ? state.currentUser.userId : '');
  const unreadCount = notifs.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadgeCount');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Global Event Listeners & Modals
function setupEventListeners() {
  // Modal Close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal-overlay').classList.remove('active');
    });
  });

  // Close modal when tapping overlay background
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Top header actions
  document.getElementById('btnChangeLocation').addEventListener('click', openLocationModal);
  document.getElementById('btnSafetyInfo').addEventListener('click', openSafetyModal);
  document.getElementById('btnNotifications').addEventListener('click', openNotificationsModal);
  document.getElementById('btnUserMenu').addEventListener('click', () => {
    state.activeTab = 'profile';
    renderApp();
  });

  // Post Job Form Submit (Employer)
  const postJobForm = document.getElementById('postJobForm');
  if (postJobForm) {
    postJobForm.addEventListener('submit', handlePostJobSubmit);
  }

  // Apply Job Form Submit (Seeker)
  const applyJobForm = document.getElementById('applyJobForm');
  if (applyJobForm) {
    applyJobForm.addEventListener('submit', handleApplyJobSubmit);
  }

  // Trust & Safety Report Form Submit
  const reportForm = document.getElementById('reportForm');
  if (reportForm) {
    reportForm.addEventListener('submit', handleReportSubmit);
  }

  // Edit Profile Form Submit
  const editProfileForm = document.getElementById('editProfileForm');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', handleEditProfileSubmit);
  }

  // Auth / Login Modal Triggers
  document.getElementById('demoLoginRahul').addEventListener('click', () => {
    AuthService.setCurrentUser('seeker-1');
    state.currentUser = AuthService.getCurrentUser();
    document.getElementById('authModal').classList.remove('active');
    state.activeTab = 'home';
    renderApp();
    showToast("Logged in as Rahul Sharma (Seeker)", "success");
  });

  document.getElementById('demoLoginPriya').addEventListener('click', () => {
    AuthService.setCurrentUser('employer-1');
    state.currentUser = AuthService.getCurrentUser();
    document.getElementById('authModal').classList.remove('active');
    state.activeTab = 'home';
    renderApp();
    showToast("Logged in as Priya Reddy (Employer)", "success");
  });

  document.getElementById('authCloseBtn').addEventListener('click', () => {
    document.getElementById('authModal').classList.remove('active');
  });

  // Auth Role tabs
  const tabSeeker = document.getElementById('authTabSeeker');
  const tabEmployer = document.getElementById('authTabEmployer');
  const authRoleInput = document.getElementById('authRole');
  if (tabSeeker && tabEmployer) {
    tabSeeker.addEventListener('click', () => {
      tabSeeker.className = 'flex-1 py-2 rounded-lg bg-white text-teal-800 shadow-sm transition';
      tabEmployer.className = 'flex-1 py-2 rounded-lg text-slate-500 transition';
      authRoleInput.value = 'seeker';
    });
    tabEmployer.addEventListener('click', () => {
      tabEmployer.className = 'flex-1 py-2 rounded-lg bg-white text-indigo-800 shadow-sm transition';
      tabSeeker.className = 'flex-1 py-2 rounded-lg text-slate-500 transition';
      authRoleInput.value = 'employer';
    });
  }

  document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('authName').value.trim();
    const phone = document.getElementById('authPhone').value.trim();
    const loc = document.getElementById('authLocation').value.trim() || 'Kukatpally, Hyderabad';
    const role = authRoleInput.value;

    if (!name || !phone) {
      showToast("Please provide your name and phone number", "warning");
      return;
    }

    const newUser = AuthService.register({
      name,
      phone,
      location: loc,
      role,
      profilePhoto: role === 'employer' 
        ? "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
      skills: role === 'seeker' ? ["Communication", "Computer Basics"] : [],
      businessName: role === 'employer' ? `${name}'s Enterprises` : undefined
    });

    state.currentUser = newUser;
    document.getElementById('authModal').classList.remove('active');
    state.activeTab = 'home';
    renderApp();
    showToast(`Welcome to HireNear, ${name}!`, "success");
  });
}

// Main Render Function
function renderApp() {
  updateHeaderBar();
  renderBottomNav();
  renderActiveScreen();
  if (window.lucide) window.lucide.createIcons();
}

function updateHeaderBar() {
  const user = state.currentUser;
  const roleBadge = document.getElementById('roleIndicatorBadge');
  const locLabel = document.getElementById('headerLocationLabel');
  const avatar = document.getElementById('headerUserAvatar');

  if (user) {
    if (user.role === 'employer') {
      roleBadge.textContent = 'Employer';
      roleBadge.className = 'text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200';
    } else if (user.role === 'admin') {
      roleBadge.textContent = 'Admin Desk';
      roleBadge.className = 'text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200';
    } else {
      roleBadge.textContent = 'Job Seeker';
      roleBadge.className = 'text-[10px] font-semibold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200';
    }

    locLabel.textContent = user.location || "Hyderabad";
    if (user.profilePhoto) {
      avatar.src = user.profilePhoto;
    }
  } else {
    roleBadge.textContent = 'Guest';
    locLabel.textContent = "Hyderabad";
  }
}

// Render Bottom Navigation Tabs
function renderBottomNav() {
  const nav = document.getElementById('bottomNavBar');
  const role = state.currentUser ? state.currentUser.role : 'seeker';

  let tabs = [];
  if (role === 'employer') {
    tabs = [
      { id: 'home', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'myjobs', label: 'My Jobs', icon: 'briefcase' },
      { id: 'applications', label: 'Applicants', icon: 'users' },
      { id: 'messages', label: 'Messages', icon: 'message-square' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ];
  } else if (role === 'admin') {
    tabs = [
      { id: 'admin', label: 'Safety Desk', icon: 'shield-alert' },
      { id: 'home', label: 'Browse Jobs', icon: 'briefcase' },
      { id: 'profile', label: 'Admin User', icon: 'settings' }
    ];
  } else {
    // Job Seeker Tabs (Home | Search | Saved | Applications | Profile)
    tabs = [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'search', label: 'Search', icon: 'search' },
      { id: 'saved', label: 'Saved', icon: 'heart' },
      { id: 'applications', label: 'Applied', icon: 'file-check' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ];
  }

  // Count unread applications or messages
  let unreadBadge = '';
  if (role === 'employer') {
    const apps = ApplicationService.getAllApplications().filter(a => a.employerId === state.currentUser.userId && a.status === 'Submitted');
    if (apps.length > 0) unreadBadge = `<span class="nav-badge">${apps.length}</span>`;
  }

  nav.innerHTML = tabs.map(tab => `
    <button class="nav-tab-btn ${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
      <i data-lucide="${tab.icon}"></i>
      <span>${tab.label}</span>
      ${tab.id === 'applications' ? unreadBadge : ''}
    </button>
  `).join('');

  nav.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.getAttribute('data-tab');
      renderApp();
    });
  });
}

// Render Active Screen Content
function renderActiveScreen() {
  const container = document.getElementById('screenContainer');
  const role = state.currentUser ? state.currentUser.role : 'seeker';

  container.scrollTop = 0;

  if (role === 'employer') {
    switch (state.activeTab) {
      case 'home':
        container.innerHTML = renderEmployerDashboard();
        break;
      case 'myjobs':
        container.innerHTML = renderEmployerMyJobs();
        break;
      case 'applications':
        container.innerHTML = renderEmployerApplications();
        break;
      case 'messages':
        container.innerHTML = renderMessagesScreen();
        break;
      case 'profile':
        container.innerHTML = renderEmployerProfile();
        break;
      default:
        container.innerHTML = renderEmployerDashboard();
    }
  } else if (role === 'admin') {
    switch (state.activeTab) {
      case 'admin':
        container.innerHTML = renderAdminDashboard();
        break;
      case 'home':
        container.innerHTML = renderJobSeekerHome();
        break;
      case 'profile':
        container.innerHTML = renderAdminProfile();
        break;
      default:
        container.innerHTML = renderAdminDashboard();
    }
  } else {
    // Job Seeker
    switch (state.activeTab) {
      case 'home':
        container.innerHTML = renderJobSeekerHome();
        break;
      case 'search':
        container.innerHTML = renderJobSearchScreen();
        break;
      case 'saved':
        container.innerHTML = renderSavedJobsScreen();
        break;
      case 'applications':
        container.innerHTML = renderJobSeekerApplications();
        break;
      case 'messages':
        container.innerHTML = renderMessagesScreen();
        break;
      case 'profile':
        container.innerHTML = renderJobSeekerProfile();
        break;
      default:
        container.innerHTML = renderJobSeekerHome();
    }
  }

  attachScreenEventHandlers();
}

// ==========================================
// 1. JOB SEEKER SCREENS
// ==========================================

function renderJobSeekerHome() {
  const user = state.currentUser || { name: "Neighbor", location: "Kukatpally, Hyderabad" };
  const allJobs = JobService.getAllJobs().filter(j => j.status === 'active');
  const rankedJobs = AIMatchingEngine.rankJobsForSeeker(allJobs, user);

  // Top AI Recommendations (top 3)
  const topAIJobs = rankedJobs.slice(0, 3);
  // Filtered by Category / Quick filter
  let displayJobs = rankedJobs;
  if (state.selectedCategory !== 'all') {
    displayJobs = displayJobs.filter(j => j.category === state.selectedCategory);
  }
  if (state.quickFilter === 'part-time') {
    displayJobs = displayJobs.filter(j => j.jobType.toLowerCase().includes('part-time'));
  } else if (state.quickFilter === 'full-time') {
    displayJobs = displayJobs.filter(j => j.jobType.toLowerCase().includes('full-time'));
  } else if (state.quickFilter === 'weekend') {
    displayJobs = displayJobs.filter(j => j.jobType.toLowerCase().includes('weekend'));
  } else if (state.quickFilter === 'student') {
    displayJobs = displayJobs.filter(j => j.skills.some(s => s.toLowerCase().includes('computer') || s.toLowerCase().includes('teach')) || j.experience.toLowerCase().includes('fresher'));
  } else if (state.quickFilter === 'near-me') {
    displayJobs = displayJobs.filter(j => j.distanceKm <= 5.0);
  } else if (state.quickFilter === 'high-salary') {
    displayJobs = [...displayJobs].sort((a, b) => b.salary - a.salary);
  }

  return `
    <div class="p-4 space-y-5">
      
      <!-- Greeting Banner -->
      <div class="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-md shadow-teal-900/10 relative overflow-hidden">
        <div class="relative z-10">
          <p class="text-xs font-medium text-teal-100 uppercase tracking-wider">Welcome back</p>
          <h2 class="text-xl font-extrabold mt-0.5 tracking-tight">Hello, ${user.name} 👋</h2>
          <p class="text-xs text-teal-100/90 mt-1 max-w-[280px]">
            Find jobs. Find people. Hire near you.
          </p>
        </div>
        <div class="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
      </div>

      <!-- Search Trigger Bar -->
      <div id="homeSearchBarTrigger" class="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2.5 shadow-sm cursor-pointer hover:border-teal-500 transition">
        <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
        <span class="text-xs text-slate-400 font-medium">Search jobs, skills or locations...</span>
        <span class="ml-auto bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-teal-200">
          Search
        </span>
      </div>

      <!-- Quick Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        ${[
          { id: 'all', label: '✨ All' },
          { id: 'near-me', label: '📍 Within 5 km' },
          { id: 'part-time', label: '⏱️ Part-Time' },
          { id: 'full-time', label: '💼 Full-Time' },
          { id: 'weekend', label: '🏖️ Weekend' },
          { id: 'student', label: '🎓 Student Friendly' },
          { id: 'high-salary', label: '💰 High Salary' }
        ].map(f => `
          <button class="quick-filter-btn whitespace-nowrap px-3 py-1.5 rounded-xl font-semibold transition ${state.quickFilter === f.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}" data-filter="${f.id}">
            ${f.label}
          </button>
        `).join('')}
      </div>

      <!-- AI Recommended Opportunities Section (AIML Focus) -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
            <h3 class="font-bold text-sm text-slate-900 tracking-tight">AI Recommended For You</h3>
          </div>
          <span class="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            🤖 Explainable Match
          </span>
        </div>

        <div class="space-y-3">
          ${topAIJobs.map(job => renderJobCard(job, true)).join('')}
        </div>
      </div>

      <!-- Job Categories Carousel/Grid -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-sm text-slate-900">Explore by Category</h3>
          <button id="seeAllCategoriesBtn" class="text-xs font-semibold text-teal-600 hover:underline">View All</button>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center">
          ${INITIAL_CATEGORIES.slice(0, 8).map(cat => `
            <div class="category-chip bg-white border border-slate-200 p-2.5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:shadow-sm transition ${state.selectedCategory === cat.id ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/30' : ''}" data-cat="${cat.id}">
              <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-teal-700 mb-1">
                <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
              </div>
              <span class="text-[10px] font-bold text-slate-700 leading-tight truncate w-full">${cat.name.split(' ')[0]}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Nearby & Local Jobs List -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="font-bold text-sm text-slate-900">
            ${state.selectedCategory !== 'all' ? `Filtered Jobs (${displayJobs.length})` : `Jobs Near ${user.location.split(',')[0]} (${displayJobs.length})`}
          </h3>
          <span class="text-[11px] text-slate-500">Sorted by Relevance</span>
        </div>

        <div class="space-y-3">
          ${displayJobs.length > 0 ? displayJobs.map(job => renderJobCard(job, false)).join('') : `
            <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center">
              <i data-lucide="map-pin-off" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
              <p class="text-xs font-bold text-slate-700">No jobs found in this category nearby</p>
              <p class="text-[11px] text-slate-500 mt-1">Try clearing filters or switching location.</p>
              <button class="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold" onclick="document.querySelector('.quick-filter-btn[data-filter=all]').click()">
                Reset Filters
              </button>
            </div>
          `}
        </div>
      </div>

      <!-- Trust and Safety Assurance Banner -->
      <div class="bg-slate-900 text-white p-3.5 rounded-2xl flex items-start gap-3 shadow-md">
        <div class="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-teal-200">100% Free for Job Seekers</h4>
          <p class="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            Never pay any advance money or registration fee. All employers on HireNear agree to our zero-fee code.
          </p>
        </div>
      </div>

    </div>
  `;
}

// Reusable Job Card Component
function renderJobCard(job, showAIExplainer = false) {
  const savedIds = JobService.getSavedJobIds();
  const isSaved = savedIds.includes(job.jobId);
  const match = job.aiMatch || { score: 85, distance_km: job.distanceKm || 3.2, reasons: ["Good match with your profile"] };

  return `
    <div class="job-card cursor-pointer" data-jobid="${job.jobId}">
      <!-- Top Row: Title & Bookmark -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="badge-jobtype">${job.jobType}</span>
            <span class="ai-match-pill">
              <i data-lucide="sparkles" class="w-3 h-3"></i>
              ${match.score}% Match
            </span>
          </div>
          <h4 class="text-sm font-bold text-slate-900 mt-1 hover:text-teal-600 transition">
            ${job.title}
          </h4>
          <div class="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
            <span class="font-medium">${job.employerName}</span>
            ${job.employerVerified ? `
              <span class="badge-verified" title="Verified Employer">
                <i data-lucide="check" class="w-2.5 h-2.5"></i> Verified
              </span>
            ` : ''}
          </div>
        </div>

        <button class="save-job-btn p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition" data-jobid="${job.jobId}" title="Save Job">
          <i data-lucide="heart" class="w-5 h-5 ${isSaved ? 'text-rose-500 fill-rose-500' : ''}"></i>
        </button>
      </div>

      <!-- Middle: Location, Distance & Salary -->
      <div class="grid grid-cols-2 gap-2 my-2.5 pt-2 border-t border-slate-100 text-xs">
        <div class="flex items-center gap-1 text-slate-600">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-teal-600 flex-shrink-0"></i>
          <span class="truncate">${job.location.split(',')[0]} (~${match.distance_km} km)</span>
        </div>
        <div class="flex items-center justify-end gap-1 text-right">
          <span class="salary-badge">${job.salaryDisplay || `₹${job.salary.toLocaleString('en-IN')}/${job.salaryType}`}</span>
        </div>
      </div>

      <!-- Skills tags -->
      <div class="flex items-center gap-1 flex-wrap mb-2.5">
        ${(job.skills || []).slice(0, 3).map(skill => `
          <span class="badge-tag">${skill}</span>
        `).join('')}
        ${job.skills && job.skills.length > 3 ? `<span class="text-[10px] text-slate-400">+${job.skills.length - 3}</span>` : ''}
      </div>

      <!-- Explainable AI Breakdown (If featured/AI recommended) -->
      ${showAIExplainer && match.reasons && match.reasons.length > 0 ? `
        <div class="bg-teal-50/70 border border-teal-100 rounded-xl p-2.5 mb-3 text-[11px]">
          <p class="font-bold text-teal-900 mb-1 flex items-center gap-1">
            <i data-lucide="bot" class="w-3.5 h-3.5 text-teal-700"></i>
            Why this job matches you:
          </p>
          <div class="space-y-0.5">
            ${match.reasons.slice(0, 2).map(r => `
              <p class="text-teal-800 flex items-center gap-1">
                <span class="text-teal-600 font-bold">✔</span> ${r}
              </p>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Bottom Actions -->
      <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button class="view-job-btn flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition" data-jobid="${job.jobId}">
          View Details
        </button>
        <button class="quick-apply-btn px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm" data-jobid="${job.jobId}">
          Apply Now
        </button>
      </div>
    </div>
  `;
}

// 2. Job Search Screen with Complete Filter Suite
function renderJobSearchScreen() {
  const allJobs = JobService.getAllJobs().filter(j => j.status === 'active');
  const user = state.currentUser || { location: "Kukatpally, Hyderabad" };
  const ranked = AIMatchingEngine.rankJobsForSeeker(allJobs, user);

  // Apply Search Query & Filter inputs
  let results = ranked;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    results = results.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.employerName.toLowerCase().includes(q) ||
      (j.skills || []).some(s => s.toLowerCase().includes(q))
    );
  }
  if (state.selectedCategory !== 'all') {
    results = results.filter(j => j.category === state.selectedCategory);
  }
  if (state.selectedJobType) {
    results = results.filter(j => j.jobType.toLowerCase().includes(state.selectedJobType.toLowerCase()));
  }
  if (state.maxDistanceKm) {
    results = results.filter(j => j.distanceKm <= state.maxDistanceKm);
  }

  return `
    <div class="p-4 space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Search Local Jobs</h2>
        <p class="text-xs text-slate-500">Find part-time, full-time, and student work nearby</p>
      </div>

      <!-- Search Input -->
      <div class="relative">
        <input 
          type="text" 
          id="mainSearchInput" 
          value="${state.searchQuery}" 
          placeholder="Try 'Home Tutor', 'Delivery', 'Excel', or 'Miyapur'..." 
          class="w-full text-xs pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm"
        />
        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3.5"></i>
        ${state.searchQuery ? `
          <button id="clearSearchBtn" class="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        ` : ''}
      </div>

      <!-- Filter Controls Accordion / Pills -->
      <div class="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        
        <!-- Distance Radii -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Distance from ${user.location.split(',')[0]}</label>
          <div class="grid grid-cols-4 gap-1.5 text-xs font-semibold">
            ${[5, 10, 25, 50].map(dist => `
              <button class="distance-pill-btn py-1.5 rounded-xl border text-center transition ${state.maxDistanceKm === dist ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-dist="${dist}">
                ${dist === 50 ? 'Any dist' : `Within ${dist}km`}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Job Type Filter -->
        <div class="pt-2 border-t border-slate-100">
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Job Type</label>
          <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-semibold">
            ${['', 'Part-Time', 'Full-Time', 'Weekend', 'Temporary'].map(type => `
              <button class="jobtype-pill-btn whitespace-nowrap px-3 py-1.5 rounded-xl border transition ${state.selectedJobType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-type="${type}">
                ${type === '' ? 'All Types' : type}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Category Dropdown Filter -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-800">Category:</span>
          <select id="searchCategorySelect" class="text-xs p-1.5 border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500">
            ${INITIAL_CATEGORIES.map(c => `
              <option value="${c.id}" ${state.selectedCategory === c.id ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>
        </div>

      </div>

      <!-- Results Header -->
      <div class="flex items-center justify-between text-xs text-slate-600">
        <span class="font-bold">${results.length} Jobs Found</span>
        <span>Ranked by AI Proximity</span>
      </div>

      <!-- Results List -->
      <div class="space-y-3">
        ${results.length > 0 ? results.map(job => renderJobCard(job, true)).join('') : `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <i data-lucide="search-x" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-800">No jobs found matching your filters</h4>
            <p class="text-xs text-slate-500 mt-1">Try broadening your distance to 25 km or selecting "All Types".</p>
            <button id="resetSearchFiltersBtn" class="mt-4 px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow">
              Clear All Filters
            </button>
          </div>
        `}
      </div>

    </div>
  `;
}

// 3. Saved Jobs Screen
function renderSavedJobsScreen() {
  const savedIds = JobService.getSavedJobIds();
  const allJobs = JobService.getAllJobs();
  const savedJobs = allJobs.filter(j => savedIds.includes(j.jobId));

  return `
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Saved Jobs (${savedJobs.length})</h2>
          <p class="text-xs text-slate-500">Opportunities bookmarked for quick review</p>
        </div>
      </div>

      <div class="space-y-3">
        ${savedJobs.length > 0 ? savedJobs.map(job => renderJobCard(job, false)).join('') : `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-2">
              <i data-lucide="heart" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-bold text-slate-800">No saved jobs yet</h4>
            <p class="text-xs text-slate-500 mt-1">Tap the heart icon on any job card to save it here for later.</p>
            <button class="mt-4 px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow" onclick="document.querySelector('.nav-tab-btn[data-tab=home]').click()">
              Explore Nearby Jobs
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// 4. Job Seeker Applications Screen
function renderJobSeekerApplications() {
  const user = state.currentUser;
  const allApps = ApplicationService.getAllApplications();
  const myApps = allApps.filter(a => a.applicantId === (user ? user.userId : ''));

  return `
    <div class="p-4 space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">My Applications (${myApps.length})</h2>
        <p class="text-xs text-slate-500">Track your application status and employer feedback</p>
      </div>

      <div class="space-y-3">
        ${myApps.length > 0 ? myApps.map(app => {
          let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
          if (app.status === 'Shortlisted') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
          if (app.status === 'Rejected') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
          if (app.status === 'Hired') badgeColor = 'bg-purple-50 text-purple-700 border-purple-300';

          return `
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-sm font-bold text-slate-900">${app.jobTitle}</h4>
                  <p class="text-xs text-slate-600 font-medium">${app.employerName}</p>
                  <p class="text-[11px] text-slate-400">Applied on ${new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}">
                  ${app.status}
                </span>
              </div>

              <div class="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 border border-slate-100">
                <p class="font-semibold text-slate-800 text-[11px] mb-0.5">Your Message:</p>
                <p class="italic">"${app.message}"</p>
                <p class="text-[10px] text-slate-400 mt-1">Availability: ${app.availability}</p>
              </div>

              <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button class="open-chat-from-app flex-1 py-2 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5" data-employerid="${app.employerId}" data-jobid="${app.jobId}" data-jobtitle="${app.jobTitle}">
                  <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Chat with Employer
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <i data-lucide="file-question" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-800">No applications submitted yet</h4>
            <p class="text-xs text-slate-500 mt-1">Browse open opportunities and apply with one tap.</p>
            <button class="mt-4 px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow" onclick="document.querySelector('.nav-tab-btn[data-tab=home]').click()">
              Find Local Jobs
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

// 5. Job Seeker Profile Screen
function renderJobSeekerProfile() {
  const user = state.currentUser || {};

  return `
    <div class="p-4 space-y-4">
      
      <!-- Profile Card -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center relative">
        <button id="btnEditProfile" class="absolute top-3 right-3 text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 flex items-center gap-1">
          <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
        </button>

        <div class="w-20 h-20 rounded-full border-4 border-teal-500/20 overflow-hidden mx-auto mb-2 shadow">
          <img src="${user.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}" alt="Avatar" class="w-full h-full object-cover">
        </div>

        <h3 class="text-base font-extrabold text-slate-900">${user.name}</h3>
        <p class="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-teal-600"></i> ${user.location}
        </p>

        <!-- Rating & Verified Badge -->
        <div class="flex items-center justify-center gap-2 mt-2">
          <span class="badge-verified">
            <i data-lucide="shield-check" class="w-3 h-3"></i> Verified Profile
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            ⭐ ${user.rating || '4.9'} (${user.reviewsCount || 14} reviews)
          </span>
        </div>

        <p class="text-xs text-slate-600 mt-3 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
          ${user.about || "Reliable, hardworking candidate looking for local employment opportunities."}
        </p>
      </div>

      <!-- Skills Section -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Skills & Capabilities</h4>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${(user.skills || []).map(skill => `
            <span class="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
              ${skill}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Preferences & Availability -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
        <h4 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Job Preferences</h4>
        
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Preferred Types</span>
          <span class="font-bold text-slate-800">${(user.preferredJobType || ['Part-Time']).join(', ')}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Expected Salary</span>
          <span class="font-bold text-teal-700">₹${(user.expectedSalary || 10000).toLocaleString('en-IN')}/${user.salaryType || 'month'}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Availability</span>
          <span class="font-bold text-slate-800">${user.availability || 'Immediate'}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Education</span>
          <span class="font-bold text-slate-800">${user.education || 'Graduate'}</span>
        </div>
        <div class="flex justify-between py-1.5">
          <span class="text-slate-500">Languages</span>
          <span class="font-bold text-slate-800">${(user.languages || ['English', 'Hindi', 'Telugu']).join(', ')}</span>
        </div>
      </div>

      <!-- Safety & Logout Actions -->
      <div class="space-y-2">
        <button id="profileSafetyBtn" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition">
          <i data-lucide="shield-check" class="w-4 h-4 text-teal-600"></i> Trust & Community Guidelines
        </button>
        <button id="profileLogoutBtn" class="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition">
          <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out / Switch User
        </button>
      </div>

    </div>
  `;
}

// ==========================================
// 2. EMPLOYER SCREENS
// ==========================================

function renderEmployerDashboard() {
  const user = state.currentUser || { name: "Priya Reddy", businessName: "ABC Learning" };
  const allJobs = JobService.getAllJobs().filter(j => j.employerId === user.userId);
  const allApps = ApplicationService.getAllApplications().filter(a => a.employerId === user.userId);
  
  const activeCount = allJobs.filter(j => j.status === 'active').length;
  const totalApps = allApps.length;
  const shortlistedCount = allApps.filter(a => a.status === 'Shortlisted').length;
  const hiredCount = allApps.filter(a => a.status === 'Hired').length;

  // AI Matched candidates for employer's active jobs
  const candidates = AuthService.getAllUsers().filter(u => u.role === 'seeker');
  let topCandidates = [];
  if (allJobs.length > 0) {
    topCandidates = AIMatchingEngine.rankCandidatesForJob(candidates, allJobs[0]).slice(0, 3);
  }

  return `
    <div class="p-4 space-y-5">
      
      <!-- Employer Welcome Banner -->
      <div class="bg-gradient-to-r from-indigo-800 via-indigo-700 to-slate-800 text-white p-4 rounded-2xl shadow-md">
        <p class="text-xs font-medium text-indigo-200 uppercase">Employer Workspace</p>
        <h2 class="text-lg font-extrabold mt-0.5">${user.businessName || user.name}</h2>
        <p class="text-xs text-indigo-100/80 mt-1">Hire verified local workers near you in hours.</p>

        <button id="btnOpenPostJob" class="mt-3 w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> Post a New Job
        </button>
      </div>

      <!-- Dashboard Statistics 4-Card Grid -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[11px] font-bold">Active Jobs</span>
            <i data-lucide="briefcase" class="w-4 h-4 text-teal-600"></i>
          </div>
          <p class="text-2xl font-black text-slate-900">${activeCount}</p>
        </div>

        <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[11px] font-bold">Applications</span>
            <i data-lucide="file-text" class="w-4 h-4 text-indigo-600"></i>
          </div>
          <p class="text-2xl font-black text-slate-900">${totalApps}</p>
        </div>

        <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[11px] font-bold">Shortlisted</span>
            <i data-lucide="star" class="w-4 h-4 text-amber-500"></i>
          </div>
          <p class="text-2xl font-black text-slate-900">${shortlistedCount}</p>
        </div>

        <div class="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between text-slate-500 mb-1">
            <span class="text-[11px] font-bold">Hired</span>
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
          </div>
          <p class="text-2xl font-black text-slate-900">${hiredCount}</p>
        </div>
      </div>

      <!-- AI Candidate Recommendations Section (AIML Focus) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <h3 class="font-bold text-sm text-slate-900">Top AI Matched Candidates</h3>
          </div>
          <span class="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
            For: ${allJobs[0] ? allJobs[0].title.split(' ')[0] : 'Open Jobs'}
          </span>
        </div>

        <div class="space-y-3">
          ${topCandidates.map(cand => renderCandidateCard(cand)).join('')}
        </div>
      </div>

      <!-- Recent Posted Jobs -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-sm text-slate-900">Your Posted Jobs</h3>
          <button class="text-xs font-semibold text-indigo-600" onclick="document.querySelector('.nav-tab-btn[data-tab=myjobs]').click()">Manage All</button>
        </div>

        <div class="space-y-2.5">
          ${allJobs.slice(0, 3).map(job => `
            <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-2">
              <div>
                <h4 class="text-xs font-bold text-slate-900">${job.title}</h4>
                <p class="text-[11px] text-slate-500">${job.jobType} • ${job.location.split(',')[0]} • ${job.salaryDisplay}</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                ${job.status}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

// Reusable Candidate Card for Employers
function renderCandidateCard(cand) {
  const match = cand.aiMatch || { score: 92, distance_km: 2.1, reasons: ["High skill alignment"] };

  return `
    <div class="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2.5">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <img src="${cand.profilePhoto}" alt="${cand.name}" class="w-10 h-10 rounded-full object-cover border border-slate-200">
          <div>
            <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1">
              ${cand.name}
              ${cand.isVerified ? '<i data-lucide="check-circle" class="w-3 h-3 text-teal-600"></i>' : ''}
            </h4>
            <p class="text-[11px] text-slate-500">${cand.experience} • ${cand.location.split(',')[0]}</p>
          </div>
        </div>

        <span class="ai-match-pill">
          <i data-lucide="sparkles" class="w-3 h-3"></i>
          ${match.score}% Match
        </span>
      </div>

      <!-- Match Explanation Reasons -->
      <div class="bg-slate-50 p-2 rounded-xl text-[11px] space-y-0.5 border border-slate-100">
        ${(match.reasons || []).slice(0, 2).map(r => `
          <p class="text-teal-800 flex items-center gap-1">
            <span class="text-teal-600 font-bold">✔</span> ${r}
          </p>
        `).join('')}
      </div>

      <!-- Skills -->
      <div class="flex items-center gap-1 flex-wrap">
        ${(cand.skills || []).slice(0, 3).map(s => `
          <span class="badge-tag">${s}</span>
        `).join('')}
      </div>

      <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button class="view-candidate-btn flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition" data-canduid="${cand.userId}">
          View Profile
        </button>
        <button class="message-candidate-btn px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition" data-canduid="${cand.userId}" data-candname="${cand.name}">
          Contact
        </button>
      </div>
    </div>
  `;
}

// Employer My Jobs Management Screen
function renderEmployerMyJobs() {
  const user = state.currentUser;
  const myJobs = JobService.getAllJobs().filter(j => j.employerId === (user ? user.userId : ''));

  return `
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">My Posted Jobs (${myJobs.length})</h2>
          <p class="text-xs text-slate-500">Manage listings, edit status, or pause jobs</p>
        </div>
        <button id="myJobsPostNewBtn" class="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Post Job
        </button>
      </div>

      <div class="space-y-3">
        ${myJobs.map(job => `
          <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="badge-jobtype">${job.jobType}</span>
                <h4 class="text-sm font-bold text-slate-900 mt-1">${job.title}</h4>
                <p class="text-xs text-slate-500">${job.location} • ${job.salaryDisplay}</p>
              </div>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                ${job.status}
              </span>
            </div>

            <p class="text-xs text-slate-600 line-clamp-2">${job.description}</p>

            <div class="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <button class="view-job-applicants-btn flex-1 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold" data-jobid="${job.jobId}">
                View Applicants
              </button>
              <button class="delete-job-btn px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold" data-jobid="${job.jobId}">
                Delete
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Employer Applicants Management Screen
function renderEmployerApplications() {
  const user = state.currentUser;
  const allApps = ApplicationService.getAllApplications().filter(a => a.employerId === (user ? user.userId : ''));

  return `
    <div class="p-4 space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Job Applicants (${allApps.length})</h2>
        <p class="text-xs text-slate-500">Review candidates, shortlist profiles, and contact workers</p>
      </div>

      <div class="space-y-3">
        ${allApps.length > 0 ? allApps.map(app => `
          <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <img src="${app.applicantPhoto}" alt="${app.applicantName}" class="w-10 h-10 rounded-full object-cover border border-slate-200">
                <div>
                  <h4 class="text-xs font-bold text-slate-900">${app.applicantName}</h4>
                  <p class="text-[11px] text-slate-500">For: <span class="font-semibold text-slate-700">${app.jobTitle}</span></p>
                  <p class="text-[10px] text-slate-400">${app.location} • Exp: ${app.experience}</p>
                </div>
              </div>

              <span class="text-xs font-bold px-2 py-0.5 rounded-full ${app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                ${app.status}
              </span>
            </div>

            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
              <p class="italic">"${app.message}"</p>
              <p class="text-[10px] text-slate-500 mt-1 font-semibold">Availability: ${app.availability}</p>
            </div>

            <div class="grid grid-cols-3 gap-1.5 pt-1 text-xs">
              <button class="shortlist-app-btn py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold" data-appid="${app.applicationId}">
                Shortlist
              </button>
              <button class="reject-app-btn py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl font-semibold border border-slate-200" data-appid="${app.applicationId}">
                Reject
              </button>
              <button class="contact-app-btn py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1" data-seekerid="${app.applicantId}" data-jobid="${app.jobId}" data-jobtitle="${app.jobTitle}">
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Chat
              </button>
            </div>
          </div>
        `).join('') : `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <i data-lucide="users" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-800">No applications yet</h4>
            <p class="text-xs text-slate-500 mt-1">When candidates apply for your posted jobs, they will appear here with AI Match ratings.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

// Employer Profile Screen
function renderEmployerProfile() {
  const user = state.currentUser || {};
  const myJobs = JobService.getAllJobs().filter(j => j.employerId === user.userId);

  return `
    <div class="p-4 space-y-4">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center relative">
        <button id="btnEditProfile" class="absolute top-3 right-3 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1">
          <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
        </button>

        <div class="w-20 h-20 rounded-full border-4 border-indigo-500/20 overflow-hidden mx-auto mb-2 shadow">
          <img src="${user.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200'}" alt="Avatar" class="w-full h-full object-cover">
        </div>

        <h3 class="text-base font-extrabold text-slate-900">${user.businessName || user.name}</h3>
        <p class="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-600"></i> ${user.location}
        </p>

        <div class="flex items-center justify-center gap-2 mt-2">
          <span class="badge-verified">
            <i data-lucide="shield-check" class="w-3 h-3"></i> Verified Employer
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            ⭐ ${user.rating || '4.8'} (${user.reviewsCount || 26} reviews)
          </span>
        </div>

        <p class="text-xs text-slate-600 mt-3 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
          ${user.about || "Established business providing reliable local employment opportunities."}
        </p>
      </div>

      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 text-xs">
        <h4 class="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Business Details</h4>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Contact Phone</span>
          <span class="font-bold text-slate-800">${user.phone}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-100">
          <span class="text-slate-500">Contact Email</span>
          <span class="font-bold text-slate-800">${user.email || 'employer@hirenear.local'}</span>
        </div>
        <div class="flex justify-between py-1">
          <span class="text-slate-500">Active Listings</span>
          <span class="font-bold text-slate-800">${myJobs.length} Jobs</span>
        </div>
      </div>

      <div class="space-y-2">
        <button id="profileLogoutBtn" class="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition">
          <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out / Switch User
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// 3. IN-APP MESSAGING SCREEN
// ==========================================

function renderMessagesScreen() {
  const user = state.currentUser;
  if (!user) return `<div class="p-4 text-center">Please login to view messages.</div>`;

  const conversations = ChatService.getUserConversations(user.userId);

  // If a specific conversation is active, render chat thread
  if (state.activeConversation) {
    const { partnerId, partnerName, partnerPhoto, jobId, jobTitle } = state.activeConversation;
    const messages = ChatService.getConversationMessages(user.userId, partnerId, jobId);

    return `
      <div class="flex flex-col h-[75vh]">
        <!-- Chat Header -->
        <div class="bg-white border-b border-slate-200 p-3 flex items-center justify-between sticky top-0 z-10">
          <div class="flex items-center gap-2.5">
            <button id="btnBackToConvList" class="p-1 text-slate-500 hover:text-slate-800">
              <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <img src="${partnerPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-8 h-8 rounded-full object-cover border border-slate-200">
            <div>
              <h4 class="text-xs font-bold text-slate-900 leading-tight">${partnerName}</h4>
              <p class="text-[10px] text-teal-700 truncate max-w-[200px]">Re: ${jobTitle || 'Local Opportunity'}</p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button class="p-2 text-slate-500 hover:text-teal-600" title="Call User" onclick="alert('Starting verified dialer to ${partnerName}...')">
              <i data-lucide="phone" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Chat Messages Area -->
        <div id="chatMessagesContainer" class="flex-1 overflow-y-auto p-3 space-y-2.5">
          <!-- Safety Notice inside Chat -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center text-[10px] text-amber-800">
            🛡️ Safety reminder: Never pay any advance fee or share bank OTPs in chat.
          </div>

          ${messages.map(msg => {
            const isMine = msg.senderId === user.userId;
            return `
              <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
                <div class="${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'} text-xs">
                  <p>${msg.message}</p>
                </div>
                <span class="text-[9px] text-slate-400 mt-0.5 px-1">
                  ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Quick Canned Replies -->
        <div class="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
          <button class="quick-canned-btn whitespace-nowrap bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-600 hover:bg-slate-100 font-medium" data-reply="I am available immediately.">
            "Available immediately"
          </button>
          <button class="quick-canned-btn whitespace-nowrap bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-600 hover:bg-slate-100 font-medium" data-reply="Could you share the exact landmark location?">
            "Exact location?"
          </button>
          <button class="quick-canned-btn whitespace-nowrap bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-600 hover:bg-slate-100 font-medium" data-reply="Yes, 4:30 PM works great for me.">
            "Time works for me"
          </button>
        </div>

        <!-- Message Input Footer -->
        <form id="chatSendForm" class="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input 
            type="text" 
            id="chatInputText" 
            placeholder="Type a safe message..." 
            class="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            autocomplete="off"
            required
          />
          <button type="submit" class="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow transition">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
        </form>
      </div>
    `;
  }

  // Conversation List View
  return `
    <div class="p-4 space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Messages</h2>
        <p class="text-xs text-slate-500">Communicate directly with verified employers and workers</p>
      </div>

      <div class="space-y-2">
        ${conversations.length > 0 ? conversations.map(c => `
          <div class="conv-item bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:border-teal-500 transition" data-partnerid="${c.partnerId}" data-partnername="${c.partnerName}" data-partnerphoto="${c.partnerPhoto}" data-jobid="${c.jobId}" data-jobtitle="${c.jobTitle}">
            <img src="${c.partnerPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-11 h-11 rounded-full object-cover border border-slate-200">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-900 truncate">${c.partnerName}</h4>
                <span class="text-[10px] text-slate-400">${new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p class="text-[11px] font-semibold text-teal-700 truncate">Re: ${c.jobTitle || 'Job Application'}</p>
              <p class="text-xs text-slate-500 truncate mt-0.5">${c.lastMessage.message}</p>
            </div>
            ${c.unread ? '<span class="w-2.5 h-2.5 rounded-full bg-teal-600 flex-shrink-0"></span>' : ''}
          </div>
        `).join('') : `
          <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <i data-lucide="message-square" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-800">No active messages</h4>
            <p class="text-xs text-slate-500 mt-1">Once you apply for a job or contact a candidate, chats will appear here.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

// ==========================================
// 4. ADMIN DESK SCREEN
// ==========================================

function renderAdminDashboard() {
  const users = AuthService.getAllUsers();
  const jobs = JobService.getAllJobs();
  const apps = ApplicationService.getAllApplications();
  const reports = TrustSafetyService.getAllReports();

  return `
    <div class="p-4 space-y-4">
      <div class="bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <div class="flex items-center gap-2 mb-1">
          <i data-lucide="shield-alert" class="w-5 h-5 text-amber-400"></i>
          <h2 class="text-base font-bold">HireNear Trust & Safety Desk</h2>
        </div>
        <p class="text-xs text-slate-300">Platform moderation, scam prevention, and community oversight</p>
      </div>

      <!-- Quick Platform Stats -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
          <p class="text-slate-400 font-bold text-[10px]">TOTAL USERS</p>
          <p class="text-lg font-black text-slate-800">${users.length}</p>
        </div>
        <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
          <p class="text-slate-400 font-bold text-[10px]">ACTIVE JOBS</p>
          <p class="text-lg font-black text-teal-700">${jobs.length}</p>
        </div>
        <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
          <p class="text-slate-400 font-bold text-[10px]">REPORTS</p>
          <p class="text-lg font-black text-rose-600">${reports.length}</p>
        </div>
      </div>

      <!-- Trust & Safety Reports Queue -->
      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Reports & Fraud Flags</h3>
        ${reports.length > 0 ? reports.map(r => `
          <div class="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-rose-900">${r.reason}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full">${r.status}</span>
            </div>
            <p class="text-rose-700 text-[11px]">"${r.details}"</p>
            <div class="flex items-center gap-2 pt-1">
              <button class="resolve-report-btn text-[10px] font-bold px-2.5 py-1 bg-rose-600 text-white rounded-lg" data-repid="${r.reportId}">
                Resolve & Suspend Target
              </button>
            </div>
          </div>
        `).join('') : `
          <p class="text-xs text-slate-500 italic">No pending reports in queue. All systems normal.</p>
        `}
      </div>

      <!-- User Management List -->
      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Registered Accounts (${users.length})</h3>
        <div class="space-y-2">
          ${users.map(u => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div class="flex items-center gap-2">
                <img src="${u.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-7 h-7 rounded-full object-cover">
                <div>
                  <p class="font-bold text-slate-800">${u.name || u.businessName} <span class="text-[10px] font-semibold text-slate-400">(${u.role})</span></p>
                  <p class="text-[10px] text-slate-500">${u.location}</p>
                </div>
              </div>
              <button class="toggle-verify-user-btn text-[10px] font-bold px-2 py-1 rounded-md border ${u.isVerified ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-200 text-slate-600'}" data-uid="${u.userId}">
                ${u.isVerified ? 'Verified ✓' : 'Verify'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderAdminProfile() {
  return `
    <div class="p-4 space-y-4">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 text-center">
        <h3 class="font-bold text-base text-slate-900">Admin Account</h3>
        <p class="text-xs text-slate-500 mt-1">HireNear Moderation Desk</p>
        <button id="profileLogoutBtn" class="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
          Switch to User
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// 5. EVENT HANDLERS & MODAL INTERACTIONS
// ==========================================

function attachScreenEventHandlers() {
  // Quick Filter Buttons
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.quickFilter = btn.getAttribute('data-filter');
      renderApp();
    });
  });

  // Category Chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const catId = chip.getAttribute('data-cat');
      state.selectedCategory = state.selectedCategory === catId ? 'all' : catId;
      renderApp();
    });
  });

  // Home search bar trigger
  const homeSearchTrigger = document.getElementById('homeSearchBarTrigger');
  if (homeSearchTrigger) {
    homeSearchTrigger.addEventListener('click', () => {
      state.activeTab = 'search';
      renderApp();
      setTimeout(() => {
        const input = document.getElementById('mainSearchInput');
        if (input) input.focus();
      }, 100);
    });
  }

  // Search input typing
  const searchInput = document.getElementById('mainSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderApp();
    });
  }

  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      renderApp();
    });
  }

  // Distance filter pills
  document.querySelectorAll('.distance-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.maxDistanceKm = parseInt(btn.getAttribute('data-dist'), 10);
      renderApp();
    });
  });

  // Job Type pills in search
  document.querySelectorAll('.jobtype-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedJobType = btn.getAttribute('data-type');
      renderApp();
    });
  });

  // Search category select
  const searchCatSelect = document.getElementById('searchCategorySelect');
  if (searchCatSelect) {
    searchCatSelect.addEventListener('change', (e) => {
      state.selectedCategory = e.target.value;
      renderApp();
    });
  }

  const resetSearchFiltersBtn = document.getElementById('resetSearchFiltersBtn');
  if (resetSearchFiltersBtn) {
    resetSearchFiltersBtn.addEventListener('click', () => {
      state.searchQuery = '';
      state.selectedCategory = 'all';
      state.selectedJobType = '';
      state.maxDistanceKm = 25;
      renderApp();
    });
  }

  // Save / Bookmark Job buttons
  document.querySelectorAll('.save-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const jobId = btn.getAttribute('data-jobid');
      const saved = JobService.toggleSaveJob(jobId);
      showToast(saved ? "Job saved to your bookmarks ❤️" : "Job removed from bookmarks", "info");
      renderApp();
    });
  });

  // View Job Details
  document.querySelectorAll('.view-job-btn, .job-card').forEach(elem => {
    elem.addEventListener('click', (e) => {
      if (e.target.closest('.save-job-btn') || e.target.closest('.quick-apply-btn')) return;
      const jobId = elem.getAttribute('data-jobid');
      if (jobId) openJobDetailsModal(jobId);
    });
  });

  // Quick Apply
  document.querySelectorAll('.quick-apply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const jobId = btn.getAttribute('data-jobid');
      openApplyModal(jobId);
    });
  });

  // Open Chat from Application or Candidate
  document.querySelectorAll('.open-chat-from-app, .contact-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const partnerId = btn.getAttribute('data-employerid') || btn.getAttribute('data-seekerid');
      const jobId = btn.getAttribute('data-jobid');
      const jobTitle = btn.getAttribute('data-jobtitle');
      const partner = AuthService.getAllUsers().find(u => u.userId === partnerId) || { name: "User" };

      state.activeConversation = {
        partnerId,
        partnerName: partner.name || partner.businessName,
        partnerPhoto: partner.profilePhoto,
        jobId,
        jobTitle
      };
      state.activeTab = 'messages';
      renderApp();
    });
  });

  // Back to Conversation list in chat
  const btnBackToConvList = document.getElementById('btnBackToConvList');
  if (btnBackToConvList) {
    btnBackToConvList.addEventListener('click', () => {
      state.activeConversation = null;
      renderApp();
    });
  }

  // Conversation click in list
  document.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      state.activeConversation = {
        partnerId: item.getAttribute('data-partnerid'),
        partnerName: item.getAttribute('data-partnername'),
        partnerPhoto: item.getAttribute('data-partnerphoto'),
        jobId: item.getAttribute('data-jobid'),
        jobTitle: item.getAttribute('data-jobtitle')
      };
      renderApp();
    });
  });

  // Send Chat Message Form
  const chatSendForm = document.getElementById('chatSendForm');
  if (chatSendForm) {
    chatSendForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInputText');
      const text = input.value.trim();
      if (!text || !state.activeConversation) return;

      ChatService.sendMessage(
        state.currentUser,
        state.activeConversation.partnerId,
        state.activeConversation.jobId,
        state.activeConversation.jobTitle,
        text
      );
      input.value = '';
      renderApp();

      // Scroll to bottom of chat
      setTimeout(() => {
        const msgContainer = document.getElementById('chatMessagesContainer');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
      }, 50);
    });
  }

  // Quick Canned reply buttons
  document.querySelectorAll('.quick-canned-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reply = btn.getAttribute('data-reply');
      const input = document.getElementById('chatInputText');
      if (input) {
        input.value = reply;
        input.focus();
      }
    });
  });

  // Employer Post Job trigger
  const btnOpenPostJob = document.getElementById('btnOpenPostJob');
  if (btnOpenPostJob) {
    btnOpenPostJob.addEventListener('click', () => {
      document.getElementById('postJobModal').classList.add('active');
    });
  }
  const myJobsPostNewBtn = document.getElementById('myJobsPostNewBtn');
  if (myJobsPostNewBtn) {
    myJobsPostNewBtn.addEventListener('click', () => {
      document.getElementById('postJobModal').classList.add('active');
    });
  }

  // View Candidate Details Modal
  document.querySelectorAll('.view-candidate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-canduid');
      openCandidateModal(uid);
    });
  });

  // Message candidate button
  document.querySelectorAll('.message-candidate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-canduid');
      const partner = AuthService.getAllUsers().find(u => u.userId === uid);
      state.activeConversation = {
        partnerId: uid,
        partnerName: partner.name,
        partnerPhoto: partner.profilePhoto,
        jobId: 'general',
        jobTitle: 'Job Invitation'
      };
      state.activeTab = 'messages';
      renderApp();
    });
  });

  // Shortlist / Reject Applications
  document.querySelectorAll('.shortlist-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-appid');
      ApplicationService.updateStatus(appId, 'Shortlisted');
      showToast("Candidate Shortlisted! Notification sent.", "success");
      renderApp();
    });
  });

  document.querySelectorAll('.reject-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-appid');
      ApplicationService.updateStatus(appId, 'Rejected');
      showToast("Application marked as rejected.", "info");
      renderApp();
    });
  });

  // Edit Profile Button
  const btnEditProfile = document.getElementById('btnEditProfile');
  if (btnEditProfile) {
    btnEditProfile.addEventListener('click', openEditProfileModal);
  }

  // Profile Logout Button
  const btnLogout = document.getElementById('profileLogoutBtn');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      document.getElementById('authModal').classList.add('active');
    });
  }

  // Admin Actions
  document.querySelectorAll('.toggle-verify-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      const user = AuthService.getAllUsers().find(u => u.userId === uid);
      if (user) {
        AuthService.updateProfile(uid, { isVerified: !user.isVerified });
        showToast(`Verification status updated for ${user.name}`, "success");
        renderApp();
      }
    });
  });

  document.querySelectorAll('.resolve-report-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const repId = btn.getAttribute('data-repid');
      TrustSafetyService.resolveReport(repId, "Account flagged & job delisted");
      showToast("Report marked as resolved. Safety action enforced.", "success");
      renderApp();
    });
  });
}

// ==========================================
// 6. MODALS CONTENT & WORKFLOWS
// ==========================================

function openJobDetailsModal(jobId) {
  const job = JobService.getJobById(jobId);
  if (!job) return;

  const user = state.currentUser || { location: "Kukatpally, Hyderabad" };
  const match = AIMatchingEngine.calculateMatch(job, user);
  const modal = document.getElementById('jobDetailsModal');
  const content = document.getElementById('jobDetailsContent');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <span class="badge-jobtype">${job.jobType}</span>
          <h3 class="text-base font-extrabold text-slate-900 mt-1">${job.title}</h3>
          <p class="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
            ${job.employerName}
            ${job.employerVerified ? '<span class="badge-verified"><i data-lucide="check" class="w-2.5 h-2.5"></i> Verified</span>' : ''}
          </p>
        </div>
        <button class="modal-close-btn p-1 text-slate-400 hover:text-slate-600">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
        <div>
          <p class="text-slate-400 text-[10px] font-bold">SALARY OFFERED</p>
          <p class="font-extrabold text-teal-700 text-sm">${job.salaryDisplay || `₹${job.salary.toLocaleString('en-IN')}/${job.salaryType}`}</p>
        </div>
        <div>
          <p class="text-slate-400 text-[10px] font-bold">APPROX. DISTANCE</p>
          <p class="font-extrabold text-slate-800 text-sm">~${match.distance_km} km away</p>
        </div>
        <div>
          <p class="text-slate-400 text-[10px] font-bold">WORKING HOURS</p>
          <p class="font-bold text-slate-700">${job.workingHours}</p>
        </div>
        <div>
          <p class="text-slate-400 text-[10px] font-bold">OPENINGS</p>
          <p class="font-bold text-slate-700">${job.openings} vacancies</p>
        </div>
      </div>

      <!-- Explainable AI Matching Breakdown -->
      <div class="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-3.5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="ai-match-pill">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            ${match.score}% AI Match
          </span>
          <span class="text-[11px] font-bold text-teal-900">Why this job fits:</span>
        </div>
        <div class="space-y-1">
          ${match.reasons.map(r => `
            <div class="ai-reason-item">
              <span class="font-bold">✔</span> <span>${r}</span>
            </div>
          `).join('')}
          ${match.cautions.map(c => `
            <div class="ai-caution-item">
              <span class="font-bold">ℹ</span> <span>${c}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Job Description -->
      <div class="space-y-1.5 text-xs">
        <h4 class="font-bold text-slate-900 uppercase text-[11px] tracking-wider">About the Role</h4>
        <p class="text-slate-600 leading-relaxed">${job.description}</p>
      </div>

      <!-- Responsibilities -->
      ${job.responsibilities && job.responsibilities.length > 0 ? `
        <div class="space-y-1.5 text-xs">
          <h4 class="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Responsibilities</h4>
          <ul class="space-y-1 list-disc list-inside text-slate-600">
            ${job.responsibilities.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Skills Required -->
      <div class="space-y-1.5 text-xs">
        <h4 class="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Required Skills</h4>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${(job.skills || []).map(s => `<span class="badge-tag">${s}</span>`).join('')}
        </div>
      </div>

      <!-- Safety Notice -->
      <div class="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
        <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5"></i>
        <span><strong>Anti-Scam Alert:</strong> Never pay money for uniform, training or interview passes. Report demands immediately.</span>
      </div>

      <!-- Buttons -->
      <div class="space-y-2 pt-2 border-t border-slate-100">
        <button id="btnModalApplyNow" class="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-xl shadow-md transition" data-jobid="${job.jobId}">
          Apply for this Job
        </button>

        <div class="grid grid-cols-2 gap-2">
          <button id="btnModalShare" class="py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
            <i data-lucide="share-2" class="w-3.5 h-3.5"></i> Share Job
          </button>
          <button id="btnModalReport" class="py-2 bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5" data-jobid="${job.jobId}">
            <i data-lucide="flag" class="w-3.5 h-3.5"></i> Report Job
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();

  // Attach modal action listeners
  content.querySelector('.modal-close-btn').addEventListener('click', () => modal.classList.remove('active'));
  
  content.querySelector('#btnModalApplyNow').addEventListener('click', () => {
    modal.classList.remove('active');
    openApplyModal(job.jobId);
  });

  content.querySelector('#btnModalShare').addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Job link copied to clipboard! Share on WhatsApp.", "success");
    } else {
      showToast("Share this job with your local friends!", "info");
    }
  });

  content.querySelector('#btnModalReport').addEventListener('click', () => {
    modal.classList.remove('active');
    openReportModal('job', job.jobId);
  });
}

function openApplyModal(jobId) {
  const job = JobService.getJobById(jobId);
  if (!job) return;

  const user = state.currentUser;
  if (!user || user.role !== 'seeker') {
    showToast("Please login as a Job Seeker to apply for jobs", "warning");
    document.getElementById('authModal').classList.add('active');
    return;
  }

  document.getElementById('applyJobId').value = job.jobId;
  document.getElementById('applyModalTitle').textContent = `Apply for ${job.title}`;
  document.getElementById('applyModalCompany').textContent = `${job.employerName} • ${job.location.split(',')[0]}`;
  document.getElementById('applySeekerPhoto').src = user.profilePhoto;
  document.getElementById('applySeekerName').textContent = user.name;
  document.getElementById('applySeekerExp').textContent = `${user.experience || 'Fresher'} • ${user.location}`;

  document.getElementById('applyModal').classList.add('active');
}

function handleApplyJobSubmit(e) {
  e.preventDefault();
  const jobId = document.getElementById('applyJobId').value;
  const message = document.getElementById('applyMessage').value.trim();
  const availability = document.getElementById('applyAvailability').value;
  const job = JobService.getJobById(jobId);
  const user = state.currentUser;

  ApplicationService.applyForJob(job, user, message, availability);
  document.getElementById('applyModal').classList.remove('active');
  showToast("Application submitted successfully! Employer notified. 🎉", "success");
  
  // Switch to applications tab
  state.activeTab = 'applications';
  renderApp();
}

function handlePostJobSubmit(e) {
  e.preventDefault();
  const user = state.currentUser;
  if (!user || user.role !== 'employer') {
    showToast("Please switch to an Employer account to post jobs", "warning");
    return;
  }

  const title = document.getElementById('jobPostTitle').value.trim();
  const category = document.getElementById('jobPostCategory').value;
  const jobType = document.getElementById('jobPostType').value;
  const location = document.getElementById('jobPostLocation').value;
  const salary = parseFloat(document.getElementById('jobPostSalary').value) || 10000;
  const salaryType = document.getElementById('jobPostSalaryType').value;
  const workingHours = document.getElementById('jobPostHours').value.trim();
  const openings = parseInt(document.getElementById('jobPostOpenings').value, 10) || 1;
  const rawSkills = document.getElementById('jobPostSkills').value.trim();
  const description = document.getElementById('jobPostDesc').value.trim();
  const experience = document.getElementById('jobPostExperience').value.trim() || 'Freshers welcome';

  const skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);

  JobService.createJob({
    title,
    category,
    jobType,
    location,
    salary,
    salaryType,
    salaryDisplay: `₹${salary.toLocaleString('en-IN')}/${salaryType.replace('per ', '')}`,
    workingHours,
    openings,
    skills,
    description,
    experience
  }, user);

  document.getElementById('postJobModal').classList.remove('active');
  document.getElementById('postJobForm').reset();
  showToast("Your job has been posted successfully! 🚀", "success");

  state.activeTab = 'myjobs';
  renderApp();
}

function openCandidateModal(userId) {
  const cand = AuthService.getAllUsers().find(u => u.userId === userId);
  if (!cand) return;

  const modal = document.getElementById('candidateModal');
  const content = document.getElementById('candidateDetailsContent');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <img src="${cand.profilePhoto}" class="w-12 h-12 rounded-full object-cover border border-slate-200">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">${cand.name}</h3>
            <p class="text-xs text-slate-500">${cand.location} • ${cand.experience}</p>
          </div>
        </div>
        <button class="modal-close-btn p-1 text-slate-400 hover:text-slate-600">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
        <p class="text-slate-700 italic">"${cand.about || 'Motivated local worker ready to contribute.'}"</p>
        <div class="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
          <p><span class="text-slate-400 font-bold">Availability:</span> ${cand.availability}</p>
          <p><span class="text-slate-400 font-bold">Expected:</span> ₹${(cand.expectedSalary || 10000).toLocaleString('en-IN')}/mo</p>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-900 uppercase text-[11px] mb-1.5">Candidate Skills</h4>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${(cand.skills || []).map(s => `<span class="badge-tag">${s}</span>`).join('')}
        </div>
      </div>

      <div class="pt-2 border-t border-slate-100 flex items-center gap-2">
        <button id="btnModalMsgCandidate" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition" data-canduid="${cand.userId}">
          Direct Message Candidate
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();

  content.querySelector('.modal-close-btn').addEventListener('click', () => modal.classList.remove('active'));
  content.querySelector('#btnModalMsgCandidate').addEventListener('click', () => {
    modal.classList.remove('active');
    state.activeConversation = {
      partnerId: cand.userId,
      partnerName: cand.name,
      partnerPhoto: cand.profilePhoto,
      jobId: 'general',
      jobTitle: 'Candidate Inquiry'
    };
    state.activeTab = 'messages';
    renderApp();
  });
}

function openLocationModal() {
  const modal = document.getElementById('locationModal');
  const list = document.getElementById('localityPickerList');

  list.innerHTML = POPULAR_LOCALITIES.map(loc => `
    <div class="location-select-item p-3 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50/40 cursor-pointer flex items-center justify-between text-xs transition" data-name="${loc.name}">
      <div>
        <p class="font-bold text-slate-900">${loc.name}</p>
        <p class="text-[11px] text-slate-500">${loc.area}</p>
      </div>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
    </div>
  `).join('');

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();

  list.querySelectorAll('.location-select-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedLoc = item.getAttribute('data-name');
      if (state.currentUser) {
        AuthService.updateProfile(state.currentUser.userId, { location: selectedLoc });
        state.currentUser.location = selectedLoc;
      }
      modal.classList.remove('active');
      showToast(`Location set to ${selectedLoc}`, "success");
      renderApp();
    });
  });
}

function openSafetyModal() {
  const modal = document.getElementById('safetyModal');
  const list = document.getElementById('communityGuidelinesList');

  list.innerHTML = COMMUNITY_GUIDELINES.map(g => `
    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
      <h4 class="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
        <i data-lucide="shield" class="w-3.5 h-3.5 text-teal-600"></i>
        ${g.title}
      </h4>
      <p class="text-[11px] text-slate-600 leading-relaxed">${g.desc}</p>
    </div>
  `).join('');

  modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function openReportModal(targetType, targetId) {
  document.getElementById('reportTargetType').value = targetType;
  document.getElementById('reportTargetId').value = targetId;
  document.getElementById('reportModal').classList.add('active');
}

function handleReportSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('reportTargetType').value;
  const targetId = document.getElementById('reportTargetId').value;
  const reason = document.getElementById('reportReason').value;
  const details = document.getElementById('reportDetails').value.trim();
  const reporterId = state.currentUser ? state.currentUser.userId : 'guest';

  TrustSafetyService.report(type, targetId, reporterId, reason, details);
  document.getElementById('reportModal').classList.remove('active');
  document.getElementById('reportForm').reset();
  showToast("Safety report received! Our moderators will investigate.", "warning");
}

function openNotificationsModal() {
  const user = state.currentUser;
  if (!user) return;
  const notifs = NotificationService.getNotifications(user.userId);
  NotificationService.markAllAsRead(user.userId);
  updateNotifBadge();

  alert(`Notifications:\n\n` + notifs.map(n => `• ${n.title}\n  ${n.body} (${n.time})`).join('\n\n'));
}

function openEditProfileModal() {
  const user = state.currentUser;
  if (!user) return;

  const modal = document.getElementById('editProfileModal');
  const fields = document.getElementById('editProfileFields');

  if (user.role === 'employer') {
    fields.innerHTML = `
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
        <input type="text" id="editEmpBusinessName" value="${user.businessName || ''}" class="w-full text-xs p-2.5 border rounded-xl">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">About Organization</label>
        <textarea id="editEmpAbout" rows="3" class="w-full text-xs p-2.5 border rounded-xl">${user.about || ''}</textarea>
      </div>
    `;
  } else {
    fields.innerHTML = `
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
        <input type="text" id="editSeekerName" value="${user.name || ''}" class="w-full text-xs p-2.5 border rounded-xl">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Skills (comma separated)</label>
        <input type="text" id="editSeekerSkills" value="${(user.skills || []).join(', ')}" class="w-full text-xs p-2.5 border rounded-xl">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Expected Salary (₹)</label>
        <input type="number" id="editSeekerSalary" value="${user.expectedSalary || 10000}" class="w-full text-xs p-2.5 border rounded-xl">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Availability</label>
        <input type="text" id="editSeekerAvail" value="${user.availability || 'Immediate'}" class="w-full text-xs p-2.5 border rounded-xl">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">About Me</label>
        <textarea id="editSeekerAbout" rows="3" class="w-full text-xs p-2.5 border rounded-xl">${user.about || ''}</textarea>
      </div>
    `;
  }

  modal.classList.add('active');
}

function handleEditProfileSubmit(e) {
  e.preventDefault();
  const user = state.currentUser;
  if (!user) return;

  if (user.role === 'employer') {
    const businessName = document.getElementById('editEmpBusinessName').value.trim();
    const about = document.getElementById('editEmpAbout').value.trim();
    AuthService.updateProfile(user.userId, { businessName, about });
  } else {
    const name = document.getElementById('editSeekerName').value.trim();
    const rawSkills = document.getElementById('editSeekerSkills').value.trim();
    const skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
    const expectedSalary = parseFloat(document.getElementById('editSeekerSalary').value) || 10000;
    const availability = document.getElementById('editSeekerAvail').value.trim();
    const about = document.getElementById('editSeekerAbout').value.trim();

    AuthService.updateProfile(user.userId, { name, skills, expectedSalary, availability, about });
  }

  state.currentUser = AuthService.getCurrentUser();
  document.getElementById('editProfileModal').classList.remove('active');
  showToast("Profile updated successfully! ✨", "success");
  renderApp();
}
