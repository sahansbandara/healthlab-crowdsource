const externalHealthService = require("./externalHealthService");
const digitalWellbeingService = require("./digitalWellbeingService");

/**
 * SERVICE: Protocol Service (Strategy Pattern)
 * Decides which guideline provider to use based on study metadata (tags).
 * This ensures the system is extensible and follows SOLID principles.
 */
class ProtocolService {
    /**
     * Routes the query to the appropriate service based on experiment tags and title metadata.
     */
    async getGuidelinesForExperiment(experiment) {
        const title = (experiment.title || "").toLowerCase();
        const tags = (experiment.tags || []).map(t => t.toLowerCase());

        // Define Keyword Sets
        const physicalKeywords = ["exercise", "fitness", "physical", "strength", "cardio", "hydration", "running", "metabolism", "diabetes"];
        const cognitiveKeywords = ["cognitive", "digital", "mental", "focus", "sleep", "screen", "productivity", "psychological", "anxiety"];

        // Strategy Detection Logic (Tags take precedence, then Title)
        const isPhysical = tags.some(t => physicalKeywords.includes(t)) ||
            physicalKeywords.some(k => title.includes(k));

        const isCognitive = tags.some(t => cognitiveKeywords.includes(t)) ||
            cognitiveKeywords.some(k => title.includes(k));

        if (isPhysical) {
            console.log(`🎯 Strategy Pattern: Selecting [Physical Provider] for ${experiment.title}`);
            const exercises = experiment.associatedExercises || [];

            if (exercises.length === 0) {
                return {
                    source: "Clinical Standard Protocol",
                    guidelines: [{
                        name: "General Physiological Safety",
                        muscleGroup: "Metabolic / Full Body",
                        intensity: "Variable",
                        safetyWarning: "Monitor blood glucose (if diabetic) and maintain hydration throughout the protocol.",
                        advancedProtocol: null
                    }]
                };
            }

            const guidelines = await Promise.all(
                exercises.map(ex => externalHealthService.getExerciseSafetyContext(ex))
            );

            return {
                source: "WGER Clinical Database",
                guidelines
            };
        }

        if (isCognitive) {
            console.log(`🎯 Strategy Pattern: Selecting [Digital Wellbeing Provider] for ${experiment.title}`);
            const guidelines = await digitalWellbeingService.getCognitiveGuidelines(experiment.title);

            return {
                source: "Digital Wellbeing Council (Expert Recommendations)",
                guidelines
            };
        }

        // Catch-all: General Wellness Protocol (Avoids the "Digital Default" bug)
        console.log(`🎯 Strategy Pattern: Selecting [General Protocol] for ${experiment.title}`);
        return {
            source: "HealthLab Standard Research Protocol",
            guidelines: [{
                name: "Universal Safety Participation",
                muscleGroup: "General Wellbeing",
                intensity: "Low / Moderate",
                safetyWarning: "Listen to your body. Stop immediately if you experience dizziness or sharp pain.",
                advancedProtocol: {
                    description: "This study follows universal health and safety guidelines. Ensure you are participating in a well-lit, ventilated environment. Take 5-minute breaks every hour to maintain optimal homeostasis.",
                    muscles: ["Systemic Health"],
                    equipment: ["None"]
                }
            }]
        };
    }
}

module.exports = new ProtocolService();
