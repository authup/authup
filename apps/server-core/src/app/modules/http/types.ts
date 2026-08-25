/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type HTTPModuleOptions = {
    /**
     * Mount the management API (the entity CRUD controllers, see
     * `MANAGEMENT_API_CONTROLLERS`) next to the identity provider's own
     * surface. The console role sets this false, so a management request
     * that lands on one of its replicas answers 404 rather than the row.
     * default: true
     */
    managementApi?: boolean,
};
