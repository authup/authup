/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIConfig, APIServiceVaultConfig, APIType } from '../../config';
import { BaseAPI } from '../../module';
import { ApiRequestConfig } from '../../type';
import { APIServiceError } from '../error';
import { VaultEnginePayload, VaultKVOptions, VaultKVVersion } from './type';
import { buildVaultKeyValueURLPath } from './utils';
import { useAPI } from '../../utils';

export function parseVaultConnectionString(connectionString: string) : APIServiceVaultConfig {
    const parts : string[] = connectionString.split('@');
    if (parts.length !== 2) {
        throw new APIServiceError('Vault connection string must be in the following format: token@host');
    }

    return {
        host: parts[1],
        token: parts[0],
    };
}

export class VaultAPI extends BaseAPI {
    constructor(config: APIConfig<APIType.VAULT>) {
        const vaultConfig : APIServiceVaultConfig = config.connection ?? parseVaultConnectionString(config.connectionString);

        const driverConfig : ApiRequestConfig = {
            ...(config.driver ?? {}),
            withCredentials: true,
            timeout: 3000,
            baseURL: vaultConfig.host,
            token: vaultConfig.token,
            headers: {
                'X-Vault-Request': 'true',
                'Content-Type': 'application/json',
            },
        };

        super(driverConfig);

        this.setHeader('X-Vault-Token', vaultConfig.token);
    }

    setNamespace(namespace: string) {
        this.setHeader('X-Vault-Namespace', namespace);
    }

    unsetNamespace() {
        this.unsetHeader('X-Vault-Namespace');
    }

    // ---------------------------------------------------------------------

    async createKeyValueSecretEngine(
        config: Pick<VaultEnginePayload, 'path'> & Partial<VaultEnginePayload>,
        options?: VaultKVOptions,
    ) {
        return this.createSecretEngine({
            config: {},
            generate_signing_key: true,
            options,
            type: 'kv',
            ...config,
        });
    }

    async createSecretEngine(data: VaultEnginePayload) {
        const response = await this.post(`sys/mounts/${data.path}`, data);

        return response.data;
    }

    // ---------------------------------------------------------------------

    async saveKeyValuePair(engine: string, key: string, value: Record<string, any>, options?: VaultKVOptions) {
        options ??= {};
        options.version ??= VaultKVVersion.ONE;

        const response = await this.post(buildVaultKeyValueURLPath(options.version, engine, key), value);
        return response.data;
    }

    async findKeyValuePair(engine: string, key: string, options?: VaultKVOptions) : Promise<Record<string, any> | undefined> {
        options ??= {};
        options.version ??= VaultKVVersion.ONE;

        try {
            const { data } = await this.get(buildVaultKeyValueURLPath(options.version, engine, key));

            return data.data;
        } catch (e) {
            if (e.response.status === 404) {
                return undefined;
            }

            throw e;
        }
    }

    async dropKeyValuePair(engine: string, key: string, options?: VaultKVOptions) {
        options ??= {};
        options.version ??= VaultKVVersion.ONE;

        try {
            await useAPI(APIType.VAULT)
                .delete(buildVaultKeyValueURLPath(options.version, engine, key));
        } catch (e) {
            if (e.response.status === 404) {
                return;
            }

            throw e;
        }
    }
}
