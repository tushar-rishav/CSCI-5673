What doesn't work?

1. No sanity check for the data received from client-side.
2. No retry mechanism for database connection failure in the backend.


What works?
1. Server can handle multiple concurrent client connections.
2. Server-Client re-use socket connection.

Round Trip Latency Times:
=========================
Client-Seller:
1. Put Item                      ---- 9ms | 6ms | 6ms
2. Change Sale Price             ---- 11ms | 3ms | 7ms
3. Remove Item                   ---- 10ms | 6ms 
4. Display Item for the seller   ---- 7ms | 9ms | 8ms

Client-Buyer:
1. Search Items for Sale    ----  12ms | 9ms | 7ms
2. Add item to cart         ----  2ms | 1ms | 3ms
3. Remove item from cart    ----  2ms | 2ms | 1ms
4. Clear cart               ----  2ms | 3ms | 4ms
5. Display cart             ----  6ms | 7ms | 8ms
