import { EnvKey } from '@authup/config';
import type { Container } from '@authup/config';
import consola from 'consola';
import process from 'node:process';
import type { ExecutionContext } from '../utils';
import { execute } from '../utils';
import { buildWebAppExecutionContext } from './client-web';
import { buildServerCoreExecutionContext } from './server-core';

type AppCommandExecutionContext = {
    container: Container,
    group: string,
    name: string,
    command: string
};
export async function executeAppCommand(
    context: AppCommandExecutionContext,
) {
    const env : Record<string, any> = {};
    const config = context.container.get(`${context.group}/${context.name}`);
    if (config) {
        const paths = config.paths.join(',');
        if (paths.length > 0) {
            env[EnvKey.CONFIG_FILE] = paths;
        }
    }

    let executionContext : ExecutionContext | undefined;
    if (context.group === 'server' && context.name === 'core') {
        executionContext = buildServerCoreExecutionContext({
            command: context.command,
            env,
        });
    }

    if (context.group === 'client' && context.name === 'web') {
        executionContext = buildWebAppExecutionContext({
            command: context.command,
            env,
        });
    }

    if (!executionContext) {
        consola.error(`${context.group}/${context.name}: The command ${context.command} is not supported`);
        process.exit(1);
    }

    await execute({
        ...executionContext,
        logDataStream(line) {
            consola.info(`${context.group}/${context.name}: ${line}`);
        },
        logErrorStream(line) {
            consola.warn(`${context.group}/${context.name}: ${line}`);
        },
    });
}
