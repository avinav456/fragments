# tests/integration/lab-10-dynamodb.hurl
# Lab 10 DynamoDB Integration Test
# Tests that fragments can be created, retrieved, and deleted with DynamoDB metadata storage

# 1. POST a new JSON fragment to http://localhost:8080 as an authorized user
POST http://localhost:8080/v1/fragments
Content-Type: application/json
# user1@email.com:password1
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

{ "service": "DynamoDB" }

# 2. Confirm that the server returns a 201, and capture the Location header and fragment id
HTTP/1.1 201
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# 3. GET the fragment info (metadata) for the fragment using the Location URL/info
GET {{fragment1_url}}/info
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# Confirm that the server returns a 200 and metadata properties match
HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment1_id}}
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.ownerId" exists
jsonpath "$.fragment.created" exists
jsonpath "$.fragment.updated" exists

# 4. POST a second Markdown fragment to http://localhost:8080 as the same authorized user
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

`DynamoDB is **great**.`

# 5. Confirm that the server returns a 201, and capture the Location header and second fragment id
HTTP/1.1 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# 6. GET the fragment info (metadata) for the second fragment using the url/info
GET {{fragment2_url}}/info
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# Confirm that the server returns a 200 and metadata properties match
HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment2_id}}
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.ownerId" exists
jsonpath "$.fragment.created" exists
jsonpath "$.fragment.updated" exists

# 7. GET all fragments for the authorized user without expanding (just get IDs)
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# Confirm that the list includes both fragment ids
HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" contains {{fragment1_id}}
jsonpath "$.fragments" contains {{fragment2_id}}

# 8. DELETE the first fragment using the url as an authorized user
DELETE {{fragment1_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# 9. Confirm that the server returns a 200
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 10. Try to GET the first fragment again using the url as an authorized user
GET {{fragment1_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# 11. Confirm that the server returns a 404, since the fragment should be deleted
HTTP/1.1 404

# 12. GET all fragments for the same user again and confirm first id is NOT included but second id is
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# Confirm that first fragment is deleted but second fragment still exists
HTTP/1.1 200
Content-Type: application/json; charset=utf-8
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" not contains {{fragment1_id}}
jsonpath "$.fragments" contains {{fragment2_id}}