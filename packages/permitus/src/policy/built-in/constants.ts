/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum BuiltInPolicyType {
    /**
     * Bundles different policies.
     */
    COMPOSITE = 'composite',
    /**
     * Date Based Access Control (DBAC)
     */
    DATE = 'date',
    /**
     * Time Based Access Control (TBAC)
     */
    TIME = 'time',
    ATTRIBUTE_NAMES = 'attributeNames',
    /**
     * Attribute Based Access Control (ABAC)
     */
    ATTRIBUTES = 'attributes',
    /**
     * Realm of Identity is for attribute realm.
     */
    REALM_MATCH = 'realmMatch',

    // Location (LBAC)
    // Device (DBAC)
}
