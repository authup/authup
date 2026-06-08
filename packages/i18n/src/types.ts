/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PluralNode } from 'ilingo';

export type LocaleDescriptor = {
    code: string,
    nativeName: string,
};

/**
 * A namespace's translation map, keyed exhaustively by the namespace's
 * key union `K`. Every key must be present (a missing key is a compile
 * error) and no extra keys are allowed — this is the compile-time half
 * of the locale-parity guarantee. Leaves are plain strings or ilingo
 * plural nodes, so plural messages stay expressible.
 */
export type NamespaceTranslations<K extends string> = Record<K, string | PluralNode>;
