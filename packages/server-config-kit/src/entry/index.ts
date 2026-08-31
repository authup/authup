/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The ENTRY primitive: what one config key's declaration is, and the two
 * reads that resolve it on its own. A whole-schema pass lives under
 * `source/` and calls into these.
 */

export * from './check.ts';
export * from './env.ts';
export * from './path.ts';
