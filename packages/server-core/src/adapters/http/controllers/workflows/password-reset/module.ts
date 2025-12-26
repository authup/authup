/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PasswordResetResponse } from '@authup/core-http-kit';
import { User } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { UserEntity, resolveRealm } from '../../../../database/domains/index.ts';
import { PasswordResetRequestValidator } from './validator.ts';

export type PasswordResetControllerContext = {
    repository: Repository<User>
};

@DController('/password-reset')
export class PasswordResetController {
    protected repository: Repository<User>;

    protected validator : RoutupContainerAdapter<User & { token: string }>;

    constructor(ctx: PasswordResetControllerContext) {
        this.repository = ctx.repository;

        const validator = new PasswordResetRequestValidator();
        this.validator = new RoutupContainerAdapter(validator);
    }

    @DPost('', [])
    async execute(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<PasswordResetResponse> {
        const data = await this.validator.run(req);

        // todo: remove this.
        const dataSource = await useDataSource();
        await validateEntityJoinColumns(data, {
            dataSource,
            entityTarget: UserEntity,
        });

        const where : FindOptionsWhere<User> = {
            ...(data.name ? { name: data.name } : {}),
            ...(data.email ? { email: data.email } : {}),
            reset_hash: data.token,
        };

        const realm = await resolveRealm(data.realm_id, true);
        where.realm_id = realm.id;

        const entity = await this.repository.findOneBy(where);
        if (!entity) {
            throw new NotFoundError();
        }

        entity.reset_at = new Date().toISOString();
        entity.reset_hash = null;
        entity.reset_expires = null;

        await this.repository.save(entity);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return sendAccepted(res, {
            reset_at: entity.reset_at,
        });
    }
}
