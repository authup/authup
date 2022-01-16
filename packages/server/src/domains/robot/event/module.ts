/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import EventEmitter from 'events';
import { RobotEntity } from '../entity';

export declare interface RobotEventEmitter {
    on(event: 'credentials', listener: (entity: Partial<RobotEntity>) => void): this;
    on(event: string, listener: CallableFunction): this;

    emit(event: 'credentials', entity: Partial<RobotEntity>) : boolean;
}

export class RobotEventEmitter extends EventEmitter {

}

// -------------------------------------------

let instance : RobotEventEmitter | undefined;

export function useRobotEventEmitter() : RobotEventEmitter {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new RobotEventEmitter();

    return instance;
}
