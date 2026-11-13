/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type HealthCheck = {
    name: string,
    /**
     * Resolves false, or rejects, when the check fails.
     */
    run: () => Promise<boolean> | boolean,
};

export type HealthCheckResult = {
    name: string,
    ok: boolean,
};

export type HealthReport = {
    healthy: boolean,
    checks: HealthCheckResult[],
};

/**
 * Set once the process received its termination signal. The readiness route
 * reads it, so the listener answers 503 while it is still serving.
 */
export type ShutdownState = {
    active: boolean,
};

export type DatabaseHealthCheckOptions = {
    /**
     * Milliseconds the ping may take before it counts as failed.
     * default: 1000
     */
    timeout?: number,
    /**
     * Milliseconds a result is reused for. The routes are anonymous, so a
     * caller must not be able to run one query per request.
     * default: 1000
     */
    ttl?: number,
};

export type HealthRoutesOptions = {
    liveness: HealthCheck[],
    readiness: HealthCheck[],
};
