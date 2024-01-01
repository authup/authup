/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import { AppCommand, AppPackageName } from '../constants';
import type { ExecutionContext } from '../../utils';
import { getClosestNodeModulesPath } from '../../utils';

export function buildWebAppExecutionContext(
    ctx: ExecutionContext,
) : ExecutionContext {
    let base = `npx ${AppPackageName.CLIENT_WEB}`;
    const modulePath = findUpPackagePath(AppPackageName.CLIENT_WEB, process.cwd()) ||
        findUpPackagePath(AppPackageName.CLIENT_WEB, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
        base = `node ${outputPath}`;
    }

    if (ctx.command !== AppCommand.START) {
        throw new Error(`The command ${ctx.command} is not supported`);
    }

    return {
        ...ctx,
        env: extendWebAppEnv(ctx.env || {}),
    };
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
