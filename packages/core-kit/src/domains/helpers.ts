export function buildResourceChannelName(entity: string, id?: string | number) {
    return id ? `${entity}:${id}` : entity;
}

export function buildResourceNamespaceName(id: string) {
    return `/realm#${id}`;
}
