/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AbilityDescriptor } from '../type';

export function extendPermissionDescriptor(descriptor: AbilityDescriptor) {
    if (typeof descriptor.target === 'undefined') {
        descriptor.target = null;
    }

    if (typeof descriptor.inverse === 'undefined') {
        descriptor.inverse = null;
    }

    return descriptor;
}
