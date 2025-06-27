#!/bin/bash

# Process ALL Ethos Users - Advanced Discovery & Processing
# This script is designed to discover and process EVERY SINGLE Ethos user

set -e

# Configuration for processing ALL users
BATCH_SIZE=${BATCH_SIZE:-15}
MAX_USERS=${MAX_USERS:-0}  # 0 = NO LIMIT (process ALL users)
DELAY_BETWEEN_USERS=${DELAY_BETWEEN_USERS:-1}
DELAY_BETWEEN_BATCHES=${DELAY_BETWEEN_BATCHES:-3}
BASE_URL=${BASE_URL:-"http://localhost:8000"}

# Advanced discovery settings
ENABLE_DEEP_DISCOVERY=${ENABLE_DEEP_DISCOVERY:-true}
ENABLE_PATTERN_DISCOVERY=${ENABLE_PATTERN_DISCOVERY:-true}
ENABLE_NETWORK_DISCOVERY=${ENABLE_NETWORK_DISCOVERY:-true}

# Directories
RESULTS_DIR="all-users-results"
LOGS_DIR="all-users-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$RESULTS_DIR/all-ethos-users-$TIMESTAMP.csv"
LOG_FILE="$LOGS_DIR/processing-$TIMESTAMP.log"
ERROR_FILE="$LOGS_DIR/errors-$TIMESTAMP.log"
DISCOVERY_FILE="$LOGS_DIR/discovered-users-$TIMESTAMP.txt"

# Create directories
mkdir -p "$RESULTS_DIR" "$LOGS_DIR"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_FILE" >&2
}

# Initialize CSV file with comprehensive headers
echo "timestamp,username,r4r_score,ethos_score,ethos_xp,risk_level,total_reviews_given,total_reviews_received,avg_reciprocal_time,processing_time_ms,status,error_message,discovery_method" > "$RESULTS_FILE"

# Advanced user discovery functions
discover_from_leaderboard() {
    log "📊 Method 1: Discovering users from leaderboard..."
    
    local response=$(curl -s "$BASE_URL/api/leaderboard" || echo "")
    if [[ -z "$response" ]]; then
        error_log "Failed to fetch leaderboard"
        return 1
    fi
    
    echo "$response" | jq -r '.entries[]?.username // empty' 2>/dev/null | grep -v '^$' | while read username; do
        if [[ -n "$username" && ${#username} -ge 3 && ${#username} -le 30 ]]; then
            echo "$username,leaderboard"
        fi
    done
}

discover_from_network_analysis() {
    if [[ "$ENABLE_NETWORK_DISCOVERY" != "true" ]]; then
        return 0
    fi
    
    log "🕸️  Method 2: Network-based user discovery..."
    log "   Analyzing review relationships to find more users..."
    
    # Get a sample of users and analyze their review networks
    local sample_users=$(curl -s "$BASE_URL/api/leaderboard" | jq -r '.entries[0:20]?.username // empty' 2>/dev/null | grep -v '^$')
    
    echo "$sample_users" | while read username; do
        if [[ -n "$username" ]]; then
            log "   Analyzing network for: $username"
            
            # Fetch profile and try to extract mentioned usernames
            local profile_response=$(curl -s --max-time 10 "$BASE_URL/profile/$username" || echo "")
            
            # Extract potential usernames from the profile (this is a heuristic approach)
            # Look for @username patterns or other user references
            echo "$profile_response" | grep -oE '@[a-zA-Z0-9_]+' | sed 's/@//' | while read found_user; do
                if [[ ${#found_user} -ge 3 && ${#found_user} -le 30 ]]; then
                    echo "$found_user,network_analysis"
                fi
            done
            
            sleep 1  # Rate limiting
        fi
    done
}

discover_from_patterns() {
    if [[ "$ENABLE_PATTERN_DISCOVERY" != "true" ]]; then
        return 0
    fi
    
    log "🔍 Method 3: Pattern-based user discovery..."
    
    # Common username patterns in crypto/web3 space
    local patterns=(
        "crypto" "nft" "defi" "dao" "web3" "ethereum" "bitcoin" "blockchain"
        "trader" "hodl" "moon" "diamond" "ape" "bear" "bull"
        "admin" "mod" "dev" "team" "official" "support"
        "alpha" "beta" "gamma" "sigma" "omega"
        "solana" "cardano" "polkadot" "chainlink"
        "test" "demo" "example" "sample"
    )
    
    local numbers=("1" "2" "3" "123" "420" "69" "777" "888" "999")
    local suffixes=("_" "er" "ist" "man" "guy" "girl" "lord" "king" "queen")
    
    for pattern in "${patterns[@]}"; do
        log "   Testing pattern: $pattern"
        
        # Test base pattern (only if >= 3 chars)
        if [[ ${#pattern} -ge 3 ]]; then
            echo "$pattern,pattern_discovery"
        fi
        
        # Test with numbers
        for num in "${numbers[@]}"; do
            local combined1="${pattern}${num}"
            local combined2="${num}${pattern}"
            if [[ ${#combined1} -ge 3 && ${#combined1} -le 30 ]]; then
                echo "$combined1,pattern_discovery"
            fi
            if [[ ${#combined2} -ge 3 && ${#combined2} -le 30 ]]; then
                echo "$combined2,pattern_discovery"
            fi
        done
        
        # Test with suffixes
        for suffix in "${suffixes[@]}"; do
            local combined="${pattern}${suffix}"
            if [[ ${#combined} -ge 3 && ${#combined} -le 30 ]]; then
                echo "$combined,pattern_discovery"
            fi
        done
    done
}

discover_from_deep_search() {
    if [[ "$ENABLE_DEEP_DISCOVERY" != "true" ]]; then
        return 0
    fi
    
    log "🏗️  Method 4: Deep discovery using existing user connections..."
    
    # This method analyzes the review data of known users to find more users
    local known_users=$(curl -s "$BASE_URL/api/leaderboard" | jq -r '.entries[0:50]?.username // empty' 2>/dev/null | grep -v '^$')
    
    echo "$known_users" | while read username; do
        if [[ -n "$username" ]]; then
            log "   Deep analysis for: $username"
            
            # Try to get review data or activity data
            local profile_url="$BASE_URL/profile/$username"
            local profile_data=$(curl -s --max-time 15 "$profile_url" || echo "")
            
            # Extract any user references from review text, comments, etc.
            # This is a heuristic approach - you might need to adjust based on actual HTML structure
            echo "$profile_data" | grep -oE 'profile/[a-zA-Z0-9_]+' | cut -d'/' -f2 | while read found_user; do
                if [[ ${#found_user} -ge 3 && ${#found_user} -le 30 ]]; then
                    echo "$found_user,deep_search"
                fi
            done
            
            sleep 2  # Rate limiting for deep analysis
        fi
    done
}

# Main user discovery function
discover_all_users() {
    log "🌐 Starting COMPREHENSIVE USER DISCOVERY..."
    log "⚠️  This will attempt to discover EVERY POSSIBLE Ethos user!"
    log "🔧 Discovery methods enabled:"
    log "   - Leaderboard: ✅ Always enabled"
    log "   - Network Analysis: $([ "$ENABLE_NETWORK_DISCOVERY" = "true" ] && echo "✅" || echo "❌")"
    log "   - Pattern Discovery: $([ "$ENABLE_PATTERN_DISCOVERY" = "true" ] && echo "✅" || echo "❌")"
    log "   - Deep Search: $([ "$ENABLE_DEEP_DISCOVERY" = "true" ] && echo "✅" || echo "❌")"
    
    local temp_discovery_file="$LOGS_DIR/temp_discovery_$TIMESTAMP.txt"
    
    # Run all discovery methods in parallel for speed
    {
        discover_from_leaderboard
        discover_from_network_analysis
        discover_from_patterns
        discover_from_deep_search
    } > "$temp_discovery_file"
    
    # Remove duplicates and clean up
    sort -u "$temp_discovery_file" | grep -v '^$' > "$DISCOVERY_FILE"
    rm "$temp_discovery_file"
    
    local total_discovered=$(wc -l < "$DISCOVERY_FILE")
    log "📈 Total unique users discovered: $total_discovered"
    
    # Show discovery breakdown
    log "📊 Discovery method breakdown:"
    cut -d',' -f2 "$DISCOVERY_FILE" | sort | uniq -c | while read count method; do
        log "   - $method: $count users"
    done
    
    # Extract just usernames for processing
    cut -d',' -f1 "$DISCOVERY_FILE"
}

# Enhanced user processing with validation
process_user() {
    local username="$1"
    local discovery_method="$2"
    local start_time=$(date +%s%3N)
    
    log "   Processing: $username (discovered via: $discovery_method)"
    
    # First, validate that this user actually exists
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
            # User doesn't exist - log but don't treat as error
            echo "$(date -Iseconds),$username,,,,,,,,$processing_time,USER_NOT_FOUND,User does not exist,$discovery_method" >> "$RESULTS_FILE"
            return 0
            ;;
        "000"|"")
            # Network error
            error_log "Network error for $username"
            echo "$(date -Iseconds),$username,,,,,,,,$processing_time,NETWORK_ERROR,Connection failed,$discovery_method" >> "$RESULTS_FILE"
            return 1
            ;;
        *)
            # Other HTTP error
            error_log "HTTP $http_code for $username"
            echo "$(date -Iseconds),$username,,,,,,,,$processing_time,HTTP_ERROR,HTTP_$http_code,$discovery_method" >> "$RESULTS_FILE"
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
    echo "$(date -Iseconds),$username,$r4r_score,$ethos_score,$ethos_xp,$risk_level,$reviews_given,$reviews_received,$avg_reciprocal_time,$processing_time,SUCCESS,,$discovery_method" >> "$RESULTS_FILE"
    
    return 0
}

# Enhanced batch processing
process_all_users() {
    log "🚀 Starting processing of ALL discovered users..."
    
    local users_with_methods="$DISCOVERY_FILE"
    local total_users=$(wc -l < "$users_with_methods")
    
    if [[ $MAX_USERS -gt 0 && $total_users -gt $MAX_USERS ]]; then
        log "📊 Limiting to first $MAX_USERS users (out of $total_users discovered)"
        head -n "$MAX_USERS" "$users_with_methods" > "${users_with_methods}.limited"
        users_with_methods="${users_with_methods}.limited"
        total_users=$MAX_USERS
    fi
    
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
    
    while IFS=',' read -r username discovery_method; do
        [[ -z "$username" ]] && continue
        
        # Batch management
        if [[ $((processed % BATCH_SIZE)) -eq 0 && $processed -gt 0 ]]; then
            log "📦 Completed batch $batch_num ($BATCH_SIZE users)"
            log "   ✅ Successful: $successful | ❌ Failed: $failed | 👻 Not Found: $not_found"
            log "⏸️  Batch break (${DELAY_BETWEEN_BATCHES}s)..."
            sleep "$DELAY_BETWEEN_BATCHES"
            ((batch_num++))
        fi
        
        # Process user
        if process_user "$username" "$discovery_method"; then
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
        if [[ $((processed % 100)) -eq 0 ]]; then
            local percent=$((processed * 100 / total_users))
            log "📈 Progress: $processed/$total_users ($percent%)"
            log "   ✅ Success: $successful | ❌ Failed: $failed | 👻 Not Found: $not_found"
        fi
        
        # Rate limiting
        if [[ $processed -lt $total_users ]]; then
            sleep "$DELAY_BETWEEN_USERS"
        fi
        
    done < "$users_with_methods"
    
    log "🎉 ALL USER PROCESSING COMPLETED!"
    log "📊 Final Statistics:"
    log "   - Total Processed: $processed"
    log "   - Successful: $successful"
    log "   - Failed: $failed"
    log "   - Not Found: $not_found"
    log "   - Success Rate: $(( successful * 100 / processed ))%"
    
    generate_comprehensive_report "$processed" "$successful" "$failed" "$not_found"
}

# Generate comprehensive report
generate_comprehensive_report() {
    local processed=$1
    local successful=$2
    local failed=$3
    local not_found=$4
    
    local report_file="$RESULTS_DIR/ALL_USERS_REPORT_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
=== COMPLETE ETHOS USER ANALYSIS REPORT ===
Generated: $(date -Iseconds)
Processing Duration: Started at $TIMESTAMP

DISCOVERY CONFIGURATION:
- Network Discovery: $ENABLE_NETWORK_DISCOVERY
- Pattern Discovery: $ENABLE_PATTERN_DISCOVERY  
- Deep Search: $ENABLE_DEEP_DISCOVERY

PROCESSING RESULTS:
- Total Users Discovered: $(wc -l < "$DISCOVERY_FILE")
- Total Users Processed: $processed
- Successful Analyses: $successful
- Failed Analyses: $failed
- Users Not Found: $not_found
- Overall Success Rate: $(( successful * 100 / processed ))%

FILES GENERATED:
- Complete Results: $RESULTS_FILE
- Processing Log: $LOG_FILE
- Error Log: $ERROR_FILE
- Discovery Log: $DISCOVERY_FILE
- This Report: $report_file

=== HIGH RISK USERS (R4R ≥ 70%) ===
EOF
    
    if [[ -f "$RESULTS_FILE" ]]; then
        awk -F',' '$3 != "" && $3 >= 70 {print $2 " - R4R: " $3 "% (" $13 ")"}' "$RESULTS_FILE" >> "$report_file"
        
        echo "" >> "$report_file"
        echo "=== DISCOVERY METHOD EFFECTIVENESS ===" >> "$report_file"
        echo "Users found by discovery method:" >> "$report_file"
        awk -F',' 'NR>1 && $11=="SUCCESS" {print $13}' "$RESULTS_FILE" | sort | uniq -c | sort -nr >> "$report_file"
        
        echo "" >> "$report_file"
        echo "=== TOP R4R SCORES ===" >> "$report_file"
        awk -F',' 'NR>1 && $3 != "" {print $3 "% - " $2}' "$RESULTS_FILE" | sort -nr | head -20 >> "$report_file"
    fi
    
    log "📋 Comprehensive report saved: $report_file"
    echo ""
    echo "🎯 PROCESSING COMPLETE! Check these files:"
    echo "   📊 Results: $RESULTS_FILE"
    echo "   📋 Report: $report_file"
    echo "   📝 Logs: $LOG_FILE"
}

# Main execution
main() {
    log "🌟 STARTING COMPLETE ETHOS USER DISCOVERY & ANALYSIS"
    log "🎯 Goal: Process EVERY SINGLE Ethos user"
    log ""
    
    # Discover all users
    local discovered_users_file="$LOGS_DIR/all_users_$TIMESTAMP.txt"
    discover_all_users > "$discovered_users_file"
    
    local total_discovered=$(wc -l < "$discovered_users_file")
    
    if [[ $total_discovered -eq 0 ]]; then
        error_log "No users discovered! Check configuration and connectivity."
        exit 1
    fi
    
    log "🎉 Discovery phase complete: $total_discovered users found"
    
    # Process all discovered users
    cp "$discovered_users_file" "$DISCOVERY_FILE.usernames"
    process_all_users
    
    log "🏁 MISSION ACCOMPLISHED: All Ethos users processed!"
}

# CLI handling
case "${1:-}" in
    --help|-h)
        cat << EOF
Process ALL Ethos Users - Complete Discovery & Analysis

USAGE: $0 [options]

This script will attempt to discover and process EVERY SINGLE Ethos user.

ENVIRONMENT VARIABLES:
    BATCH_SIZE                  Users per batch (default: 15)
    MAX_USERS                   Max users to process (0 = unlimited, default: 0)
    DELAY_BETWEEN_USERS         Seconds between users (default: 1)
    DELAY_BETWEEN_BATCHES       Seconds between batches (default: 3)
    ENABLE_NETWORK_DISCOVERY    Enable network-based discovery (default: true)
    ENABLE_PATTERN_DISCOVERY    Enable pattern-based discovery (default: true)  
    ENABLE_DEEP_DISCOVERY       Enable deep search discovery (default: true)

EXAMPLES:
    # Process ALL users with all discovery methods
    $0
    
    # Process ALL users but limit to first 5000
    MAX_USERS=5000 $0
    
    # Fast processing (higher server load)
    BATCH_SIZE=25 DELAY_BETWEEN_USERS=0.5 $0
    
    # Conservative processing (lower server load)
    BATCH_SIZE=10 DELAY_BETWEEN_USERS=3 DELAY_BETWEEN_BATCHES=10 $0
    
    # Only use leaderboard discovery (fastest)
    ENABLE_NETWORK_DISCOVERY=false ENABLE_PATTERN_DISCOVERY=false ENABLE_DEEP_DISCOVERY=false $0

WARNING: This script may take several hours to complete and will generate
significant load on your server. Monitor system resources during execution.
EOF
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 