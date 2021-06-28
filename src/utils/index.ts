export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

export function getExpirationDate(expiresIn: number | string) {
    if(typeof expiresIn !== 'number') {
        expiresIn = Number.parseInt(expiresIn, 10);
    }

    return new Date(Date.now() + expiresIn * 1000);
}
