# tests/integration/lab-9-s3.hurl
# Lab 9 S3 Integration Test
# Tests that fragments can be created, retrieved, and deleted with S3 storage

# 1. POST a new text fragment to http://localhost:8080 as an authorized user
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
# user1@email.com:password1
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

`Hello S3!`

# 2. Confirm that the server returns a 201, and capture the Location header
HTTP/1.1 201
[Captures]
url: header "Location"

# 3. GET the fragment we just created using the url as an authorized user
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# 4. Confirm that the server returns a 200, type is text/plain, body is correct
HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
Content-Length: 9
[Asserts]
body == "Hello S3!"

# 5. DELETE the fragment using the url as an authorized user
DELETE {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# 6. Confirm that the server returns a 200
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 7. Try to GET the fragment again using the url as an authorized user
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

# 8. Confirm that the server returns a 404, since the fragment should be deleted
HTTP/1.1 404