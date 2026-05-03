/**
 * BenefitService - The "Insight Engine"
 * Maps user attributes and experiment metadata to professional impact statements.
 */

// 1. Study-Specific Benefit Map (Contextual Keywords)
const STUDY_CONTEXT_MAP = {
    "hydration": {
        benefit: "Hydration impacts cellular function and cognitive clarity. This study helps you understand how water intake shifts your energy levels throughout the day.",
        focus: "physiological energy balance"
    },
    "sleep": {
        benefit: "Tracking your sleep cycles allows us to correlate your rest quality with daily cognitive focus, potentially identifying patterns that reduce persistent fatigue.",
        focus: "circadian rhythm optimization"
    },
    "focus": {
        benefit: "Cognitive focus is highly sensitive to environmental and lifestyle factors. This research provides a baseline for your personal productivity trends.",
        focus: "mental performance efficiency"
    },
    "screen": {
        benefit: "Digital engagement affects both neurobiology and behavioral habits. This study offers tools to monitor and mitigate digital fatigue.",
        focus: "digital wellness"
    },
    "metabolic": {
        benefit: "Monitoring glycemic markers and metabolic stability provides a deeper understanding of your body's response to nutritional and rest patterns.",
        focus: "metabolic resilience"
    },
    "weight": {
        benefit: "This study's focus on weight-management metrics provides high-impact data for tracking long-term body composition and health goals.",
        focus: "metabolic health"
    },
    "fitness": {
        benefit: "Exercise science trials provide professional-grade monitoring of your physiological response to activity, helping optimize your training outcomes.",
        focus: "active lifestyle performance"
    },
    "respiratory": {
        benefit: "Pulmonary health is critical for overall vitality. This study tracks airway responsiveness and breathing patterns in real-world scenarios.",
        focus: "respiratory health"
    }
};

// 2. Specialized Demographic/Condition Rules
const BENEFIT_RULES = [
    {
        id: "teen_brain_health",
        condition: (user, experiment) => {
            const text = (experiment.title + " " + experiment.description).toLowerCase();
            return user.age < 20 && (text.includes("screen") || text.includes("focus") || text.includes("social"));
        },
        statement: "As a younger participant, your neuroplasticity makes you a high-priority demographic for behavioral habit research; this study offers age-specific tools for focus management."
    },
    {
        id: "senior_resilience",
        condition: (user, experiment) => {
            const text = (experiment.title + " " + experiment.description).toLowerCase();
            return user.age > 60 && (text.includes("cognitive") || text.includes("mobility") || text.includes("aging"));
        },
        statement: "Your demographic profile provides essential baseline data for research into cognitive longevity and physiological resilience in older adults."
    },
    {
        id: "diabetes_specialized",
        condition: (user, experiment) => {
            const text = (experiment.title + " " + experiment.description).toLowerCase();
            const isRelevant = text.includes("diabetes") || text.includes("metabolic") || text.includes("sugar") || text.includes("insulin");
            return (user.medicalConditions || []).includes("Diabetes") && isRelevant;
        },
        statement: "Since you have Diabetes, this study tracks glycemic variability alongside other clinical markers, offering a holistic view of your metabolic health journey."
    },
    {
        id: "asthma_targeted",
        condition: (user, experiment) => {
            const text = (experiment.title + " " + experiment.description).toLowerCase();
            const isRelevant = text.includes("asthma") || text.includes("respiratory") || text.includes("lung") || text.includes("breath");
            return (user.medicalConditions || []).includes("Asthma") && isRelevant;
        },
        statement: "Given your history of Asthma, the specialized pulmonary monitoring in this trial provides unique data on your airway responsiveness."
    }
];

/**
 * Generates an array of personalized insight strings based on user and experiment data.
 */
function generateInsights(user, experiment) {
    const text = (experiment.title + " " + experiment.description).toLowerCase();
    const insights = [];

    // 1. Check Specialized Rules (Demographics/Conditions)
    const ruleMatch = BENEFIT_RULES.find(rule => rule.condition(user, experiment));
    if (ruleMatch) {
        insights.push(ruleMatch.statement);
    }

    // 2. Check Study Context Map (The "Why" for this specific study)
    const contextKey = Object.keys(STUDY_CONTEXT_MAP).find(key => text.includes(key));
    if (contextKey) {
        insights.push(STUDY_CONTEXT_MAP[contextKey].benefit);
        insights.push(`This study aligns with your profile markers to help you improve ${STUDY_CONTEXT_MAP[contextKey].focus}.`);
    }

    // 3. Fallback: Catch-all based on Biometrics (if still empty)
    if (insights.length === 0) {
        if (user.activityLevel === "Sedentary") {
            insights.push(`Your profile (Activity: ${user.activityLevel}) provides an ideal baseline for monitoring how "${experiment.title}" impacts daily energy levels.`);
        } else if (user.bmi > 28) {
            insights.push(`Monitoring your response to this study's protocols offers valuable tracking for your overall metabolic wellness journey.`);
        } else {
            insights.push(`Your participation in "${experiment.title}" allows you to contribute to critical health data patterns for your demographic.`);
        }
    }

    return insights;
}

module.exports = {
    generateInsights,
    STUDY_CONTEXT_MAP,
    BENEFIT_RULES
};
