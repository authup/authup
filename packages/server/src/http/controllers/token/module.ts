/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'express';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';
import { createTokenRouteHandler, deleteTokenRouteHandler, verifyTokenRouteHandler } from './handlers';
import { TokenControllerOptions } from './type';
import { forceLoggedIn } from '../../middleware';

export function registerTokenController(router: Application, options: TokenControllerOptions) {
    router.post('/token', async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await createTokenRouteHandler(req, res, options);
        } catch (e) {
            next(e);
        }
    });

    router.delete('/token', async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await deleteTokenRouteHandler(req, res);
        } catch (e) {
            next(e);
        }
    });

    router.get('/token/:id', async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await verifyTokenRouteHandler(req, res, options);
        } catch (e) {
            next(e);
        }
    });

    router.get('/token', [forceLoggedIn], async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await verifyTokenRouteHandler(req, res, options);
        } catch (e) {
            next(e);
        }
    });
}
