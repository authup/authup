/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DGet,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { User } from '@authup/core-kit';
import type { IUserService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type UserInfoControllerContext = {
    service: IUserService,
};

/**
 * The OIDC userinfo endpoint (advertised via discovery). It serves the
 * authenticated user's own record as a FLAT claims document — it must
 * never adopt the `{ data, meta }` entity-record envelope, which is why
 * it is a dedicated route instead of an alias of `GET /users/@me`.
 */
@DTags('auth')
@DController('/userinfo')
export class UserInfoController {
    protected service: IUserService;

    constructor(ctx: UserInfoControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async get(
        @DContext() event: IAppEvent,
    ): Promise<User> {
        const actor = buildActorContext(event);

        let id = '@me';
        if (
            actor.identity &&
            actor.identity.type === 'user'
        ) {
            id = actor.identity.data.id;
        }

        // `email` is a standard OIDC claim, but the column is `select: false`
        // (opt-in projection), so the default field set leaves it out and the
        // claims document arrives without it. This endpoint only ever serves
        // the CALLER'S OWN record, so the claim rides on top of the defaults.
        // A caller stating its own `fields` keeps full control: the opt-in
        // stays opt-in wherever the projection is explicit.
        const query = useRequestQuery(event);

        return this.service.getOne(id, actor, {
            ...query,
            fields: query.fields || '+email',
        });
    }
}
