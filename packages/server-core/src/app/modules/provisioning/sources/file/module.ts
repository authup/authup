/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { load, locateMany } from 'locter';
import path from 'node:path';
import { RootProvisioningValidator } from '../../entities';
import type { RootProvisioningData } from '../../entities/root';
import type {
    IProvisioningSource,

} from '../../types.ts';
import { CompositeProvisioningSource } from '../composite';
import type { FileEntitySchemaImporterOptions } from './types.ts';

export class FileProvisioningSource implements IProvisioningSource {
    protected options: FileEntitySchemaImporterOptions;

    protected rootValidator: RootProvisioningValidator;

    constructor(options: FileEntitySchemaImporterOptions) {
        this.options = options;

        this.rootValidator = new RootProvisioningValidator();
    }

    async load(): Promise<RootProvisioningData> {
        const cwd = path.isAbsolute(this.options.cwd) ?
            this.options.cwd :
            path.join(process.cwd(), this.options.cwd);

        const locations = await locateMany('*.{json,yaml,yml,ts,mts,mjs,js}', {
            path: cwd,
        });

        const compositeSource = new CompositeProvisioningSource([]);

        const output : RootProvisioningData = {};
        for (let i = 0; i < locations.length; i++) {
            const location = locations[i];

            const raw = await load(location);
            const data = await this.rootValidator.run(raw.default);

            compositeSource.merge(output, data);
        }

        return output;
    }
}
