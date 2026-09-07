/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Target } from './types.ts';

/**
 * The emitted files that hold a password, written owner-only by `src/index.ts`. The compose file, `nginx.conf`,
 * `package.json` and `authup.yml` carry none: every secret rides an `.env`, or `values.yaml` for helm.
 * `test/unit/secret-files.spec.ts` holds the renderers to this list, so a new secret-bearing file cannot slip past it.
 */
export const SECRET_FILES = new Set(['.env', 'authup.env', 'values.yaml']);

export const TARGETS: readonly Target[] = ['docker', 'compose', 'helm', 'bare-metal'] as const;
