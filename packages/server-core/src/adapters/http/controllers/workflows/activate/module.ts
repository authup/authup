/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { sendAccepted } from 'routup';
import type { Repository } from 'typeorm';
import { ActivateRequestValidator } from './validator';

export type ActivateControllerContext = {
    repository: Repository<User>
};

@DController('/activate')
export class ActivateController {
    protected repository: Repository<User>;

    protected validator : RoutupContainerAdapter<{ token: string }>;

    constructor(ctx: ActivateControllerContext) {
        this.repository = ctx.repository;

        const validator = new ActivateRequestValidator();
        this.validator = new RoutupContainerAdapter(validator);
    }

    @DPost('', [])
    async execute(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const data = await this.validator.run(req);

        const entity = await this.repository.findOneBy({
            activate_hash: data.token,
        });

        if (!entity) {
            throw new NotFoundError();
        }

        entity.active = true;
        entity.activate_hash = null;

        await this.repository.save(entity);

        return sendAccepted(res);
    }
}
