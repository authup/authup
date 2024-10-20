/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from '@posva/event-emitter';
import type { StoreEventBus, StoreEventBusEvents } from './types';

export function createStoreEventBus() : StoreEventBus {
    return new EventEmitter<StoreEventBusEvents>();
}
