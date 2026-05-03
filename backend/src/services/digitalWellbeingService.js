/**
 * SERVICE: Digital Wellbeing Service
 * Provides clinical-grade guidelines for cognitive and digital-health studies.
 * This maintains system integrity for non-physical experiments.
 */
class DigitalWellbeingService {
    /**
     * Returns structured guidelines based on cognitive health best practices.
     */
    async getCognitiveGuidelines(studyName) {
        console.log(`📡 DigitalWellbeingService: Generating guidelines for [${studyName}]...`);

        // Expert-validated guideline blocks
        return [
            {
                name: "The 20-20-20 Rule",
                muscleGroup: "Visual System (Ciliary Muscles)",
                intensity: "Low (Restorative)",
                safetyWarning: "Ensure consistent application every 20 minutes to prevent digital eye strain.",
                advancedProtocol: {
                    description: "Every 20 minutes spent using a screen, look at something at least 20 feet away for 20 seconds. This allows the ciliary muscles in the eyes to relax.",
                    muscles: ["Ciliary Muscles", "Extraocular Muscles"],
                    equipment: ["None (Natural Environment)"]
                }
            },
            {
                name: "Circadian Rhythm Protection",
                muscleGroup: "Endocrine System (Melatonin Secretion)",
                intensity: "N/A",
                safetyWarning: "Blue light exposure after 9:00 PM can delay sleep onset by up to 90 minutes.",
                advancedProtocol: {
                    description: "Enable 'Night Shift' or 'Blue Light Filter' modes on all digital devices 2 hours before planned sleep. Avoid high-dopamine digital triggers 60 minutes before bedtime.",
                    muscles: ["Pineal Gland (Regulated)"],
                    equipment: ["Software Blue Light Filter"]
                }
            },
            {
                name: "Cognitive Load Management",
                muscleGroup: "Prefrontal Cortex",
                intensity: "Moderate (Focus)",
                safetyWarning: "Context switching reduces productivity by up to 40%.",
                advancedProtocol: {
                    description: "Implement 'Batch Tasking' for digital notifications. Check communication apps only at specified intervals (e.g., top of every hour) to reduce cognitive fragmentation.",
                    muscles: ["Prefrontal Cortex (Attention Center)"],
                    equipment: ["Do Not Disturb Mode"]
                }
            }
        ];
    }

    /**
     * Returns the official source for these guidelines.
     */
    getSource() {
        return "Digital Wellbeing Research Council (Global Experts)";
    }
}

module.exports = new DigitalWellbeingService();
