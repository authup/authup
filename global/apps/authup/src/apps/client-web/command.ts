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

export function createWebAppStartCommand() {
    let base = `npx ${AppPackageName.CLIENT_WEB}`;
    const modulePath = findUpPackagePath(AppPackageName.CLIENT_WEB, process.cwd()) ||
        findUpPackagePath(AppPackageName.CLIENT_WEB, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
        base = `node ${outputPath}`;
    }

    return base;
}

export function extendWebAppEnv(input: Record<string, any>) {
    const env : Record<string, any> = {};

    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        env[keys[i]] = input[keys[i]];

        if (!keys[i].match(/^(?:NUXT|NITRO)_.*$/)) {
            env[`NUXT_PUBLIC_${keys[i]}`] = input[keys[i]];
        }
    }

    return env;
}
