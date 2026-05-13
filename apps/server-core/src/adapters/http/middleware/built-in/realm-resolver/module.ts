/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { EntityNotFoundError } from '@authup/errors';
import type { IRoutupEvent } from 'routup';
import type { IRealmRepository } from '../../../../../core/index.ts';
import { setRequestRealmID } from '../../../request/index.ts';
import type { RealmResolverMiddlewareContext } from './types.ts';

export class RealmResolverMiddleware {
    protected realmRepository: IRealmRepository;

    constructor(ctx: RealmResolverMiddlewareContext) {
        this.realmRepository = ctx.realmRepository;
    }

    async run(event: IRoutupEvent) {
        const value = event.params.realmId;
        if (typeof value !== 'string' || !value) {
            return;
        }

        if (isUUID(value)) {
            setRequestRealmID(event, value);
            return;
        }

        const realm = await this.realmRepository.resolve(value);
        if (!realm) {
            throw new EntityNotFoundError(`realm '${value}' not found`);
        }

        setRequestRealmID(event, realm.id);
    }
}
