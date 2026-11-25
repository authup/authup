# Entity Change Feed

Services built on Authup keep rows that reference Authup entities (realms, users, clients, ...).
When such an entity is deleted, those rows must be cleaned up.
The realtime channels (Redis pub/sub, socket.io) are fire-and-forget: a service that is down or restarting misses the change for good.

The **entity change feed** closes that gap.
It lists every committed entity change (`created`, `updated`, `deleted`) in a stable order, so a service can resume from the last change it processed after any downtime.

## Request

```
GET /events/@feed?filter[id]=>{cursor}&page[limit]=50
GET /realms/{realmId}/events/@feed
```

- The cursor is the `id` of the last change you processed, passed as an ordinary filter (`filter[id]=>{cursor}`). Omit it to start at the oldest retained change.
- Event ids are UUIDv7, so they sort by creation time and the `id` is both the order and the cursor.
- The feed only lists entity changes (`scope = entity`) and always sorts by `id` ascending. Further filters (`refType`, `name`, `realmId`) work as on `GET /events`.
- A page holds at most 50 rows (larger values are capped). A page shorter than the limit means you are caught up.
- A filter the feed cannot apply (an unknown key, a cursor that is not a UUID) is refused with `400` rather than dropped, so a typo never restarts the feed or reads as caught up.
- Each row names what changed (`refType`, `refId`, `realmId`, `name`, and for updates a `diff`), not the full entity. Read the entity if you need more.

## Access

The caller needs the `EVENT_READ` permission. Without it the request is answered with `403`, unlike `GET /events`, which falls back to the caller's own rows.

Realm-bounded readers (for example a `realm_admin`) get the changes of their realm plus global ones. A reader's own rows outside that reach also appear.
A permission reach that cannot be expressed as a row condition is refused with `403` instead of being filtered per row: a page with all rows dropped would look like "caught up".

## Delivery guarantees

Delivery is **at-least-once**. Your handler must be idempotent: after a crash between handling a batch and storing the cursor, the batch is delivered again. Dedupe on the event `id`.

## Client helper

`@authup/core-http-kit` ships `client.event.getFeed(query?)` and `drainEventFeed`. The helper pages through the feed until it is caught up, calls `handle` per batch and, once it resolved, `persist` with the id of that batch's last event. It returns the final cursor. A rejection of either stops the drain, and the batch whose `handle` rejected is not persisted.

```typescript
import { Client, drainEventFeed } from '@authup/core-http-kit';

const client = new Client({ baseURL: 'https://auth.example.com' });
// authenticate the client with a token holding EVENT_READ

async function poll() {
    const stored = await storage.get('authup-feed-cursor'); // string | null

    await drainEventFeed(client, {
        cursor: stored,
        filters: { refType: 'realm' },
        handle: async (events) => {
            for (const event of events) {
                if (event.name === 'deleted') {
                    await removeRowsOfRealm(event.refId);
                }
            }
        },
        persist: async (cursor) => {
            await storage.set('authup-feed-cursor', cursor);
        },
    });
}

async function run() {
    try {
        await poll();
    } catch (error) {
        console.error(error); // the batch is retried on the next run
    } finally {
        setTimeout(run, 5_000); // never two drains at once
    }
}

run();
```

The consumer owns cursor storage. Persisting through `persist` after every batch means a crash mid-drain repeats at most one batch.

## Settle window

An event id is minted while the write's transaction is still open, so an id can commit after a higher one. To keep a cursor from passing a change that has not committed yet, the feed withholds rows younger than the settle window (`eventLogFeedSettleSeconds`, default 10 seconds, see [Server Configuration](../deployment/configuration-server-core)). The bound uses the server's clock, never the consumer's.

This rests on an assumption: no write transaction stays open longer than the window, and the clocks of replicas agree within it. Raise the window if a deployment runs long transactions or its replicas drift further apart. A server clock stepping backwards delays rows, it does not lose them.

## Retention and reconcile

The feed reads the entity mirror of the event log, so it depends on these settings:

- `eventLogEnabled` and `eventLogEntityEnabled` must be `true` (both default to `true`). Turning either off stops new changes from reaching the feed.
- `eventLogEntityRetentionDays` (default 7) bounds how far back a consumer can resume.

If your stored cursor is older than the retention (the consumer was down longer), changes were dropped. To detect it, read the cursor's time: the first 48 bits of a UUIDv7 (the first 12 hex digits, hyphen removed) are its unix time in milliseconds. Compare it with `eventLogEntityRetentionDays` (0 keeps rows forever), which a reader holding `EVENT_READ` finds as `meta.entityRetentionDays` on `GET /events/@stats`.

```typescript
const createdAt = Number.parseInt(cursor.replaceAll('-', '').slice(0, 12), 16);
const expired = entityRetentionDays > 0 &&
    Date.now() - createdAt > entityRetentionDays * 86_400_000;
```

When it is expired, do a **full reconcile** against the entities instead of relying on the feed. Take the time `T` before the reconcile starts and resume with the cursor `buildUUIDv7LowerBound(T)` from `@authup/kit`, so every change from the reconcile onward is replayed.

## Limits

- **Cascaded deletes.** Deleting a realm removes its users and clients through database cascade without an event per row. React to the parent's `deleted` event and clean up your children yourself.
- **Upgrade.** Event ids were random (UUIDv4) before the feed. Rows from before the upgrade are not reliably ordered; the feed is fully ordered one entity retention period after upgrading.
- **Missing rows.** A failed audit write is logged and not retried. The change itself commits, so the feed can miss it. This only happens on infrastructure failures.
