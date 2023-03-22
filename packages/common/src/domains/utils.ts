/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainEventName, DomainType } from './contstants';
import type { DomainEventFullName } from './types';

export function buildDomainEventFullName<T extends `${DomainType}`>(
    type: T,
    event: `${DomainEventName}`,
) : DomainEventFullName<T> {
    const eventCapitalized = event.substring(0, 1).toUpperCase() + event.substring(1);

    return type + eventCapitalized as DomainEventFullName<T>;
}

export function buildDomainChannelName(type: string, id?: string | number) {
    return `${type}${id ? `:${id}` : ''}`;
}

export function buildDomainNamespaceName(id: string) {
    return `/realm#${id}`;
}
