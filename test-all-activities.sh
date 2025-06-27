#!/bin/bash

# Test script to fetch ALL activities and count unique users
# This will show us the full potential of activity-based discovery

set -e

ETHOS_API_URL="https://api.ethos.network/api/v2"
ACTIVITY_DAYS=${ACTIVITY_DAYS:-1}
ACTIVITY_LIMIT=${ACTIVITY_LIMIT:-1000}  # Max per request
ACTIVITY_TYPES=${ACTIVITY_TYPES:-"review,vouch,unvouch,attestation"}

echo "🧪 TESTING ALL ACTIVITIES DISCOVERY"
echo "===================================="
echo "📅 Days lookback: $ACTIVITY_DAYS"
echo "📊 Activity limit per request: $ACTIVITY_LIMIT"
echo "🏷️  Activity types: $ACTIVITY_TYPES"
echo ""

# Convert activity types to JSON array
activity_array=$(echo "$ACTIVITY_TYPES" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

# Initialize pagination
offset=0
total_fetched=0
total_available=0
page=1
all_users_file="temp_all_users.txt"
> "$all_users_file"  # Clear file

echo "🔄 Starting pagination to fetch ALL activities..."

while true; do
    echo "📄 Fetching page $page (offset: $offset)..."
    
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
    "offset": $offset
}
EOF
)
    
    # Fetch activities
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        "$ETHOS_API_URL/activities/feed" || echo "")
    
    if [[ -z "$response" ]]; then
        echo "❌ Failed to fetch page $page"
        break
    fi
    
    # Validate JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo "❌ Invalid JSON on page $page"
        break
    fi
    
    # Extract counts
    page_total=$(echo "$response" | jq '.total // 0')
    page_fetched=$(echo "$response" | jq '.values | length // 0')
    
    if [[ $page_fetched -eq 0 ]]; then
        echo "📄 No more activities on page $page"
        break
    fi
    
    # Update totals
    total_available=$page_total
    total_fetched=$((total_fetched + page_fetched))
    
    echo "   📊 Page $page: $page_fetched activities"
    echo "   📈 Progress: $total_fetched / $total_available ($(( total_fetched * 100 / total_available ))%)"
    
    # Extract users from this page and append to file
    echo "$response" | jq -r '
        .values[]? | 
        select(. != null) | 
        [
            (.author.userkey // empty),
            (.subject.userkey // empty)
        ][] | 
        select(. != null and . != "")
    ' >> "$all_users_file" 2>/dev/null || true
    
    # Check if done
    if [[ $total_fetched -ge $total_available ]]; then
        echo "📄 All activities fetched!"
        break
    fi
    
    # Next page
    offset=$((offset + ACTIVITY_LIMIT))
    ((page++))
    
    # Rate limiting
    sleep 0.5
done

echo ""
echo "📊 FINAL RESULTS:"
echo "   Total activities available: $total_available"
echo "   Total activities fetched: $total_fetched"
echo "   Pages processed: $page"

# Count unique users
if [[ -f "$all_users_file" ]]; then
    total_user_mentions=$(wc -l < "$all_users_file" | tr -d ' ')
    unique_users=$(sort -u "$all_users_file" | wc -l | tr -d ' ')
    
    echo "   Total user mentions: $total_user_mentions"
    echo "   Unique active users: $unique_users"
    echo ""
    
    echo "👥 SAMPLE OF DISCOVERED USERS:"
    sort -u "$all_users_file" | head -20 | while read userkey; do
        echo "   - $userkey"
    done
    
    if [[ $unique_users -gt 20 ]]; then
        echo "   ... and $((unique_users - 20)) more unique users"
    fi
    
    # Save unique users for potential use
    sort -u "$all_users_file" > "discovered_all_users_$(date +%Y%m%d_%H%M%S).txt"
    echo ""
    echo "💾 Saved unique users to: discovered_all_users_$(date +%Y%m%d_%H%M%S).txt"
    
    # Cleanup
    rm -f "$all_users_file"
else
    echo "   No users discovered"
fi

echo ""
echo "🎯 ACTIVITY-BASED DISCOVERY POTENTIAL:"
echo "   From $total_fetched activities in last $ACTIVITY_DAYS day(s)"
echo "   We can discover $unique_users unique active users"
echo "   This is $(( unique_users * 100 / 74 ))x more than the 74 users from 50 activities!"
echo ""
echo "🚀 Ready to process all these users with:"
echo "   ./activity-batch-processor.sh" 