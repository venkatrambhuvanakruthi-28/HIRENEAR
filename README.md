# HireNear — Local Job Marketplace & Explainable AI Matching 🤖

> **"Find Jobs. Find People. Hire Near."**  
> *Alternative Tagline: "Jobs Near You. People You Need."*

HireNear is a modern, responsive, mobile-first marketplace built to connect local employers (families, shops, small businesses, schools, clinics) with nearby workers seeking part-time, full-time, temporary, weekend, and student-friendly jobs.

---

## 🌟 Key Highlights & Philosophy

* **Hyper-Local Focus:** Opportunities prioritized by real geographic proximity (using the Haversine great-circle distance algorithm across Indian localities such as Kukatpally, Gachibowli, Miyapur, Secunderabad, Uppal, Dilsukhnagar, etc.).
* **Explainable AI Matching:** Transparent multi-factor machine learning scoring (0–100%) that explicitly tells job seekers and employers **why** a recommendation was made (skills match, commute distance, salary match, working hours fit).
* **Trust & Safety First:** Prominent scam warnings against advance registration fees, verified employer and candidate badges, reporting workflows, user blocking, and community safety guidelines.
* **Dual Device Experience:** Instant toggle between **📱 Mobile Smartphone Frame View (390px)** and **💻 Full Responsive View** directly in the top preview bar.
* **Indian Market Optimization:** Realistic Indian salaries (₹/month, ₹/day, ₹/hour), localized job roles (Home Tutor, Delivery Partner, Clinic Receptionist, Housekeeper, Electrician, Event Helper), and bilingual/regional language support.

---

## 📱 App Walkthrough & Features

### 1. Job Seeker Experience
* **Home Feed:** Personalized greeting ("Hello, Rahul Sharma 👋"), quick filters (*Near Me (≤5km)*, *Part-Time*, *Full-Time*, *Weekend*, *Student Friendly*, *High Salary*), category shortcuts, and top AI recommended jobs.
* **Explainable AI Cards:** Shows match score percentage (e.g. `94% Match 🤖`) with itemized reasons (*✔ Skills match: Mathematics, Science*, *✔ Extremely close (1.8 km away)*, *✔ Salary meets expectation*).
* **Job Search:** Dedicated search tab with keyword search, category picker, distance radii (*Within 5 km*, *10 km*, *25 km*, *Any distance*), job type filters, and clear filter states.
* **Job Details:** Employer credentials, verified status, exact working hours, job description, responsibilities, vacancies, share button, and "Report Job" safety flag.
* **One-Tap Apply:** Modal displaying seeker profile summary, personalized pitch note, availability picker (*Immediately*, *Within 3 days*, *Weekends*), and privacy consent.
* **My Applications:** Real-time tracking of submission status (*Submitted*, *Viewed*, *Shortlisted*, *Rejected*, *Hired*) and direct chat launcher.
* **Saved Jobs:** Quick bookmarking and management.
* **Seeker Profile:** Editable profile with skills chips, experience, education, preferred job types, expected salary, availability, languages, rating stars, and contact preference.

### 2. Employer Experience
* **Employer Workspace:** Live statistics (Active Jobs, Total Applications, Shortlisted Candidates, Hired).
* **Post a Job Form:** Complete form capturing Job Title, Category, Description, Required Skills (interactive tags), Locality, Salary Amount & Type (per month/day/hour/fixed), Working Hours, Openings, and Experience.
* **Top AI Matched Candidates:** Proactively suggests matching local candidates with explainable match percentages and instant "Contact" buttons.
* **Application Management:** Review applicants, inspect detailed profiles, trigger status changes (*Shortlist* / *Reject*), and launch direct in-app chat.
* **My Jobs:** Manage listings, view active vs paused status, and inspect applicants per job.
* **Employer Profile:** Business credentials, address, verified employer badge, previously posted count, and reviews.

### 3. In-App Messaging System
* Clean, responsive real-time chat interface.
* Job reference badge embedded directly in header (e.g., *Re: Home Tutor (Maths & Science)*).
* Message bubbles with timestamps and read receipts.
* Quick canned responses for rapid communication (*"I am available immediately"*, *"Could you share the exact landmark location?"*, *"Time works for me"*).
* Embedded safety reminders against sharing sensitive financial credentials or advance payments.

### 4. Trust, Safety & Admin Desk
* **Community Guidelines:** Zero-advance payment enforcement, public meeting recommendations, approximate locality privacy protection.
* **Report System:** File reports for advance-payment scams, misleading salaries, or inappropriate conduct.
* **Admin Desk Panel:** Platform-wide oversight:
  - Platform statistics (Total Users, Active Jobs, Safety Reports, Applications).
  - Fraud & scam queue with one-click resolution.
  - User verification toggles and account suspension controls.

---

## 🤖 Explainable AI Matching Architecture

HireNear uses a multi-factor scoring model implemented symmetrically in both **Python** (`backend/ai_engine.py`) and **Client-Side JavaScript** (`js/ai-matching.js`):

$$\text{Match Score} = (S_{\text{skills}} \times 0.35) + (S_{\text{geo}} \times 0.25) + (S_{\text{type}} \times 0.15) + (S_{\text{sal}} \times 0.15) + (S_{\text{exp}} \times 0.10)$$

| Factor | Weight | Evaluation Method |
| :--- | :--- | :--- |
| **Skills Overlap** | **35%** | Jaccard index between candidate skill tags and job requirements, expanded with semantic keyword matching. |
| **Geo-Location Proximity** | **25%** | Great-circle distance calculated using the **Haversine Formula**: $\le 3\text{km} \to 100\%$, $3\text{--}7\text{km} \to 85\%$, $7\text{--}15\text{km} \to 65\%$, $15\text{--}25\text{km} \to 45\%$. |
| **Job Type Preference** | **15%** | Compatibility check between seeker preferences (Part-Time, Weekend, Full-Time) and job listing. |
| **Salary Alignment** | **15%** | Ratio of offered compensation to candidate's expected periodic rate. |
| **Availability & Experience** | **10%** | Fit between required experience (e.g. Freshers welcome) and candidate's availability slot. |

---

## 🗄️ Database Structure & Firestore Integration

The application includes complete Cloud Firestore schemas and production security rules:

* **Schema Specification:** [`backend/firestore_schema.json`](backend/firestore_schema.json)
* **Firestore Security Rules:** [`backend/firestore.rules`](backend/firestore.rules)
* **Client Firebase Adapter:** [`js/firebase-config.js`](js/firebase-config.js)

### Collections Summary:
1. `/users/{userId}` — Base user identities, roles, and profiles.
2. `/jobSeekerProfiles/{userId}` — Extended seeker skills, salary preferences, education.
3. `/employerProfiles/{userId}` — Business credentials, verification badges, reviews.
4. `/jobs/{jobId}` — Active, paused, and closed local job listings.
5. `/applications/{applicationId}` — Application submissions, pitches, and employer status flags.
6. `/messages/{messageId}` — Direct secure messages between seekers and employers.
7. `/reviews/{reviewId}` — Post-job mutual 1–5 star ratings and reviews.
8. `/reports/{reportId}` — Trust & Safety incident tickets (admin-restricted).

---

## 🚀 Quick Start Guide

### Option 1: One-Click Windows Launcher (Recommended)
Double-click `start.bat` in the project root:
```cmd
start.bat
```
This automatically boots the FastAPI AI server on `http://localhost:8000` and opens your default browser.

### Option 2: Running via Python Terminal
```bash
# Navigate to the backend directory
cd backend

# Start the server with Uvicorn
python -m uvicorn main:app --reload --port 8000
```
Open **`http://localhost:8000`** in your browser.

### Option 3: Standalone Browser Mode (No Server Needed)
You can directly open `index.html` in Google Chrome, Microsoft Edge, or Firefox. The client-side AI engine and storage service run fully offline via `localStorage`!

---

## 👥 Demo Accounts (Instant 1-Click Access)

Use the top toolbar in the application to instantly switch roles:

| Name | Role | Profile Context |
| :--- | :--- | :--- |
| **Rahul Sharma** | Job Seeker | Final year B.Sc. student in Kukatpally seeking evening tuitions, computer operations, or store assistant roles. |
| **Kavita Devi** | Job Seeker | Experienced residential cook & housekeeper in Miyapur. |
| **Mohammed Arif** | Job Seeker | Two-wheeler delivery partner in Uppal with complete city route knowledge. |
| **Priya Reddy** | Employer | Owner of ABC Learning & Tuitions in Kukatpally hiring tutors and front-desk clinic staff. |
| **Vikram Singhania** | Employer | Store manager at Metro Retail Hub in Secunderabad hiring showroom sales staff. |
| **HireNear Admin** | Admin Desk | Platform Trust & Safety moderator overseeing fraud reports and verification badges. |

---

## 📁 Project Directory Structure

```
hirenear/
├── backend/
│   ├── ai_engine.py           # Python explainable AI matching service & Haversine distance
│   ├── main.py                # FastAPI REST API & static file server
│   ├── requirements.txt       # Python dependencies (fastapi, uvicorn, pydantic)
│   ├── firestore_schema.json  # Complete Cloud Firestore JSON Schema
│   └── firestore.rules        # Production-grade Firestore security rules
├── css/
│   └── styles.css             # Design system, mobile frame mockup, badges & bottom nav
├── js/
│   ├── ai-matching.js         # Client-side AI recommendation engine
│   ├── app.js                 # Main UI controller, modal managers & view renderers
│   ├── data.js                # Realistic seed data (Hyderabad localities, Indian INR salaries)
│   ├── firebase-config.js     # Pluggable Firebase client configuration & adapter
│   └── services.js            # Storage, Auth, Jobs, Applications, Chat & Reports services
├── index.html                 # Mobile-first single page application
├── start.bat                  # One-click Windows runner
└── README.md                  # Comprehensive documentation
```

---

## 📄 License
Created for **HireNear** — Find Jobs. Find People. Hire Near.
