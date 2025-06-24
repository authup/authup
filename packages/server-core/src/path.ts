/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';

export function resolveRootPath() {
    return __dirname;
}

export function resolvePackagePath() {
    return path.resolve(resolveRootPath(), '..');
}

export function resolveClientWebSlimPackagePath() {
    return path.resolve(resolveRootPath(), '..', '..', 'client-web-slim');
}

export function getSrcPath() {
    return path.join(resolvePackagePath(), 'src');
}

export function getDistPath() {
    return path.join(resolvePackagePath(), 'dist');
}
