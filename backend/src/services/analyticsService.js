const FundRequest = require('../models/FundRequest');
const ExperimentWallet = require('../models/ExperimentWallet');
const User = require('../models/User');
const Researcher = require('../models/Researcher');

// totalRequestedAmount
// totalApprovedAmount
// totalDisbursedAmount
// counts by status
// top experiments by approved amount

const getAnalytics = async () => {
    const stats = await FundRequest.aggregate([
        {
            $group: {
                _id: null,
                totalRequested: { $sum: '$requestedAmount' },
                // Approved amount is only set if approved, so we filter or just sum it (it's undefined/null otherwise, which sums to 0 usually, but safer to match)
                totalApproved: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['APPROVED', 'DISBURSED']] }, '$approvedAmount', 0]
                    }
                },
                totalDisbursed: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'DISBURSED'] }, '$approvedAmount', 0]
                    }
                }
            }
        }
    ]);

    const statusCounts = await FundRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const topExperiments = await FundRequest.aggregate([
        { $match: { status: { $in: ['APPROVED', 'DISBURSED'] } } },
        { $group: { _id: '$experimentId', totalApproved: { $sum: '$approvedAmount' } } },
        { $sort: { totalApproved: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'experiments', localField: '_id', foreignField: '_id', as: 'experiment' } },
        { $unwind: '$experiment' },
        { $project: { title: '$experiment.title', totalApproved: 1 } }
    ]);

    return {
        totals: stats[0] || { totalRequested: 0, totalApproved: 0, totalDisbursed: 0 },
        statusCounts: statusCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        topExperiments
    };
};

const getReports = async ({ status, experimentId, researcherId, fromDate, toDate, limit = 10, page = 1 }) => {
    const query = {};
    if (status) query.status = status;
    if (experimentId) query.experimentId = experimentId;
    if (researcherId) query.researcherId = researcherId;
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const requests = await FundRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('researcherId', 'name email')
        .populate('experimentId', 'title');

    const total = await FundRequest.countDocuments(query);

    return {
        data: requests,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        }
    };
};

const getDashboardStats = async (days = 30) => {
    // 1. User Role Distribution
    const userRoles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // 2. Researcher Status Distribution
    const researcherStatus = await Researcher.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Qualification Distribution
    const qualifications = await Researcher.aggregate([
        { $group: { _id: '$highestAcademicQualification', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // 4. Registration Trend (Dynamic range based on 'days')
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const registrationTrendRaw = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Gap filling for registration trend
    const registrationTrend = [];
    const tempDate = new Date(startDate);
    const endDate = new Date();
    
    // Create a map for quick lookup
    const trendMap = registrationTrendRaw.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    while (tempDate <= endDate) {
        const dateStr = tempDate.toISOString().split('T')[0];
        registrationTrend.push({
            date: dateStr,
            count: trendMap[dateStr] || 0
        });
        tempDate.setDate(tempDate.getDate() + 1);
    }

    // 5. Growth Metrics (New users this week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const currentWeekCount = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const previousWeekCount = await User.countDocuments({ 
        createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } 
    });

    let growthRate = 0;
    if (previousWeekCount > 0) {
        growthRate = ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100;
    } else if (currentWeekCount > 0) {
        growthRate = 100;
    }

    return {
        userRoles: userRoles.reduce((acc, curr) => ({ ...acc, [curr._id || 'unknown']: curr.count }), {}),
        researcherStatus: researcherStatus.reduce((acc, curr) => ({ ...acc, [curr._id || 'pending']: curr.count }), {}),
        qualifications: qualifications.map(q => ({ name: q._id || 'Unspecified', count: q.count })),
        registrationTrend,
        summary: {
            totalUsers: await User.countDocuments(),
            totalResearchers: await Researcher.countDocuments(),
            pendingResearchers: await Researcher.countDocuments({ status: { $in: ['pending', '', null] } }),
            approvedResearchers: await Researcher.countDocuments({ status: 'approved' }),
            rejectedResearchers: await Researcher.countDocuments({ status: 'rejected' }),
            growthRate: parseFloat(growthRate.toFixed(1)),
            newUsersThisWeek: currentWeekCount
        }
    };
};

module.exports = { getAnalytics, getReports, getDashboardStats };
