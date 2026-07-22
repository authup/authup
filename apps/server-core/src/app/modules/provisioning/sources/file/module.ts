/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup, isObject } from '@authup/kit';
import { locateMany, read } from 'locter';
import path from 'node:path';
import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/index.ts';
import { RootProvisioningValidator } from '../../../../../core/provisioning/entities/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';
import { CompositeProvisioningSource } from '../composite/index.ts';
import type { FileEntitySchemaImporterOptions } from './types.ts';

// Extensions locter loads as an ES module namespace ({ default, ...named }),
// as opposed to data files (json/yaml/yml) whose parsed value is returned
// directly. Only the former should have their `default` export unwrapped.
const MODULE_FILE_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

export class FileProvisioningSource implements IProvisioningSource {
    protected options: FileEntitySchemaImporterOptions;

    protected rootValidator: RootProvisioningValidator;

    constructor(options: FileEntitySchemaImporterOptions) {
        this.options = options;

        this.rootValidator = new RootProvisioningValidator();
    }

    async load(): Promise<RootProvisioningEntity> {
        const cwd = path.isAbsolute(this.options.cwd) ?
            this.options.cwd :
            path.join(process.cwd(), this.options.cwd);

        const locations = await locateMany('*.{json,yaml,yml,ts,mts,mjs,js}', { cwd });

        const compositeSource = new CompositeProvisioningSource([]);

        const output : RootProvisioningEntity = {};
        for (const location of locations) {
            const raw = await read(location);
            // Unwrap the default export only for module files; a data file
            // (json/yaml) whose root legitimately carries a `default` key must
            // keep all of its keys.
            const isModule = typeof location.extension === 'string' &&
                MODULE_FILE_EXTENSIONS.has(location.extension.toLowerCase());
            const entity = isModule && isObject(raw) && 'default' in raw ?
                raw.default :
                raw;

            // Fail closed on a malformed root (top-level list/scalar, or an
            // empty file parsing to null) instead of silently provisioning
            // nothing — the same silent-skip class the loader otherwise avoids.
            if (!isObject(entity)) {
                throw new Error(`The provisioning file "${location.path}" must contain an object at its root.`);
            }

            // Provisioning files use the camelCase management vocabulary
            // (plan 073). Keys are NOT rewritten here: a blanket snake->camel
            // pass cannot tell a schema property from a data-identifier map key
            // (`clientPermissions`/`clientRoles` are keyed by client name, and
            // client names may contain underscores), so it would silently
            // corrupt those keys. Unmounted keys are stripped by the validator.
            const data = await this.rootValidator.run(
                entity as Record<string, any>,
                { group: ValidatorGroup.PROVISIONING },
            );

            compositeSource.merge(output, data);
        }

        return output;
    }
}
