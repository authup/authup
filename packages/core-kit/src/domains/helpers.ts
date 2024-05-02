export function buildDomainChannelName(entity: string, id?: string | number) {
    return id ? `${entity}:${id}` : entity;
}

export function buildDomainNamespaceName(id: string) {
    return `/realm#${id}`;
}
