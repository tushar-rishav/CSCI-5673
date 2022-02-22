### What doesn't work?

1. No sanity check for the data received from client-side.
2. No retry mechanism for database connection failure in the backend.


### What works?
1. Server can handle multiple concurrent client connections.
2. Services are stateless as any state is stored in a Mongo database.
3. Each request between client-server is authenticated and requires login.
4. All APIs from last assignment with additional API from this assignment has been implemented.
5. All communication between server and database is done over gRPC.
6. Financial transaction to make purchase service supports SOAP/WSDL.
7. Test deployment done cloud with end-to-end latency reported below.
8. Improved client interface. Replaced console interface with simple browser based UI as shown below: ![client_interface](/client_ui.png)

Round Trip Latency Times:
=========================
Client-Seller:
1. Put Item                      ---- 99ms | 96ms | 96ms
2. Change Sale Price             ---- 112ms | 93ms | 97ms
3. Remove Item                   ---- 98ms | 96ms 
4. Display Item for the seller   ---- 99ms | 119ms | 88ms
5. Sign-in                        ---- 125ms | 119ms | 82ms
6. Sign-out                       ---- 95ms | 119ms | 97ms
7. Sign-up                        ---- 81ms | 130ms | 118ms

Client-Buyer:
1. Search Items for Sale    ----  96ms | 109ms | 107ms
2. Add item to cart         ----  105ms | 99ms | 113ms
3. Remove item from cart    ----  92ms | 102ms | 121ms
4. Clear cart               ----  90ms | 93ms | 99ms
5. Display cart             ----  94ms | 90ms | 95ms
6. Sign-in                  ----  93ms | 102ms | 108ms
7. Sign-out                 ----  96ms | 108ms | 95ms
8. Make purchase            ----  92ms | 99ms | 118ms
9. Provide Feedback         ----  96ms | 90ms | 98ms
10. Get seller rating       ----  104ms | 99ms | 108ms
11. Get buyer history       ----  106ms | 97ms | 118ms

System Design:
==============
We have set up server-side sellers, server-side buyers, client-side sellers, and buyers based on browser UI. 
Server-side seller and buyer stores all the items in MongoDB with no state stored in memory. This allows services to be stateless and
scalable. Also all requests between the client and server is authenticated with username and password stored in the database.
Databse schema looks like below:
`Item`
* ID: Unique index, primary key, type: ObjectID
* name: unique username fpr the user, type: str
* category: Category item belongs to, type: int
* keywords: Keyword for the item, type: List[<str>]
* condition: new or used etc. type: str
* price: Price for the item. type: int
* qty: Quantity of the item, type: int
* feedback: Feedback for the item,

`User`
  * ID: Unique index
  * username: Unique username
  * passwd: password
  * type: Seller or Buyer, type: str
  * mean_ratings: Avg for the user
  * num_ratings: Total rating for the user
  * Items: Cart Items for the buyer and items added if seller. Items contain list of (item_id, quantity) pair
  
When an item quantity is reduced to 0, it's deleted from the databse. 
