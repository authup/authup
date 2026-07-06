/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { useRequestLocale } from '../../../../../src/adapters/http/request';
import { createFakeEvent } from './fake-event';

describe('useRequestLocale', () => {
    it('should resolve the explicit locale cookie', () => {
        const event = createFakeEvent({ cookies: { 'vc-locale': 'de' } });
        expect(useRequestLocale(event)).toEqual('de');
    });

    it('should narrow a regioned cookie value to its base locale', () => {
        const event = createFakeEvent({ cookies: { 'vc-locale': 'de-DE' } });
        expect(useRequestLocale(event)).toEqual('de');
    });

    it('should let the cookie win over Accept-Language', () => {
        const event = createFakeEvent({
            cookies: { 'vc-locale': 'fr' },
            headers: { 'accept-language': 'de' },
        });
        expect(useRequestLocale(event)).toEqual('fr');
    });

    it('should fall through to Accept-Language when the cookie is "auto"', () => {
        const event = createFakeEvent({
            cookies: { 'vc-locale': 'auto' },
            headers: { 'accept-language': 'es' },
        });
        expect(useRequestLocale(event)).toEqual('es');
    });

    it('should fall through to Accept-Language when the cookie is unsupported', () => {
        const event = createFakeEvent({
            cookies: { 'vc-locale': 'xx' },
            headers: { 'accept-language': 'fr' },
        });
        expect(useRequestLocale(event)).toEqual('fr');
    });

    it('should honor q-ordering and skip unauthored languages', () => {
        const event = createFakeEvent({ headers: { 'accept-language': 'pt-BR, de;q=0.8' } });
        expect(useRequestLocale(event)).toEqual('de');
    });

    it('should return undefined when nothing matches', () => {
        const event = createFakeEvent({ headers: { 'accept-language': 'pt-BR' } });
        expect(useRequestLocale(event)).toBeUndefined();
    });

    it('should return undefined when neither cookie nor header is present', () => {
        expect(useRequestLocale(createFakeEvent())).toBeUndefined();
    });
});
