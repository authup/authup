/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionChecker as BasePermissionChecker, type PermissionCheckerOptions } from '@authup/kit';
import { PolicyEngine } from '../policy';
import { PermissionDBProvider } from './provider';

export class PermissionChecker extends BasePermissionChecker {
    constructor(options: PermissionCheckerOptions = {}) {
        super({
            ...options,
            policyEngine: new PolicyEngine(),
            provider: new PermissionDBProvider(),
        });
    }
}
