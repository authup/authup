/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildEventFullName } from '@authup/core-realtime-kit';
import type { EventPayload } from '@authup/core-realtime-kit';
import type { Logger } from '../logger';
import type {
    DomainEventPublishContext,
    IDomainEventHandler,
    IDomainEventPublisher,
} from './types';

export type DomainEventPublisherContext = {
    logger?: Logger
};

export class DomainEventPublisher implements IDomainEventPublisher {
    protected handlers : Set<IDomainEventHandler>;

    protected logger? : Logger;

    constructor(ctx: DomainEventPublisherContext = {}) {
        this.handlers = new Set<IDomainEventHandler>();
        this.logger = ctx.logger;
    }

    register(handler: IDomainEventHandler): void {
        this.handlers.add(handler);
    }

    async dispose() : Promise<void> {
        for (const handler of this.handlers) {
            if (handler.dispose) {
                await handler.dispose();
            }
        }

        this.handlers.clear();
    }

    async safePublish<T extends EventPayload>(
        ctx: DomainEventPublishContext<T>,
    ) : Promise<void> {
        try {
            await this.publish(ctx);
        } catch (e) {
            if (this.logger) {
                this.logger.error(`Publishing event ${buildEventFullName(ctx.content.type, ctx.content.event)} failed.`);
                this.logger.error(e);
            }
        }
    }

    async publish<T extends EventPayload>(
        ctx: DomainEventPublishContext<T>,
    ) : Promise<void> {
        if (this.handlers.size === 0) {
            return;
        }

        if (this.logger) {
            this.logger.debug(`Publishing event ${buildEventFullName(ctx.content.type, ctx.content.event)}...`);
        }

        const handlers = this.handlers.values();
        while (true) {
            const it = handlers.next();
            if (it.done) {
                return;
            }

            await it.value.handle(ctx);
        }
    }
}
