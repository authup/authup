/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildConfig } from '@authup/client-web-config';
import type { Container } from '@authup/config';
import path from 'node:path';
import { ServiceCommand, ServicePackageName } from '../constants';
import type { ShellCommandExecContext } from '../../utils';
import { findModulePath } from '../../utils';

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

type WebAppExecutionContext = ShellCommandExecContext & {
    container: Container
};

export function buildWebAppExecutionContext(
    ctx: WebAppExecutionContext,
) : ShellCommandExecContext {
    if (ctx.command !== ServiceCommand.START) {
        throw new Error(`The command ${ctx.command} is not supported`);
    }

    const env : Record<string, string | undefined> = ctx.env || {};

    const data = ctx.container.getData('client/web');
    const config = buildConfig({
        data,
        env: true,
    });

    if (config.host) {
        env.HOST = config.host;
    }

    if (config.port) {
        env.PORT = `${config.port}`;
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
