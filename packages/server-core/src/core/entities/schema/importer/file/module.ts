/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'confinity';
import { isObject } from '@authup/kit';
import { UserValidator } from '@authup/core-kit';
import type { EntitySchema, IEntitySchemaImporter } from '../../types.ts';
import type { FileEntitySchemaImporterOptions } from './types.ts';

export class FileEntitySchemaImporter implements IEntitySchemaImporter {
    protected options: FileEntitySchemaImporterOptions;

    // todo: extended version of e.g. RealmValidator (with users for UserValidator)
    protected userValidator : UserValidator;

    constructor(options: FileEntitySchemaImporterOptions) {
        this.options = options;

        this.userValidator = new UserValidator();
    }

    async import(): Promise<EntitySchema> {
        const container = new Container({
            prefix: 'authup',
            cwd: this.options.cwd,
        });

        await container.load();

        const config = container.get('schema');
        if (!isObject(config)) {
            throw new Error('Config property "schema" must be an object');
        }

        const schema : EntitySchema = {
            clients: [],
            realms: [],
            users: [],
            roles: [],
            permissions: [],
        };

        return schema;
    }

    private readPropertyAsArray(input: Record<string, any>, propertyKey: string): any[] {
        return input[propertyKey] && Array.isArray(input[propertyKey]) ? input[propertyKey] : [];
    }
}
