/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ADMIN_CONSOLE_SELECTOR_WARNING, LauncherCommand, PackageID } from './constants';
import { normalizePackageID } from './normalize';
import type { LaunchPlan } from './types';

export function resolveLaunchPlan(command: string, rest: string[] = []) : LaunchPlan {
    const tokens = rest
        .flatMap((token) => token.split(','))
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    const warnings : string[] = [];

    switch (command) {
        case LauncherCommand.START: {
            for (const token of tokens) {
                const packageId = normalizePackageID(token);
                if (!packageId) {
                    throw new Error(
                        `The package "${token}" is not supported.` +
                        ` Supported packages: ${Object.values(PackageID).join(', ')}.`,
                    );
                }

                // Accepted for an existing invocation's sake, launches
                // nothing (plan 081).
                if (packageId === PackageID.CLIENT_ADMIN_CONSOLE && !warnings.includes(ADMIN_CONSOLE_SELECTOR_WARNING)) {
                    warnings.push(ADMIN_CONSOLE_SELECTOR_WARNING);
                }
            }

            // Selectors named ONLY the retired package: launch nothing. The
            // old console unit of a two-unit deployment must not turn into a
            // second server (its own sqlite, its own master realm, default
            // admin credentials) just because it kept running `authup start`.
            const retiredOnly = tokens.length > 0 && warnings.length > 0 &&
                !tokens.some((token) => normalizePackageID(token) === PackageID.SERVER_CORE);

            return {
                packages: retiredOnly ? [] : [PackageID.SERVER_CORE],
                commandArgs: [LauncherCommand.START],
                warnings,
            };
        }
        case LauncherCommand.MIGRATION:
        case LauncherCommand.HEALTHCHECK: {
            const commandArgs : string[] = [command];
            for (const token of tokens) {
                const packageId = normalizePackageID(token);
                if (packageId === PackageID.CLIENT_ADMIN_CONSOLE) {
                    if (!warnings.includes(ADMIN_CONSOLE_SELECTOR_WARNING)) {
                        warnings.push(ADMIN_CONSOLE_SELECTOR_WARNING);
                    }

                    continue;
                }

                if (packageId === PackageID.SERVER_CORE) {
                    continue;
                }

                commandArgs.push(token);
            }

            return {
                packages: [PackageID.SERVER_CORE],
                commandArgs,
                warnings,
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
