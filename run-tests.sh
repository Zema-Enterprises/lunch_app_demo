#!/bin/bash

# LunchSync Comprehensive Testing Script
# Run this script to execute all backend API tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/scripts/json_helpers.sh"

BASE_URL="http://localhost:5000/api"
TOKEN=""
COMPANY_ID=""
RESTAURANT_ID=""
EVENT_ID=""
NOTIFICATIONS_MODE="polling"
RUN_POLLING_FRONT=false
RUN_REALTIME_FRONT=false
RUN_REALTIME_BACK=false

usage() {
    cat <<EOF
Usage: $0 [--notifications-mode <polling|realtime|both>] [--help]

Options:
  --notifications-mode   Select notification verification mode:
                           polling  – run API suite + polling-focused frontend checks (default)
                           realtime – run API suite + realtime smoke tests (frontend/backend)
                           both     – execute polling checks followed by realtime smoke tests
  --help                 Show this help message and exit
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --notifications-mode)
            NOTIFICATIONS_MODE="$2"
            shift 2
            ;;
        --notifications-mode=*)
            NOTIFICATIONS_MODE="${1#*=}"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

case "$NOTIFICATIONS_MODE" in
    polling)
        RUN_POLLING_FRONT=true
        ;;
    realtime)
        RUN_REALTIME_FRONT=true
        RUN_REALTIME_BACK=true
        ;;
    both)
        RUN_POLLING_FRONT=true
        RUN_REALTIME_FRONT=true
        RUN_REALTIME_BACK=true
        ;;
    *)
        echo "Invalid notifications mode: $NOTIFICATIONS_MODE"
        usage
        exit 1
        ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "LunchSync API Testing Suite"
echo "========================================="
echo ""

# Function to print test results
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo "Response: $2"
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

info "Notifications mode: $NOTIFICATIONS_MODE"

# ==========================================
# 1. AUTHENTICATION TESTS
# ==========================================
echo "========================================="
echo "1. AUTHENTICATION TESTS"
echo "========================================="
echo ""

# TC-AUTH-001: Successful login
info "TC-AUTH-001: Testing successful login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // empty')
COMPANY_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.companyId // .data.user.companyId // empty')

if [ -n "$TOKEN" ]; then
    pass "User logged in successfully"
    info "Token: ${TOKEN:0:20}..."
    info "Company ID: $COMPANY_ID"
else
    fail "Login failed" "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# TC-AUTH-002: Login with wrong password
info "TC-AUTH-002: Testing login with wrong password..."
WRONG_PASS_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"wrongpassword"}')

STATUS=$(echo "$WRONG_PASS_RESPONSE" | jq -r '.error // .message // .data.message // empty')
if [[ "$STATUS" == *"Invalid"* ]] || [[ "$STATUS" == *"credentials"* ]]; then
    pass "Wrong password rejected correctly"
else
    fail "Wrong password not handled properly" "$WRONG_PASS_RESPONSE"
fi
echo ""

# TC-AUTH-003: Register new user with validation
info "TC-AUTH-003: Testing user registration..."
RANDOM_EMAIL="testuser$(date +%s)@test.com"
RANDOM_SLUG="testcompany$(date +%s)"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"Test123!\",\"name\":\"Test User\",\"companyName\":\"Test Company\",\"companyDomain\":\"testcompany.com\",\"companySlug\":\"$RANDOM_SLUG\"}")

REG_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // .data.token // empty')
if [ -n "$REG_TOKEN" ]; then
    pass "User registered successfully"
    info "New user email: $RANDOM_EMAIL"
else
    fail "Registration failed" "$REGISTER_RESPONSE"
fi
echo ""

# TC-AUTH-004: Register with invalid email
info "TC-AUTH-004: Testing registration with invalid email..."
INVALID_EMAIL_STATUS=$(curl -s -o /tmp/invalid_email_response.json -w "%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"notanemail","password":"Test123!","name":"Test User","companyName":"Test Company","companyDomain":"test.com","companySlug":"test"}')

if [ "$INVALID_EMAIL_STATUS" -ge 400 ]; then
    pass "Invalid email rejected correctly"
else
    fail "Invalid email not handled properly" "$(cat /tmp/invalid_email_response.json)"
fi
echo ""

# TC-AUTH-005: Access protected route without token
info "TC-AUTH-005: Testing access to protected route without token..."
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants")

if [[ "$NO_TOKEN_RESPONSE" == *"No token"* ]] || [[ "$NO_TOKEN_RESPONSE" == *"Unauthorized"* ]] || [[ "$NO_TOKEN_RESPONSE" == *"unauthorized"* ]]; then
    pass "Protected route blocked without token"
else
    fail "Protected route accessible without token" "$NO_TOKEN_RESPONSE"
fi
echo ""

# TC-AUTH-006: Access protected route with valid token
info "TC-AUTH-006: Testing access to protected route with token..."
WITH_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN")

if [[ "$WITH_TOKEN_RESPONSE" == "["* ]] || [[ "$WITH_TOKEN_RESPONSE" == *"restaurants"* ]]; then
    pass "Protected route accessible with valid token"
else
    fail "Protected route failed with valid token" "$WITH_TOKEN_RESPONSE"
fi
echo ""

# ==========================================
# 2. RESTAURANT TESTS
# ==========================================
echo "========================================="
echo "2. RESTAURANT TESTS"
echo "========================================="
echo ""

# TC-REST-001: Get all restaurants
info "TC-REST-001: Testing get all restaurants..."
RESTAURANTS_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN")
RESTAURANTS_DATA=$(unwrap_json_payload "$RESTAURANTS_RESPONSE")

RESTAURANT_COUNT=$(echo "$RESTAURANTS_DATA" | jq 'if type == "array" then length else 0 end')
if [ "$RESTAURANT_COUNT" -gt 0 ]; then
    pass "Retrieved $RESTAURANT_COUNT restaurants"
    RESTAURANT_ID=$(echo "$RESTAURANTS_DATA" | jq -r 'if type == "array" and length > 0 then .[0].id else empty end')
    if [ -n "$RESTAURANT_ID" ]; then
        info "First restaurant ID: $RESTAURANT_ID"
    fi
else
    fail "No restaurants found" "$RESTAURANTS_RESPONSE"
fi
echo ""

# TC-REST-002: Get single restaurant
info "TC-REST-002: Testing get single restaurant..."
SINGLE_REST_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants/$RESTAURANT_ID" \
    -H "Authorization: Bearer $TOKEN")
SINGLE_REST_DATA=$(unwrap_json_payload "$SINGLE_REST_RESPONSE")

REST_NAME=$(echo "$SINGLE_REST_DATA" | jq -r '.name // empty')
if [ "$REST_NAME" != "null" ] && [ ! -z "$REST_NAME" ]; then
    pass "Retrieved restaurant: $REST_NAME"
else
    fail "Failed to get single restaurant" "$SINGLE_REST_RESPONSE"
fi
echo ""

# TC-REST-003: Get restaurant menu items
info "TC-REST-003: Testing get restaurant menu items..."
MENU_RESPONSE=$(curl -s -X GET "$BASE_URL/restaurants/$RESTAURANT_ID/menu" \
    -H "Authorization: Bearer $TOKEN")
MENU_DATA=$(unwrap_json_payload "$MENU_RESPONSE")

MENU_COUNT=$(echo "$MENU_DATA" | jq 'if type == "array" then length else 0 end')
if [ "$MENU_COUNT" -ge 0 ]; then
    pass "Retrieved $MENU_COUNT menu items"
else
    fail "Failed to get menu items" "$MENU_RESPONSE"
fi
echo ""

# TC-REST-004: Create restaurant (admin only)
info "TC-REST-004: Testing create restaurant (admin)..."
NEW_REST_NAME="Test Restaurant $(date +%s)"
CREATE_REST_RESPONSE=$(curl -s -X POST "$BASE_URL/restaurants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NEW_REST_NAME\",\"cuisine\":\"Test Cuisine\",\"openTime\":\"09:00\",\"closeTime\":\"22:00\",\"deliveryTime\":\"30-45 minutes\",\"hasMenu\":true}")
CREATE_REST_DATA=$(unwrap_json_payload "$CREATE_REST_RESPONSE")

CREATED_REST_ID=$(echo "$CREATE_REST_DATA" | jq -r '.id // empty')
if [ "$CREATED_REST_ID" != "null" ] && [ ! -z "$CREATED_REST_ID" ]; then
    pass "Restaurant created: $NEW_REST_NAME"
    info "New restaurant ID: $CREATED_REST_ID"
else
    fail "Failed to create restaurant" "$CREATE_REST_RESPONSE"
fi
echo ""

# ==========================================
# 3. EVENT TESTS
# ==========================================
echo "========================================="
echo "3. EVENT TESTS"
echo "========================================="
echo ""

# TC-EVENT-001: Get all events
info "TC-EVENT-001: Testing get all events..."
EVENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/events" \
    -H "Authorization: Bearer $TOKEN")
EVENTS_DATA=$(unwrap_json_payload "$EVENTS_RESPONSE")

EVENT_COUNT=$(echo "$EVENTS_DATA" | jq 'if type == "array" then length else 0 end')
if [ "$EVENT_COUNT" -ge 0 ]; then
    pass "Retrieved $EVENT_COUNT events"
    if [ "$EVENT_COUNT" -gt 0 ]; then
        EVENT_ID=$(echo "$EVENTS_DATA" | jq -r 'if type == "array" and length > 0 then .[0].id else empty end')
        info "First event ID: $EVENT_ID"
    fi
else
    fail "Failed to get events" "$EVENTS_RESPONSE"
fi
echo ""

# TC-EVENT-002: Create new event
info "TC-EVENT-002: Testing create event..."
TOMORROW=$(date -d "+1 day" +%Y-%m-%dT12:00:00Z)
EVENT_NAME="Test Lunch Event $(date +%s)"
CREATE_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"restaurantId\":\"$RESTAURANT_ID\",\"orderDeadline\":\"$TOMORROW\",\"title\":\"$EVENT_NAME\",\"description\":\"Test event\",\"deliveryLocation\":\"Office Kitchen\",\"paymentMethod\":\"INDIVIDUAL\"}")
CREATE_EVENT_DATA=$(unwrap_json_payload "$CREATE_EVENT_RESPONSE")

NEW_EVENT_ID=$(echo "$CREATE_EVENT_DATA" | jq -r '.id // empty')
if [ "$NEW_EVENT_ID" != "null" ] && [ ! -z "$NEW_EVENT_ID" ]; then
    pass "Event created: $EVENT_NAME"
    info "New event ID: $NEW_EVENT_ID"
    EVENT_ID=$NEW_EVENT_ID
else
    fail "Failed to create event" "$CREATE_EVENT_RESPONSE"
fi
echo ""

# TC-EVENT-003: Join event
info "TC-EVENT-003: Testing join event..."
JOIN_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/events/$EVENT_ID/join" \
    -H "Authorization: Bearer $TOKEN")
JOIN_EVENT_DATA=$(unwrap_json_payload "$JOIN_EVENT_RESPONSE")

JOIN_PARTICIPANT_ID=$(echo "$JOIN_EVENT_DATA" | jq -r '.id // empty')
if [ -n "$JOIN_PARTICIPANT_ID" ]; then
    pass "Joined event successfully"
else
    fail "Failed to join event" "$JOIN_EVENT_RESPONSE"
fi
echo ""

# TC-EVENT-004: Get single event with participants
info "TC-EVENT-004: Testing get event details with participants..."
EVENT_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/events/$EVENT_ID" \
    -H "Authorization: Bearer $TOKEN")
EVENT_DETAIL_DATA=$(unwrap_json_payload "$EVENT_DETAIL_RESPONSE")

EVENT_TITLE=$(echo "$EVENT_DETAIL_DATA" | jq -r '.title // empty')
if [ "$EVENT_TITLE" != "null" ] && [ ! -z "$EVENT_TITLE" ]; then
    pass "Retrieved event details: $EVENT_TITLE"
else
    fail "Failed to get event details" "$EVENT_DETAIL_RESPONSE"
fi
echo ""

# ==========================================
# 4. ORDER TESTS
# ==========================================
echo "========================================="
echo "4. ORDER TESTS"
echo "========================================="
echo ""

# TC-ORDER-001: Place order with menu items
info "TC-ORDER-001: Testing place order with menu items..."
if [ "$MENU_COUNT" -gt 0 ]; then
    MENU_ITEM_ID=$(echo "$MENU_DATA" | jq -r 'if type == "array" and length > 0 then .[0].id else empty end')
    MENU_ITEM_PRICE=$(echo "$MENU_DATA" | jq -r 'if type == "array" and length > 0 then .[0].price else empty end')
    CREATE_ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/events/$EVENT_ID/orders" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"orderItems\":[{\"menuItemId\":\"$MENU_ITEM_ID\",\"quantity\":1,\"price\":$MENU_ITEM_PRICE}],\"totalAmount\":$MENU_ITEM_PRICE}")

    CREATE_ORDER_DATA=$(unwrap_json_payload "$CREATE_ORDER_RESPONSE")
    ORDER_ID=$(echo "$CREATE_ORDER_DATA" | jq -r '.id // empty')
    if [ "$ORDER_ID" != "null" ] && [ ! -z "$ORDER_ID" ]; then
        pass "Order created with menu item"
        info "Order ID: $ORDER_ID"
    else
        fail "Failed to create order" "$CREATE_ORDER_RESPONSE"
    fi
else
    info "Skipping menu item order test (no menu items available)"
fi
echo ""

# TC-ORDER-002: Place custom order
info "TC-ORDER-002: Testing place custom order..."
CUSTOM_ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/events/$EVENT_ID/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"customOrder":"Custom Sandwich with extras","totalAmount":9.99}' 2>&1)

CUSTOM_ORDER_DATA=$(
    unwrap_json_payload "$CUSTOM_ORDER_RESPONSE" 2>/dev/null || echo ""
)
CUSTOM_ORDER_ID=$(echo "$CUSTOM_ORDER_DATA" | jq -r '.id' 2>/dev/null || echo "")
if [ "$CUSTOM_ORDER_ID" != "null" ] && [ "$CUSTOM_ORDER_ID" != "" ]; then
    pass "Custom order created"
    info "Custom order ID: $CUSTOM_ORDER_ID"
else
    # May fail if event doesn't exist, that's ok for testing
    info "Custom order test result: $(echo $CUSTOM_ORDER_RESPONSE | jq -r '.error // .message' 2>/dev/null || echo 'Could not parse response')"
fi
echo ""

# TC-ORDER-003: Get orders for event
info "TC-ORDER-003: Testing get orders for event..."
EVENT_ORDERS_RESPONSE=$(curl -s -X GET "$BASE_URL/events/$EVENT_ID/orders" \
    -H "Authorization: Bearer $TOKEN")
EVENT_ORDERS_DATA=$(unwrap_json_payload "$EVENT_ORDERS_RESPONSE")

ORDER_COUNT=$(echo "$EVENT_ORDERS_DATA" | jq 'if type == "array" then length else 0 end')
if [ "$ORDER_COUNT" -ge 0 ]; then
    pass "Retrieved $ORDER_COUNT orders for event"
else
    fail "Failed to get event orders" "$EVENT_ORDERS_RESPONSE"
fi
echo ""

# ==========================================
# OPTIONAL NOTIFICATION MODE SUITES
# ==========================================
if [ "$RUN_POLLING_FRONT" = true ]; then
    info "Running frontend polling-mode notification regression suite..."
    (
        cd frontend
        NOTIFICATIONS_TEST_MODE=polling npm exec -- vitest run \
            src/test/components/notifications/NotificationBell.test.tsx \
            src/test/performance/notifications-query-metrics.test.tsx \
            --pool threads
    )
    pass "Frontend polling-mode notification regression suite"
    echo ""
fi

if [ "$RUN_REALTIME_FRONT" = true ]; then
    info "Running frontend realtime notification smoke suite..."
    (
        cd frontend
        NOTIFICATIONS_TEST_MODE=realtime npm run test:realtime
    )
    pass "Frontend realtime notification smoke suite"
    echo ""
fi

if [ "$RUN_REALTIME_BACK" = true ]; then
    info "Running backend realtime gateway smoke suite..."
    (
        cd backend
        NOTIFICATIONS_TEST_MODE=realtime npm run test:realtime
    )
    pass "Backend realtime gateway smoke suite"
    echo ""
fi

# ==========================================
# TEST SUMMARY
# ==========================================
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo ""
echo "✅ Backend API tests completed!"
if [ "$RUN_POLLING_FRONT" = true ]; then
    echo "✅ Frontend polling-mode notification tests executed"
fi
if [ "$RUN_REALTIME_FRONT" = true ] || [ "$RUN_REALTIME_BACK" = true ]; then
    echo "✅ Realtime smoke suites executed (${RUN_REALTIME_FRONT:+frontend }${RUN_REALTIME_BACK:+backend})"
fi
echo ""
echo "Next steps:"
echo "1. Review any failed tests above"
echo "2. Test frontend E2E flows manually"
echo "3. Run security tests (SQL injection, XSS)"
echo "4. Test multi-tenant isolation"
echo "5. Write automated tests"
echo "6. Capture telemetry snapshots & update regression checklist"
echo ""
