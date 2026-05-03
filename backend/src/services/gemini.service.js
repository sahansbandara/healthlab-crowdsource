const { GoogleGenAI } = require("@google/genai");
const benefitService = require("./benefitService");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Generate a text summary using the Gemini API.
 * @param {string} prompt - The prompt text to send to the model.
 * @returns {Promise<string>} - The generated text response.
 */
async function generateSummary(prompt) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    console.warn("⚠️ Gemini API: Missing apiKey. Falling back to simulated clinical data.");
    return "FALLBACK_MODE";
  }

  try {
    const model = ai.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
    return "FALLBACK_MODE";
  }
}

/**
 * Perform semantic matching between user conditions and study exclusions.
 * This provides "Professional Conflict Detection" using NLP.
 */
async function verifyClinicalEligibility(userConditions, excludedConditions) {
  if (!excludedConditions || excludedConditions.length === 0) {
    return { eligible: true };
  }

  const prompt = `
    Role: Senior Clinical Data Architect
    Task: Semantic Conflict Detection for Clinical Trial Eligibility
    
    Participant Medical History: [${userConditions.join(", ")}]
    Study Exclusion Criteria: [${excludedConditions.join(", ")}]

    Determine if there is a clinical conflict. 
    A conflict exists if:
    1. A condition in the history is a SUBTYPE or SYNONYM of an exclusion criteria (e.g., "Type 2 Diabetes" matches "Diabetes").
    2. A condition falls under the same clinical CLASS (e.g., "Asthma" matches "Chronic Obstructive Pulmonary Diseases").

    Format your response as a JSON object:
    {
      "isConflicted": boolean,
      "conflictReason": "Professional clinical justification (1 sentence)",
      "clinicalExplanation": "Detailed explanation mentioning the specific mapping found"
    }
  `;

  const result = await generateSummary(prompt);

  if (result === "FALLBACK_MODE") {
    // Basic Rule-Based Semantic Fallback for Demo
    const conflict = userConditions.find(u =>
      excludedConditions.some(e => u.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(u.toLowerCase()))
    );

    if (conflict) {
      return {
        isConflicted: true,
        conflictReason: "Clinical Conflict Detected (Simulated)",
        clinicalExplanation: `Our semantic engine detected a potential overlap between your condition '${conflict}' and the study exclusions. Even in simulated mode, this constitutes a protocol risk.`
      };
    }
    return { isConflicted: false };
  }

  try {
    // Attempt to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { isConflicted: false };
  } catch (e) {
    console.error("❌ Gemini Medical Parsing Error:", e);
    return { isConflicted: false };
  }
}

/**
 * Generate a personalized benefit analysis for a user joining an experiment.
 * This highlights "Participant Lifecycle" engagement and "Technical Depth".
 */
async function generatePersonalizedBenefitAnalysis(user, experiment) {
  // 1. Generate rule-based insights first (these are deterministic and high-quality)
  const ruleBasedInsights = benefitService.generateInsights(user, experiment);

  const profile = {
    age: user.age,
    gender: user.gender,
    weight: user.weight,
    bmi: user.bmi,
    sleepPatterns: user.sleepPatterns || "Not provided",
    smokingStatus: user.smokingStatus || "Not provided",
    activityLevel: user.activityLevel || "Not provided",
    medicalHistory: (user.medicalConditions || []).join(", ")
  };

  const prompt = `
    Role: Senior Clinical Study Consultant
    Task: Decision Support Narrative Generation
    
    User Profile:
    - Age: ${profile.age}
    - Gender: ${profile.gender}
    - Weight: ${profile.weight}kg
    - BMI: ${profile.bmi}
    - Habits: Sleep [${profile.sleepPatterns}], Smoking [${profile.smokingStatus}], Activity [${profile.activityLevel}]
    - History: [${profile.medicalHistory}]
    
    Experiment context:
    - Title: "${experiment.title}"
    - Description: "${experiment.description}"
    - Key Focus Tags: [${(experiment.tags || []).join(", ")}]

    Deterministic Clinical Insights:
    ${ruleBasedInsights.map(i => `- ${i}`).join("\n")}
    
    INSTRUCTIONS:
    Build upon the Deterministic Clinical Insights above. 
    Synthesize them into a cohesive, 2-3 sentence professional narrative that WOWs the user. 
    Explain exactly "Why" this study is a strategic fit for their health journey.
    Maintain a professional, medical-grade tone.
  `;

  console.log(`🧠 [Insight Engine] Generating narrative for ${user.email} (Study: "${experiment.title}")`);
  const result = await generateSummary(prompt);

  // 2. High-Quality Rule-Based Fallback (No AI)
  if (result === "FALLBACK_MODE") {
    console.log("⚠️ [Insight Engine] Missing API Key. Returning deterministic rule-based insights.");
    // Join the insights into a professional paragraph for the UI
    return ruleBasedInsights.join(" ");
  }

  return result;
}

module.exports = {
  generateSummary,
  verifyClinicalEligibility,
  generatePersonalizedBenefitAnalysis,
};


