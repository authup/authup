/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup, isObject } from '@authup/kit';
import { load, locateMany } from 'locter';
import path from 'node:path';
import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/index.ts';
import { RootProvisioningValidator } from '../../../../../core/provisioning/entities/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';
import { CompositeProvisioningSource } from '../composite/index.ts';
import { normalizeProvisioningEntityKeys } from './normalize.ts';
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

        const locations = await locateMany('*.{json,yaml,yml,ts,mts,mjs,js}', { path: cwd });

        const compositeSource = new CompositeProvisioningSource([]);

        const output : RootProvisioningEntity = {};
        for (const location of locations) {
            const raw = await load(location);
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

            // One-release dual-accept (plan 073): snake_case keys are
            // normalized to camelCase with a deprecation warning; removed the
            // release after v1.0.0.
            const normalized = normalizeProvisioningEntityKeys(entity);
            if (normalized.convertedKeys.size > 0) {
                this.options.logger?.warn(
                    `The provisioning file "${location.path}" uses deprecated snake_case keys ` +
                    `(${[...normalized.convertedKeys].join(', ')}). ` +
                    'Rename them to camelCase; snake_case support will be removed in the next release.',
                );
            }
            if (normalized.staleNameValues.size > 0) {
                this.options.logger?.warn(
                    `The provisioning file "${location.path}" declares attribute-names policy entries ` +
                    `(${[...normalized.staleNameValues].join(', ')}) that look like pre-1.0 snake_case ` +
                    'property names. Entity properties are camelCase now — stale entries never match ' +
                    'and the policy fails open for those fields.',
                );
            }

            const data = await this.rootValidator.run(
                normalized.data as Record<string, any>,
                { group: ValidatorGroup.PROVISIONING },
            );

            compositeSource.merge(output, data);
        }

        return output;
    }
}
