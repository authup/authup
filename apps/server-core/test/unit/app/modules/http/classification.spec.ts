/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import * as controllers from '../../../../../src/adapters/http/controllers';
import { ControllerKind } from '../../../../../src/app/modules/http';
import {
    IDP_SURFACE_CONTROLLERS,
    MANAGEMENT_API_CONTROLLERS,
    classifyController,
} from '../../../../../src/app/modules/http/modules/classification';

/**
 * Every controller class the http adapter exports must sit on exactly one
 * of the two lists the console role is carved by (plan 099). The barrel is
 * the census: a controller added to the adapter without a classification
 * fails here, before it can ship unmounted on a console replica by
 * accident, or mounted there by accident.
 */
describe('src/app/modules/http/modules/classification', () => {
    const exported = Object.entries(controllers)
        .filter(([name, value]) => typeof value === 'function' && name.endsWith('Controller'))
        .map(([name, value]) => ({ name, type: value as new (...args: any[]) => object }));

    it('should classify every exported controller class exactly once', () => {
        expect(exported.length).toBeGreaterThanOrEqual(40);

        for (const { name, type } of exported) {
            const idp = IDP_SURFACE_CONTROLLERS.includes(type);
            const management = MANAGEMENT_API_CONTROLLERS.includes(type);

            expect(idp || management, `${name} is on neither list`).toBeTruthy();
            expect(idp && management, `${name} is on both lists`).toBeFalsy();
        }

        // and the lists carry nothing the barrel does not export
        const types = exported.map(({ type }) => type);
        for (const type of [...IDP_SURFACE_CONTROLLERS, ...MANAGEMENT_API_CONTROLLERS]) {
            expect(types, `${type.name} is classified but not exported`).toContain(type);
        }
    });

    it('should keep the routes the consoles and the hosted pages stand on', () => {
        for (const type of [
            controllers.AuthorizeController,
            controllers.TokenController,
            controllers.AccountController,
            controllers.AdminController,
            controllers.StatusController,
            controllers.SessionController,
            controllers.RealmController,
            controllers.IdentityProviderController,
            controllers.ConsentController,
            controllers.UserAuthenticatorController,
        ]) {
            expect(IDP_SURFACE_CONTROLLERS, type.name).toContain(type);
        }
    });

    it('should classify an instance by its class and refuse an unclassified one', () => {
        expect(classifyController(Object.create(controllers.StatusController.prototype)))
            .toEqual(ControllerKind.IDP_SURFACE);
        expect(classifyController(Object.create(controllers.RoleController.prototype)))
            .toEqual(ControllerKind.MANAGEMENT_API);

        class StrayController {}

        expect(() => classifyController(new StrayController()))
            .toThrow(/StrayController is neither on IDP_SURFACE_CONTROLLERS nor on MANAGEMENT_API_CONTROLLERS/);
    });
});
