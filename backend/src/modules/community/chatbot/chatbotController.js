// Chatbot controller: single chat endpoint; calls Groq for reply
const { HTTP_STATUS } = require("../../../config/constants");
const { getReply } = require("./services/groqService");

// POST body: message, optional history; returns { success, reply }
async function chat(req, res, next) {
  try {
    const { message, history } = req.body || {};
    const reply = await getReply(message, Array.isArray(history) ? history : []);
    return res.status(HTTP_STATUS.OK).json({ success: true, reply });
  } catch (err) {
    const msg = err.message || "Chat request failed";
    let status = HTTP_STATUS.SERVER_ERROR;
    if (msg.includes("required") || msg.includes("invalid") || msg.includes("unauthorized")) status = HTTP_STATUS.BAD_REQUEST;
    else if (msg.includes("rate limit")) status = 429;
    return res.status(status).json({ success: false, message: msg });
  }
}

module.exports = { chat };
