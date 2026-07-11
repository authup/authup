/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    EventRecordInput,
    IEventService,
} from '../../../../src/core/entities/event/types.ts';

export class FakeEventService implements IEventService {
    public recordCalls: EventRecordInput[] = [];

    async record(input: EventRecordInput): Promise<void> {
        this.recordCalls.push(input);
    }

    async getMany(): Promise<EntityRepositoryFindManyResult<Event>> {
        return {
            data: [],
            meta: {
                total: 0,
                limit: 50,
                offset: 0,
            },
        };
    }

    async getOne(): Promise<Event> {
        throw new Error('not implemented');
    }
}
