/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ValidupError } from 'validup';
import {
    getRequestParamID,
    getRequestStringParam,
    getRequestStringParamOrFail,
    useRequestParamID,
} from '../../../../../src/adapters/http/request';
import { createFakeEvent } from './fake-event';

const UUID = '4f4d3b3e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';

describe('getRequestParamID', () => {
    it('should return a UUID id by default', () => {
        const event = createFakeEvent({ params: { id: UUID } });
        expect(getRequestParamID(event)).toEqual(UUID);
    });

    it('should reject a non-UUID id by default', () => {
        const event = createFakeEvent({ params: { id: 'not-a-uuid' } });
        expect(getRequestParamID(event)).toBeUndefined();
    });

    it('should accept a non-UUID id when isUUID is disabled', () => {
        const event = createFakeEvent({ params: { id: 'not-a-uuid' } });
        expect(getRequestParamID(event, { isUUID: false })).toEqual('not-a-uuid');
    });

    it('should return undefined when the id param is missing', () => {
        expect(getRequestParamID(createFakeEvent())).toBeUndefined();
    });
});

describe('useRequestParamID', () => {
    it('should return the id when present', () => {
        const event = createFakeEvent({ params: { id: UUID } });
        expect(useRequestParamID(event)).toEqual(UUID);
    });

    it('should throw when the id is absent', () => {
        expect(() => useRequestParamID(createFakeEvent())).toThrow(ValidupError);
    });

    it('should throw when the id is not a UUID and validation is enabled', () => {
        const event = createFakeEvent({ params: { id: 'not-a-uuid' } });
        expect(() => useRequestParamID(event)).toThrow(ValidupError);
    });
});

describe('getRequestStringParam', () => {
    it('should return a non-empty string param', () => {
        const event = createFakeEvent({ params: { realmId: 'master' } });
        expect(getRequestStringParam(event, 'realmId')).toEqual('master');
    });

    it('should return undefined for a missing or empty param', () => {
        expect(getRequestStringParam(createFakeEvent(), 'realmId')).toBeUndefined();
        expect(getRequestStringParam(createFakeEvent({ params: { realmId: '' } }), 'realmId')).toBeUndefined();
    });
});

describe('getRequestStringParamOrFail', () => {
    it('should return the value when present', () => {
        const event = createFakeEvent({ params: { realmId: 'master' } });
        expect(getRequestStringParamOrFail(event, 'realmId')).toEqual('master');
    });

    it('should throw when the value is absent', () => {
        expect(() => getRequestStringParamOrFail(createFakeEvent(), 'realmId')).toThrow(ValidupError);
    });
});
