/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { RequestValidator } from '../../../../../core';
import { UserRepository, resolveRealm } from '../../../../../domains';

export class AuthPasswordResetRequestValidator extends RequestValidator<User & { token: string }> {
    constructor() {
        super();

        this.addOneOf([
            this.create('email')
                .exists()
                .notEmpty()
                .isEmail(),
            this.create('name')
                .exists()
                .notEmpty()
                .isString(),
        ]);

        this.add('realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true });

        this.add('token')
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 256 });

        this.add('password')
            .exists()
            .notEmpty()
            .isLength({ min: 5, max: 512 });
    }
}

export async function createAuthPasswordResetRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new AuthPasswordResetRequestValidator();
    const data = await validator.execute(req);

    // todo: log attempt (email, token, ip_address, user_agent)

    const where : FindOptionsWhere<User> = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        reset_hash: data.token,
    };

    const realm = await resolveRealm(data.realm_id, true);
    where.realm_id = realm.id;

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    const entity = await repository.findOneBy(where);
    if (!entity) {
        throw new NotFoundError();
    }

    entity.reset_at = new Date().toISOString();
    entity.reset_hash = null;
    entity.reset_expires = null;

    await repository.save(entity);

    return sendAccepted(res);
}
