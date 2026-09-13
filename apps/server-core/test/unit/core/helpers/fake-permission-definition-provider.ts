/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionGetOptions } from '@authup/access';
import { buildPermissionKey } from '@authup/access';
import type {
    IPermissionDefinitionProvider,
    PermissionDefinition,
} from '../../../../src/core/authorization/types.ts';

export class FakePermissionDefinitionProvider implements IPermissionDefinitionProvider {
    private definitions: PermissionDefinition[] = [];

    setDefinitions(definitions: PermissionDefinition[]) {
        this.definitions = definitions;
    }

    async findDefinitions(keys: PermissionGetOptions[]): Promise<PermissionDefinition[]> {
        const wanted = new Set(keys.map((key) => buildPermissionKey(key)));

        return this.definitions.filter((definition) => wanted.has(buildPermissionKey(definition.permission)));
    }
}
