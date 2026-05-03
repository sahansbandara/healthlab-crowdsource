/**
 * Heuristic-based matching logic to simulate AI recommendations.
 * 
 * Features compared:
 * 1. Age (0-20 points)
 * 2. Medical Conditions (0-40 points)
 * 3. Activity Level / Lifestyle (0-20 points)
 * 4. Keyword Match in Title/Description (0-20 points)
 */

exports.calculateMatchScore = (user, experiment) => {
    let score = 0;
    const reasons = [];

    // 1. Age Match (20 points)
    const { minAge, maxAge } = experiment.eligibilityRules || {};
    if (minAge && maxAge) {
        if (user.age >= minAge && user.age <= maxAge) {
            score += 20;
            reasons.push("Fits target age group");
        } else if (Math.abs(user.age - minAge) < 5 || Math.abs(user.age - maxAge) < 5) {
            score += 10;
            reasons.push("Close to target age range");
        }
    } else {
        score += 10; // Neutral if no age rules
    }

    // 2. Medical Conditions Match (40 points)
    const expConditions = experiment.eligibilityRules?.medicalConditions || [];
    const userConditions = user.medicalConditions || [];

    if (expConditions.length > 0) {
        const matches = userConditions.filter(c =>
            expConditions.some(ec => ec.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(ec.toLowerCase()))
        );

        if (matches.length > 0) {
            score += 40;
            reasons.push(`Matches conditions: ${matches.join(", ")}`);
        } else {
            // Check if description mentions any of user's conditions
            const desc = (experiment.description || "").toLowerCase();
            const descMatches = userConditions.filter(c => desc.includes(c.toLowerCase()));
            if (descMatches.length > 0) {
                score += 20;
                reasons.push("Topic relevance to your health profile");
            }
        }
    } else {
        score += 20; // Open to everyone is a moderate match
    }

    // 3. Activity Level / Lifestyle (20 points)
    const activityLevel = user.activityLevel || "Prefer not to say";
    const desc = (experiment.description || "").toLowerCase();
    const title = experiment.title.toLowerCase();

    const activityKeywords = {
        "Very Active": ["athlete", "running", "sport", "intense", "cardio", "stamina"],
        "Moderately Active": ["active", "walking", "fitness", "regular"],
        "Sedentary": ["stress", "sleep", "mindfulness", "nutrition", "office"]
    };

    const relevantKeywords = activityKeywords[activityLevel] || [];
    const hasActivityMatch = relevantKeywords.some(kw => desc.includes(kw) || title.includes(kw));

    if (hasActivityMatch) {
        score += 20;
        reasons.push(`Matches your ${activityLevel} lifestyle`);
    }

    // 4. Keyword relevance (20 points)
    const interests = ["mental health", "nutrition", "technology", "wearables", "pain", "sleep"];
    const userInterests = interests.filter(i => desc.includes(i) || title.includes(i));

    if (userInterests.length > 0) {
        score += Math.min(20, userInterests.length * 10);
        reasons.push(`Relevant project: ${userInterests[0]}`);
    }

    // Normalize and cap
    const finalScore = Math.min(100, score);

    return {
        score: finalScore,
        reason: reasons[0] || "General health study",
        allReasons: reasons
    };
};
