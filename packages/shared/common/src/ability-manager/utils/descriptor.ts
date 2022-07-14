/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityDescriptor } from '../type';

export function extendPermissionDescriptor(descriptor: AbilityDescriptor) {
    descriptor.target ??= null;
    descriptor.inverse ??= false;

    return descriptor;
}
