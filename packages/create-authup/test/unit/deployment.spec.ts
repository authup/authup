/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { describeExposure, trustProxyValue } from '../../src/deployment.ts';

describe('describeExposure', () => {
    it('should publish an explicit http port directly', () => {
        expect(describeExposure('http://localhost:8080')).toEqual({ behindProxy: false, hostPort: 8080 });
        expect(describeExposure('http://localhost:3000')).toEqual({ behindProxy: false, hostPort: 3000 });
    });

    it('should read https or a default port as a proxy in front and keep the listen port', () => {
        expect(describeExposure('https://auth.example.com')).toEqual({ behindProxy: true, hostPort: 3000 });
        expect(describeExposure('https://auth.example.com:8443')).toEqual({ behindProxy: true, hostPort: 3000 });
        expect(describeExposure('http://auth.example.com')).toEqual({ behindProxy: true, hostPort: 3000 });
    });
});

describe('trustProxyValue', () => {
    it('should count the hops the deployment knows about and trust none otherwise', () => {
        expect(trustProxyValue({ behindProxy: false, hostPort: 8080 })).toEqual('false');
        expect(trustProxyValue({ behindProxy: true, hostPort: 3000 })).toEqual('1');
        expect(trustProxyValue({ behindProxy: true, hostPort: 3000 }, true)).toEqual('2');
        expect(trustProxyValue({ behindProxy: false, hostPort: 8080 }, true)).toEqual('1');
    });
});
