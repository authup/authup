/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { slugify } from './slugify';

const ADJECTIVES = [
    'agile amber ancient autumn azure blithe bold brave bright brisk calm clever',
    'cobalt cosmic crimson crystal curious daring dapper eager electric elegant',
    'fancy fearless fluffy gentle gilded golden happy hidden jolly keen lively',
    'lucid lunar mellow merry mighty nimble noble polished proud quiet quick rapid',
    'royal rustic serene shiny silent silver sleek smooth solar spry stellar',
    'sturdy sunny swift tidy vivid witty zesty zealous',
].join(' ').split(' ');

const NOUNS = [
    'otter falcon willow comet harbor meadow cipher lynx maple heron cedar badger',
    'finch glacier canyon beacon pebble ember birch raven sparrow marten walrus',
    'puffin orchid cypress juniper aspen lotus quartz basalt tundra lagoon reef',
    'delta fjord summit ridge grove thicket mantis cricket beetle newt gecko koala',
    'panda bison moose osprey kestrel magpie robin wren salmon marlin coral kelp',
    'fern moss lichen clover',
].join(' ').split(' ');

function pick(list: readonly string[], rand: () => number): string {
    return list[Math.floor(rand() * list.length)] ?? '';
}

function hashSeed(seed: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    };
}

/**
 * Generate a human-friendly, URL-friendly name, e.g. `brave-otter-1a2b3c`.
 *
 * The trailing random hex suffix keeps generated names readable while making
 * collisions practically irrelevant. The result always satisfies the slug
 * charset (`[a-z0-9-]`) and stays within 128 characters.
 *
 * Passing a `seed` makes the result deterministic for that seed — feed a
 * hydration-stable value (e.g. Vue's `useId()`) to produce the same name on
 * the SSR and client render passes and avoid a hydration mismatch.
 */
export function generateName(seed?: string): string {
    const rand = typeof seed === 'undefined' ?
        Math.random :
        mulberry32(hashSeed(seed));

    const suffix = Math.floor(rand() * 0x1000000)
        .toString(16)
        .padStart(6, '0');

    return slugify(`${pick(ADJECTIVES, rand)}-${pick(NOUNS, rand)}-${suffix}`).slice(0, 128);
}
