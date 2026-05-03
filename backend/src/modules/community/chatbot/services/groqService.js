// Groq chat: build messages and call Groq API for HealthLab community assistant reply
const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a helpful, friendly community assistant for a health and research platform called HealthLab. You help users with questions about community discussions, health topics, research participation, and general guidance. Keep replies concise, clear, and supportive. Do not give medical diagnoses; suggest consulting healthcare providers when appropriate.`;

// System message + history (user/model) + current user message
function buildMessages(userMessage, history = []) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of history) {
    if (!m || !m.content) continue;
    messages.push({ role: m.role === "model" ? "assistant" : "user", content: String(m.content).trim() });
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

// Call Groq API; throws if no key, empty message, or API error (auth/rate limit)
async function getReply(message, history = []) {
  if (!GROQ_API_KEY || !GROQ_API_KEY.trim()) throw new Error("GROQ_API_KEY is not configured");
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) throw new Error("Message is required");

  const messages = buildMessages(trimmedMessage, Array.isArray(history) ? history : []);

  try {
    const { data } = await axios.post(
      GROQ_URL,
      { model: GROQ_MODEL, messages, max_tokens: 1024, temperature: 0.7 },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY.trim()}` },
        timeout: 60000,
      }
    );
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "I couldn't generate a reply. Please try again.";
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || String(err);
    const status = err.response?.status;
    if (status === 401 || status === 403 || /api key|invalid|unauthorized/i.test(msg)) throw new Error("Groq API key is invalid or unauthorized.");
    if (status === 429 || /rate limit|quota/i.test(msg)) throw new Error("Groq rate limit reached. Please try again later.");
    throw new Error(msg || "Chat request failed");
  }
}

module.exports = { getReply };
