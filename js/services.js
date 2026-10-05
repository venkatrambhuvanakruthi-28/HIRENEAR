/**
 * HireNear Services Layer
 * Handles data persistence, CRUD operations, authentication,
 * application workflows, messaging, and trust & safety reporting.
 */

import {
  INITIAL_USERS,
  INITIAL_JOBS,
  INITIAL_APPLICATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS
} from './data.js';

const STORAGE_KEYS = {
  USERS: 'hirenear_users',
  CURRENT_USER_ID: 'hirenear_curr_user',
  JOBS: 'hirenear_jobs',
  APPLICATIONS: 'hirenear_applications',
  SAVED_JOBS: 'hirenear_saved_jobs',
  MESSAGES: 'hirenear_messages',
  NOTIFICATIONS: 'hirenear_notifications',
  REPORTS: 'hirenear_reports',
  REVIEWS: 'hirenear_reviews'
};

export const StorageService = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'seeker-1'); // Default Rahul Sharma
    }
    if (!localStorage.getItem(STORAGE_KEYS.JOBS)) {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(INITIAL_APPLICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SAVED_JOBS)) {
      localStorage.setItem(STORAGE_KEYS.SAVED_JOBS, JSON.stringify(['job-101', 'job-107']));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
    }
  },

  resetAll() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'seeker-1');
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(INITIAL_APPLICATIONS));
    localStorage.setItem(STORAGE_KEYS.SAVED_JOBS, JSON.stringify(['job-101', 'job-107']));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading ${key}`, e);
      return null;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(`Error writing ${key}`, e);
    }
  }
};

export const AuthService = {
  getCurrentUser() {
    const currentId = StorageService.get(STORAGE_KEYS.CURRENT_USER_ID) || 'seeker-1';
    const users = StorageService.get(STORAGE_KEYS.USERS) || INITIAL_USERS;
    return users.find(u => u.userId === currentId) || users[0];
  },

  setCurrentUser(userId) {
    StorageService.set(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  getAllUsers() {
    return StorageService.get(STORAGE_KEYS.USERS) || INITIAL_USERS;
  },

  updateProfile(userId, updatedFields) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedFields };
      StorageService.set(STORAGE_KEYS.USERS, users);
      return users[idx];
    }
    return null;
  },

  register(userData) {
    const users = this.getAllUsers();
    const newId = `user-${Date.now()}`;
    const newUser = {
      userId: newId,
      createdAt: new Date().toISOString(),
      isVerified: false,
      rating: 5.0,
      reviewsCount: 0,
      ...userData
    };
    users.push(newUser);
    StorageService.set(STORAGE_KEYS.USERS, users);
    this.setCurrentUser(newId);
    return newUser;
  },

  login(identifier, password) {
    const users = this.getAllUsers();
    const cleanId = (identifier || '').toLowerCase().trim();
    const user = users.find(u =>
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.phone && u.phone.includes(cleanId))
    );
    if (user) {
      this.setCurrentUser(user.userId);
      return { success: true, user };
    }
    return { success: false, message: "User not found. Try one of the demo accounts or create a new account." };
  }
};

export const JobService = {
  getAllJobs() {
    return StorageService.get(STORAGE_KEYS.JOBS) || INITIAL_JOBS;
  },

  getJobById(jobId) {
    const jobs = this.getAllJobs();
    return jobs.find(j => j.jobId === jobId);
  },

  createJob(jobData, employer) {
    const jobs = this.getAllJobs();
    const newId = `job-${Date.now()}`;
    const newJob = {
      jobId: newId,
      employerId: employer.userId,
      employerName: employer.businessName || employer.name,
      employerVerified: employer.isVerified || false,
      employerRating: employer.rating || 4.8,
      createdAt: new Date().toISOString(),
      status: "active",
      featured: false,
      ...jobData
    };
    jobs.unshift(newJob);
    StorageService.set(STORAGE_KEYS.JOBS, jobs);
    return newJob;
  },

  updateJob(jobId, updatedData) {
    const jobs = this.getAllJobs();
    const idx = jobs.findIndex(j => j.jobId === jobId);
    if (idx !== -1) {
      jobs[idx] = { ...jobs[idx], ...updatedData };
      StorageService.set(STORAGE_KEYS.JOBS, jobs);
      return jobs[idx];
    }
    return null;
  },

  deleteJob(jobId) {
    let jobs = this.getAllJobs();
    jobs = jobs.filter(j => j.jobId !== jobId);
    StorageService.set(STORAGE_KEYS.JOBS, jobs);
    return true;
  },

  getSavedJobIds(userId) {
    const saved = StorageService.get(STORAGE_KEYS.SAVED_JOBS) || [];
    return saved;
  },

  toggleSaveJob(jobId) {
    let saved = this.getSavedJobIds();
    const exists = saved.includes(jobId);
    if (exists) {
      saved = saved.filter(id => id !== jobId);
    } else {
      saved.push(jobId);
    }
    StorageService.set(STORAGE_KEYS.SAVED_JOBS, saved);
    return !exists;
  }
};

export const ApplicationService = {
  getAllApplications() {
    return StorageService.get(STORAGE_KEYS.APPLICATIONS) || INITIAL_APPLICATIONS;
  },

  applyForJob(job, seeker, message, availability) {
    const apps = this.getAllApplications();
    const newApp = {
      applicationId: `app-${Date.now()}`,
      jobId: job.jobId,
      applicantId: seeker.userId,
      applicantName: seeker.name,
      applicantPhoto: seeker.profilePhoto,
      jobTitle: job.title,
      employerId: job.employerId,
      employerName: job.employerName,
      location: seeker.location,
      skills: seeker.skills || [],
      experience: seeker.experience || "Fresher",
      expectedSalary: seeker.expectedSalary || job.salary,
      availability: availability || "Immediate",
      message: message || "I am interested in this opportunity and look forward to discussing further.",
      resumeNote: "HireNear Verified Profile & Credentials",
      status: "Submitted",
      appliedAt: new Date().toISOString()
    };
    apps.unshift(newApp);
    StorageService.set(STORAGE_KEYS.APPLICATIONS, apps);

    // Create a notification for the employer
    NotificationService.addNotification({
      userId: job.employerId,
      type: "new_application",
      title: "New Job Applicant 📝",
      body: `${seeker.name} just applied for "${job.title}".`,
      link: "applications"
    });

    return newApp;
  },

  updateStatus(appId, newStatus) {
    const apps = this.getAllApplications();
    const idx = apps.findIndex(a => a.applicationId === appId);
    if (idx !== -1) {
      apps[idx].status = newStatus;
      StorageService.set(STORAGE_KEYS.APPLICATIONS, apps);

      // Notify the seeker
      NotificationService.addNotification({
        userId: apps[idx].applicantId,
        type: newStatus.toLowerCase(),
        title: `Application ${newStatus}!`,
        body: `Your application for "${apps[idx].jobTitle}" was marked as ${newStatus}.`,
        link: "applications"
      });

      return apps[idx];
    }
    return null;
  }
};

export const ChatService = {
  getAllMessages() {
    return StorageService.get(STORAGE_KEYS.MESSAGES) || INITIAL_MESSAGES;
  },

  getConversationMessages(userId1, userId2, jobId) {
    const all = this.getAllMessages();
    return all.filter(m =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  getUserConversations(userId) {
    const all = this.getAllMessages();
    const users = AuthService.getAllUsers();
    const convMap = new Map();

    all.forEach(msg => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partner = users.find(u => u.userId === partnerId) || { name: "User", profilePhoto: "" };
      
      const key = `${partnerId}_${msg.jobId || 'general'}`;
      if (!convMap.has(key) || new Date(msg.timestamp) > new Date(convMap.get(key).lastMessage.timestamp)) {
        convMap.set(key, {
          key,
          partnerId,
          partnerName: partner.name || partner.businessName,
          partnerPhoto: partner.profilePhoto,
          partnerRole: partner.role,
          jobId: msg.jobId,
          jobTitle: msg.jobTitle,
          lastMessage: msg,
          unread: msg.receiverId === userId && !msg.readStatus
        });
      }
    });

    return Array.from(convMap.values()).sort((a, b) =>
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
  },

  sendMessage(sender, receiverId, jobId, jobTitle, text) {
    const all = this.getAllMessages();
    const newMsg = {
      messageId: `msg-${Date.now()}`,
      jobId,
      jobTitle,
      senderId: sender.userId,
      senderName: sender.name || sender.businessName,
      receiverId,
      message: text,
      timestamp: new Date().toISOString(),
      readStatus: false
    };
    all.push(newMsg);
    StorageService.set(STORAGE_KEYS.MESSAGES, all);

    // Notify receiver
    NotificationService.addNotification({
      userId: receiverId,
      type: "message",
      title: `Message from ${sender.name} 💬`,
      body: text.length > 50 ? text.substring(0, 50) + "..." : text,
      link: "messages"
    });

    return newMsg;
  }
};

export const NotificationService = {
  getNotifications(userId) {
    const all = StorageService.get(STORAGE_KEYS.NOTIFICATIONS) || INITIAL_NOTIFICATIONS;
    return all.filter(n => n.userId === userId);
  },

  addNotification(notif) {
    const all = StorageService.get(STORAGE_KEYS.NOTIFICATIONS) || INITIAL_NOTIFICATIONS;
    const newNotif = {
      notificationId: `notif-${Date.now()}`,
      time: "Just now",
      read: false,
      ...notif
    };
    all.unshift(newNotif);
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, all);
    return newNotif;
  },

  markAllAsRead(userId) {
    const all = StorageService.get(STORAGE_KEYS.NOTIFICATIONS) || INITIAL_NOTIFICATIONS;
    all.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, all);
  }
};

export const TrustSafetyService = {
  report(type, targetId, reporterId, reason, details) {
    const reports = StorageService.get(STORAGE_KEYS.REPORTS) || [];
    const reportItem = {
      reportId: `rep-${Date.now()}`,
      type, // 'job' or 'user'
      targetId,
      reporterId,
      reason,
      details,
      status: "pending_review",
      createdAt: new Date().toISOString()
    };
    reports.unshift(reportItem);
    StorageService.set(STORAGE_KEYS.REPORTS, reports);
    return reportItem;
  },

  getAllReports() {
    return StorageService.get(STORAGE_KEYS.REPORTS) || [];
  },

  resolveReport(reportId, actionTaken) {
    const reports = this.getAllReports();
    const idx = reports.findIndex(r => r.reportId === reportId);
    if (idx !== -1) {
      reports[idx].status = "resolved";
      reports[idx].actionTaken = actionTaken;
      StorageService.set(STORAGE_KEYS.REPORTS, reports);
      return reports[idx];
    }
    return null;
  }
};
