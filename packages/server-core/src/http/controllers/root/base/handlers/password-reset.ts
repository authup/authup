/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { createValidator } from '@validup/adapter-validator';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { Container } from 'validup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserEntity, UserRepository, resolveRealm } from '../../../../../domains';

export class AuthPasswordResetRequestValidator extends Container<User & { token: string }> {
    constructor() {
        super();

        // todo: extract email + name mount
        const container = new Container({
            oneOf: true,
        });
        container.mount('email', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isEmail()));
        container.mount('name', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()));

        this.mount(container);

        this.mount('realm_id', createValidator((chain) => chain
            .exists()
            .isUUID()
            .optional({ nullable: true })));

        this.mount('token', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 256 })));

        this.mount('password', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isLength({ min: 5, max: 512 })));
    }
}

export async function createAuthPasswordResetRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new AuthPasswordResetRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req);

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserEntity,
    });

    // todo: log attempt (email, token, ip_address, user_agent)

    const where : FindOptionsWhere<User> = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        reset_hash: data.token,
    };

    const realm = await resolveRealm(data.realm_id, true);
    where.realm_id = realm.id;

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
