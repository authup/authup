/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/assets';
import { assets } from '@routup/assets';
import path from 'node:path';
import type { Router } from 'routup';
import { resolvePackagePath } from '../../../path';

export function registerAssetsMiddleware(router: Router, input?: OptionsInput) {
    router.use('public', assets(path.posix.join(resolvePackagePath(), 'public'), input));
}
