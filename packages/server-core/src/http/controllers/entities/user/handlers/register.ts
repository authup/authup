/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { UserValidator } from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { useLogger } from '@authup/server-kit';
import { Container } from 'validup';
import { createNanoID } from '@authup/kit';
import { isSMTPClientUsable, useSMTPClient } from '../../../../../core';
import { UserEntity, UserRepository, resolveRealm } from '../../../../../database/domains';
import { useConfig } from '../../../../../config';
import { EnvironmentName } from '../../../../../env';
import { RequestHandlerOperation } from '../../../../request';
import { UserCredentialService } from '../../../../../services/credential/impl';

export class AuthRegisterRequestValidator extends Container<User> {
    protected initialize() {
        super.initialize();

        this.mount(new UserValidator({
            pathsToInclude: ['email', 'name', 'password', 'realm_id'],
        }));
    }
}

export async function createAuthRegisterRouteHandler(req: Request, res: Response) : Promise<any> {
    const config = useConfig();

    if (!config.registration) {
        throw new BadRequestError('User registration is not enabled.');
    }

    if (
        config.emailVerification &&
        config.env !== 'test' &&
        !isSMTPClientUsable()
    ) {
        throw new BadRequestError('SMTP options are not defined.');
    }

    const validator = new AuthRegisterRequestValidator();
    const validatorWrapper = new RoutupContainerAdapter(validator);
    const data = await validatorWrapper.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserEntity,
    });

    data.name ??= data.email;

    if (config.emailVerification) {
        data.active = false;
        data.activate_hash = randomBytes(32).toString('hex'); // todo: create random bytes to hex
    }

    const repository = new UserRepository(dataSource);
    const entity = repository.create(data);

    const credentialsService = new UserCredentialService();
    entity.password = entity.password || createNanoID(64);
    entity.password = await credentialsService.protect(entity.password);

    const realm = await resolveRealm(entity.realm_id, true);
    entity.realm_id = realm.id;

    await repository.save(entity);

    if (
        config.emailVerification &&
        config.env !== EnvironmentName.TEST
    ) {
        if (!isSMTPClientUsable()) {
            throw new BadRequestError('Email verification is not possible.');
        }

        const smtpClient = useSMTPClient();

        const info = await smtpClient.sendMail({
            to: entity.email,
            subject: 'Registration - Activation code',
            html: `
                <p>Please use the code below to activate your account and start using the site.</p>
                <p>${entity.activate_hash}</p>
                `,
        });

        useLogger()
            .debug(`Message #${info.messageId} has been sent!`);
    }

    return sendAccepted(res, entity);
}
