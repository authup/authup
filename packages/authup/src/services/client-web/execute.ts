/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { ServiceCommand, ServicePackageName } from '../constants';
import type { ShellCommandExecContext } from '../../utils';
import { findModulePath } from '../../utils';
import { buildClientWebConfig, readClientWebConfigRaw } from './config';

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

export async function buildClientWebShellCommandExecContext(
    ctx: ShellCommandExecContext,
) : Promise<ShellCommandExecContext> {
    if (ctx.command !== ServiceCommand.START) {
        throw new Error(`The command ${ctx.command} is not supported`);
    }

    const env : Record<string, string | undefined> = ctx.env || {};

    const configRaw = await readClientWebConfigRaw({
        fs: {
            file: ctx.configFile,
            cwd: ctx.configDirectory,
        },
    });
    const config = buildClientWebConfig(configRaw);

    if (config.host) {
        env.HOST = config.host;
    }

    if (config.port) {
        env.PORT = `${config.port}`;
    }

    if (config.apiUrl) {
        env.API_URL = config.apiUrl;
    }

    if (config.publicUrl) {
        env.PUBLIC_URL = config.publicUrl;
    }

    let command : string;

    const modulePath = findModulePath(ServicePackageName.CLIENT_WEB);
    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
        command = `node ${outputPath}`;
    } else {
        command = `npx ${ServicePackageName.CLIENT_WEB}`;
    }

    return {
        ...ctx,
        command,
        env: extendEnv(env),
    };
}
