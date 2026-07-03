/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityNotFoundError } from '@authup/errors';
import type { IAppEvent } from 'routup';
import type { IRealmRepository } from '../../../../../core/index.ts';
import { setRequestRealmID } from '../../../request/index.ts';
import type { RealmResolverMiddlewareContext } from './types.ts';

export class RealmResolverMiddleware {
    protected realmRepository: IRealmRepository;

    constructor(ctx: RealmResolverMiddlewareContext) {
        this.realmRepository = ctx.realmRepository;
    }

    async run(event: IAppEvent) {
        const value = event.params.realmId;
        if (typeof value !== 'string' || !value) {
            return;
        }

        const realmId = await this.realmRepository.resolveId(value);
        if (!realmId) {
            throw new EntityNotFoundError(`realm '${value}' not found`);
        }

        setRequestRealmID(event, realmId);
    }
}
