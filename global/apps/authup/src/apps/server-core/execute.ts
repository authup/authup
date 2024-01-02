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

export function buildServerCoreExecutionContext(
    ctx: ShellCommandExecContext,
) : ShellCommandExecContext {
    let command = `npx ${ServicePackageName.SERVER_CORE}`;
    const modulePath = findUpPackagePath(ServicePackageName.SERVER_CORE, process.cwd()) ||
        findUpPackagePath(ServicePackageName.SERVER_CORE, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
        command = `node ${outputPath}`;
    }

    switch (ctx.command) {
        case ServiceCommand.START: {
            command += ' start';
            break;
        }
        case ServiceCommand.CLEANUP: {
            command += ' reset';
            break;
        }
        default: {
            throw new Error(`The command ${ctx.command} is not supported.`);
        }
    }

    return {
        ...ctx,
        command,
    };
}
