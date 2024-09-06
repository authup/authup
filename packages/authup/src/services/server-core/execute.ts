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

export function buildServerCoreShellCommandExecContext(
    ctx: ShellCommandExecContext,
) : ShellCommandExecContext {
    let command : string;
    const modulePath = findModulePath(ServicePackageName.SERVER_CORE);
    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
        command = `node ${outputPath}`;
    } else {
        command = `npx ${ServicePackageName.SERVER_CORE}`;
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

    // todo: append config directory & file

    return {
        ...ctx,
        command,
    };
}
