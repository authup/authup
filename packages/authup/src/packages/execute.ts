import consola from 'consola';
import type { ChildProcess } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';
import type { ShellCommandExecContext } from '../utils';
import { execShellCommand } from '../utils';
import { buildClientWebShellCommandExecContext } from './client-web';
import { PackageID } from './constants';
import { buildServerCoreShellCommandExecContext } from './server-core';

type PackageCommandExecutionContext = {
    command: string,
    package: PackageID,
    configFile?: string,
    configDirectory?: string,
};

type PackagesCommandExecutionContext = Omit<PackageCommandExecutionContext, 'package'> & {
    packages: (PackageID)[]
};

async function executePackageCommand(
    context: PackageCommandExecutionContext,
) : Promise<ChildProcess> {
    let shellExecContext : ShellCommandExecContext | undefined;
    try {
        switch (context.package) {
            case PackageID.CLIENT_WEB: {
                shellExecContext = await buildClientWebShellCommandExecContext({
                    configDirectory: context.configDirectory,
                    configFile: context.configFile,
                    command: context.command,
                });
                break;
            }
            case PackageID.SERVER_CORE: {
                shellExecContext = buildServerCoreShellCommandExecContext({
                    configDirectory: context.configDirectory,
                    configFile: context.configFile,
                    command: context.command,
                });
                break;
            }
        }
    } catch (e) {
        consola.error(`${context.package}: The package command ${context.command} not supported.`);
        process.exit(1);
    }

    if (!shellExecContext) {
        consola.error(`${context.package}: The service is not supported.`);
        process.exit(1);
    }

    return execShellCommand({
        ...shellExecContext,
        logDataStream(line) {
            consola.info(`${context.package}: ${line}`);
        },
        logErrorStream(line) {
            consola.warn(`${context.package}: ${line}`);
        },
    });
}

export async function executePackagesCommand(
    context: PackagesCommandExecutionContext,
) {
    const promises : Promise<ChildProcess>[] = [];
    for (let i = 0; i < context.packages.length; i++) {
        promises.push(executePackageCommand({
            ...context,
            package: context.packages[i],
        }));
    }

    const childProcesses = await Promise.all(promises);
    const readLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    readLine.on('SIGINT', () => {
        for (let i = 0; i < childProcesses.length; i++) {
            childProcesses[i].kill();
        }

        process.exit();
    });
}
