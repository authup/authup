/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'crypto';
import {
    OAuth2AccessToken,
    OAuth2AccessTokenPayload,
    OAuth2Client,
    OAuth2TokenKind,
    OAuth2TokenSubKind,
    Realm,
    Robot,
    User, hasOwnProperty,
} from '@authelion/common';
import { getRepository } from 'typeorm';
import { signToken } from '@authelion/api-utils';
import { OAuth2AccessTokenEntity } from '../../../../domains/oauth2-access-token';
import { AccessTokenBuilderContext } from './type';

export class Oauth2AccessTokenBuilder {
    static MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS = 10;

    // -----------------------------------------------------

    protected context: AccessTokenBuilderContext;

    // -----------------------------------------------------

    protected entity?: OAuth2AccessTokenEntity;

    // -----------------------------------------------------

    protected id?: OAuth2AccessToken['id'];

    protected client?: OAuth2Client | OAuth2Client['id'];

    protected robot?: Robot | Robot['id'];

    protected user?: User | User['id'];

    protected realm?: Realm | Realm['id'];

    protected expires?: Date;

    protected scope: string[] = [];

    // -----------------------------------------------------

    constructor(context: AccessTokenBuilderContext) {
        this.context = context;
    }

    // -----------------------------------------------------

    getId() {
        if (!this.id) {
            this.id = randomUUID();
        }

        return this.id;
    }

    resetId() {
        this.id = undefined;
    }

    // -----------------------------------------------------

    public async getToken() : Promise<string> {
        const userId = this.getUserId();
        const robotId = this.getRobotId();

        const tokenPayload: Partial<OAuth2AccessTokenPayload> = {
            access_token_id: this.getId(),
            iss: this.context.selfUrl,
            sub: userId || robotId,
            sub_kind: userId ?
                OAuth2TokenSubKind.USER :
                OAuth2TokenSubKind.ROBOT,
            remote_address: this.context.request.ip,
            kind: OAuth2TokenKind.ACCESS,
            client_id: this.getClientId(),
            realm_id: this.getRealmId(),
        };

        return signToken(
            tokenPayload,
            {
                keyPair: this.context.keyPairOptions,
                options: {
                    expiresIn: this.context.maxAge,
                },
            },
        );
    }

    public async create(data?: Partial<OAuth2AccessTokenEntity>) : Promise<OAuth2AccessTokenEntity> {
        const repository = getRepository(OAuth2AccessTokenEntity);

        const scope : string = this.scope.join(' ');

        let entity = repository.create({
            user_id: this.getUserId(),
            robot_id: this.getRobotId(),
            client_id: this.getClientId(),
            realm_id: this.getRealmId(),
            expires: this.getExpireDate(),
            scope: scope || null,
        });

        entity = repository.merge(entity, {
            ...(data || {}),
        });

        let maxGenerationAttempts = Oauth2AccessTokenBuilder.MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS;

        while (maxGenerationAttempts-- > 0) {
            try {
                entity.id = this.getId();
                entity.content = await this.getToken();

                await repository.insert(entity);
                break;
            } catch (e) {
                if (
                    hasOwnProperty(e, 'code') &&
                    e.code === 'ER_DUP_ENTRY'
                ) {
                    this.resetId();
                } else {
                    throw e;
                }
            }
        }

        this.entity = entity;

        return entity;
    }

    // -----------------------------------------------------

    getClientId() : OAuth2Client['id'] | undefined {
        return typeof this.client === 'object' ? this.client.id : this.client;
    }

    getUserId() : User['id'] | undefined {
        return typeof this.user === 'object' ? this.user.id : this.user;
    }

    getRobotId() : Robot['id'] | undefined {
        return typeof this.robot === 'object' ? this.robot.id : this.robot;
    }

    getRealmId() : Realm['id'] | undefined {
        return typeof this.realm === 'object' ? this.realm.id : this.realm;
    }

    getExpireDate() : Date {
        return this.expires || new Date(Date.now() + (1000 * (this.context.maxAge | 3600)));
    }

    // -----------------------------------------------------

    setClient(id: OAuth2Client['id'] | OAuth2Client) {
        this.client = id;

        return this;
    }

    setUser(id: User['id'] | User) {
        this.user = id;

        return this;
    }

    setRobot(id: Robot['id'] | Robot) {
        this.robot = id;

        return this;
    }

    setRealm(id: Realm['id'] | Realm) {
        this.realm = id;

        return this;
    }

    setExpireDate(time: Date) {
        this.expires = time;

        return this;
    }

    // -----------------------------------------------------

    addScope(scope: string | string[]) {
        if (Array.isArray(scope)) {
            this.scope.push(...scope);
        } else {
            this.scope.push(scope);
        }

        return this;
    }

    dropScope(scope: string) {
        const index = this.scope.indexOf(scope);
        if (index !== -1) {
            this.scope.splice(index, 1);
        }
    }
}
