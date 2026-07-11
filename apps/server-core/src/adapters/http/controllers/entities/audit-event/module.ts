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
    DPath,
    DTags,
} from '@routup/decorators';
import type { AuditEvent } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { EntityCollectionResponse } from '@authup/core-http-kit';
import type { IAuditEventService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type AuditEventControllerContext = {
    service: IAuditEventService,
};

// Read-only surface — the log is append-only: writes happen internally via
// IAuditEventService.record(), pruning is the retention sweep's job.
@DTags('audit')
@DController(['/audit-events', '/realms/:realmId/audit-events'])
export class AuditEventController {
    protected service: IAuditEventService;

    constructor(ctx: AuditEventControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<AuditEvent>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<AuditEvent> {
        const actor = buildActorContext(event);

        return this.service.getOne(id, actor);
    }
}
