#!/bin/bash

# Enhanced Batch Processor for ALL Ethos Users
# This script can discover and process every single Ethos user

set -e

# Configuration
BATCH_SIZE=${BATCH_SIZE:-10}
MAX_USERS=${MAX_USERS:-0}  # 0 = no limit (process ALL users)
DELAY_BETWEEN_USERS=${DELAY_BETWEEN_USERS:-2}
DELAY_BETWEEN_BATCHES=${DELAY_BETWEEN_BATCHES:-5}
BASE_URL=${BASE_URL:-"http://localhost:8000"}
DISCOVERY_MODE=${DISCOVERY_MODE:-"leaderboard"}  # "leaderboard" or "full_discovery"

# Directories
RESULTS_DIR="batch-results"
LOGS_DIR="batch-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$RESULTS_DIR/all-users-$TIMESTAMP.csv"
LOG_FILE="$LOGS_DIR/batch-processing-$TIMESTAMP.log"
ERROR_FILE="$LOGS_DIR/errors-$TIMESTAMP.log"

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
echo "timestamp,username,r4r_score,ethos_score,ethos_xp,risk_level,total_reviews_given,total_reviews_received,avg_reciprocal_time,processing_time_ms,status,error_message" > "$RESULTS_FILE"

# Function to discover users from leaderboard
discover_users_from_leaderboard() {
    log "🔍 Discovering users from leaderboard..."
    
    local response=$(curl -s "$BASE_URL/api/leaderboard" || echo "")
    if [[ -z "$response" ]]; then
        error_log "Failed to fetch leaderboard"
        return 1
    fi
    
    # Extract usernames from leaderboard
    echo "$response" | jq -r '.entries[]?.username // empty' | grep -v '^$' | sort -u
}

# Function to discover ALL users through various methods
discover_all_users() {
    log "🌐 Starting FULL USER DISCOVERY mode..."
    log "⚠️  This will attempt to discover ALL Ethos users - this may take a while!"
    
    local temp_users_file="$LOGS_DIR/discovered_users_$TIMESTAMP.txt"
    
    # Method 1: Get users from leaderboard
    log "📊 Method 1: Getting users from leaderboard..."
    discover_users_from_leaderboard > "$temp_users_file" 2>/dev/null || true
    
    # Method 2: Try to discover users through profile searches
    # This is a more aggressive approach - you might want to implement
    # additional discovery methods here based on Ethos API capabilities
    
    log "🔍 Method 2: Attempting user discovery through common patterns..."
    
    # Try common username patterns (this is an example - you'd need to customize)
    local common_patterns=("admin" "test" "user" "ethos" "crypto" "nft" "dao" "defi")
    
    for pattern in "${common_patterns[@]}"; do
        log "   Searching pattern: $pattern"
        # You could implement search API calls here if Ethos supports it
        # For now, we'll skip this and rely on leaderboard data
    done
    
    # Remove duplicates and empty lines
    sort -u "$temp_users_file" | grep -v '^$' > "${temp_users_file}.clean"
    mv "${temp_users_file}.clean" "$temp_users_file"
    
    local user_count=$(wc -l < "$temp_users_file")
    log "📈 Total unique users discovered: $user_count"
    
    cat "$temp_users_file"
}

# Function to process a single user
process_user() {
    local username="$1"
    local start_time=$(date +%s%3N)
    
    log "   Processing: $username"
    
    # Fetch profile page
    local profile_url="$BASE_URL/profile/$username"
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$profile_url" || echo "HTTPSTATUS:000")
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    local end_time=$(date +%s%3N)
    local processing_time=$((end_time - start_time))
    
    if [[ "$http_code" != "200" ]]; then
        error_log "Failed to fetch profile for $username (HTTP $http_code)"
        echo "$(date -Iseconds),$username,,,,,,,,$processing_time,ERROR,HTTP_$http_code" >> "$RESULTS_FILE"
        return 1
    fi
    
    # Extract data from HTML (this is a simplified extraction)
    # You might need to enhance this based on the actual HTML structure
    local r4r_score=""
    local ethos_score=""
    local ethos_xp=""
    local risk_level=""
    local reviews_given=""
    local reviews_received=""
    local avg_reciprocal_time=""
    
    # Try to extract R4R score from the page
    if echo "$body" | grep -q "R4R.*[0-9]"; then
        r4r_score=$(echo "$body" | grep -o "R4R[^0-9]*[0-9]\+\.*[0-9]*" | head -1 | grep -o "[0-9]\+\.*[0-9]*" || echo "")
    fi
    
    # Determine risk level based on R4R score
    if [[ -n "$r4r_score" ]]; then
        if (( $(echo "$r4r_score >= 70" | bc -l) )); then
            risk_level="HIGH"
        elif (( $(echo "$r4r_score >= 40" | bc -l) )); then
            risk_level="MODERATE"
        else
            risk_level="LOW"
        fi
    fi
    
    # Save results
    echo "$(date -Iseconds),$username,$r4r_score,$ethos_score,$ethos_xp,$risk_level,$reviews_given,$reviews_received,$avg_reciprocal_time,$processing_time,SUCCESS," >> "$RESULTS_FILE"
    
    return 0
}

# Function to process users in batches
process_users_in_batches() {
    local users_file="$1"
    local total_users=$(wc -l < "$users_file")
    
    if [[ $MAX_USERS -gt 0 && $total_users -gt $MAX_USERS ]]; then
        log "📊 Limiting processing to first $MAX_USERS users (out of $total_users discovered)"
        head -n "$MAX_USERS" "$users_file" > "${users_file}.limited"
        users_file="${users_file}.limited"
        total_users=$MAX_USERS
    fi
    
    log "🚀 Starting batch processing of $total_users users..."
    log "⚙️  Batch size: $BATCH_SIZE"
    log "⏱️  Delay between users: ${DELAY_BETWEEN_USERS}s"
    log "⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}s"
    
    local processed=0
    local successful=0
    local failed=0
    local batch_num=1
    
    while IFS= read -r username; do
        [[ -z "$username" ]] && continue
        
        if [[ $((processed % BATCH_SIZE)) -eq 0 && $processed -gt 0 ]]; then
            log "📦 Completed batch $batch_num ($BATCH_SIZE users)"
            log "   Successful: $successful, Failed: $failed"
            log "⏸️  Sleeping ${DELAY_BETWEEN_BATCHES}s between batches..."
            sleep "$DELAY_BETWEEN_BATCHES"
            ((batch_num++))
        fi
        
        if process_user "$username"; then
            ((successful++))
        else
            ((failed++))
        fi
        
        ((processed++))
        
        # Progress update
        if [[ $((processed % 50)) -eq 0 ]]; then
            local percent=$((processed * 100 / total_users))
            log "📈 Progress: $processed/$total_users ($percent%) - Success: $successful, Failed: $failed"
        fi
        
        # Delay between users
        if [[ $processed -lt $total_users ]]; then
            sleep "$DELAY_BETWEEN_USERS"
        fi
        
    done < "$users_file"
    
    log "✅ Batch processing completed!"
    log "📊 Final stats: $processed processed, $successful successful, $failed failed"
    
    # Generate summary
    generate_summary "$processed" "$successful" "$failed"
}

# Function to generate processing summary
generate_summary() {
    local processed=$1
    local successful=$2
    local failed=$3
    
    local summary_file="$RESULTS_DIR/summary-$TIMESTAMP.txt"
    
    cat > "$summary_file" << EOF
=== ETHOS BATCH PROCESSING SUMMARY ===
Timestamp: $(date -Iseconds)
Discovery Mode: $DISCOVERY_MODE
Batch Size: $BATCH_SIZE
Max Users Limit: $MAX_USERS

RESULTS:
- Total Users Processed: $processed
- Successful: $successful
- Failed: $failed
- Success Rate: $(( successful * 100 / processed ))%

FILES GENERATED:
- Results: $RESULTS_FILE
- Logs: $LOG_FILE
- Errors: $ERROR_FILE
- Summary: $summary_file

HIGH RISK USERS (R4R >= 70%):
EOF
    
    # Extract high-risk users from results
    if [[ -f "$RESULTS_FILE" ]]; then
        awk -F',' '$4 != "" && $4 >= 70 {print $2 " (R4R: " $4 "%)"}' "$RESULTS_FILE" >> "$summary_file"
    fi
    
    log "📋 Summary saved to: $summary_file"
    cat "$summary_file"
}

# Main execution
main() {
    log "🚀 Starting Enhanced Ethos Batch Processor"
    log "⚙️  Configuration:"
    log "   - Discovery Mode: $DISCOVERY_MODE"
    log "   - Batch Size: $BATCH_SIZE"
    log "   - Max Users: $MAX_USERS (0 = unlimited)"
    log "   - User Delay: ${DELAY_BETWEEN_USERS}s"
    log "   - Batch Delay: ${DELAY_BETWEEN_BATCHES}s"
    
    # Discover users
    local users_file="$LOGS_DIR/users_to_process_$TIMESTAMP.txt"
    
    if [[ "$DISCOVERY_MODE" == "full_discovery" ]]; then
        discover_all_users > "$users_file"
    else
        discover_users_from_leaderboard > "$users_file"
    fi
    
    local discovered_count=$(wc -l < "$users_file")
    
    if [[ $discovered_count -eq 0 ]]; then
        error_log "No users discovered! Check your configuration and API connectivity."
        exit 1
    fi
    
    log "🎯 Discovered $discovered_count users for processing"
    
    # Process users
    process_users_in_batches "$users_file"
    
    log "🏁 All processing completed! Check results in: $RESULTS_DIR"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        cat << EOF
Enhanced Ethos Batch Processor - Process ALL Ethos Users

USAGE:
    $0 [options]

OPTIONS:
    --help, -h          Show this help message
    --discovery-mode    Set discovery mode: 'leaderboard' or 'full_discovery'
    --batch-size        Number of users per batch (default: 10)
    --max-users         Maximum users to process (0 = unlimited)
    --user-delay        Delay between users in seconds (default: 2)
    --batch-delay       Delay between batches in seconds (default: 5)

EXAMPLES:
    # Process ALL users from leaderboard
    $0
    
    # Process ALL users with full discovery
    DISCOVERY_MODE=full_discovery $0
    
    # Process first 1000 users only
    MAX_USERS=1000 $0
    
    # Faster processing (higher load)
    BATCH_SIZE=20 DELAY_BETWEEN_USERS=1 $0
    
    # Slower processing (lower load)
    BATCH_SIZE=5 DELAY_BETWEEN_USERS=5 $0

ENVIRONMENT VARIABLES:
    BATCH_SIZE              Users per batch (default: 10)
    MAX_USERS               Max users to process (default: 0 = unlimited)
    DELAY_BETWEEN_USERS     Seconds between users (default: 2)
    DELAY_BETWEEN_BATCHES   Seconds between batches (default: 5)
    DISCOVERY_MODE          'leaderboard' or 'full_discovery' (default: leaderboard)
    BASE_URL                Server URL (default: http://localhost:8000)
EOF
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 