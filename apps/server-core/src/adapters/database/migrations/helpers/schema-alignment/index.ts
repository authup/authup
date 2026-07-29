/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The dialect machinery here (mysql.ts, postgres.ts) is generic repair
 * migration tooling and is proposed upstream in
 * tada5hi/typeorm-extension#1420 — drop it in favour of the library once
 * that lands. The rename/type-change DATA in data.ts stays here: which
 * constraint is renamed to what is this schema's history, not a
 * library concern.
 */

export * from './data.ts';
export * from './mysql.ts';
export * from './postgres.ts';
export * from './types.ts';
export * from './utils.ts';
