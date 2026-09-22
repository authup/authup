# Paths (Folders for Users and Clients)

A **path** is a folder inside one realm that users and clients can be filed
under, so that a large realm can be organized and navigated.

A path is therefore both:

- a node in a folder tree owned by exactly one realm; and
- a label on the users and clients filed under it.

A folder carries no authorization. Filing a user under `sales/berlin` grants
nothing, withholds nothing, and moving a row between folders changes nothing
about what it may do. Organization and authorization are deliberately kept
apart: roles, permissions and policies decide access, folders decide where a
row lives.

## What a path is not

Filing a user or a client under a folder does not:

- grant or withhold a permission, a role or a scope;
- affect a login, a token, a consent or a session;
- by itself restrict who may read, update or delete the row;
- make the folder a tenant. The realm is the isolation boundary: it owns the
  signing keys, the discovery document and the system clients. A folder is a
  label inside one realm and never spans realms.

Delegating administration by folder is possible, but only as an explicit policy
an administrator writes. The folder never does it on its own. See
[Delegating a subtree](#delegating-a-subtree).

## How the tree works

A folder has a parent and a single name segment. The server derives the full
path from the parent chain and stores it on the folder:

```text
sales          name: sales        parent: (none)   path: sales
  berlin       name: berlin       parent: sales    path: sales/berlin
  hamburg      name: hamburg      parent: sales    path: sales/hamburg
engineering    name: engineering  parent: (none)   path: engineering
```

The full path is never accepted from a caller. It is recomputed whenever a
folder is created, renamed or moved, and it is unique inside the realm: two
folders under one parent cannot carry the same name, while two realms may both
hold a `sales/berlin`.

- **Names** use the same character set as every other Authup name (`a` to `z`,
  `0` to `9`, `-`, `_`, `.`) and are trimmed and lowercased on write, so
  `Berlin` is stored as `berlin`. A segment holds at most 128 characters, a
  full path at most 255, and the tree is at most 15 levels deep.
- **Empty folders are allowed.** Build the structure first and file rows into
  it afterwards.
- **Renaming or moving** a folder recomputes its own path and rewrites every
  descendant path in one transaction. The users and clients filed under those
  folders keep their reference and are not written at all: renaming `sales` to
  `marketing` turns `sales/berlin` into `marketing/berlin` and everyone filed
  there follows. A folder cannot be moved under itself or under one of its own
  descendants.
- **Deleting a folder deletes its descendants and unfiles their occupants** in
  the same statement. No user and no client is ever deleted with a folder: the
  folder reference is cleared and the rows become unfiled. This is never
  refused and needs no force flag. Before it sends the request the admin
  console reads the subtree and names three numbers in the confirmation: how
  many subfolders are deleted, and how many users and how many clients are
  unfiled. When one of those reads is refused, or the subtree is larger than
  the console can resolve, the confirmation says the counts are unavailable
  and describes the effect instead.

## Filing a user or a client

A user and a client each carry one optional folder reference. No reference
means **unfiled**, and unfiled is the default: nothing is filed automatically,
and an upgrade migrates no row into a folder.

Unlike the realm, which is fixed at creation, the folder is mutable: a row is
refiled by pointing it at another folder. The folder must belong to the same
realm as the row, otherwise the write is rejected.

A user cannot refile itself. The folder reference is on the self-management
denylist for both users and clients, so it is an administrative field even on
the account console, where the signed-in user sees their own folder as a
read-only value.

## Managing folders

Folders are administered through the `path_read`, `path_create`, `path_update`
and `path_delete` permissions, over the routes `/paths` and
`/realms/:realmId/paths`. The global `admin` role reaches every realm. A
`realm_admin` reads the folders of its own realm and of no other, and creates,
updates and deletes only inside its own realm.

Reading the folder of a user or a client is not gated on `path_read`. A folder
row holds organizational metadata only (its name, its path, a display name and
a description), so a reader who may see the row may see where it is filed: the
folder column in the admin console's user list renders for every reader of that
list, and the account console shows a user their own folder without granting
them anything. The folder **collection** is gated: listing the realm's folders
requires the read permission, which is why the folder tree that scopes the
users and clients lists is shown only to a reader holding it.

To manage folders in the admin console:

1. Select the target realm.
2. Open **Paths** in the sidebar and build the tree there.
3. On the users and clients pages, pick a folder in the tree beside the table
   to scope the list to that folder and everything below it. The chosen
   folder is written into the address, so a scoped list can be shared as a
   link and survives a reload; **All paths** clears it. The search box is
   independent of that scope: it searches names and display names, and the
   two narrow the list together. A subtree with more folders than the console
   can carry in one request is not scoped at all: the page then lists every
   row and says why, rather than showing a silently shortened list.
4. On a user or client form, choose the folder the row belongs to.

## Federated users

A user created by an [identity provider](./identity-providers.md) is filed
under `sources/<provider name>` on first login, and the folder chain is created
if it does not exist yet. An attribute mapping that targets the folder wins
over that default.

That **default** applies at creation only. A later login never refiles an
existing user, so an administrator who moves a federated user elsewhere keeps
that placement, and a folder that cannot be created leaves the user unfiled
rather than failing the login.

An **attribute mapping** that targets the folder behaves like every other
mapped attribute and is re-applied on **every** login, so it overwrites a
manual refile. It must supply the folder's **UUID**: nothing resolves a path
such as `sales/berlin` to a folder there. The folder must belong to the user's
realm, and a mapping naming another realm's folder is refused, which fails that
provider's logins until the mapping is corrected.

Nothing is reserved about the `sources` prefix: it is a convention, and an
ordinary folder may live next to it.

## Declaring folders in a provisioning file

A realm entry declares its folders by full path, and a user or client entry
references one the same way. Nothing has to be declared before it is used:
`sales/berlin` creates `sales` first when it is missing, and a user that
references a folder no entry declares creates that folder too. Declaring a
folder is how it gets a display name or a description.

```yaml
realms:
  - attributes:
      name: acme
    relations:
      paths:
        - attributes:
            path: sales/berlin
            displayName: Berlin
        - attributes:
            path: engineering
      users:
        - attributes:
            name: alice
            password: replace-with-a-strong-secret
          relations:
            path: sales/berlin
      clients:
        - attributes:
            name: acme-app
            authMethod: none
          relations:
            path: engineering
```

Folders are synchronized before the realm's clients and users, so a folder
declared in the same file is available to reference. See
[Provisioning](../deployment/provisioning.md) for the file format, the sync
strategies and the wildcard realm entry that seeds one folder set into every
realm.

## Delegating a subtree

A folder decides nothing by itself, but an administrator can write a policy
that reads it. Attach an `attributes`
[policy](./permissions-and-policies.md) to the grant that gives a role its
`user_read` / `user_update` / `user_delete` permissions, and restrict it to a
set of folders:

```yaml
policies:
  - attributes:
      name: sales-folders
      type: attributes
    extraAttributes:
      query:
        pathId:
          $in:
            - 0f1c5d3e-1b7a-4c1f-9e11-2f6a7d0c4b11
            - 7a2e9b64-5d30-4f8c-bf02-1c9d3e5a8042
```

A user or a client carries its folder reference, not the folder's path, so a
policy over those rows names folder ids. A subtree is expressed over the folder
rows themselves: a policy on a `path_read` or `path_update` grant with
`{ path: { $startsWith: 'sales/' } }` reaches every folder below `sales`.

Two limits are worth knowing before relying on this:

- **Only a global administrator can author it.** Attaching a policy to a grant
  requires an unrestricted, policy-free grant of that permission. A
  folder-scoped administrator can pass on its own policy unchanged and nothing
  narrower, so a `sales` administrator cannot mint a `sales/emea` one. Folder
  delegation cannot be sub-delegated.
- **Never use `$regex`.** It is not portable across the databases Authup
  supports and fails the query outright on SQLite. Use `$in` over folder ids,
  or `$startsWith` over a folder path.

## When you do not need paths

Most deployments do not need folders. A realm already separates tenants, and
the admin console searches users and clients by name and display name without
one. Reach for folders when a single realm holds enough rows that browsing it
needs structure, when the provenance of an account is worth recording, or when
a set of rows should be addressable as a group for an administrator who wants
to write the delegation policy above.
