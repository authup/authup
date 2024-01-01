/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import { AppPackageName } from '../constants';
import { getClosestNodeModulesPath } from '../../utils';

export function createServerCommand(cmd: string) {
    let base = `npx ${AppPackageName.SERVER_CORE}`;
    const modulePath = findUpPackagePath(AppPackageName.SERVER_CORE, process.cwd()) ||
        findUpPackagePath(AppPackageName.SERVER_CORE, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
        base = `node ${outputPath}`;
    }

    return `${base} ${cmd}`;
}
