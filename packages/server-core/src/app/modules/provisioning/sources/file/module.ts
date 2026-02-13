/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { UserValidator } from '@authup/core-kit';
import { isObject } from '@authup/kit';
import { Container } from 'confinity';
import type { IProvisioningSource, ProvisioningData } from '../../types.ts';
import type { FileEntitySchemaImporterOptions } from './types.ts';

export class FileProvisioningSource implements IProvisioningSource {
    protected options: FileEntitySchemaImporterOptions;

    // todo: extended version of e.g. RealmValidator (with users for UserValidator)
    protected userValidator : UserValidator;

    constructor(options: FileEntitySchemaImporterOptions) {
        this.options = options;

        this.userValidator = new UserValidator();
    }

    async load(): Promise<ProvisioningData> {
        const container = new Container({
            prefix: 'authup',
            cwd: this.options.cwd,
        });

        await container.load();

        const config = container.get('schema');
        if (!isObject(config)) {
            throw new Error('Config property "schema" must be an object');
        }

        return {
            realms: this.readPropertyAsArray(config, 'realms'),
            roles: this.readPropertyAsArray(config, 'roles'),
            permissions: this.readPropertyAsArray(config, 'permissions'),
        };
    }

    private readPropertyAsArray(input: Record<string, any>, propertyKey: string): any[] {
        return input[propertyKey] && Array.isArray(input[propertyKey]) ? input[propertyKey] : [];
    }
}
