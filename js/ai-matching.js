/**
 * HireNear Client-Side Explainable AI Matching Engine
 * Accurately scores match percentage between:
 *  1. Job Seekers and Jobs
 *  2. Employers and Candidate Applicants
 */

const LOCALITY_COORDS = {
  "kukatpally": { lat: 17.4947, lng: 78.3996 },
  "gachibowli": { lat: 17.4401, lng: 78.3489 },
  "madhapur": { lat: 17.4483, lng: 78.3915 },
  "hitec city": { lat: 17.4474, lng: 78.3762 },
  "miyapur": { lat: 17.4968, lng: 78.3547 },
  "secunderabad": { lat: 17.4399, lng: 78.4983 },
  "begumpet": { lat: 17.4447, lng: 78.4664 },
  "ameerpet": { lat: 17.4375, lng: 78.4482 },
  "banjara hills": { lat: 17.4156, lng: 78.4350 },
  "jubilee hills": { lat: 17.4319, lng: 78.4073 },
  "dilsukhnagar": { lat: 17.3688, lng: 78.5247 },
  "uppal": { lat: 17.4018, lng: 78.5602 },
  "kondapur": { lat: 17.4699, lng: 78.3578 },
  "charminar": { lat: 17.3616, lng: 78.4747 },
  "lingampally": { lat: 17.4933, lng: 78.3150 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "delhi": { lat: 28.6139, lng: 77.2090 }
};

// Haversine Distance in Kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function getCoordsForLocation(locationString = '') {
  const query = locationString.toLowerCase();
  for (const [name, coords] of Object.entries(LOCALITY_COORDS)) {
    if (query.includes(name)) return coords;
  }
  return LOCALITY_COORDS["hyderabad"];
}

export const AIMatchingEngine = {
  /**
   * Computes multi-factor match between a Job and a Job Seeker
   */
  calculateMatch(job, seeker) {
    if (!job || !seeker) {
      return { score: 70, distance_km: 4.5, reasons: ["General profile alignment"], cautions: [] };
    }

    const reasons = [];
    const cautions = [];

    // 1. Skill Overlap (35% weight)
    const seekerSkills = (seeker.skills || []).map(s => s.toLowerCase().trim());
    const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim());
    
    let matchedSkills = [];
    seekerSkills.forEach(s => {
      if (jobSkills.includes(s)) {
        matchedSkills.push(s);
      } else {
        const jobDesc = `${job.title} ${job.description}`.toLowerCase();
        if (jobDesc.includes(s)) {
          matchedSkills.push(s);
        }
      }
    });

    const skillDenominator = Math.max(jobSkills.length, 1);
    let skillScore = matchedSkills.length > 0 ? (matchedSkills.length / skillDenominator) : 0.25;
    skillScore = Math.min(skillScore, 1.0);

    if (matchedSkills.length > 0) {
      const displaySkills = matchedSkills.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
      reasons.push(`Skills match (${displaySkills})`);
    } else {
      cautions.push("Training or skill adaptation may be required");
    }

    // 2. Geolocation Distance Proximity (25% weight)
    const seekerCoords = getCoordsForLocation(seeker.location || 'Hyderabad');
    const jobCoords = getCoordsForLocation(job.location || 'Hyderabad');
    const distanceKm = calculateHaversineDistance(
      seekerCoords.lat, seekerCoords.lng,
      jobCoords.lat, jobCoords.lng
    );

    let locScore = 0.5;
    if (distanceKm <= 3.0) {
      locScore = 1.0;
      reasons.push(`Location is very close (${distanceKm} km away)`);
    } else if (distanceKm <= 7.0) {
      locScore = 0.85;
      reasons.push(`Nearby location (${distanceKm} km away)`);
    } else if (distanceKm <= 15.0) {
      locScore = 0.65;
      reasons.push(`Commutable distance (${distanceKm} km away)`);
    } else if (distanceKm <= 25.0) {
      locScore = 0.45;
      cautions.push(`Distance is ${distanceKm} km`);
    } else {
      locScore = 0.25;
      cautions.push(`Distance is ${distanceKm} km away`);
    }

    // 3. Job Type Alignment (15% weight)
    const seekerTypes = (seeker.preferredJobType || ['Part-Time', 'Full-Time']).map(t => t.toLowerCase());
    const jobTypeStr = (job.jobType || '').toLowerCase();
    let typeScore = 0.4;
    if (seekerTypes.some(t => jobTypeStr.includes(t) || t.includes(jobTypeStr))) {
      typeScore = 1.0;
      reasons.push(`Preferred job type (${job.jobType})`);
    } else {
      cautions.push(`Requires ${job.jobType} commitment`);
    }

    // 4. Expected Salary Alignment (15% weight)
    const expected = parseFloat(seeker.expectedSalary || 10000);
    const offered = parseFloat(job.salary || 10000);
    let salScore = 0.5;
    if (offered >= expected) {
      salScore = 1.0;
      reasons.push(`Salary matches or exceeds expectation (₹${offered.toLocaleString('en-IN')})`);
    } else if (offered >= expected * 0.8) {
      salScore = 0.75;
      reasons.push(`Salary within acceptable range (₹${offered.toLocaleString('en-IN')})`);
    } else {
      salScore = 0.4;
      cautions.push(`Offered salary ₹${offered.toLocaleString('en-IN')} is lower than expected ₹${expected.toLocaleString('en-IN')}`);
    }

    // 5. Availability & Experience (10% weight)
    const seekerExp = (seeker.experience || 'Fresher').toLowerCase();
    const jobExp = (job.experience || 'Fresher').toLowerCase();
    let expScore = 0.8;
    if (jobExp.includes('fresher') || jobExp.includes('any') || seekerExp.includes(jobExp) || jobExp.includes(seekerExp)) {
      expScore = 1.0;
      reasons.push("Experience level is a great match");
    }

    // Weighted Score
    const totalWeighted = (
      skillScore * 0.35 +
      locScore * 0.25 +
      typeScore * 0.15 +
      salScore * 0.15 +
      expScore * 0.10
    );

    let matchPct = Math.round(totalWeighted * 100);
    // Realistic bounds between 48% and 97%
    matchPct = Math.max(48, Math.min(matchPct, 97));

    return {
      score: matchPct,
      distance_km: distanceKm,
      reasons,
      cautions,
      summary: `${matchPct}% Match based on skills, location (${distanceKm} km), and preferences.`
    };
  },

  /**
   * Filter and rank jobs for a seeker
   */
  rankJobsForSeeker(jobs, seeker) {
    return jobs.map(job => {
      const match = this.calculateMatch(job, seeker);
      return {
        ...job,
        aiMatch: match,
        distanceKm: match.distance_km
      };
    }).sort((a, b) => b.aiMatch.score - a.aiMatch.score);
  },

  /**
   * Filter and rank candidates for an employer's job
   */
  rankCandidatesForJob(candidates, job) {
    return candidates.map(cand => {
      const match = this.calculateMatch(job, cand);
      return {
        ...cand,
        aiMatch: match,
        distanceKm: match.distance_km
      };
    }).sort((a, b) => b.aiMatch.score - a.aiMatch.score);
  }
};
