/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PackageID } from './constants';

export function isPackageValid(input: string) : input is PackageID {
    return Object.values(PackageID).includes(input as PackageID);
}
