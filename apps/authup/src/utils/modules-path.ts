/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import { PACKAGE_DIRECTORY } from '../constants';

export function findModulePath(module: string) : string | undefined {
    let modulePath = findUpPackagePath(module, PACKAGE_DIRECTORY);
    if (PACKAGE_DIRECTORY !== process.cwd()) {
        modulePath = findUpPackagePath(module, process.cwd());
    }

    if (!modulePath) {
        return undefined;
    }

    return modulePath;
}
