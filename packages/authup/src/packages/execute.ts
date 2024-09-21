import type { ChildProcess } from 'node:child_process';
import { ClientWebPackage } from './client-web';
import { PackageID } from './constants';
import { ServerCorePackage } from './server-core';
import type { PackageExecuteOptions } from './types';

export async function executePackageCommand(
    pkg: string,
    command: string,
    options: PackageExecuteOptions = {},
) : Promise<ChildProcess> {
    switch (pkg) {
        case PackageID.CLIENT_WEB: {
            const serverCore = new ClientWebPackage();

            return serverCore.execute(
                command,
                options,
            );
        }
        case PackageID.SERVER_CORE: {
            const serverCore = new ServerCorePackage();

            return serverCore.execute(
                command,
                options,
            );
        }
    }

    throw new Error(`The package ${pkg} is not supported.`);
}
