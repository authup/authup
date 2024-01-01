export function parseAppID(id: string) {
    const match = id.match(/([^:/]+)[:/]([^:d/]+)/);
    if (!match) {
        return undefined;
    }

    const [, group, name] = match;

    return {
        group,
        name,
    };
}
