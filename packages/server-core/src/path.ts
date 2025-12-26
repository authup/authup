/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveRootPath() {
    return path.dirname(fileURLToPath(import.meta.url));
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
