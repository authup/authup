/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { ExpressRequest } from '../../../type';
import { UserAttributeValidationResult } from '../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { extendExpressValidationResultWithUser } from '../../user';
import { CRUDOperation } from '../../../constants';

export async function runUserAttributeValidation(
    req: ExpressRequest,
    operation: `${CRUDOperation.CREATE}` | `${CRUDOperation.UPDATE}`,
) : Promise<UserAttributeValidationResult> {
    const result : UserAttributeValidationResult = {
        data: {},
        meta: {},
    };

    if (operation === CRUDOperation.CREATE) {
        await check('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 })
            .run(req);

        await check('user_id')
            .exists()
            .isUUID()
            .optional();
    }

    await check('value')
        .exists()
        .notEmpty()
        .isString()
        .isLength({ min: 3, max: 512 })
        .optional({ nullable: true })
        .run(req);

    // ----------------------------------------------

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    result.data = matchedValidationData(req, { includeOptionals: true });

    if (operation === CRUDOperation.CREATE) {
        await extendExpressValidationResultWithUser(result);

        if (result.meta.user) {
            result.data.realm_id = result.meta.user.realm_id;
            result.data.user_id = result.meta.user.id;
        } else {
            result.data.realm_id = req.realmId;
            result.data.user_id = req.userId;
        }
    }

    return result;
}
