/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type {
    PermissionChecker,
    PermissionCheckerCheckContext,
} from '@authup/kit';
import type { Request } from 'routup';
import { useRequestIdentity, useRequestScopes } from '../helpers';

export class RequestPermissionChecker {
    protected req: Request;

    protected checker: PermissionChecker;

    constructor(req: Request, checker: PermissionChecker) {
        this.req = req;
        this.checker = checker;
    }

    // --------------------------------------------------------------

    async check(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.checker.check(this.extendCheckContext(ctx));
    }

    async preCheck(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.checker.preCheck(this.extendCheckContext(ctx));
    }

    // --------------------------------------------------------------

    async preCheckOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.checker.preCheckOneOf(this.extendCheckContext(ctx));
    }

    async checkOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        return this.checker.checkOneOf(this.extendCheckContext(ctx));
    }

    // --------------------------------------------------------------

    protected extendCheckContext(ctx: PermissionCheckerCheckContext) {
        const scopes = useRequestScopes(this.req);
        if (scopes.indexOf(ScopeName.GLOBAL) !== -1) {
            ctx.data = {
                ...ctx.data || {},
                identity: useRequestIdentity(this.req),
            };
        }

        return ctx;
    }
}
