const Experiment = require("../models/Experiment");
const Participation = require("../models/Participation");
const recommendationService = require("../services/recommendationService");
const asyncHandler = require("../utils/asyncHandler");

exports.getRecommendations = asyncHandler(async (req, res) => {
    console.log("🔍 API /recommendations hit");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("User in request:", req.user ? req.user.email : "NULL");

    try {
        const user = req.user;
        if (!user) {
            console.log("❌ Recommendations: Not authenticated");
            return res.status(401).json({ message: "Not authenticated" });
        }

        console.log(`⏳ Recommendations: Fetching for user ${user._id} (${user.email})...`);

        // 1. Fetch all experiments (including draft)
        // The original code already fetches all experiments without an 'active' filter.
        const experiments = await Experiment.find({});
        console.log(`📊 Recommendations: Found ${experiments.length} experiments in ${Experiment.db.name}`);

        // 3. Check for existing participations to mark as 'enrolled'
        const userParticipations = await Participation.find({ userId: user._id, status: "joined" });
        const joinedExpIds = new Set(userParticipations.map(p => p.experimentId.toString()));

        const recommendations = experiments.map(exp => {
            try {
                const matchInfo = recommendationService.calculateMatchScore(user, exp);
                return {
                    ...exp.toJSON(),
                    matchScore: matchInfo.score,
                    matchReason: matchInfo.reason,
                    enrolled: joinedExpIds.has(exp._id.toString())
                };
            } catch (err) {
                console.error(`❌ Recommendations: Failed to score experiment ${exp._id}:`, err.message);
                return null;
            }
        }).filter(Boolean);

        // 3. Sort by score descending
        recommendations.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`✅ Recommendations: Returning ${recommendations.length} items.`);
        res.status(200).json(recommendations);
    } catch (error) {
        console.error("❌ Recommendations error:", error);
        res.status(500).json({ message: "Error fetching recommendations", error: error.message });
    }
});
