/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { EventSubscriber } from 'typeorm';
import { EntitySubscriber, buildEntityDestinations } from '../../subscriber/index.ts';
import { PathEntity } from './entity.ts';

@EventSubscriber()
export class PathSubscriber extends EntitySubscriber<Path> {
    constructor() {
        super({
            type: EntityType.PATH,
            target: PathEntity,
            destinations: buildEntityDestinations(EntityType.PATH, (data) => [data.realmId]),
        });
    }
}
