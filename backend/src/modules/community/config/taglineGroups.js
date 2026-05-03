/**
 * Group taglines by category to keep candidate label sets small.
 * This improves latency and reliability with zero-shot classification.
 *
 * You can add more labels later by:
 * - adding them to `taglines.js` AND
 * - (optionally) adding them under the relevant category below.
 */

module.exports = {
  "Mental Health": [
    "Mental Health",
    "Anxiety",
    "Depression",
    "Stress Management",
    "Sleep Health",
  ],
  Nutrition: [
    "Nutrition",
    "Dietary Habits",
    "Obesity Prevention",
  ],
  Epidemiology: [
    "Epidemiology",
    "Public Health",
    "Infectious Diseases",
    "Vaccination",
    "Disease Prevention",
    "Preventive Medicine",
    "Community Health",
    "Global Health",
  ],
  "Public Policy": [
    "Healthcare Policy",
    "Public Health",
    "Community Health",
    "Global Health",
    "Preventive Medicine",
  ],
  "Clinical Research": [
    "Clinical Trials",
    "Medical Research",
    "Chronic Illness",
    "Public Health",
    "Global Health",
  ],
};

