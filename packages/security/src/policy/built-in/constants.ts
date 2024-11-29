/*
 * Copyright (c) 2024-2024.
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
    /**
     * Attribute Name Based Access Control (ANBAC)
     */
    ATTRIBUTE_NAMES = 'attributeNames',
    /**
     * Attribute Based Access Control (ABAC)
     */
    ATTRIBUTES = 'attributes',
    /**
     * Realm of Identity is for attribute realm.
     */
    REALM_MATCH = 'realmMatch',

    /**
     * Restriction based on identity (type, id, ...)
     */
    IDENTITY = 'identity',

    /**
     * Restriction based on a binding between identity <-> permission
     */
    PERMISSION_BINDING = 'permissionBinding',

    // Location (LBAC)
    // Device (DBAC)
}
