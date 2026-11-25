/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

const regexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-8][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(input: string) : boolean {
    return regexp.test(input);
}

const COUNTER_MAX = 0xFFF;

let lastTimestamp = -1;
let lastRequested = -1;
let lastCounter = 0;

function formatUUIDv7(timestamp: number, counter: number, tail: Uint8Array) : string {
    const bytes = new Uint8Array(16);

    bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xFF;
    bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xFF;
    bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xFF;
    bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xFF;
    bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xFF;
    bytes[5] = timestamp & 0xFF;
    bytes[6] = 0x70 | (counter >> 8);
    bytes[7] = counter & 0xFF;
    bytes.set(tail, 8);
    bytes[8] = (bytes[8] & 0x3F) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomCounter() : number {
    return crypto.getRandomValues(new Uint16Array(1))[0] & 0x7FF;
}

/**
 * RFC 9562 UUIDv7 (method 1): ids minted in one process sort in creation order,
 * also within one millisecond. Only the clock is clamped against going back;
 * an explicit timestamp is taken as given.
 */
export function createUUIDv7(timestamp?: number) : string {
    const tail = crypto.getRandomValues(new Uint8Array(8));

    const requested = timestamp ?? Date.now();

    let ts = requested;

    if (requested === lastRequested || (timestamp === undefined && requested < lastTimestamp)) {
        ts = lastTimestamp;
    }

    lastRequested = requested;

    if (ts === lastTimestamp) {
        lastCounter += 1;

        if (lastCounter > COUNTER_MAX) {
            lastTimestamp += 1;
            lastCounter = randomCounter();
        }
    } else {
        lastTimestamp = ts;
        lastCounter = randomCounter();
    }

    return formatUUIDv7(lastTimestamp, lastCounter, tail);
}

export function buildUUIDv7LowerBound(timestamp: number) : string {
    return formatUUIDv7(timestamp, 0, new Uint8Array(8));
}
