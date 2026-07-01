/**
 * ---------------------------------------------------------------------------------
 * SERVICE: ScoringService (Pipeline Stage 4)
 * ---------------------------------------------------------------------------------
 * Purpose: Ranks and selects the optimal subset of drivers to dispatch offers to.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

class ScoringService {
    /**
     * Scores and ranks candidates based on ETA, ratings, and business rules.
     * @param {Array} evaluatedCandidates 
     * @param {Number} limit - Max offers to generate in this batch
     * @returns {Array} Top candidates
     */
    static scoreAndRank(evaluatedCandidates, limit = 5) {
        // Sort by ETA ascending
        const sorted = evaluatedCandidates.sort((a, b) => a.etaSeconds - b.etaSeconds);
        
        // Take top N
        return sorted.slice(0, limit);
    }
}

module.exports = ScoringService;
