# Architecture

## Server API

The server component is the heart 🧡 of the authup ecosystem and can be used without any other component.
It provides an HTTP-API interface to interact with various resources.

These endpoints can be inspected after starting the application under the `/docs` endpoint.
Also, client libraries for [JavaScript](../sdks/javascript/access/)
and [Python](../sdks/python/index) provide a way to interact with the architecture in a more secure way.

## Consoles

The server serves three web surfaces on its own origin: the hosted auth pages
(login, consent, registration, password recovery), the account console at
`/console/account` (end-user self-service) and the admin console at `/console/admin`
(management of realms, users, clients, roles and everything else the API
holds). All three are Vue 3 applications built on the frontend components of
the client package, which can also be used in a custom user interface.
Read more [here](../sdks/javascript/client-web-kit/). 
