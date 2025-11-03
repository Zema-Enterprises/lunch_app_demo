#!/bin/bash

# Quick test to verify XSS sanitization is working

echo "🔒 Testing XSS Sanitization..."
echo ""

# Login first
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✓ Logged in successfully"
echo ""

# Test XSS in restaurant name
echo "2. Testing XSS in restaurant name..."
XSS_RESPONSE=$(curl -s -X POST http://localhost:5000/api/restaurants \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"<script>alert('"'"'XSS'"'"')</script>Test Restaurant","cuisine":"Test","openTime":"09:00","closeTime":"22:00","deliveryTime":"30min","hasMenu":true}')

RESTAURANT_NAME=$(echo "$XSS_RESPONSE" | jq -r '.name // empty')

if [[ "$RESTAURANT_NAME" == *"<script>"* ]]; then
    echo "❌ FAIL: XSS payload NOT sanitized!"
    echo "   Restaurant name: $RESTAURANT_NAME"
else
    echo "✓ PASS: XSS payload sanitized!"
    echo "   Original: <script>alert('XSS')</script>Test Restaurant"
    echo "   Sanitized: ${RESTAURANT_NAME:-<removed>}"
fi
echo ""

# Test length validation
echo "3. Testing length validation..."
LONG_NAME=$(printf 'A%.0s' {1..150})
LENGTH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/restaurants \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$LONG_NAME\",\"cuisine\":\"Test\",\"openTime\":\"09:00\",\"closeTime\":\"22:00\",\"deliveryTime\":\"30min\",\"hasMenu\":true}")

if [[ "$LENGTH_RESPONSE" == *"error"* ]] || [[ "$LENGTH_RESPONSE" == *"too long"* ]] || [[ "$LENGTH_RESPONSE" == *"max"* ]]; then
    echo "✓ PASS: Length validation working!"
    echo "   Response: $(echo $LENGTH_RESPONSE | jq -r '.error // .message' | head -c 100)..."
else
    echo "❌ FAIL: Long input accepted!"
fi
echo ""

# Test security headers
echo "4. Testing security headers..."
HEADERS=$(curl -sI http://localhost:5000/api/restaurants \
    -H "Authorization: Bearer $TOKEN")

HEADERS_LOWER=$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')

if echo "$HEADERS_LOWER" | grep -q "x-content-type-options"; then
    echo "✓ PASS: X-Content-Type-Options header present"
else
    echo "❌ FAIL: X-Content-Type-Options header missing"
fi

if echo "$HEADERS_LOWER" | grep -q "x-frame-options"; then
    echo "✓ PASS: X-Frame-Options header present"
else
    echo "❌ FAIL: X-Frame-Options header missing"
fi

if echo "$HEADERS_LOWER" | grep -q "content-security-policy"; then
    echo "✓ PASS: Content-Security-Policy header present"
else
    echo "❌ FAIL: Content-Security-Policy header missing"
fi
echo ""

echo "🎉 Security verification complete!"
