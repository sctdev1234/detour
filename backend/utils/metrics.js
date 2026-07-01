/**
 * ---------------------------------------------------------------------------------
 * UTILITY: Metrics Reporter
 * ---------------------------------------------------------------------------------
 * Purpose: Separates operational metrics from standard application logs.
 *          Outputs strictly structured JSON that monitoring systems (Datadog/Prometheus) 
 *          can aggregate.
 * ---------------------------------------------------------------------------------
 */

const context = require('./context');

class Metrics {
    /**
     * Records a timing metric.
     * @param {string} metricName (e.g. 'matching_duration_ms')
     * @param {number} durationMs 
     * @param {Object} tags (e.g. { domain: 'dispatch', outcome: 'success' })
     */
    static timing(metricName, durationMs, tags = {}) {
        this._emit('timing', metricName, durationMs, tags);
    }

    /**
     * Records a generic count metric.
     * @param {string} metricName (e.g. 'offers_generated')
     * @param {number} count 
     * @param {Object} tags 
     */
    static count(metricName, count = 1, tags = {}) {
        this._emit('count', metricName, count, tags);
    }

    /**
     * Records a discrete gauge metric.
     * @param {string} metricName (e.g. 'active_drivers')
     * @param {number} value 
     * @param {Object} tags 
     */
    static gauge(metricName, value, tags = {}) {
        this._emit('gauge', metricName, value, tags);
    }

    static _emit(type, name, value, tags) {
        const correlationId = context.get('correlationId') || 'SYSTEM';
        const environment = process.env.NODE_ENV || 'development';

        const metricPayload = {
            type: 'METRIC',
            metric_type: type,
            metric_name: name,
            value,
            tags: {
                ...tags,
                env: environment
            },
            correlationId,
            timestamp: new Date().toISOString()
        };

        // In production, this might write to a specific UDP port or specialized log stream.
        // For now, we write a structured JSON line to stdout.
        console.log(JSON.stringify(metricPayload));
    }
}

module.exports = Metrics;
