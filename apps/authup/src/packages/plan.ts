/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LauncherCommand, PackageID } from './constants';
import { normalizePackageID } from './normalize';
import type { LaunchPlan } from './types';

export function resolveLaunchPlan(command: string, rest: string[] = []) : LaunchPlan {
    const tokens = rest
        .flatMap((token) => token.split(','))
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    switch (command) {
        case LauncherCommand.START: {
            const packages : `${PackageID}`[] = [];
            for (const token of tokens) {
                const packageId = normalizePackageID(token);
                if (!packageId) {
                    throw new Error(
                        `The package "${token}" is not supported.` +
                        ` Supported packages: ${Object.values(PackageID).join(', ')}.`,
                    );
                }

                if (!packages.includes(packageId)) {
                    packages.push(packageId);
                }
            }

            if (packages.length === 0) {
                packages.push(PackageID.SERVER_CORE, PackageID.CLIENT_WEB);
            }

            return {
                packages,
                commandArgs: [LauncherCommand.START],
            };
        }
        case LauncherCommand.MIGRATION:
        case LauncherCommand.HEALTHCHECK: {
            const commandArgs : string[] = [command];
            for (const token of tokens) {
                const packageId = normalizePackageID(token);
                if (packageId === PackageID.CLIENT_WEB) {
                    throw new Error(
                        `The command "${command}" is not supported by the ${PackageID.CLIENT_WEB} package.`,
                    );
                }

                if (packageId === PackageID.SERVER_CORE) {
                    continue;
                }

                commandArgs.push(token);
            }

            return {
                packages: [PackageID.SERVER_CORE],
                commandArgs,
            };
        }
        default: {
            throw new Error(
                `The command "${command}" is not supported.` +
                ` Supported commands: ${Object.values(LauncherCommand).join(', ')}.`,
            );
        }
    }
}
