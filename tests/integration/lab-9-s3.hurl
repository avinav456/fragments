# Test 1: Create a text fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==
Content-Type: text/plain
```
This is a fragment stored in S3!
```

HTTP 201
[Captures]
url: header "Location"
fragment1_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" exists
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 34

# Test 2: Retrieve the text fragment
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
Content-Type: text/plain; charset=utf-8
Content-Length: 34
[Asserts]
body == "This is a fragment stored in S3!"

# Test 3: Get metadata for the text fragment
GET {{url}}/info
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment1_id}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 34

# Test 4: List fragments
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" includes "{{fragment1_id}}"

# Test 5: Create a markdown fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==
Content-Type: text/markdown
```
# S3 Integration Test

This fragment tests **S3 storage** with markdown content.
```

HTTP 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"

# Test 6: Retrieve the markdown fragment
GET {{fragment2_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
body contains "# S3 Integration Test"

# Test 7: Ensure both fragments appear in list
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.fragments" includes "{{fragment1_id}}"
jsonpath "$.fragments" includes "{{fragment2_id}}"

# Test 8: Expanded list
GET http://localhost:8080/v1/fragments?expand=1
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.fragments[*].id" includes "{{fragment1_id}}"
jsonpath "$.fragments[*].id" includes "{{fragment2_id}}"

# Test 9: Delete the first fragment
DELETE {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# Test 10: Ensure first fragment is deleted
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 404

# Test 11: Delete markdown fragment
DELETE {{fragment2_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200

# Test 12: Create JSON fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==
Content-Type: application/json
```
{"service":"fragments","backend":"S3"}
```

HTTP 201
[Captures]
json_url: header "Location"
[Asserts]
jsonpath "$.status" == "ok"

# Test 13: Retrieve JSON fragment
GET {{json_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
[Asserts]
jsonpath "$.service" == "fragments"

# Test 14: Delete JSON fragment
DELETE {{json_url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP 200
