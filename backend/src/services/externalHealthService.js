const axios = require("axios");

/**
 * SERVICE: External Health Data Integration
 * Interfaces with clinical-grade databases (NIH, OpenFDA)
 * to provide professional justification for eligibility checks.
 */
class ExternalHealthService {
    /**
     * Validates a medical condition against the NIH ClinicalTrials.gov database.
     * Returns synonyms and classifications to aid in semantic matching.
     */
    async fetchClinicalData(condition) {
        try {
            console.log(`📡 ExternalHealthService: Fetching clinical data for [${condition}]...`);

            const response = await axios.get("https://clinicaltrialsapi.nlm.nih.gov/api/v2/conditions", {
                params: {
                    q: condition,
                    pageSize: 3,
                },
                timeout: 5000,
            });

            if (!response.data.results || response.data.results.length === 0) {
                return null;
            }

            // Return the top matched term and any related metadata found
            return {
                officialTerm: response.data.results[0].term,
                alternatives: response.data.results.map(r => r.term),
                source: "NIH ClinicalTrials.gov",
                verifiedAt: new Date(),
            };
        } catch (error) {
            console.error("❌ ExternalHealthService Error:", error.message);
            return null; // Graceful fallback
        }
    }

    /**
     * Optional: Fetches drug interaction or classification from OpenFDA
     */
    async fetchDrugInfo(drugName) {
        try {
            const response = await axios.get(`https://api.fda.gov/drug/label.json`, {
                params: {
                    search: `openfda.brand_name:"${drugName}"`,
                    limit: 1,
                },
            });
            return response.data.results?.[0] || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Fetches exercise safety and muscle group data from the WGER API.
     * Upgraded to fetch detailed muscles, equipment, and descriptions.
     */
    async getExerciseSafetyContext(exerciseName) {
        try {
            console.log(`📡 ExternalHealthService: Fetching advanced WGER data for [${exerciseName}]...`);

            // 1. Search for the exercise by name to get the ID
            const searchRes = await axios.get(`https://wger.de/api/v2/exercise/search/`, {
                params: { term: exerciseName },
                timeout: 5000
            });

            const suggestion = searchRes.data.suggestions?.[0];

            if (!suggestion || !suggestion.data || !suggestion.data.id) {
                return {
                    name: exerciseName,
                    muscleGroup: "General Conditioning",
                    intensity: "Standard",
                    safetyWarning: "Ensure proper form and hydration.",
                    advancedProtocol: null
                };
            }

            const id = suggestion.data.id;

            // 2. Fetch full details using the ID
            const detailRes = await axios.get(`https://wger.de/api/v2/exerciseinfo/${id}/`, {
                timeout: 5000
            });
            const data = detailRes.data;

            // 3. Parse and clean data
            const cleanDescription = (data.description || "")
                .replace(/<[^>]*>?/gm, "") // Strip HTML
                .replace(/\s+/g, " ")       // Flatten whitespace
                .trim();

            const primaryMuscles = (data.muscles || []).map(m => m.name);
            const secondaryMuscles = (data.muscles_secondary || []).map(m => m.name);
            const equipment = (data.equipment || []).map(e => e.name);

            return {
                name: data.name || exerciseName,
                muscleGroup: primaryMuscles.length > 0 ? primaryMuscles.join(", ") : "Major Muscle Groups",
                intensity: "Moderate",
                safetyWarning: "Maintain neutral spine alignment and control eccentric movements.",
                // Advanced Protocol Data
                advancedProtocol: {
                    description: cleanDescription || "No detailed instructions available.",
                    muscles: [...primaryMuscles, ...secondaryMuscles],
                    equipment: equipment.length > 0 ? equipment : ["None"]
                }
            };
        } catch (error) {
            console.error("❌ WGER Advanced API Error:", error.message);
            return {
                name: exerciseName,
                muscleGroup: "Unknown",
                intensity: "N/A",
                safetyWarning: "Consult a trainer if unsure about technique.",
                advancedProtocol: null
            };
        }
    }
}

module.exports = new ExternalHealthService();
