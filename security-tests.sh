#!/bin/bash

# LunchSync Security Testing Script
# Tests for common security vulnerabilities

# Don't exit on error, continue testing
#set -e

BASE_URL="http://localhost:5000/api"
TOKEN=""
SECOND_TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() {
    echo -e "${GREEN}✓ SECURE${NC}: $1"
}

fail() {
    echo -e "${RED}✗ VULNERABLE${NC}: $1"
    echo "Details: $2"
}

warn() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
}

info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

echo "========================================="
echo "LunchSync Security Testing Suite"
echo "========================================="
echo ""

# Get authentication token
info "Authenticating for security tests..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // empty')
if [ -z "$TOKEN" ]; then
    fail "Failed to authenticate" "$LOGIN_RESPONSE"
    exit 1
fi
info "Authenticated successfully"
echo ""

# ==========================================
# SQL INJECTION TESTS
# ==========================================
echo "========================================="
echo "1. SQL INJECTION TESTS"
echo "========================================="
echo ""

info "SEC-001: Testing SQL injection in login email..."
SQL_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@demo.com' OR '1'='1\",\"password\":\"anything\"}")

if [[ "$SQL_LOGIN" == *"token"* ]] && [[ "$SQL_LOGIN" != *"error"* ]]; then
    fail "SQL injection vulnerability in login!" "$SQL_LOGIN"
else
    pass "Login protected against SQL injection"
fi
echo ""

info "SEC-002: Testing SQL injection in restaurant ID..."
SQL_REST=$(curl -s -X GET "$BASE_URL/restaurants/1' OR '1'='1" \
    -H "Authorization: Bearer $TOKEN" 2>&1 || echo "error")

if echo "$SQL_REST" | grep -q "id.*:"; then
    fail "SQL injection vulnerability in restaurant query!" "$SQL_REST"
else
    pass "Restaurant query protected against SQL injection"
fi
echo ""

info "SEC-003: Testing SQL injection in event search..."
SQL_EVENT_STATUS=$(curl -s -o /tmp/sql_event_response.json -w "%{http_code}" -X POST "$BASE_URL/events" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test'; DROP TABLE events; --\",\"restaurantId\":\"123\",\"deliveryLocation\":\"Office\",\"orderDeadline\":\"2025-01-30T12:00:00Z\",\"paymentMethod\":\"INDIVIDUAL\"}")

if [ "$SQL_EVENT_STATUS" -ge 400 ]; then
    pass "Event creation protected against SQL injection"
else
    warn "Event creation accepted SQL-like syntax (may need investigation)"
fi
echo ""

# ==========================================
# XSS (CROSS-SITE SCRIPTING) TESTS
# ==========================================
echo "========================================="
echo "2. XSS (CROSS-SITE SCRIPTING) TESTS"
echo "========================================="
echo ""

info "SEC-004: Testing XSS in restaurant name..."
XSS_SCRIPT="<script>alert('XSS')</script>"
XSS_REST=$(curl -s -X POST "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$XSS_SCRIPT\",\"cuisine\":\"Test\",\"openTime\":\"09:00\",\"closeTime\":\"22:00\",\"deliveryTime\":\"30min\",\"hasMenu\":true}")

if [[ "$XSS_REST" == *"<script>"* ]]; then
    warn "XSS payload accepted in restaurant name (sanitization needed)"
elif [[ "$XSS_REST" == *"id"* ]]; then
    info "Restaurant created with XSS payload (frontend sanitization needed)"
else
    pass "XSS payload rejected or sanitized"
fi
echo ""

info "SEC-005: Testing XSS in event title..."
XSS_EVENT=$(curl -s -X POST "$BASE_URL/events" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"<img src=x onerror=alert('XSS')>\",\"restaurantId\":\"cmg7py8yq0006j6ivmp9njkec\",\"deliveryLocation\":\"Office\",\"orderDeadline\":\"2025-01-30T12:00:00Z\",\"paymentMethod\":\"INDIVIDUAL\"}")

if [[ "$XSS_EVENT" == *"<img"* ]]; then
    warn "XSS payload accepted in event title (sanitization needed)"
elif [[ "$XSS_EVENT" == *"id"* ]]; then
    info "Event created with XSS payload (frontend sanitization needed)"
else
    pass "XSS payload rejected or sanitized"
fi
echo ""

# ==========================================
# AUTHENTICATION & AUTHORIZATION TESTS
# ==========================================
echo "========================================="
echo "3. AUTHENTICATION & AUTHORIZATION TESTS"
echo "========================================="
echo ""

info "SEC-006: Testing access with invalid token..."
INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer invalid_token_12345")

if [[ "$INVALID_TOKEN_RESPONSE" == *"error"* ]] || [[ "$INVALID_TOKEN_RESPONSE" == *"Invalid"* ]]; then
    pass "Invalid token rejected"
else
    fail "Invalid token accepted!" "$INVALID_TOKEN_RESPONSE"
fi
echo ""

info "SEC-007: Testing access with expired token..."
EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE1MTYyMzkwMjJ9.invalid"
EXPIRED_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $EXPIRED_TOKEN")

if [[ "$EXPIRED_RESPONSE" == *"error"* ]] || [[ "$EXPIRED_RESPONSE" == *"Invalid"* ]] || [[ "$EXPIRED_RESPONSE" == *"expired"* ]]; then
    pass "Expired/invalid token rejected"
else
    fail "Expired token accepted!" "$EXPIRED_RESPONSE"
fi
echo ""

info "SEC-008: Testing JWT token manipulation..."
# Try to modify the payload
MANIPULATED_TOKEN="${TOKEN%.*}.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid"
MANIP_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $MANIPULATED_TOKEN")

if [[ "$MANIP_RESPONSE" == *"error"* ]] || [[ "$MANIP_RESPONSE" == *"Invalid"* ]]; then
    pass "Manipulated token rejected"
else
    fail "Manipulated token accepted!" "$MANIP_RESPONSE"
fi
echo ""

# ==========================================
# AUTHORIZATION BYPASS TESTS
# ==========================================
echo "========================================="
echo "4. AUTHORIZATION BYPASS TESTS"
echo "========================================="
echo ""

info "SEC-009: Testing access to other company's restaurant..."
REST_LIST_STATUS=$(curl -s -o /tmp/rest_list.json -w "%{http_code}" -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN")

if [ "$REST_LIST_STATUS" -ne 200 ]; then
    warn "Unable to fetch restaurant listing for authorization test (status $REST_LIST_STATUS)"
else
    REST_ID=$(jq -r '.data[0].id // .[0].id // empty' /tmp/rest_list.json 2>/dev/null)

    if [ -z "$REST_ID" ]; then
        warn "Unable to fetch restaurant ID for authorization test"
    else
        SECONDARY_EMAIL="authcheck$(date +%s%N)@test.com"
        SECONDARY_SLUG="authcheck-$(date +%s)"
        SECONDARY_STATUS=$(curl -s -o /tmp/authcheck_register.json -w "%{http_code}" -X POST "$BASE_URL/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$SECONDARY_EMAIL\",\"password\":\"StrongPass!1\",\"name\":\"Auth Check\",\"companyName\":\"Auth Check Co\",\"companyDomain\":\"$SECONDARY_SLUG.com\",\"companySlug\":\"$SECONDARY_SLUG\"}")

        if [ "$SECONDARY_STATUS" -ge 400 ]; then
            warn "Could not create secondary tenant for authorization test"
        else
            SECOND_TOKEN=$(cat /tmp/authcheck_register.json | jq -r '.data.token // .token // empty')
            if [ -z "$SECOND_TOKEN" ]; then
                warn "Secondary tenant created but token unavailable"
            else
                DELETE_STATUS=$(curl -s -o /tmp/delete_response.json -w "%{http_code}" -X DELETE "$BASE_URL/restaurants/$REST_ID" \
                    -H "Authorization: Bearer $SECOND_TOKEN")

                if [ "$DELETE_STATUS" -ge 400 ]; then
                    pass "Cannot delete other company's resources"
                else
                    fail "Authorization bypass risk when deleting restaurant!" "$(cat /tmp/delete_response.json)"
                fi
            fi
        fi
    fi
fi
echo ""

info "SEC-010: Testing IDOR (Insecure Direct Object Reference)..."
# Try to access a made-up ID
IDOR_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants/fake-id-12345" \
    -H "Authorization: Bearer $TOKEN")

if [[ "$IDOR_RESPONSE" == *"error"* ]] || [[ "$IDOR_RESPONSE" == *"not found"* ]] || [[ "$IDOR_RESPONSE" == *"Not found"* ]]; then
    pass "IDOR protection working (non-existent ID rejected)"
else
    warn "IDOR check may need review"
fi
echo ""

info "SEC-020: Testing company data isolation..."
if [ -z "$REST_ID" ] || [ -z "$SECOND_TOKEN" ]; then
    warn "Skipping company isolation test (missing secondary tenant or restaurant ID)"
else
    ISOLATION_STATUS=$(curl -s -o /tmp/isolation_get.json -w "%{http_code}" -X GET "$BASE_URL/restaurants/$REST_ID" \
        -H "Authorization: Bearer $SECOND_TOKEN")
    if [ "$ISOLATION_STATUS" -ge 400 ]; then
        pass "Company isolation enforced (secondary tenant blocked)"
    else
        fail "Company isolation breached (secondary tenant accessed data)" "$(cat /tmp/isolation_get.json)"
    fi
fi
echo ""

# ==========================================
# INPUT VALIDATION TESTS
# ==========================================
echo "========================================="
echo "5. INPUT VALIDATION TESTS"
echo "========================================="
echo ""

info "SEC-011: Testing extremely long input..."
LONG_STRING=$(printf 'A%.0s' {1..10000})
LONG_INPUT_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$LONG_STRING\",\"cuisine\":\"Test\",\"openTime\":\"09:00\",\"closeTime\":\"22:00\",\"deliveryTime\":\"30min\",\"hasMenu\":true}")

if [[ "$LONG_INPUT_RESPONSE" == *"error"* ]] || [[ "$LONG_INPUT_RESPONSE" == *"too long"* ]]; then
    pass "Long input rejected"
else
    warn "Long input accepted (may need length validation)"
fi
echo ""

info "SEC-012: Testing special characters..."
SPECIAL_CHARS="!@#$%^&*()_+-=[]{}|;:',.<>?/~\`"
SPECIAL_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Restaurant $SPECIAL_CHARS\",\"cuisine\":\"Test\",\"openTime\":\"09:00\",\"closeTime\":\"22:00\",\"deliveryTime\":\"30min\",\"hasMenu\":true}")

if [[ "$SPECIAL_RESPONSE" == *"id"* ]]; then
    info "Special characters accepted (ensure proper escaping on display)"
else
    info "Special characters validation applied"
fi
echo ""

info "SEC-013: Testing negative numbers in prices..."
NEGATIVE_PRICE=$(curl -s -X POST "$BASE_URL/restaurants/cmg7py8yq0006j6ivmp9njkec/menu-items" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Item","price":-10.99,"category":"Test"}')

if [[ "$NEGATIVE_PRICE" == *"error"* ]] || [[ "$NEGATIVE_PRICE" == *"positive"* ]] || [[ "$NEGATIVE_PRICE" == *"validation"* ]]; then
    pass "Negative prices rejected"
else
    fail "Negative prices accepted!" "$NEGATIVE_PRICE"
fi
echo ""

# ==========================================
# RATE LIMITING TESTS
# ==========================================
echo "========================================="
echo "6. RATE LIMITING TESTS"
echo "========================================="
echo ""

info "SEC-014: Testing rate limiting (100 rapid requests)..."
RATE_LIMIT_DETECTED=false
for i in {1..100}; do
    RATE_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/restaurants" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$RATE_RESPONSE" == "429" ]; then
        RATE_LIMIT_DETECTED=true
        break
    fi
done

if [ "$RATE_LIMIT_DETECTED" = true ]; then
    pass "Rate limiting is active (detected 429 response)"
else
    warn "No rate limiting detected (consider implementing for production)"
fi
echo ""

# ==========================================
# PASSWORD SECURITY TESTS
# ==========================================
echo "========================================="
echo "7. PASSWORD SECURITY TESTS"
echo "========================================="
echo ""

info "SEC-015: Testing weak password..."
WEAK_PASS_EMAIL="weakpass$(date +%s)@test.com"
WEAK_PASS_SLUG="weakpass-$(date +%s)"
WEAK_PASS_STATUS=$(curl -s -o /tmp/weak_pass_response.json -w "%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$WEAK_PASS_EMAIL\",\"password\":\"123\",\"name\":\"Test\",\"companyName\":\"Test\",\"companyDomain\":\"$WEAK_PASS_SLUG.com\",\"companySlug\":\"$WEAK_PASS_SLUG\"}")

if [ "$WEAK_PASS_STATUS" -ge 400 ]; then
    pass "Weak passwords rejected by validation"
else
    warn "Weak password accepted (consider stronger requirements)"
fi
echo ""

info "SEC-016: Testing common password..."
COMMON_PASS_EMAIL="commonpass$(date +%s)@test.com"
COMMON_PASS_SLUG="commonpass-$(date +%s)"
COMMON_PASS_STATUS=$(curl -s -o /tmp/common_pass_response.json -w "%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$COMMON_PASS_EMAIL\",\"password\":\"password\",\"name\":\"Test\",\"companyName\":\"Test\",\"companyDomain\":\"$COMMON_PASS_SLUG.com\",\"companySlug\":\"$COMMON_PASS_SLUG\"}")

if [ "$COMMON_PASS_STATUS" -ge 400 ]; then
    pass "Common password rejected"
else
    warn "Common password 'password' accepted (consider password blacklist)"
fi
echo ""

# ==========================================
# CORS TESTS
# ==========================================
echo "========================================="
echo "8. CORS (CROSS-ORIGIN) TESTS"
echo "========================================="
echo ""

info "SEC-017: Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$BASE_URL/restaurants" \
    -H "Origin: http://malicious-site.com" \
    -H "Access-Control-Request-Method: GET")

if [[ "$CORS_RESPONSE" == *"Access-Control-Allow-Origin: *"* ]]; then
    warn "CORS allows all origins (tighten for production)"
elif [[ "$CORS_RESPONSE" == *"Access-Control-Allow-Origin"* ]]; then
    pass "CORS configured (verify allowed origins)"
else
    info "CORS headers not found in response"
fi
echo ""

# ==========================================
# HTTPS & SECURITY HEADERS TESTS
# ==========================================
echo "========================================="
echo "9. SECURITY HEADERS TESTS"
echo "========================================="
echo ""

info "SEC-018: Testing security headers..."
HEADERS_RESPONSE=$(curl -s -I "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN")

HEADERS_LOWER=$(echo "$HEADERS_RESPONSE" | tr '[:upper:]' '[:lower:]')

if echo "$HEADERS_LOWER" | grep -q "x-content-type-options"; then
    pass "X-Content-Type-Options header present"
else
    warn "X-Content-Type-Options header missing (prevents MIME sniffing)"
fi

if echo "$HEADERS_LOWER" | grep -q "x-frame-options"; then
    pass "X-Frame-Options header present"
else
    warn "X-Frame-Options header missing (prevents clickjacking)"
fi

if echo "$HEADERS_LOWER" | grep -q "strict-transport-security"; then
    pass "HSTS header present"
else
    info "HSTS header missing (recommended for HTTPS in production)"
fi

if echo "$HEADERS_LOWER" | grep -q "content-security-policy"; then
    pass "CSP header present"
else
    warn "Content-Security-Policy header missing (prevents XSS)"
fi
echo ""

# ==========================================
# SESSION MANAGEMENT TESTS
# ==========================================
echo "========================================="
echo "10. SESSION MANAGEMENT TESTS"
echo "========================================="
echo ""

info "SEC-019: Testing session fixation..."
# Try to use the same token from multiple IPs (simulated)
SESSION_RESPONSE1=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Forwarded-For: 192.168.1.1")

SESSION_RESPONSE2=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Forwarded-For: 10.0.0.1")

if [[ "$SESSION_RESPONSE1" == *"id"* ]] && [[ "$SESSION_RESPONSE2" == *"id"* ]]; then
    info "Token works from different IPs (consider IP binding for sensitive operations)"
else
    pass "Session security measures detected"
fi
echo ""

# ==========================================
# TEST SUMMARY
# ==========================================
echo "========================================="
echo "SECURITY TEST SUMMARY"
echo "========================================="
echo ""
echo "✅ Security tests completed!"
echo ""
echo "Review findings above and address any VULNERABLE or WARNING items."
echo ""
echo "Recommendations:"
echo "1. Implement rate limiting for production"
echo "2. Add security headers (CSP, X-Frame-Options, etc.)"
echo "3. Consider stronger password requirements"
echo "4. Tighten CORS configuration for production"
echo "5. Implement input sanitization for XSS prevention"
echo "6. Add audit logging for sensitive operations"
echo ""
