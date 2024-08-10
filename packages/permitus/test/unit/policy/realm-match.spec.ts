/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RealmMatchPolicy } from '../../../src';
import {
    BuiltInPolicyType,
    RealmMatchPolicyEvaluator,
} from '../../../src';

describe('src/policy/attribute-realm', () => {
    it('should permit by matching realm', async () => {
        const options : RealmMatchPolicy = {
            type: BuiltInPolicyType.REALM_MATCH,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate({
            options,
            data: {
                identity: {
                    type: 'user',
                    id: 'xxx',
                    realmId: 'foo-bar',
                },
                attributes: {
                    realm_id: 'foo-bar',
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should permit by matching master realm', async () => {
        const options : RealmMatchPolicy = {
            type: BuiltInPolicyType.REALM_MATCH,
            identityMasterMatchAll: true,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate({
            options,
            data: {
                identity: {
                    type: 'user',
                    id: 'xxx',
                    realmName: 'master',
                },
                attributes: {
                    realm_id: 'foo-bar',
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should restrict due non matching realm', async () => {
        const options : RealmMatchPolicy = {
            type: BuiltInPolicyType.REALM_MATCH,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate({
            options,
            data: {
                identity: {
                    type: 'user',
                    id: 'xxx',
                    realmId: 'bar-baz',
                },
                attributes: {
                    realm_id: 'foo-bar',
                },
            },
        });
        expect(outcome).toBeFalsy();
    });

    it('should restrict due non matching realm and master full scope disabled', async () => {
        const options : RealmMatchPolicy = {
            type: BuiltInPolicyType.REALM_MATCH,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate({
            options,
            data: {
                identity: {
                    type: 'user',
                    id: 'xxx',
                    realmName: 'master',
                },
                attributes: {
                    realm_id: 'foo-bar',
                },
            },
        });
        expect(outcome).toBeFalsy();
    });
});
