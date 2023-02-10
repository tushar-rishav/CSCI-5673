### What doesn't work?
- Group membership and recovery protocol not implemented 


### What works?
1. Server can handle multiple concurrent client connections.
2. Services are stateless as any state is stored in a Mongo database.
3. Each request between client-server is authenticated and requires login.
4. All APIs from last assignment with additional API from this assignment has been implemented.
5. All communication between server and database is done over gRPC.
6. Financial transaction to make purchase service supports SOAP/WSDL.
7. Test deployment done cloud with end-to-end latency reported below.
8. Improved client interface. Replaced console interface with simple browser based UI as shown below: ![client_interface](/PA4/client_ui.png)
9. User DB has consensus layer using total-ordered atomic broadcast protocol.
10. Product DB has raft for managing replica of MongoDB.
11. Seller and Buyer server replicated with PM2 - nodejs cluster manager.

Round Trip Latency Times (in ms):
=================================
**Client-Seller:**
1. Sign up           --- 221 | 231 | 229 | 227
2. Login             --- 280 | 291 | 287 | 285
3. Logout            --- 161 | 171 | 166 | 167
4. Add_item          --- 125 | 132 | 129 | 131
5. Display_item      --- 303 | 321 | 318 | 325
6. Remove_item       --- 192 | 203 | 197 | 205
7. Seller_Ratings    --- 211 | 215 | 218 | 220

**Client-Buyer:**
1. Search Items for Sale    ----  196ms | 209ms | 207ms | 215ms
2. Add item to cart         ----  205ms | 199ms | 213ms | 223ms
3. Remove item from cart    ----  192ms | 202ms | 221ms | 225ms
4. Clear cart               ----  190ms | 193ms | 199ms | 211ms
5. Display cart             ----  194ms | 190ms | 195ms | 215ms
6. Sign-in                  ----  193ms | 202ms | 208ms | 210ms
7. Sign-out                 ----  196ms | 208ms | 195ms | 222ms
8. Make purchase            ----  192ms | 199ms | 218ms | 231ms
9. Provide Feedback         ----  196ms | 190ms | 198ms | 211ms
10. Get seller rating       ----  204ms | 199ms | 208ms | 223ms
11. Get buyer history       ----  206ms | 197ms | 218ms | 255ms

System Design:
==============
We have set up server-side sellers, server-side buyers, client-side sellers, and buyers based on browser UI. 
Server-side seller and buyer stores all the items in MongoDB with no state stored in memory. This allows services to be stateless and
scalable. Moroever, there's GRPC server which acts as interface to buyer/seller server to perform DB queries. We added consensus with total ordered
atomic broadcast protocol in buyer/seller server. Morever, MongoDB which has product database is replicated with Raft protocol.

Also all requests between the client and server is authenticated with username and password stored in the database.
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
