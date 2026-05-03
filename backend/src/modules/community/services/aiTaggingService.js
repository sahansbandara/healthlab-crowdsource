const axios = require("axios");
const TAGLINES = require("../config/taglines");
const TAGLINE_GROUPS = require("../config/taglineGroups");

const CATEGORIES = [
  "Mental Health",
  "Nutrition",
  "Epidemiology",
  "Public Policy",
  "Clinical Research",
];

const DEFAULT_MODEL = "typeform/distilbert-base-uncased-mnli";

function getHfConfig() {
  const token = process.env.HF_TOKEN;
  const model = process.env.HF_MODEL || DEFAULT_MODEL;
  const endpoint =
    process.env.HF_ENDPOINT ||
    `https://router.huggingface.co/hf-inference/models/${model}`;

  return { token, model, endpoint };
}

async function hfZeroShot({ endpoint, token, inputs, candidate_labels }) {
  const response = await axios.post(
    endpoint,
    { inputs, parameters: { candidate_labels } },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: Math.max(1000, parseInt(process.env.HF_TIMEOUT_MS || "60000", 10)),
    }
  );
  return response.data;
}

function pickTopLabels(result, { min = 3, max = 5 } = {}) {
  // HF router commonly returns: [{ label: string, score: number }, ...]
  // Some inference endpoints return: { labels: string[], scores: number[] }
  let pairs = [];
  if (Array.isArray(result)) {
    pairs = result
      .map((x) => ({ label: x?.label, score: x?.score }))
      .filter((x) => typeof x.label === "string" && typeof x.score === "number")
      .sort((a, b) => b.score - a.score);
  } else {
    const labels = Array.isArray(result?.labels) ? result.labels : [];
    const scores = Array.isArray(result?.scores) ? result.scores : [];
    pairs = labels
      .map((label, idx) => ({ label, score: scores[idx] }))
      .filter((x) => typeof x.label === "string" && typeof x.score === "number")
      .sort((a, b) => b.score - a.score);
  }

  // Prefer labels above threshold, but always return at least `min`.
  const threshold = parseFloat(process.env.HF_TAG_SCORE_THRESHOLD || "0.18");
  const above = pairs.filter((p) => p.score >= threshold).slice(0, max);

  if (above.length >= min) return above.map((p) => p.label);
  return pairs.slice(0, Math.min(max, Math.max(min, pairs.length))).map((p) => p.label);
}

/**
 * Generate { category, aiTags } for a discussion.
 *
 * @param {Object} args
 * @param {string} args.title
 * @param {string} args.content
 * @returns {Promise<{category: string|null, aiTags: string[]}|null>}
 */
async function generateSmartTags({ title, content }) {
  const { token, endpoint } = getHfConfig();
  if (!token) return null;

  const text = `${(title || "").trim()}\n\n${(content || "").trim()}`.trim();
  if (!text) return null;

  try {
    // HuggingFace router can be slow/rate-limited; do sequential calls for reliability.
    const catResult = await hfZeroShot({
      endpoint,
      token,
      inputs: text,
      candidate_labels: CATEGORIES,
    });

    const category = pickTopLabels(catResult, { min: 1, max: 1 })[0] || null;
    // Prefer category-specific tagline subset for speed/reliability
    const general = ["Public Health", "Community Health", "Preventive Medicine", "Global Health"];
    const grouped = category && TAGLINE_GROUPS[category] ? TAGLINE_GROUPS[category] : TAGLINES;
    const candidate_labels = Array.from(new Set([...(grouped || []), ...general])).filter(Boolean);

    const tagResult = await hfZeroShot({
      endpoint,
      token,
      inputs: text,
      candidate_labels,
    });
    const aiTags = pickTopLabels(tagResult, { min: 3, max: 5 });

    return { category, aiTags };
  } catch (err) {
    console.warn("[SmartTagging] HF request failed:", err.message || err);
    return null;
  }
}

module.exports = {
  CATEGORIES,
  TAGLINES,
  generateSmartTags,
};

