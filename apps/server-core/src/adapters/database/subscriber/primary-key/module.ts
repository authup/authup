/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createUUIDv7 } from '@authup/kit';
import type { EntitySubscriberInterface, InsertEvent, ObjectLiteral } from 'typeorm';
import { EventSubscriber } from 'typeorm';

/**
 * Mints every empty uuid primary key as a UUIDv7 (#3918). typeorm broadcasts
 * beforeInsert for save() and for a query-builder or repository insert() of
 * plain objects, before it generates a uuid itself, so it is the one seam
 * every insert path passes.
 *
 * The entities keep @PrimaryGeneratedColumn('uuid'): a plain uuid primary
 * column is varchar(255) on mysql instead of varchar(36), which the generated
 * migration answers by dropping and re-adding every id column.
 */
@EventSubscriber()
export class PrimaryKeySubscriber implements EntitySubscriberInterface {
    beforeInsert(event: InsertEvent<ObjectLiteral>): void {
        if (!event.entity) {
            return;
        }

        for (const column of event.metadata.primaryColumns) {
            if (column.type !== 'uuid') {
                continue;
            }

            const value = column.getEntityValue(event.entity);

            if (value === undefined || value === null || value === '') {
                column.setEntityValue(event.entity, createUUIDv7());
            }
        }
    }
}
