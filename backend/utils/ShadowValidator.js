/**
 * ---------------------------------------------------------------------------------
 * UTILITY: ShadowValidator
 * ---------------------------------------------------------------------------------
 * Phase 5: Parallel Validation (Shadow Mode)
 * 
 * Purpose: Simulates V2 calculations/state machine transitions in the background
 * without affecting the primary V1 request. Persists mismatches to 
 * ShadowValidationResult.
 * ---------------------------------------------------------------------------------
 */

const { EventEmitter } = require('events');
let PricingServiceV2 = null;
let DispatchStateMachine = null;
try { PricingServiceV2 = require('../services/v2/PricingServiceV2'); } catch(e) {}
try { DispatchStateMachine = require('../stateMachines/DispatchStateMachine'); } catch(e) {}

const ShadowValidationResult = require('../models/ShadowValidationResult');
const { v4: uuidv4 } = require('uuid');

class ShadowValidator extends EventEmitter {
    
    /**
     * Determines whether to execute shadow validation based on SHADOW_SAMPLE_RATE env var.
     */
    static shouldSample() {
        const rate = parseFloat(process.env.SHADOW_SAMPLE_RATE || '1.0');
        return Math.random() <= rate;
    }

    /**
     * Shadow Mode for State Machine transitions.
     */
    static async validateStateTransition(instance, targetStatus) {
        if (!this.shouldSample()) return;

        setImmediate(async () => {
            const startTime = process.hrtime.bigint();
            const startMemory = process.memoryUsage().heapUsed;

            try {
                let isAllowed = true;
                if (DispatchStateMachine && typeof DispatchStateMachine.canTransition === 'function') {
                    isAllowed = DispatchStateMachine.canTransition(instance.status, targetStatus);
                }

                const executionTimeMs = Number(process.hrtime.bigint() - startTime) / 1e6;
                const memoryUsageMb = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;

                const result = new ShadowValidationResult({
                    validationType: 'STATE',
                    correlationId: instance.correlationId || uuidv4(),
                    tripId: instance._id,
                    legacyResult: { current: instance.status, target: targetStatus },
                    v2Result: { allowed: isAllowed },
                    difference: isAllowed ? null : `V2 rejected transition ${instance.status} -> ${targetStatus}`,
                    severity: isAllowed ? 'INFO' : 'CRITICAL',
                    status: isAllowed ? 'MATCH' : 'MISMATCH',
                    migrationVersion: process.env.MIGRATION_VERSION || '1.0.0',
                    applicationVersion: process.env.APP_VERSION || '1.0.0',
                    executionTimeMs,
                    memoryUsageMb
                });

                await result.save();
            } catch (err) {
                console.error(`[SHADOW_ERROR] State validation failed: ${err.message}`);
                await ShadowValidationResult.create({
                    validationType: 'STATE',
                    correlationId: instance.correlationId || uuidv4(),
                    tripId: instance._id,
                    severity: 'CRITICAL',
                    status: 'ERROR',
                    difference: err.message
                });
            }
        });
    }

    /**
     * Shadow Mode for Pricing
     */
    static async validatePricing(tripData, v1Price) {
        if (!this.shouldSample()) return;

        setImmediate(async () => {
            const startTime = process.hrtime.bigint();
            const startMemory = process.memoryUsage().heapUsed;

            try {
                if (PricingServiceV2 && typeof PricingServiceV2.calculatePrice === 'function') {
                    const v2Price = await PricingServiceV2.calculatePrice(tripData);
                    
                    const tolerance = parseFloat(process.env.PRICING_TOLERANCE || '0.01');
                    const diff = Math.abs(v1Price - v2Price);
                    const isMatch = diff <= tolerance;

                    const executionTimeMs = Number(process.hrtime.bigint() - startTime) / 1e6;
                    const memoryUsageMb = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;

                    const result = new ShadowValidationResult({
                        validationType: 'PRICING',
                        correlationId: tripData.correlationId || uuidv4(),
                        tripId: tripData.tripId || tripData._id,
                        legacyResult: v1Price,
                        v2Result: v2Price,
                        difference: diff,
                        severity: isMatch ? 'INFO' : (diff > 5 ? 'CRITICAL' : 'WARNING'),
                        status: isMatch ? 'MATCH' : 'MISMATCH',
                        migrationVersion: process.env.MIGRATION_VERSION || '1.0.0',
                        applicationVersion: process.env.APP_VERSION || '1.0.0',
                        executionTimeMs,
                        memoryUsageMb
                    });

                    await result.save();
                }
            } catch (err) {
                console.error(`[SHADOW_ERROR] Pricing validation failed: ${err.message}`);
                await ShadowValidationResult.create({
                    validationType: 'PRICING',
                    correlationId: tripData.correlationId || uuidv4(),
                    tripId: tripData.tripId || tripData._id,
                    severity: 'CRITICAL',
                    status: 'ERROR',
                    difference: err.message
                });
            }
        });
    }

}

module.exports = ShadowValidator;
