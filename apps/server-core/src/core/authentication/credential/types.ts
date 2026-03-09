/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from 'validup';

export interface ICredentialService<T extends ObjectLiteral = ObjectLiteral> {
    verify(input: string, entity: T) : Promise<boolean>;

    protect(input: string, entity: T): Promise<string>;
}
