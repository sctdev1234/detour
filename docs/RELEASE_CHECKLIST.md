# RELEASE CHECKLIST

This checklist is the definitive operational release gate used before every production deployment. It ensures that deployments are safe, measurable, and recoverable.

## Release Metadata

- **Release Checklist Version:** _______________  
- **Architecture Version:** _______________  
- **Schema Version:** _______________  
- **Runbook Version:** _______________  
- **Owner:** _______________  
- **Last Updated:** _______________  
- **Applicable Platform Version:** _______________  

---

## Automatic NO-GO Conditions

Deployment **MUST stop immediately** if ANY of the following occur:
- migration failure
- ledger reconciliation != 100%
- settlement failures detected
- smoke test failure
- rollback validation failure
- monitoring unavailable
- production error rate above threshold
- P1 incident opened
- critical security verification failure

---

## 1. Database Readiness
**Owner: Operations**
- [ ] All required MongoDB indexes exist and are healthy (Evidence: `[   ]`)
- [ ] Background index creation has completed (Evidence: `[   ]`)
- [ ] Database migrations completed successfully (Evidence: `[   ]`)
- [ ] Migration verification passed (Evidence: `[   ]`)
- [ ] Backup completed before deployment (Evidence: `[   ]`)
- [ ] Restore procedure tested within the last release cycle (Evidence: `[   ]`)
- [ ] Estimated rollback time documented (Evidence: `[   ]`)

## 2. API Contract & Security Verification
**Owner: Engineering**
- [ ] No breaking API changes (Evidence: `[   ]`)
- [ ] Mobile clients remain backward compatible (Evidence: `[   ]`)
- [ ] Admin API verified (Evidence: `[   ]`)
- [ ] Versioned endpoints validated (Evidence: `[   ]`)
- [ ] Feature flags verified (Evidence: `[   ]`)
- [ ] JWT authentication verified (Evidence: `[   ]`)
- [ ] RBAC verified (Evidence: `[   ]`)
- [ ] Admin endpoints protected (Evidence: `[   ]`)
- [ ] Rate limiting enabled (Evidence: `[   ]`)
- [ ] CORS verified (Evidence: `[   ]`)
- [ ] Secrets not committed (Evidence: `[   ]`)
- [ ] Production `.env` validated (Evidence: `[   ]`)

## 3. Performance Verification
**Owner: Operations**
- [ ] Ride Request P95 < 500 ms (Evidence: `[   ]`)
- [ ] Dispatch Matching < 2 s (Evidence: `[   ]`)
- [ ] Wallet Settlement < 1 s (Evidence: `[   ]`)
- [ ] Scheduler completes within 5 minutes (Evidence: `[   ]`)
- [ ] Dashboard initial load < 2 seconds (Evidence: `[   ]`)

## 4. Observability Verification
**Owner: Operations**
- [ ] Correlation IDs present in logs (Evidence: `[   ]`)
- [ ] Structured JSON logs verified (Evidence: `[   ]`)
- [ ] Error alerts tested (Evidence: `[   ]`)
- [ ] Dashboard panels populated (Evidence: `[   ]`)
- [ ] Trace sampling verified (Evidence: `[   ]`)

## 5. Disaster Recovery Verification
**Owner: Operations**
- [ ] Backup restored successfully in staging (Evidence: `[   ]`)
- [ ] Rollback deployment tested (Evidence: `[   ]`)
- [ ] Manual settlement replay tested (Evidence: `[   ]`)
- [ ] Scheduler recovery tested (Evidence: `[   ]`)
- [ ] Notification replay tested (Evidence: `[   ]`)

---

## 6. Technical Smoke Test
**Owner: QA**
- [ ] API healthy (HTTP 200) (Evidence: `[   ]`)
- [ ] Socket connected (Evidence: `[   ]`)
- [ ] Scheduler executed (Evidence: `[   ]`)
- [ ] Finance settlement completed (Evidence: `[   ]`)
- [ ] `DomainEventBus` operational (Evidence: `[   ]`)
- [ ] Driver reconnect tested (Evidence: `[   ]`)
- [ ] Passenger reconnect tested (Evidence: `[   ]`)
- [ ] Background → Foreground recovery verified (Evidence: `[   ]`)
- [ ] Missed offer recovery verified (Evidence: `[   ]`)
- [ ] Sequence recovery verified (Evidence: `[   ]`)
- [ ] No duplicate socket listeners (Evidence: `[   ]`)

## 7. Business Acceptance
**Owner: Product**
- [ ] Passenger booked ride (Evidence: `[   ]`)
- [ ] Driver accepted ride (Evidence: `[   ]`)
- [ ] Trip completed (Evidence: `[   ]`)
- [ ] Settlement completed (Evidence: `[   ]`)
- [ ] Receipt generated (Evidence: `[   ]`)
- [ ] Withdrawal approved (Evidence: `[   ]`)
- [ ] Refund completed (Evidence: `[   ]`)
- [ ] Ledger reconciled (Evidence: `[   ]`)
- [ ] Ride completion rate >= 95% (Evidence: `[   ]`)
- [ ] Settlement success rate = 100% (Evidence: `[   ]`)
- [ ] Driver acceptance rate >= 80% (Evidence: `[   ]`)
- [ ] Matching success rate >= 90% (Evidence: `[   ]`)
- [ ] Wallet reconciliation = 100% (Evidence: `[   ]`)

---

## 8. Rollback Triggers
**Owner: Operations**

Rollback immediately if ANY of the following occur:
- settlement failures exceed 0%
- matching success drops below 90%
- wallet reconciliation fails
- repeated socket disconnects occur
- repeated Mongo transaction failures occur
- production error budget exceeded

---

## 9. Post Deployment Verification
**Owner: Engineering**

Immediately after deployment verify:

### 15 Minutes (Immediate deployment health)
- [ ] Error rate normal (Evidence: `[   ]`)
- [ ] CPU normal (Evidence: `[   ]`)
- [ ] Memory normal (Evidence: `[   ]`)
- [ ] Event Loop normal (Evidence: `[   ]`)
- [ ] Mongo slow queries acceptable (Evidence: `[   ]`)
- [ ] Socket connections stable (Evidence: `[   ]`)
- [ ] Matching success unchanged (Evidence: `[   ]`)
- [ ] Settlement success unchanged (Evidence: `[   ]`)
- [ ] No active alerts (Evidence: `[   ]`)

*Deployment Owner Sign-off:* _______________

### 1 Hour (Business workflow stability)
- [ ] Core business metrics stable (Evidence: `[   ]`)
- [ ] Zero `finance_settlement_failure` events (Evidence: `[   ]`)
- [ ] Background jobs / scheduler running successfully (Evidence: `[   ]`)

*Deployment Owner Sign-off:* _______________

### 24 Hours (Long-term production validation)
- [ ] Memory leaks absent (Evidence: `[   ]`)
- [ ] Ledger reconciliation audit successful (Evidence: `[   ]`)
- [ ] Cloud costs nominal (Evidence: `[   ]`)

*Deployment Owner Sign-off:* _______________

---

## Production Declaration

Engineering certifies that:
- Architecture has not changed.
- No temporary workarounds exist.
- No TODO/FIXME remains.
- Monitoring is active.
- Rollback has been validated.
- Release criteria have been satisfied.

**Release Manager Signature:** _________________________  
**Date:** _________________________  
**Time:** _________________________  
