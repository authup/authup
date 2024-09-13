/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type {
    PermissionChecker, PermissionCheckerCheckContext, PolicyIdentity,
} from '@authup/kit';
import type { Request } from 'routup';
import { useRequestEnv } from '../helpers';

export class RequestPermissionChecker {
    protected req: Request;

    protected checker: PermissionChecker;

    protected identity : PolicyIdentity | undefined;

    protected identityExtracted : boolean;

    constructor(req: Request, checker: PermissionChecker) {
        this.req = req;
        this.checker = checker;
        this.identityExtracted = false;
    }

    getRequestIdentity() : PolicyIdentity | undefined {
        this.extractRequestIdentity();

        return this.identity;
    }

    protected extractRequestIdentity() {
        if (this.identityExtracted) {
            return;
        }

        this.identityExtracted = true;

        const scopes = useRequestEnv(this.req, 'scopes') || [];
        if (scopes.indexOf(ScopeName.GLOBAL) === -1) {
            return;
        }

        const env = useRequestEnv(this.req);
        if (env.userId) {
            this.identity = {
                type: 'user',
                id: env.userId,
                realmId: env.realm?.id,
                realmName: env.realm?.name,
            };

            return;
        }

        if (env.robotId) {
            this.identity = {
                type: 'robot',
                id: env.robotId,
                realmId: env.realm?.id,
                realmName: env.realm?.name,
            };

            return;
        }

        if (env.clientId) {
            this.identity = {
                type: 'client',
                id: env.clientId,
                realmId: env.realm?.id,
                realmName: env.realm?.name,
            };
        }
    }

    // --------------------------------------------------------------

    async check(ctx: PermissionCheckerCheckContext) : Promise<void> {
        this.extractRequestIdentity();

        return this.checker.check(this.extendCheckContext(ctx));
    }

    async preCheck(ctx: PermissionCheckerCheckContext) : Promise<void> {
        this.extractRequestIdentity();

        return this.checker.preCheck(this.extendCheckContext(ctx));
    }

    // --------------------------------------------------------------

    async preCheckOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        this.extractRequestIdentity();

        return this.checker.preCheckOneOf(this.extendCheckContext(ctx));
    }

    async checkOneOf(ctx: PermissionCheckerCheckContext) : Promise<void> {
        this.extractRequestIdentity();

        return this.checker.checkOneOf(this.extendCheckContext(ctx));
    }

    // --------------------------------------------------------------

    protected extendCheckContext(ctx: PermissionCheckerCheckContext) {
        if (this.identity) {
            ctx.data = {
                ...ctx.data || {},
                identity: this.identity,
            };
        }

        return ctx;
    }
}
