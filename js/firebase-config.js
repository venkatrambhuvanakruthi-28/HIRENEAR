/**
 * HireNear Firebase Client Configuration & Adapter
 * 
 * To connect to a live Firebase project:
 * 1. Create a project in https://console.firebase.google.com
 * 2. Enable Authentication (Email/Password & Phone)
 * 3. Enable Cloud Firestore & deploy backend/firestore.rules
 * 4. Paste your web app firebaseConfig below
 */

export const firebaseConfig = {
  apiKey: "AIzaSyYOUR_API_KEY_HERE",
  authDomain: "hirenear-local-jobs.firebaseapp.com",
  projectId: "hirenear-local-jobs",
  storageBucket: "hirenear-local-jobs.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Check if Firebase SDK is loaded via CDN or npm
export const isFirebaseConfigured = () => {
  return typeof window !== 'undefined' && 
         window.firebase && 
         firebaseConfig.apiKey !== "AIzaSyYOUR_API_KEY_HERE";
};

/**
 * Pluggable Firebase Firestore Sync Helper
 * In local prototype mode, HireNear uses the high-performance local storage service.
 * When Firebase credentials are provided, this adapter bridges Firestore real-time snapshots.
 */
export class FirebaseAdapter {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (isFirebaseConfigured()) {
      try {
        window.firebase.initializeApp(firebaseConfig);
        this.auth = window.firebase.auth();
        this.db = window.firebase.firestore();
        this.initialized = true;
        console.log("HireNear connected to Cloud Firestore successfully.");
      } catch (err) {
        console.warn("Firebase initialization skipped, continuing with local storage mode:", err);
      }
    }
  }

  async syncJobs(onUpdate) {
    if (!this.initialized) return null;
    return this.db.collection('jobs')
      .where('status', '==', 'active')
      .onSnapshot(snapshot => {
        const jobs = snapshot.docs.map(doc => ({ jobId: doc.id, ...doc.data() }));
        onUpdate(jobs);
      });
  }

  async submitApplication(applicationData) {
    if (!this.initialized) return null;
    return this.db.collection('applications').add({
      ...applicationData,
      appliedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

export const firebaseAdapter = new FirebaseAdapter();
