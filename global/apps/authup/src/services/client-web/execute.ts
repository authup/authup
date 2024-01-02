/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import { ServiceCommand, ServicePackageName } from '../constants';
import type { ShellCommandExecContext } from '../../utils';
import { getClosestNodeModulesPath } from '../../utils';

function extendEnv(input: Record<string, string | undefined>) {
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

export function buildWebAppExecutionContext(
    ctx: ShellCommandExecContext,
) : ShellCommandExecContext {
    if (ctx.command !== ServiceCommand.START) {
        throw new Error(`The command ${ctx.command} is not supported`);
    }

    let base = `npx ${ServicePackageName.CLIENT_WEB}`;
    const modulePath = findUpPackagePath(ServicePackageName.CLIENT_WEB, process.cwd()) ||
        findUpPackagePath(ServicePackageName.CLIENT_WEB, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
        base = `node ${outputPath}`;
    }

    return {
        ...ctx,
        command: base,
        env: extendEnv(ctx.env || {}),
    };
}
