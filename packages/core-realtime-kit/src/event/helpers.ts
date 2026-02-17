/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventFullName } from './types';

export function buildEventFullName<
    ENTITY extends string,
    VERB extends string,
>(
    entity: ENTITY,
    event: VERB,
) : EventFullName<ENTITY, VERB> {
    const eventCapitalized = event.substring(0, 1).toUpperCase() + event.substring(1);

    return entity + eventCapitalized as EventFullName<ENTITY, VERB>;
}
