/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CODE_PATH = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_PATH = path.join(CODE_PATH, '..');
export const SRC_PATH = path.join(PACKAGE_PATH, 'src');
export const DIST_PATH = path.join(PACKAGE_PATH, 'dist');

export const UI_DIST_PATH = path.join(DIST_PATH, 'ui');
export const UI_SOURCE_PATH = path.join(PACKAGE_PATH, 'ui');
