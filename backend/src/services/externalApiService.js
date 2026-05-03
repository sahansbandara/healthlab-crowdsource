const axios = require("axios");

const OPEN_FDA_BASE = "https://api.fda.gov";

/**
 * Fetch drug event data from Open FDA (third-party API).
 * @see https://open.fda.gov/apis/
 */
async function getDrugEvents(limit = 5) {
  const url = `${OPEN_FDA_BASE}/drug/event.json?limit=${limit}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data;
}

/**
 * Fetch drug labels from Open FDA (third-party API).
 */
async function getDrugLabels(search = "", limit = 5) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search) params.set("search", `openfda.brand_name:"${search}"`);
  const url = `${OPEN_FDA_BASE}/drug/label.json?${params}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data;
}

module.exports = {
  getDrugEvents,
  getDrugLabels,
};
