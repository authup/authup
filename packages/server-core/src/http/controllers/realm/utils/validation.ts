/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRealmNameValid } from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { RealmEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class RealmRequestValidator extends Container<
RealmEntity
> {
    constructor(options: ContainerOptions<RealmEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        const nameChain = (optional?: boolean) => createValidator((chain) => {
            const output = chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({
                    min: 3,
                    max: 128,
                })
                .custom((value) => {
                    const isValid = isRealmNameValid(value);
                    if (!isValid) {
                        throw new BadRequestError('Only the characters [A-Za-z0-9-_]+ are allowed.');
                    }

                    return isValid;
                });

            if (optional) {
                return output.optional({ values: 'null' });
            }

            return output;
        });

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameChain());
        this.mount('name', { group: RequestHandlerOperation.UPDATE }, nameChain(true));

        this.mount('description', createValidator((chain) => chain
            .optional({ nullable: true })
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 4096 })));
    }
}
