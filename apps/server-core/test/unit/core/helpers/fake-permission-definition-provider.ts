/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionDefinitionProvider,
    PermissionDefinition,
} from '../../../../src/core/authorization/types.ts';

export class FakePermissionDefinitionProvider implements IPermissionDefinitionProvider {
    private definitions: PermissionDefinition[] = [];

    setDefinitions(definitions: PermissionDefinition[]) {
        this.definitions = definitions;
    }

    async findAll(): Promise<PermissionDefinition[]> {
        return this.definitions;
    }
}
