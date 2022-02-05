What doesn't work?

1. No sanity check for the data received from client-side.
2. No retry mechanism for database connection failure in the backend.


What works?
1. Server can handle multiple concurrent client connections.
2. Server-Client re-use socket connection.
