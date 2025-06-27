#!/bin/bash

# Test script for Ethos Activity API
# This validates the API and shows sample data before running the full batch processor

set -e

ETHOS_API_URL="https://api.ethos.network/api/v2"
ACTIVITY_DAYS=${ACTIVITY_DAYS:-1}
ACTIVITY_LIMIT=${ACTIVITY_LIMIT:-50}  # Small limit for testing
ACTIVITY_TYPES=${ACTIVITY_TYPES:-"review,vouch,unvouch,attestation"}

echo "🧪 TESTING ETHOS ACTIVITY API"
echo "================================"
echo "📅 Days lookback: $ACTIVITY_DAYS"
echo "📊 Activity limit: $ACTIVITY_LIMIT"
echo "🏷️  Activity types: $ACTIVITY_TYPES"
echo ""

# Convert activity types to JSON array
activity_array=$(echo "$ACTIVITY_TYPES" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

# Create JSON payload
json_payload=$(cat << EOF
{
    "filter": [$activity_array],
    "dayRange": $ACTIVITY_DAYS,
    "orderBy": {
        "field": "timestamp",
        "direction": "desc"
    },
    "limit": $ACTIVITY_LIMIT,
    "offset": 0
}
EOF
)

echo "📡 Calling Ethos Activity API..."
echo "Endpoint: $ETHOS_API_URL/activities/feed"
echo "Payload: $json_payload"
echo ""

# Make API call
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$ETHOS_API_URL/activities/feed" || echo "")

if [[ -z "$response" ]]; then
    echo "❌ FAILED: No response from Ethos API"
    exit 1
fi

echo "📥 Raw API Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

# Validate JSON
if ! echo "$response" | jq . >/dev/null 2>&1; then
    echo "❌ FAILED: Invalid JSON response"
    exit 1
fi

# Extract stats
total_activities=$(echo "$response" | jq '.total // 0')
fetched_activities=$(echo "$response" | jq '.values | length // 0')

echo "📊 ACTIVITY STATS:"
echo "   Total available: $total_activities"
echo "   Fetched: $fetched_activities"
echo ""

if [[ $fetched_activities -eq 0 ]]; then
    echo "⚠️  WARNING: No activities found for the specified criteria"
    echo "   Try increasing ACTIVITY_DAYS or changing ACTIVITY_TYPES"
    exit 1
fi

# Extract sample users
echo "👥 EXTRACTING USERS FROM ACTIVITIES..."

# Extract author and subject userkeys
users=$(echo "$response" | jq -r '
    .values[]? | 
    select(. != null) | 
    [
        (.author.userkey // empty),
        (.subject.userkey // empty)
    ][] | 
    select(. != null and . != "")
' | sort -u 2>/dev/null || echo "")

user_count=$(echo "$users" | wc -l | tr -d ' ')

echo "📈 Discovered $user_count unique active users"
echo ""

if [[ $user_count -gt 0 ]]; then
    echo "👀 SAMPLE USERS:"
    echo "$users" | head -10 | while read userkey; do
        echo "   - $userkey"
    done
    
    if [[ $user_count -gt 10 ]]; then
        echo "   ... and $((user_count - 10)) more"
    fi
    echo ""
fi

# Show sample activities
echo "🔍 SAMPLE ACTIVITIES:"
echo "$response" | jq -r '.values[0:3][]? | 
    "📝 " + (.activityType // "unknown") + 
    " by " + (.author.userkey // "unknown") + 
    " → " + (.subject.userkey // "unknown") + 
    " at " + (.timestamp // "unknown")
' 2>/dev/null || echo "No activities to display"

echo ""
echo "✅ ETHOS ACTIVITY API TEST COMPLETED!"
echo ""
echo "🚀 Ready to run the full batch processor:"
echo "   ./activity-batch-processor.sh"
echo ""
echo "📋 Configuration options:"
echo "   ACTIVITY_DAYS=$ACTIVITY_DAYS ./activity-batch-processor.sh"
echo "   ACTIVITY_TYPES=review ./activity-batch-processor.sh"
echo "   MAX_USERS=100 ./activity-batch-processor.sh" 