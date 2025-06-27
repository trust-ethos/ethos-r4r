#!/bin/bash

# Activity-Based Batch Processor for Ethos Users
# Uses Ethos Activity API to find real, active users from recent activity

set -e

# Configuration
BATCH_SIZE=${BATCH_SIZE:-15}
MAX_USERS=${MAX_USERS:-0}  # 0 = no limit
DELAY_BETWEEN_USERS=${DELAY_BETWEEN_USERS:-2}
DELAY_BETWEEN_BATCHES=${DELAY_BETWEEN_BATCHES:-5}
BASE_URL=${BASE_URL:-"http://localhost:8000"}
ETHOS_API_URL="https://api.ethos.network/api/v2"

# Activity discovery settings
ACTIVITY_DAYS=${ACTIVITY_DAYS:-1}  # Look back 1 day by default
ACTIVITY_LIMIT=${ACTIVITY_LIMIT:-1000}  # Max activities per request (API limit)
ACTIVITY_TYPES=${ACTIVITY_TYPES:-"review,vouch,unvouch,attestation"}  # Comma-separated
FETCH_ALL_ACTIVITIES=${FETCH_ALL_ACTIVITIES:-true}  # Fetch all available activities

# Directories
RESULTS_DIR="activity-batch-results"
LOGS_DIR="activity-batch-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$RESULTS_DIR/activity-users-$TIMESTAMP.csv"
LOG_FILE="$LOGS_DIR/processing-$TIMESTAMP.log"
ERROR_FILE="$LOGS_DIR/errors-$TIMESTAMP.log"
ACTIVITY_FILE="$LOGS_DIR/activities-$TIMESTAMP.json"
USERS_FILE="$LOGS_DIR/discovered-users-$TIMESTAMP.txt"

# Create directories
mkdir -p "$RESULTS_DIR" "$LOGS_DIR"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_FILE" >&2
}

# Initialize CSV file
echo "timestamp,username,userkey,r4r_score,ethos_score,ethos_xp,risk_level,total_reviews_given,total_reviews_received,avg_reciprocal_time,processing_time_ms,status,error_message,activity_types" > "$RESULTS_FILE"

# Function to fetch recent activities from Ethos API
fetch_recent_activities() {
    log "🔍 Fetching recent activities from Ethos API..."
    log "   📅 Looking back: $ACTIVITY_DAYS days"
    log "   📊 Activity limit per request: $ACTIVITY_LIMIT"
    log "   🏷️  Activity types: $ACTIVITY_TYPES"
    log "   🔄 Fetch all activities: $FETCH_ALL_ACTIVITIES"
    
    # Convert activity types to JSON array
    local activity_array=$(echo "$ACTIVITY_TYPES" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
    
    # Initialize variables for pagination
    local all_activities='{"values": [], "total": 0, "limit": 0, "offset": 0}'
    local offset=0
    local total_fetched=0
    local total_available=0
    local page=1
    
    while true; do
        log "📄 Fetching page $page (offset: $offset)..."
        
        # Create JSON payload for current page
        local json_payload=$(cat << EOF
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
        
        # Fetch activities from Ethos API
        local response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$json_payload" \
            "$ETHOS_API_URL/activities/feed" || echo "")
        
        if [[ -z "$response" ]]; then
            error_log "Failed to fetch activities from Ethos API on page $page"
            break
        fi
        
        # Check if response is valid JSON
        if ! echo "$response" | jq . >/dev/null 2>&1; then
            error_log "Invalid JSON response from Ethos API on page $page"
            break
        fi
        
        # Extract counts for this page
        local page_total=$(echo "$response" | jq '.total // 0')
        local page_fetched=$(echo "$response" | jq '.values | length // 0')
        
        if [[ $page_fetched -eq 0 ]]; then
            log "📄 No more activities on page $page, stopping pagination"
            break
        fi
        
        # Update totals
        total_available=$page_total
        total_fetched=$((total_fetched + page_fetched))
        
        log "   📊 Page $page: fetched $page_fetched activities"
        log "   📈 Total so far: $total_fetched / $total_available"
        
        # Merge activities into all_activities
        if [[ $page -eq 1 ]]; then
            # First page - use as base
            all_activities="$response"
        else
            # Subsequent pages - merge values arrays
            all_activities=$(jq -s '
                {
                    "values": (.[0].values + .[1].values),
                    "total": .[1].total,
                    "limit": .[1].limit,
                    "offset": .[1].offset
                }
            ' <(echo "$all_activities") <(echo "$response"))
        fi
        
        # Check if we should continue
        if [[ "$FETCH_ALL_ACTIVITIES" != "true" ]]; then
            log "📄 Single page mode - stopping after page 1"
            break
        fi
        
        if [[ $total_fetched -ge $total_available ]]; then
            log "📄 All activities fetched ($total_fetched / $total_available)"
            break
        fi
        
        # Update offset for next page
        offset=$((offset + ACTIVITY_LIMIT))
        ((page++))
        
        # Rate limiting between pages
        sleep 1
    done
    
    # Save raw response for debugging
    echo "$all_activities" > "$ACTIVITY_FILE"
    
    log "✅ Successfully fetched all activities"
    log "   📊 Total available: $total_available"
    log "   📥 Total fetched: $total_fetched"
    log "   📄 Pages processed: $page"
    
    echo "$all_activities"
}

# Function to extract unique users from activities
extract_users_from_activities() {
    local activities_json="$1"
    
    log "👥 Extracting unique users from activities..."
    
    # Extract both authors and subjects from activities
    local temp_users_file="$LOGS_DIR/temp_users_$TIMESTAMP.txt"
    
    # Extract author userkeys and subjects
    echo "$activities_json" | jq -r '
        .values[]? | 
        select(. != null) | 
        [
            (.author.userkey // empty),
            (.subject.userkey // empty)
        ][] | 
        select(. != null and . != "")
    ' | sort -u > "$temp_users_file" 2>/dev/null || true
    
    # Also extract any other user references
    echo "$activities_json" | jq -r '
        .values[]? |
        select(. != null) |
        .. | 
        select(type == "object") |
        select(has("userkey")) |
        .userkey
    ' | sort -u >> "$temp_users_file" 2>/dev/null || true
    
    # Remove duplicates and empty lines
    sort -u "$temp_users_file" | grep -v '^$' > "$USERS_FILE"
    rm -f "$temp_users_file"
    
    local user_count=$(wc -l < "$USERS_FILE" 2>/dev/null || echo "0")
    log "📈 Discovered $user_count unique active users"
    
    # Show sample of discovered users
    if [[ $user_count -gt 0 ]]; then
        log "👀 Sample users:"
        head -5 "$USERS_FILE" | while read userkey; do
            log "   - $userkey"
        done
        if [[ $user_count -gt 5 ]]; then
            log "   ... and $((user_count - 5)) more"
        fi
    fi
    
    return 0
}

# Function to get username from userkey using your local API
get_username_from_userkey() {
    local userkey="$1"
    
    # Try to get username from your leaderboard first (fastest)
    local username=$(curl -s "$BASE_URL/api/leaderboard" | \
        jq -r --arg userkey "$userkey" \
        '.entries[]? | select(.userkey == $userkey) | .username' 2>/dev/null || echo "")
    
    if [[ -n "$username" ]]; then
        echo "$username"
        return 0
    fi
    
    # If not found in leaderboard, try to extract from userkey
    # Userkey format is often like "service:x.com:1234567890" or similar
    # Extract the last part which might be a Twitter ID or username
    local extracted=$(echo "$userkey" | grep -oE '[^:]+$' || echo "")
    
    if [[ -n "$extracted" && ${#extracted} -ge 3 ]]; then
        echo "$extracted"
        return 0
    fi
    
    # Return userkey as fallback
    echo "$userkey"
    return 1
}

# Function to process a single user
process_user() {
    local userkey="$1"
    local start_time=$(date +%s%3N)
    
    # Get username from userkey
    local username=$(get_username_from_userkey "$userkey")
    
    log "   Processing: $username ($userkey)"
    
    # Try profile analysis using username
    local profile_url="$BASE_URL/profile/$username"
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time 20 "$profile_url" || echo "HTTPSTATUS:000")
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    local end_time=$(date +%s%3N)
    local processing_time=$((end_time - start_time))
    
    # Handle different HTTP responses
    case "$http_code" in
        "200")
            # Success - user exists
            ;;
        "404")
            # User doesn't exist - try with userkey directly
            log "     Username not found, trying userkey..."
            local profile_url2="$BASE_URL/profile/$userkey"
            local response2=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time 20 "$profile_url2" || echo "HTTPSTATUS:000")
            local http_code2=$(echo "$response2" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
            
            if [[ "$http_code2" != "200" ]]; then
                echo "$(date -Iseconds),$username,$userkey,,,,,,,,$processing_time,USER_NOT_FOUND,Profile not accessible,activity_based" >> "$RESULTS_FILE"
                return 0
            else
                response="$response2"
                body=$(echo "$response2" | sed -E 's/HTTPSTATUS:[0-9]*$//')
            fi
            ;;
        "000"|"")
            # Network error
            error_log "Network error for $username"
            echo "$(date -Iseconds),$username,$userkey,,,,,,,,$processing_time,NETWORK_ERROR,Connection failed,activity_based" >> "$RESULTS_FILE"
            return 1
            ;;
        *)
            # Other HTTP error
            error_log "HTTP $http_code for $username"
            echo "$(date -Iseconds),$username,$userkey,,,,,,,,$processing_time,HTTP_ERROR,HTTP_$http_code,activity_based" >> "$RESULTS_FILE"
            return 1
            ;;
    esac
    
    # Extract comprehensive data from profile
    local r4r_score=""
    local ethos_score=""
    local ethos_xp=""
    local risk_level=""
    local reviews_given=""
    local reviews_received=""
    local avg_reciprocal_time=""
    
    # Enhanced data extraction
    if echo "$body" | grep -q "R4R"; then
        r4r_score=$(echo "$body" | grep -oE 'R4R[^0-9]*([0-9]+\.?[0-9]*)' | head -1 | grep -oE '[0-9]+\.?[0-9]*' || echo "")
    fi
    
    if echo "$body" | grep -q "Ethos Score"; then
        ethos_score=$(echo "$body" | grep -oE 'Ethos Score[^0-9]*([0-9]+\.?[0-9]*)' | head -1 | grep -oE '[0-9]+\.?[0-9]*' || echo "")
    fi
    
    if echo "$body" | grep -q "XP"; then
        ethos_xp=$(echo "$body" | grep -oE 'XP[^0-9]*([0-9]+)' | head -1 | grep -oE '[0-9]+' || echo "")
    fi
    
    # Extract review counts
    if echo "$body" | grep -q "Reviews Given"; then
        reviews_given=$(echo "$body" | grep -oE 'Reviews Given[^0-9]*([0-9]+)' | head -1 | grep -oE '[0-9]+' || echo "")
    fi
    
    if echo "$body" | grep -q "Reviews Received"; then
        reviews_received=$(echo "$body" | grep -oE 'Reviews Received[^0-9]*([0-9]+)' | head -1 | grep -oE '[0-9]+' || echo "")
    fi
    
    # Determine risk level
    if [[ -n "$r4r_score" && "$r4r_score" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        if (( $(echo "$r4r_score >= 70" | bc -l 2>/dev/null || echo "0") )); then
            risk_level="HIGH"
        elif (( $(echo "$r4r_score >= 40" | bc -l 2>/dev/null || echo "0") )); then
            risk_level="MODERATE"
        else
            risk_level="LOW"
        fi
    fi
    
    # Save comprehensive results
    echo "$(date -Iseconds),$username,$userkey,$r4r_score,$ethos_score,$ethos_xp,$risk_level,$reviews_given,$reviews_received,$avg_reciprocal_time,$processing_time,SUCCESS,,activity_based" >> "$RESULTS_FILE"
    
    return 0
}

# Function to process users in batches
process_users_in_batches() {
    local users_file="$USERS_FILE"
    local total_users=$(wc -l < "$users_file" 2>/dev/null || echo "0")
    
    if [[ $total_users -eq 0 ]]; then
        error_log "No users found to process"
        return 1
    fi
    
    if [[ $MAX_USERS -gt 0 && $total_users -gt $MAX_USERS ]]; then
        log "📊 Limiting to first $MAX_USERS users (out of $total_users discovered)"
        head -n "$MAX_USERS" "$users_file" > "${users_file}.limited"
        users_file="${users_file}.limited"
        total_users=$MAX_USERS
    fi
    
    log "🚀 Starting batch processing of $total_users active users..."
    log "⚙️  Processing configuration:"
    log "   - Total users to process: $total_users"
    log "   - Batch size: $BATCH_SIZE"
    log "   - Delay between users: ${DELAY_BETWEEN_USERS}s"
    log "   - Delay between batches: ${DELAY_BETWEEN_BATCHES}s"
    
    local processed=0
    local successful=0
    local failed=0
    local not_found=0
    local batch_num=1
    
    while IFS= read -r userkey; do
        [[ -z "$userkey" ]] && continue
        
        # Batch management
        if [[ $((processed % BATCH_SIZE)) -eq 0 && $processed -gt 0 ]]; then
            log "📦 Completed batch $batch_num ($BATCH_SIZE users)"
            log "   ✅ Successful: $successful | ❌ Failed: $failed | 👻 Not Found: $not_found"
            log "⏸️  Batch break (${DELAY_BETWEEN_BATCHES}s)..."
            sleep "$DELAY_BETWEEN_BATCHES"
            ((batch_num++))
        fi
        
        # Process user
        if process_user "$userkey"; then
            # Check if user was found or not
            if tail -n 1 "$RESULTS_FILE" | grep -q "USER_NOT_FOUND"; then
                ((not_found++))
            else
                ((successful++))
            fi
        else
            ((failed++))
        fi
        
        ((processed++))
        
        # Progress updates
        if [[ $((processed % 50)) -eq 0 ]]; then
            local percent=$((processed * 100 / total_users))
            log "📈 Progress: $processed/$total_users ($percent%)"
            log "   ✅ Success: $successful | ❌ Failed: $failed | 👻 Not Found: $not_found"
        fi
        
        # Rate limiting
        if [[ $processed -lt $total_users ]]; then
            sleep "$DELAY_BETWEEN_USERS"
        fi
        
    done < "$users_file"
    
    log "🎉 ACTIVITY-BASED PROCESSING COMPLETED!"
    log "📊 Final Statistics:"
    log "   - Total Processed: $processed"
    log "   - Successful: $successful"
    log "   - Failed: $failed"
    log "   - Not Found: $not_found"
    log "   - Success Rate: $(( successful * 100 / processed ))%"
    
    generate_activity_report "$processed" "$successful" "$failed" "$not_found"
}

# Generate comprehensive report
generate_activity_report() {
    local processed=$1
    local successful=$2
    local failed=$3
    local not_found=$4
    
    local report_file="$RESULTS_DIR/ACTIVITY_REPORT_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
=== ETHOS ACTIVITY-BASED USER ANALYSIS REPORT ===
Generated: $(date -Iseconds)
Processing Duration: Started at $TIMESTAMP

ACTIVITY CONFIGURATION:
- Activity Days Lookback: $ACTIVITY_DAYS
- Activity Types: $ACTIVITY_TYPES
- Activity Limit: $ACTIVITY_LIMIT

PROCESSING RESULTS:
- Total Active Users Discovered: $(wc -l < "$USERS_FILE" 2>/dev/null || echo "0")
- Total Users Processed: $processed
- Successful Analyses: $successful
- Failed Analyses: $failed
- Users Not Found: $not_found
- Overall Success Rate: $(( successful * 100 / processed ))%

FILES GENERATED:
- Complete Results: $RESULTS_FILE
- Processing Log: $LOG_FILE
- Error Log: $ERROR_FILE
- Raw Activities: $ACTIVITY_FILE
- Discovered Users: $USERS_FILE
- This Report: $report_file

=== HIGH RISK USERS (R4R ≥ 70%) ===
EOF
    
    # Extract high-risk users from results
    if [[ -f "$RESULTS_FILE" ]]; then
        awk -F',' '$4 != "" && $4 >= 70 {print $2 " (" $3 ") - R4R: " $4 "%"}' "$RESULTS_FILE" >> "$report_file"
        
        echo "" >> "$report_file"
        echo "=== ACTIVITY DISCOVERY EFFECTIVENESS ===" >> "$report_file"
        echo "Active users found in last $ACTIVITY_DAYS day(s) with activity types: $ACTIVITY_TYPES" >> "$report_file"
        echo "Total activities analyzed: $(jq '.total // 0' "$ACTIVITY_FILE" 2>/dev/null || echo "0")" >> "$report_file"
        
        echo "" >> "$report_file"
        echo "=== TOP R4R SCORES ===" >> "$report_file"
        awk -F',' 'NR>1 && $4 != "" {print $4 "% - " $2 " (" $3 ")"}' "$RESULTS_FILE" | sort -nr | head -20 >> "$report_file"
    fi
    
    log "📋 Activity report saved: $report_file"
    echo ""
    echo "🎯 ACTIVITY-BASED PROCESSING COMPLETE! Check these files:"
    echo "   📊 Results: $RESULTS_FILE"
    echo "   📋 Report: $report_file"
    echo "   📝 Logs: $LOG_FILE"
    echo "   🔍 Raw Activities: $ACTIVITY_FILE"
}

# Main execution
main() {
    log "🌟 STARTING ACTIVITY-BASED ETHOS USER PROCESSING"
    log "🎯 Goal: Process users active in the last $ACTIVITY_DAYS day(s)"
    log ""
    
    # Fetch recent activities from Ethos API
    local activities_json=$(fetch_recent_activities)
    if [[ -z "$activities_json" ]]; then
        error_log "Failed to fetch activities. Exiting."
        exit 1
    fi
    
    # Extract users from activities
    if ! extract_users_from_activities "$activities_json"; then
        error_log "Failed to extract users from activities. Exiting."
        exit 1
    fi
    
    local discovered_count=$(wc -l < "$USERS_FILE" 2>/dev/null || echo "0")
    
    if [[ $discovered_count -eq 0 ]]; then
        error_log "No active users discovered! Check configuration and API connectivity."
        exit 1
    fi
    
    log "🎉 Discovery phase complete: $discovered_count active users found"
    
    # Process all discovered users
    process_users_in_batches
    
    log "🏁 MISSION ACCOMPLISHED: All active users processed!"
}

# CLI handling
case "${1:-}" in
    --help|-h)
        cat << EOF
Activity-Based Ethos User Processor

USAGE: $0 [options]

This script fetches recent activities from the Ethos API and processes
all users who have been active in the specified time period.

ENVIRONMENT VARIABLES:
    BATCH_SIZE              Users per batch (default: 15)
    MAX_USERS               Max users to process (0 = unlimited, default: 0)
    DELAY_BETWEEN_USERS     Seconds between users (default: 2)
    DELAY_BETWEEN_BATCHES   Seconds between batches (default: 5)
    ACTIVITY_DAYS           Days to look back for activities (default: 1)
    ACTIVITY_LIMIT          Max activities to fetch (default: 1000)
    ACTIVITY_TYPES          Activity types to include (default: review,vouch,unvouch,attestation)

EXAMPLES:
    # Process users active in last 24 hours
    $0
    
    # Process users active in last 3 days
    ACTIVITY_DAYS=3 $0
    
    # Only process review activities from last week
    ACTIVITY_DAYS=7 ACTIVITY_TYPES=review $0
    
    # Fast processing of recent activity
    BATCH_SIZE=25 DELAY_BETWEEN_USERS=1 $0
    
    # Conservative processing
    BATCH_SIZE=10 DELAY_BETWEEN_USERS=5 MAX_USERS=100 $0

ACTIVITY TYPES:
    - review: User reviews
    - vouch: Vouching activities  
    - unvouch: Unvouching activities
    - attestation: Attestations
    - invitation-accepted: Accepted invitations
    - open-slash: Slash reports opened
    - closed-slash: Slash reports closed
    - slash: General slash activities

This approach is much more reliable than pattern-based discovery as it uses
real activity data from the Ethos network to find genuinely active users.
EOF
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 