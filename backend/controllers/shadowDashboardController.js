const ShadowValidationResult = require('../models/ShadowValidationResult');

exports.getDashboardMetrics = async (req, res) => {
    try {
        const totalValidations = await ShadowValidationResult.countDocuments();
        
        const aggregation = await ShadowValidationResult.aggregate([
            {
                $group: {
                    _id: "$validationType",
                    total: { $sum: 1 },
                    matches: { 
                        $sum: { $cond: [{ $eq: ["$status", "MATCH"] }, 1, 0] } 
                    },
                    mismatches: { 
                        $sum: { $cond: [{ $eq: ["$status", "MISMATCH"] }, 1, 0] } 
                    },
                    errors: { 
                        $sum: { $cond: [{ $eq: ["$status", "ERROR"] }, 1, 0] } 
                    },
                    maxDeviation: {
                        $max: {
                            $cond: [{ $eq: ["$validationType", "PRICING"] }, "$difference", 0]
                        }
                    }
                }
            }
        ]);

        // Calculate percentages and format the output
        const metrics = aggregation.reduce((acc, curr) => {
            const successPct = curr.total > 0 ? (curr.matches / curr.total) * 100 : 0;
            const failurePct = curr.total > 0 ? (curr.mismatches / curr.total) * 100 : 0;
            const errorPct = curr.total > 0 ? (curr.errors / curr.total) * 100 : 0;
            
            acc[curr._id] = {
                total: curr.total,
                matches: curr.matches,
                mismatches: curr.mismatches,
                errors: curr.errors,
                successPercentage: Number(successPct.toFixed(2)),
                failurePercentage: Number(failurePct.toFixed(2)),
                errorPercentage: Number(errorPct.toFixed(2)),
                largestDeviation: curr.maxDeviation
            };
            return acc;
        }, {});

        // Fetch last 5 mismatches
        const recentMismatches = await ShadowValidationResult.find({ status: 'MISMATCH' })
            .sort({ timestamp: -1 })
            .limit(5);

        res.status(200).json({
            status: 'success',
            data: {
                totalValidations,
                metrics,
                recentMismatches
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getHealthStatus = async (req, res) => {
    try {
        const pricingStats = await ShadowValidationResult.aggregate([
            { $match: { validationType: 'PRICING' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    matches: { $sum: { $cond: [{ $eq: ["$status", "MATCH"] }, 1, 0] } }
                }
            }
        ]);

        const stateStats = await ShadowValidationResult.aggregate([
            { $match: { validationType: 'STATE' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    matches: { $sum: { $cond: [{ $eq: ["$status", "MATCH"] }, 1, 0] } }
                }
            }
        ]);

        const pricingMetrics = pricingStats[0] || { total: 0, matches: 0 };
        const stateMetrics = stateStats[0] || { total: 0, matches: 0 };

        const pricingSuccessPct = pricingMetrics.total > 0 ? (pricingMetrics.matches / pricingMetrics.total) * 100 : 100;
        const stateSuccessPct = stateMetrics.total > 0 ? (stateMetrics.matches / stateMetrics.total) * 100 : 100;

        // Determine overall health based on Release Gates
        // Gate: Pricing > 99.9%, State = 100%
        let health = 'HEALTHY';
        if (pricingSuccessPct < 99.9 || stateSuccessPct < 100) {
            health = 'WARNING';
        }
        if (pricingSuccessPct < 90 || stateSuccessPct < 95) {
            health = 'CRITICAL';
        }

        res.status(200).json({
            status: 'success',
            data: {
                health,
                gates: {
                    pricing: {
                        current: Number(pricingSuccessPct.toFixed(4)),
                        required: 99.9,
                        passed: pricingSuccessPct >= 99.9
                    },
                    state: {
                        current: Number(stateSuccessPct.toFixed(4)),
                        required: 100,
                        passed: stateSuccessPct >= 100
                    }
                }
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};
