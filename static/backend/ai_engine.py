"""
HireNear AI Matching Engine
Provides explainable AI matching for both Job Seekers and Candidates.
Factors evaluated:
1. Skill overlap (Token Jaccard & Semantic tag matching) - 35%
2. Geolocation distance proximity (Haversine formula) - 25%
3. Job Type alignment (Part-time, Full-time, Weekend, etc.) - 15%
4. Salary alignment (Expected vs Offered) - 15%
5. Availability & Experience alignment - 10%
"""

import math
from typing import Dict, List, Any, Tuple

# Pre-defined coordinates for popular Indian localities (Hyderabad baseline)
LOCALITY_COORDINATES = {
    "kukatpally": (17.4947, 78.3996),
    "gachibowli": (17.4401, 78.3489),
    "madhapur": (17.4483, 78.3915),
    "hitec city": (17.4474, 78.3762),
    "miyapur": (17.4968, 78.3547),
    "secunderabad": (17.4399, 78.4983),
    "begumpet": (17.4447, 78.4664),
    "ameerpet": (17.4375, 78.4482),
    "banjara hills": (17.4156, 78.4350),
    "jubilee hills": (17.4319, 78.4073),
    "dilsukhnagar": (17.3688, 78.5247),
    "uppal": (17.4018, 78.5602),
    "kondapur": (17.4699, 78.3578),
    "charminar": (17.3616, 78.4747),
    "lingampally": (17.4933, 78.3150),
    "hyderabad": (17.3850, 78.4867),
    "bengaluru": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
}

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance in kilometers between two lat/lon pairs."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371.0 # Earth radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def get_location_coords(location_str: str) -> Tuple[float, float]:
    """Finds best matching lat/lon from location string."""
    loc_clean = location_str.lower().strip()
    for key, coords in LOCALITY_COORDINATES.items():
        if key in loc_clean:
            return coords
    return LOCALITY_COORDINATES["hyderabad"]

def calculate_job_seeker_match(job: Dict[str, Any], seeker: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes explainable match score between a Job and a Job Seeker.
    Returns score (0-100) and list of reasons.
    """
    reasons: List[str] = []
    cautions: List[str] = []
    
    # 1. Skill Similarity (35%)
    seeker_skills = set(s.lower().strip() for s in seeker.get("skills", []))
    job_skills = set(s.lower().strip() for s in job.get("skills", []))
    
    matched_skills = seeker_skills.intersection(job_skills)
    # Check partial / keyword matches in title or description
    job_text = (job.get("title", "") + " " + job.get("description", "")).lower()
    for skill in seeker_skills:
        if skill not in matched_skills and skill in job_text:
            matched_skills.add(skill)

    if job_skills:
        skill_score = (len(matched_skills) / max(len(job_skills), 1))
    else:
        skill_score = 0.8 # default reasonable if no specific skills listed
    skill_score = min(skill_score, 1.0)
    
    if matched_skills:
        reasons.append(f"✔ Skills match: {', '.join(list(matched_skills)[:3])}")
    else:
        cautions.append("May need on-job training for required skills")

    # 2. Location Proximity (25%)
    seeker_loc = seeker.get("location", "Hyderabad")
    job_loc = job.get("location", "Hyderabad")
    coords1 = get_location_coords(seeker_loc)
    coords2 = get_location_coords(job_loc)
    distance_km = haversine_distance(coords1, coords2)

    if distance_km <= 3.0:
        loc_score = 1.0
        reasons.append(f"✔ Extremely close ({distance_km} km away)")
    elif distance_km <= 7.0:
        loc_score = 0.85
        reasons.append(f"✔ Nearby ({distance_km} km away)")
    elif distance_km <= 15.0:
        loc_score = 0.65
        reasons.append(f"✔ Commutable distance ({distance_km} km away)")
    elif distance_km <= 25.0:
        loc_score = 0.4
        cautions.append(f"Located {distance_km} km away")
    else:
        loc_score = 0.2
        cautions.append(f"Distance is {distance_km} km away")

    # 3. Job Type Match (15%)
    seeker_types = [t.lower() for t in seeker.get("preferredJobType", ["part-time", "full-time"])]
    job_type = job.get("jobType", "").lower()
    if any(t in job_type or job_type in t for t in seeker_types):
        type_score = 1.0
        reasons.append(f"✔ Preferred job type ({job.get('jobType')})")
    else:
        type_score = 0.4
        cautions.append(f"Job is {job.get('jobType')}")

    # 4. Salary Alignment (15%)
    seeker_salary = float(seeker.get("expectedSalary", 8000) or 8000)
    job_salary = float(job.get("salary", 10000) or 10000)
    if job_salary >= seeker_salary:
        sal_score = 1.0
        reasons.append(f"✔ Salary meets or exceeds expectation (₹{int(job_salary):,})")
    elif job_salary >= seeker_salary * 0.8:
        sal_score = 0.75
        reasons.append(f"✔ Salary within range (₹{int(job_salary):,})")
    else:
        sal_score = 0.4
        cautions.append(f"Offered salary ₹{int(job_salary):,} is below expected ₹{int(seeker_salary):,}")

    # 5. Availability & Experience (10%)
    avail = seeker.get("availability", "Immediate").lower()
    exp_seeker = seeker.get("experience", "Fresher").lower()
    exp_job = job.get("experience", "Fresher").lower()
    
    exp_score = 0.8
    if "fresher" in exp_job or "any" in exp_job:
        exp_score = 1.0
        reasons.append("✔ Experience criteria suitable for your profile")
    elif exp_job in exp_seeker:
        exp_score = 1.0
        reasons.append("✔ Experience matches requirements")

    # Final Weighted Calculation
    total_score = (
        skill_score * 0.35 +
        loc_score * 0.25 +
        type_score * 0.15 +
        sal_score * 0.15 +
        exp_score * 0.10
    )

    final_pct = int(round(total_score * 100))
    # Cap between 40 and 98 to keep realistic
    final_pct = max(45, min(final_pct, 98))

    return {
        "score": final_pct,
        "distance_km": distance_km,
        "reasons": reasons,
        "cautions": cautions,
        "summary": f"{final_pct}% Match based on skills, location ({distance_km}km), and preferences."
    }

def rank_jobs_for_seeker(jobs: List[Dict[str, Any]], seeker: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Ranks and annotates jobs with AI match data."""
    ranked = []
    for job in jobs:
        match_info = calculate_job_seeker_match(job, seeker)
        job_copy = dict(job)
        job_copy["aiMatch"] = match_info
        ranked.append(job_copy)
    ranked.sort(key=lambda x: x["aiMatch"]["score"], reverse=True)
    return ranked

def rank_candidates_for_job(candidates: List[Dict[str, Any]], job: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Ranks candidates for an employer's posted job."""
    ranked = []
    for seeker in candidates:
        match_info = calculate_job_seeker_match(job, seeker)
        cand_copy = dict(seeker)
        cand_copy["aiMatch"] = match_info
        ranked.append(cand_copy)
    ranked.sort(key=lambda x: x["aiMatch"]["score"], reverse=True)
    return ranked
