/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import type { PackageEntrypoint, PackageProcessArgv } from './types';

export function findPackageManifestPath(
    packageName: string,
    lookupDirectories: string[],
) : string | undefined {
    for (const directory of lookupDirectories) {
        const manifestPath = findUpPackagePath(packageName, directory);
        if (manifestPath) {
            return manifestPath;
        }
    }

    return undefined;
}

export async function resolvePackageEntrypoint(
    packageName: string,
    binName: string,
    lookupDirectories: string[],
) : Promise<PackageEntrypoint> {
    const manifestPath = findPackageManifestPath(packageName, lookupDirectories);
    if (!manifestPath) {
        return { type: 'npx', packageName };
    }

    const manifestRaw = await fs.promises.readFile(manifestPath, { encoding: 'utf8' });
    const manifest = JSON.parse(manifestRaw) as { bin?: string | Record<string, string> };

    let binPath : string | undefined;
    if (typeof manifest.bin === 'string') {
        binPath = manifest.bin;
    } else if (manifest.bin) {
        binPath = manifest.bin[binName];
    }

    if (!binPath) {
        throw new Error(
            `The package ${packageName} (${manifestPath}) does not expose a "${binName}" bin entry.`,
        );
    }

    return {
        type: 'node',
        path: path.resolve(path.dirname(manifestPath), binPath),
    };
}

export function buildPackageProcessArgv(
    entrypoint: PackageEntrypoint,
    args: string[],
) : PackageProcessArgv {
    if (entrypoint.type === 'node') {
        return {
            exec: process.execPath,
            args: [entrypoint.path, ...args],
        };
    }

    return {
        exec: 'npx',
        args: [entrypoint.packageName, ...args],
    };
}
