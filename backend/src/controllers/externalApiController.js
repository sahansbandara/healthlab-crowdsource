const asyncHandler = require("../utils/asyncHandler");
const { getDrugEvents, getDrugLabels } = require("../services/externalApiService");

const fdaDrugEvents = asyncHandler(async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const data = await getDrugEvents(limit);
    res.status(200).json({
      success: true,
      source: "Open FDA",
      description: "Drug adverse events (third-party API)",
      count: data.results?.length ?? 0,
      results: data.results ?? [],
    });
  } catch (err) {
    if (err.response || err.code === "ECONNREFUSED") {
      return res.status(502).json({
        success: false,
        message: "Open FDA API temporarily unavailable",
      });
    }
    throw err;
  }
});

const fdaDrugLabels = asyncHandler(async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const search = req.query.search || "";
    const data = await getDrugLabels(search, limit);
    res.status(200).json({
      success: true,
      source: "Open FDA",
      description: "Drug labels (third-party API)",
      count: data.results?.length ?? 0,
      results: data.results ?? [],
    });
  } catch (err) {
    if (err.response || err.code === "ECONNREFUSED") {
      return res.status(502).json({
        success: false,
        message: "Open FDA API temporarily unavailable",
      });
    }
    throw err;
  }
});

module.exports = {
  fdaDrugEvents,
  fdaDrugLabels,
};
