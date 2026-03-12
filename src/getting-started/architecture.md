# Architecture

## Server API

The server component is the heart 🧡 of the authup ecosystem and can be used without any other component.
It provides an HTTP-API interface to interact with various resources.

These endpoints can be inspected after starting the application under the `/docs` endpoint.
Also, client libraries for [JavaScript](../sdks/javascript/access/)
and [Python](../sdks/python/index) provide a way to interact with the architecture in a more secure way.

## Client UI

The client application can be used in addition to the server component and provides easy
management and interaction with API endpoints of the backend.
It is based on vue3 and uses the frontend components provided by the vue package, 
which can also be used in a custom user interface.
Read more [here](../sdks/javascript/client-web-kit/). 
