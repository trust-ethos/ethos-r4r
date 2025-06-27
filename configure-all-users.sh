#!/bin/bash

# Configuration Helper for Processing ALL Ethos Users
# This script helps you set up different processing scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🌟 Ethos ALL USERS Processing Configuration${NC}"
echo -e "${CYAN}===========================================${NC}"
echo ""

# Function to show current database stats
show_current_stats() {
    echo -e "${BLUE}📊 Current Database Status:${NC}"
    local stats=$(curl -s http://localhost:8000/api/leaderboard | jq '.stats' 2>/dev/null || echo "null")
    
    if [[ "$stats" != "null" ]]; then
        echo "$stats" | jq -r '"   Total Users: " + (.totalEntries | tostring)'
        echo "$stats" | jq -r '"   High Risk: " + (.highRisk | tostring) + " (" + ((.highRisk * 100 / .totalEntries) | floor | tostring) + "%)"'
        echo "$stats" | jq -r '"   Moderate Risk: " + (.moderateRisk | tostring) + " (" + ((.moderateRisk * 100 / .totalEntries) | floor | tostring) + "%)"'
        echo "$stats" | jq -r '"   Low Risk: " + (.lowRisk | tostring) + " (" + ((.lowRisk * 100 / .totalEntries) | floor | tostring) + "%)"'
    else
        echo -e "${RED}   ❌ Could not fetch database stats${NC}"
    fi
    echo ""
}

# Function to estimate processing time
estimate_processing_time() {
    local users=$1
    local batch_size=$2
    local user_delay=$3
    local batch_delay=$4
    
    local total_batches=$(( (users + batch_size - 1) / batch_size ))
    local user_processing_time=$(( users * user_delay ))
    local batch_processing_time=$(( total_batches * batch_delay ))
    local total_seconds=$(( user_processing_time + batch_processing_time ))
    
    local hours=$(( total_seconds / 3600 ))
    local minutes=$(( (total_seconds % 3600) / 60 ))
    local seconds=$(( total_seconds % 60 ))
    
    echo "   Estimated Time: ${hours}h ${minutes}m ${seconds}s"
    echo "   Total Batches: $total_batches"
    echo "   Processing Rate: ~$(( 3600 / (user_delay + batch_delay / batch_size) )) users/hour"
}

# Show current stats
show_current_stats

echo -e "${YELLOW}🚀 Processing Scenarios:${NC}"
echo ""

echo -e "${GREEN}1. CONSERVATIVE (Recommended for first run)${NC}"
echo "   • Batch Size: 10 users"
echo "   • User Delay: 3 seconds"
echo "   • Batch Delay: 10 seconds"
echo "   • Discovery: Leaderboard only"
echo "   • Max Users: 1000"
estimate_processing_time 1000 10 3 10
echo ""

echo -e "${BLUE}2. BALANCED (Good for regular processing)${NC}"
echo "   • Batch Size: 15 users"
echo "   • User Delay: 2 seconds"
echo "   • Batch Delay: 5 seconds"
echo "   • Discovery: All methods"
echo "   • Max Users: 5000"
estimate_processing_time 5000 15 2 5
echo ""

echo -e "${PURPLE}3. AGGRESSIVE (Fast but high server load)${NC}"
echo "   • Batch Size: 25 users"
echo "   • User Delay: 1 second"
echo "   • Batch Delay: 3 seconds"
echo "   • Discovery: All methods"
echo "   • Max Users: 10000"
estimate_processing_time 10000 25 1 3
echo ""

echo -e "${RED}4. MAXIMUM (Process EVERY user - may take hours!)${NC}"
echo "   • Batch Size: 20 users"
echo "   • User Delay: 1 second"
echo "   • Batch Delay: 2 seconds"
echo "   • Discovery: All methods"
echo "   • Max Users: UNLIMITED"
echo "   ⚠️  This could process 50,000+ users and take 10+ hours!"
echo ""

echo -e "${CYAN}5. CUSTOM (You configure)${NC}"
echo "   • Set your own parameters"
echo ""

echo -e "${YELLOW}Choose a scenario (1-5):${NC} "
read -r choice

case $choice in
    1)
        echo -e "${GREEN}🛡️  CONSERVATIVE mode selected${NC}"
        export BATCH_SIZE=10
        export MAX_USERS=1000
        export DELAY_BETWEEN_USERS=3
        export DELAY_BETWEEN_BATCHES=10
        export ENABLE_NETWORK_DISCOVERY=false
        export ENABLE_PATTERN_DISCOVERY=false
        export ENABLE_DEEP_DISCOVERY=false
        ;;
    2)
        echo -e "${BLUE}⚖️  BALANCED mode selected${NC}"
        export BATCH_SIZE=15
        export MAX_USERS=5000
        export DELAY_BETWEEN_USERS=2
        export DELAY_BETWEEN_BATCHES=5
        export ENABLE_NETWORK_DISCOVERY=true
        export ENABLE_PATTERN_DISCOVERY=true
        export ENABLE_DEEP_DISCOVERY=true
        ;;
    3)
        echo -e "${PURPLE}🚀 AGGRESSIVE mode selected${NC}"
        export BATCH_SIZE=25
        export MAX_USERS=10000
        export DELAY_BETWEEN_USERS=1
        export DELAY_BETWEEN_BATCHES=3
        export ENABLE_NETWORK_DISCOVERY=true
        export ENABLE_PATTERN_DISCOVERY=true
        export ENABLE_DEEP_DISCOVERY=true
        ;;
    4)
        echo -e "${RED}💥 MAXIMUM mode selected - Processing ALL users!${NC}"
        echo -e "${YELLOW}⚠️  This will process EVERY SINGLE Ethos user!${NC}"
        echo -e "${YELLOW}⚠️  This may take many hours and use significant resources!${NC}"
        echo ""
        echo -e "${YELLOW}Are you sure? (yes/no):${NC} "
        read -r confirm
        if [[ "$confirm" != "yes" ]]; then
            echo "Cancelled."
            exit 0
        fi
        export BATCH_SIZE=20
        export MAX_USERS=0  # No limit
        export DELAY_BETWEEN_USERS=1
        export DELAY_BETWEEN_BATCHES=2
        export ENABLE_NETWORK_DISCOVERY=true
        export ENABLE_PATTERN_DISCOVERY=true
        export ENABLE_DEEP_DISCOVERY=true
        ;;
    5)
        echo -e "${CYAN}🔧 CUSTOM configuration${NC}"
        echo ""
        echo -e "${YELLOW}Batch size (users per batch, default 15):${NC} "
        read -r batch_size
        export BATCH_SIZE=${batch_size:-15}
        
        echo -e "${YELLOW}Max users to process (0 = unlimited, default 5000):${NC} "
        read -r max_users
        export MAX_USERS=${max_users:-5000}
        
        echo -e "${YELLOW}Delay between users in seconds (default 2):${NC} "
        read -r user_delay
        export DELAY_BETWEEN_USERS=${user_delay:-2}
        
        echo -e "${YELLOW}Delay between batches in seconds (default 5):${NC} "
        read -r batch_delay
        export DELAY_BETWEEN_BATCHES=${batch_delay:-5}
        
        echo -e "${YELLOW}Enable advanced discovery methods? (y/n, default y):${NC} "
        read -r enable_advanced
        if [[ "$enable_advanced" =~ ^[Nn] ]]; then
            export ENABLE_NETWORK_DISCOVERY=false
            export ENABLE_PATTERN_DISCOVERY=false
            export ENABLE_DEEP_DISCOVERY=false
        else
            export ENABLE_NETWORK_DISCOVERY=true
            export ENABLE_PATTERN_DISCOVERY=true
            export ENABLE_DEEP_DISCOVERY=true
        fi
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Configuration set:${NC}"
echo "   Batch Size: $BATCH_SIZE"
echo "   Max Users: $([ "$MAX_USERS" -eq 0 ] && echo "UNLIMITED" || echo "$MAX_USERS")"
echo "   User Delay: ${DELAY_BETWEEN_USERS}s"
echo "   Batch Delay: ${DELAY_BETWEEN_BATCHES}s"
echo "   Network Discovery: $ENABLE_NETWORK_DISCOVERY"
echo "   Pattern Discovery: $ENABLE_PATTERN_DISCOVERY"
echo "   Deep Discovery: $ENABLE_DEEP_DISCOVERY"
echo ""

# Estimate processing time for configured settings
if [[ "$MAX_USERS" -eq 0 ]]; then
    echo -e "${YELLOW}⏱️  Processing time: UNKNOWN (unlimited users)${NC}"
else
    echo -e "${YELLOW}⏱️  Estimated processing time:${NC}"
    estimate_processing_time "$MAX_USERS" "$BATCH_SIZE" "$DELAY_BETWEEN_USERS" "$DELAY_BETWEEN_BATCHES"
fi
echo ""

echo -e "${YELLOW}Ready to start processing? (y/n):${NC} "
read -r start_now

if [[ "$start_now" =~ ^[Yy] ]]; then
    echo -e "${GREEN}🚀 Starting processing...${NC}"
    echo ""
    
    # Create a timestamp for this run
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    echo "Processing started at: $(date)" | tee "all-users-run-$TIMESTAMP.log"
    
    # Run the processor
    ./process-all-ethos-users.sh 2>&1 | tee -a "all-users-run-$TIMESTAMP.log"
    
    echo ""
    echo -e "${GREEN}🎉 Processing completed!${NC}"
    echo -e "${BLUE}📋 Check the results in: all-users-results/${NC}"
    echo -e "${BLUE}📝 Full log saved to: all-users-run-$TIMESTAMP.log${NC}"
else
    echo ""
    echo -e "${BLUE}📋 Configuration saved. To run later, execute:${NC}"
    echo ""
    echo -e "${CYAN}export BATCH_SIZE=$BATCH_SIZE${NC}"
    echo -e "${CYAN}export MAX_USERS=$MAX_USERS${NC}"
    echo -e "${CYAN}export DELAY_BETWEEN_USERS=$DELAY_BETWEEN_USERS${NC}"
    echo -e "${CYAN}export DELAY_BETWEEN_BATCHES=$DELAY_BETWEEN_BATCHES${NC}"
    echo -e "${CYAN}export ENABLE_NETWORK_DISCOVERY=$ENABLE_NETWORK_DISCOVERY${NC}"
    echo -e "${CYAN}export ENABLE_PATTERN_DISCOVERY=$ENABLE_PATTERN_DISCOVERY${NC}"
    echo -e "${CYAN}export ENABLE_DEEP_DISCOVERY=$ENABLE_DEEP_DISCOVERY${NC}"
    echo -e "${CYAN}./process-all-ethos-users.sh${NC}"
    echo ""
    echo -e "${BLUE}Or simply run: ${CYAN}./configure-all-users.sh${NC} ${BLUE}again${NC}"
fi 