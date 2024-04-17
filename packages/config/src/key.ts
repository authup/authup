import type { Key } from './types';

export function deserializeKey(input: string) : Key {
    const match = input.match(/([^:/]+)[:/]([^:d/]+)/);
    if (!match) {
        return {
            name: input,
        };
    }

    const [, group, name] = match;

    return {
        group,
        name,
    };
}
