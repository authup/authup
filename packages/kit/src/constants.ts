/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum DecisionStrategy {
    /**
     * One or more positive
     */
    AFFIRMATIVE = 'affirmative',
    /**
     * All positive
     */
    UNANIMOUS = 'unanimous',
    /**
     * More positive than negative
     */
    CONSENSUS = 'consensus',
}

export enum EnvironmentName {
    PRODUCTION = 'production',
    TEST = 'test',
    DEVELOPMENT = 'development',
}

export enum ValidatorGroup {
    CREATE = 'create',
    UPDATE = 'update',
    /**
     * Startup provisioning (file source). Shares the CREATE field rules but
     * relaxes API-only constraints (e.g. optional user email) and mounts
     * provisioning-only fields (e.g. built_in) that the API groups
     * deliberately strip. Never used by HTTP-facing services.
     */
    PROVISIONING = 'provisioning',
}
