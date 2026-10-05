"""
HireNear FastAPI Application & AI Recommendation Server
Serves both REST API endpoints for AI Matching, Jobs, Applications
and mounts the mobile-first frontend.
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from ai_engine import (
    calculate_job_seeker_match,
    rank_jobs_for_seeker,
    rank_candidates_for_job,
    haversine_distance,
    get_location_coords
)

app = FastAPI(
    title="HireNear API",
    description="Local job marketplace and explainable AI matching service",
    version="1.0.0"
)

# Enable CORS for local development and hybrid web/mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store initialized with realistic seed data
SEED_JOBS = [
    {
        "jobId": "job-101",
        "employerId": "employer-1",
        "employerName": "ABC Learning & Tuitions",
        "employerVerified": True,
        "employerRating": 4.8,
        "title": "Home Tutor (Maths & Science)",
        "category": "education",
        "description": "Looking for an energetic, patient tutor for a Class 8 ICSE student. Primary focus on Mathematics fundamentals and General Science. Convenient 1.5 hours daily session.",
        "responsibilities": [
            "Teach Class 8 Math & Science concepts clearly",
            "Help with daily school homework & concept revision",
            "Conduct weekly mock tests and review mistakes"
        ],
        "skills": ["Mathematics", "Science", "Teaching", "English Communication"],
        "location": "Kukatpally, Hyderabad",
        "salary": 12000,
        "salaryType": "per month",
        "salaryDisplay": "₹10,000 - ₹12,000/month",
        "jobType": "Part-Time",
        "workingHours": "5:00 PM – 6:30 PM (Mon to Fri)",
        "experience": "Fresher / College Students Welcome",
        "openings": 2,
        "deadline": "2026-10-25",
        "createdAt": "2026-10-02T09:30:00Z",
        "status": "active",
        "featured": True
    },
    {
        "jobId": "job-102",
        "employerId": "employer-2",
        "employerName": "Metro Retail Hub",
        "employerVerified": True,
        "employerRating": 4.6,
        "title": "Store Sales Executive",
        "category": "sales",
        "description": "Require an active salesperson for our retail showroom counter. Must be polite, prompt in customer interactions, and capable of handling cash/billing.",
        "responsibilities": [
            "Greet customers walking into the showroom",
            "Showcase garments, assist with sizing and product choices",
            "Maintain tidy rack displays and price tagging"
        ],
        "skills": ["Sales", "Customer Service", "Billing", "Telugu & Hindi"],
        "location": "Secunderabad",
        "salary": 18000,
        "salaryType": "per month",
        "salaryDisplay": "₹16,000 - ₹18,000/month",
        "jobType": "Full-Time",
        "workingHours": "10:30 AM – 8:30 PM",
        "experience": "6 months - 2 years",
        "openings": 3,
        "deadline": "2026-10-30",
        "createdAt": "2026-10-01T11:00:00Z",
        "status": "active",
        "featured": True
    },
    {
        "jobId": "job-103",
        "employerId": "employer-1",
        "employerName": "Sai Wellness Dental Clinic",
        "employerVerified": True,
        "employerRating": 4.9,
        "title": "Front Desk & Clinic Receptionist",
        "category": "office",
        "description": "Seeking a well-mannered front desk receptionist to coordinate patient appointments, answer phone inquiries, and maintain basic patient registers on computer.",
        "responsibilities": [
            "Manage front desk and receive incoming patients warmly",
            "Book and confirm doctor consultation appointments",
            "Generate patient invoices using easy software"
        ],
        "skills": ["Computer Basics", "MS Excel", "Communication", "Appointment Scheduling"],
        "location": "Kukatpally, Hyderabad",
        "salary": 10500,
        "salaryType": "per month",
        "salaryDisplay": "₹9,500 - ₹10,500/month",
        "jobType": "Part-Time",
        "workingHours": "9:00 AM – 1:30 PM (Morning slot)",
        "experience": "Fresher / 6 months",
        "openings": 1,
        "deadline": "2026-10-20",
        "createdAt": "2026-10-03T14:15:00Z",
        "status": "active",
        "featured": False
    },
    {
        "jobId": "job-104",
        "employerId": "employer-1",
        "employerName": "Dr. K. Rao Residence",
        "employerVerified": True,
        "employerRating": 5.0,
        "title": "Housekeeper & Morning Cook",
        "category": "domestic",
        "description": "Looking for an honest, dependable person for daily morning cooking and light apartment housekeeping for a family of 3 near Miyapur Metro.",
        "responsibilities": [
            "Prepare simple, hygienic breakfast and packed lunch for 3 people",
            "Daily sweeping, mopping, and kitchen cleanup"
        ],
        "skills": ["Cooking", "Housekeeping", "Hygiene", "Reliability"],
        "location": "Miyapur, Hyderabad",
        "salary": 8500,
        "salaryType": "per month",
        "salaryDisplay": "₹8,500/month",
        "jobType": "Part-Time",
        "workingHours": "7:00 AM – 10:00 AM",
        "experience": "1+ year experience in household",
        "openings": 1,
        "deadline": "2026-10-18",
        "createdAt": "2026-10-04T08:00:00Z",
        "status": "active",
        "featured": False
    },
    {
        "jobId": "job-105",
        "employerId": "employer-2",
        "employerName": "Express Local Delivery Co.",
        "employerVerified": True,
        "employerRating": 4.5,
        "title": "Delivery Partner (Two-Wheeler)",
        "category": "delivery",
        "description": "Fast-growing delivery hub in Uppal hiring delivery partners for localized parcel drop-offs. Flexible shift timings with daily fuel allowance and incentives.",
        "responsibilities": [
            "Pick up assigned delivery bags from Uppal hub",
            "Deliver orders within 5 km localized radius",
            "Collect customer signatures and digital OTP confirmations"
        ],
        "skills": ["Two-Wheeler", "Driving License", "Smartphone", "Route Navigation"],
        "location": "Uppal, Hyderabad",
        "salary": 15500,
        "salaryType": "per month",
        "salaryDisplay": "₹14,000 - ₹17,000/month + Incentives",
        "jobType": "Full-Time",
        "workingHours": "10:00 AM – 7:00 PM",
        "experience": "Freshers can apply",
        "openings": 5,
        "deadline": "2026-11-05",
        "createdAt": "2026-10-02T16:45:00Z",
        "status": "active",
        "featured": True
    },
    {
        "jobId": "job-106",
        "employerId": "employer-1",
        "employerName": "Sri Balaji Documentation Center",
        "employerVerified": True,
        "employerRating": 4.7,
        "title": "Computer Operator & DTP Assistant",
        "category": "office",
        "description": "Required computer operator for MeeSeva and document typing center. Knowledge of English/Telugu typing, Aadhaar updates, and scan/print operations preferred.",
        "responsibilities": [
            "Type legal and government forms accurately",
            "Execute online government portal filings and submissions"
        ],
        "skills": ["Computer Basics", "MS Office", "Typing", "Internet Browsing"],
        "location": "Dilsukhnagar, Hyderabad",
        "salary": 12000,
        "salaryType": "per month",
        "salaryDisplay": "₹11,000 - ₹12,500/month",
        "jobType": "Full-Time",
        "workingHours": "9:30 AM – 7:00 PM",
        "experience": "Fresher or 6 months",
        "openings": 2,
        "deadline": "2026-10-28",
        "createdAt": "2026-09-29T10:00:00Z",
        "status": "active",
        "featured": False
    },
    {
        "jobId": "job-107",
        "employerId": "employer-2",
        "employerName": "Royal Celebrations Event Co.",
        "employerVerified": True,
        "employerRating": 4.8,
        "title": "Weekend Event Coordinator & Helper",
        "category": "events",
        "description": "Urgent opening for energetic weekend helpers for a 2-day corporate expo & wedding banquet in Gachibowli. Food, transport, and daily spot pay provided.",
        "responsibilities": [
            "Assist event managers with stage setup and banquet seating",
            "Guide guests to registration desks and auditoriums"
        ],
        "skills": ["Communication", "Teamwork", "Punctuality", "Student Friendly"],
        "location": "Gachibowli, Hyderabad",
        "salary": 750,
        "salaryType": "per day",
        "salaryDisplay": "₹750/day (Meals provided)",
        "jobType": "Weekend",
        "workingHours": "8:00 AM – 6:00 PM (Saturday & Sunday)",
        "experience": "No prior experience required",
        "openings": 8,
        "deadline": "2026-10-12",
        "createdAt": "2026-10-04T12:00:00Z",
        "status": "active",
        "featured": True
    },
    {
        "jobId": "job-108",
        "employerId": "employer-1",
        "employerName": "QuickFix Electricals",
        "employerVerified": True,
        "employerRating": 4.9,
        "title": "Assistant Electrician / Wireman",
        "category": "technical",
        "description": "Looking for an ITI electrician or experienced wireman for residential house wiring, inverter battery servicing, and fan/switchboard installations.",
        "responsibilities": [
            "Troubleshoot electrical faults in domestic apartments",
            "Install switchboards, LED lighting fixtures, and geysers"
        ],
        "skills": ["Electrical Wiring", "Appliance Repair", "Safety Standards", "Tools Handling"],
        "location": "Kondapur, Hyderabad",
        "salary": 800,
        "salaryType": "per day",
        "salaryDisplay": "₹800/day + Commute",
        "jobType": "Temporary",
        "workingHours": "9:00 AM – 6:00 PM",
        "experience": "1+ year practical trade experience",
        "openings": 2,
        "deadline": "2026-10-22",
        "createdAt": "2026-10-03T11:20:00Z",
        "status": "active",
        "featured": False
    }
]

SEED_CANDIDATES = [
    {
        "userId": "seeker-1",
        "name": "Rahul Sharma",
        "phone": "+91 98765 43210",
        "email": "rahul.sharma@example.com",
        "role": "seeker",
        "location": "Kukatpally, Hyderabad",
        "profilePhoto": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
        "skills": ["Mathematics", "Science", "Computer Basics", "MS Excel", "English", "Hindi"],
        "education": "B.Sc. Computer Science (Final Year)",
        "experience": "1+ year private tutoring",
        "preferredJobType": ["Part-Time", "Weekend", "Student Jobs"],
        "expectedSalary": 9500,
        "availability": "Immediate (Evenings after 4 PM & Weekends)",
        "rating": 4.9,
        "isVerified": True
    },
    {
        "userId": "seeker-2",
        "name": "Kavita Devi",
        "phone": "+91 98490 11223",
        "email": "kavita.devi@example.com",
        "role": "seeker",
        "location": "Miyapur, Hyderabad",
        "profilePhoto": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
        "skills": ["Cooking", "Housekeeping", "Child Care", "Hygiene Maintenance"],
        "education": "Secondary School (10th)",
        "experience": "4 years family residential cook",
        "preferredJobType": ["Part-Time", "Full-Time"],
        "expectedSalary": 8500,
        "availability": "Morning Shift (7:00 AM - 1:00 PM)",
        "rating": 4.8,
        "isVerified": True
    },
    {
        "userId": "seeker-3",
        "name": "Mohammed Arif",
        "phone": "+91 97000 88991",
        "email": "arif.delivery@example.com",
        "role": "seeker",
        "location": "Uppal, Hyderabad",
        "profilePhoto": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        "skills": ["Driving", "Two-Wheeler", "Smartphone Navigation", "Delivery Logistics"],
        "education": "Intermediate (12th Pass)",
        "experience": "2 years e-commerce delivery partner",
        "preferredJobType": ["Full-Time", "Temporary"],
        "expectedSalary": 15000,
        "availability": "Immediate",
        "rating": 4.7,
        "isVerified": True
    }
]

class SeekerProfileInput(BaseModel):
    userId: Optional[str] = "seeker-demo"
    name: Optional[str] = "User"
    location: str = "Kukatpally, Hyderabad"
    skills: List[str] = []
    preferredJobType: List[str] = ["Part-Time"]
    expectedSalary: float = 10000.0
    availability: str = "Immediate"
    experience: str = "Fresher"

class JobInput(BaseModel):
    title: str
    category: str
    description: str
    skills: List[str] = []
    location: str
    salary: float
    salaryType: str = "per month"
    jobType: str = "Part-Time"
    workingHours: str
    experience: str = "Fresher"
    openings: int = 1
    deadline: str = "2026-10-31"

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "HireNear", "version": "1.0.0"}

@app.get("/api/jobs")
def get_jobs(
    q: Optional[str] = None,
    category: Optional[str] = None,
    job_type: Optional[str] = None,
    location: Optional[str] = None,
    max_distance_km: Optional[float] = None
):
    results = list(SEED_JOBS)
    if q:
        query_lower = q.lower()
        results = [
            j for j in results
            if query_lower in j["title"].lower()
            or query_lower in j["description"].lower()
            or any(query_lower in s.lower() for s in j.get("skills", []))
        ]
    if category and category != "all":
        results = [j for j in results if j.get("category") == category]
    if job_type:
        results = [j for j in results if job_type.lower() in j.get("jobType", "").lower()]
    
    if location and max_distance_km:
        user_coords = get_location_coords(location)
        filtered = []
        for j in results:
            job_coords = get_location_coords(j.get("location", ""))
            dist = haversine_distance(user_coords, job_coords)
            if dist <= max_distance_km:
                j_copy = dict(j)
                j_copy["distance_km"] = dist
                filtered.append(j_copy)
        results = filtered
    return {"total": len(results), "jobs": results}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    for j in SEED_JOBS:
        if j["jobId"] == job_id:
            return j
    raise HTTPException(status_code=404, detail="Job not found")

@app.post("/api/jobs")
def create_job(job: JobInput):
    new_id = f"job-{len(SEED_JOBS) + 101}"
    new_job = {
        "jobId": new_id,
        "employerId": "employer-custom",
        "employerName": "Local Business",
        "employerVerified": True,
        "employerRating": 5.0,
        "salaryDisplay": f"₹{int(job.salary):,}/{job.salaryType.replace('per ', '')}",
        "status": "active",
        "featured": False,
        "createdAt": "2026-10-05T12:00:00Z",
        **job.dict()
    }
    SEED_JOBS.insert(0, new_job)
    return new_job

@app.post("/api/recommend-jobs")
def recommend_jobs(seeker: SeekerProfileInput):
    """
    AI Recommendation Endpoint:
    Scores and ranks all available jobs against a seeker profile.
    Provides transparent reasoning for every match.
    """
    seeker_dict = seeker.dict()
    ranked = rank_jobs_for_seeker(SEED_JOBS, seeker_dict)
    return {
        "seeker": seeker.name,
        "total_analyzed": len(SEED_JOBS),
        "recommended_jobs": ranked
    }

@app.post("/api/recommend-candidates")
def recommend_candidates(job_id: str = Query(...)):
    """
    AI Candidate Matching Endpoint:
    Returns the top matching candidate seekers for a given job.
    """
    target_job = None
    for j in SEED_JOBS:
        if j["jobId"] == job_id:
            target_job = j
            break
    if not target_job:
        raise HTTPException(status_code=404, detail="Job not found")

    ranked = rank_candidates_for_job(SEED_CANDIDATES, target_job)
    return {
        "jobTitle": target_job["title"],
        "candidates": ranked
    }

# Mount static frontend
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists(os.path.join(parent_dir, "index.html")):
    app.mount("/css", StaticFiles(directory=os.path.join(parent_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(parent_dir, "js")), name="js")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(parent_dir, "index.html"))
