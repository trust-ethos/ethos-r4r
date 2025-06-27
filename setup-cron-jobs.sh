#!/bin/bash

# Setup Cron Jobs for R4R Batch Processing
# This script sets up automated batch jobs using cron

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BATCH_SCRIPT="$SCRIPT_DIR/simple-batch-processor.sh"

echo "🕐 Setting up Cron Jobs for R4R Batch Processing..."
echo "📁 Script Directory: $SCRIPT_DIR"
echo "🔧 Batch Script: $BATCH_SCRIPT"
echo ""

# Check if batch script exists
if [ ! -f "$BATCH_SCRIPT" ]; then
    echo "❌ Batch script not found: $BATCH_SCRIPT"
    exit 1
fi

# Make sure batch script is executable
chmod +x "$BATCH_SCRIPT"

# Create cron jobs
echo "📋 Setting up the following cron jobs:"
echo ""

# Job 1: Small frequent updates (every 2 hours, 10 users)
echo "1. 🔄 Frequent Updates: Every 2 hours, process 10 users"
echo "   Schedule: 0 */2 * * * (every 2 hours)"
echo "   Command: cd $SCRIPT_DIR && ./simple-batch-processor.sh 5 10"
echo ""

# Job 2: Larger batch (every 6 hours, 50 users)
echo "2. 📊 Large Batch: Every 6 hours, process 50 users"
echo "   Schedule: 0 */6 * * * (every 6 hours)"
echo "   Command: cd $SCRIPT_DIR && ./simple-batch-processor.sh 10 50"
echo ""

# Job 3: Daily cleanup and reporting
echo "3. 🧹 Daily Report: Every day at 1 AM, generate summary"
echo "   Schedule: 0 1 * * * (daily at 1 AM)"
echo "   Command: cd $SCRIPT_DIR && ./simple-batch-processor.sh 5 10 results"
echo ""

read -p "Do you want to install these cron jobs? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cron job installation cancelled."
    exit 0
fi

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get current crontab (if any)
crontab -l 2>/dev/null > "$TEMP_CRON"

# Add our jobs
echo "" >> "$TEMP_CRON"
echo "# R4R Batch Processing Jobs - Added $(date)" >> "$TEMP_CRON"
echo "# Small frequent updates every 2 hours" >> "$TEMP_CRON"
echo "0 */2 * * * cd $SCRIPT_DIR && ./simple-batch-processor.sh 5 10 >> $SCRIPT_DIR/cron.log 2>&1" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"
echo "# Large batch processing every 6 hours" >> "$TEMP_CRON"
echo "0 */6 * * * cd $SCRIPT_DIR && ./simple-batch-processor.sh 10 50 >> $SCRIPT_DIR/cron.log 2>&1" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"
echo "# Daily reporting at 1 AM" >> "$TEMP_CRON"
echo "0 1 * * * cd $SCRIPT_DIR && ./simple-batch-processor.sh 5 10 results >> $SCRIPT_DIR/daily-report.log 2>&1" >> "$TEMP_CRON"

# Install the new crontab
if crontab "$TEMP_CRON"; then
    echo "✅ Cron jobs installed successfully!"
    echo ""
    echo "📋 Current crontab:"
    crontab -l | grep -A 10 -B 2 "R4R Batch Processing"
    echo ""
    echo "📝 Logs will be saved to:"
    echo "   • Regular jobs: $SCRIPT_DIR/cron.log"
    echo "   • Daily reports: $SCRIPT_DIR/daily-report.log"
    echo "   • Batch results: $SCRIPT_DIR/batch-results-YYYYMMDD.csv"
    echo ""
    echo "🔧 To manage cron jobs:"
    echo "   • View: crontab -l"
    echo "   • Edit: crontab -e"
    echo "   • Remove: crontab -r"
else
    echo "❌ Failed to install cron jobs"
    exit 1
fi

# Clean up
rm "$TEMP_CRON"

# Create log monitoring script
cat > "$SCRIPT_DIR/monitor-jobs.sh" << 'EOF'
#!/bin/bash

# Monitor R4R Batch Jobs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📊 R4R Batch Job Monitor"
echo "======================="
echo ""

# Show recent cron activity
if [ -f "$SCRIPT_DIR/cron.log" ]; then
    echo "🕐 Recent Cron Activity (last 10 lines):"
    tail -n 10 "$SCRIPT_DIR/cron.log"
    echo ""
fi

# Show today's results
TODAY=$(date +%Y%m%d)
if [ -f "$SCRIPT_DIR/batch-results-$TODAY.csv" ]; then
    echo "📊 Today's Batch Results:"
    TOTAL=$(( $(wc -l < "$SCRIPT_DIR/batch-results-$TODAY.csv") - 1 ))
    SUCCESS=$(grep -c "SUCCESS" "$SCRIPT_DIR/batch-results-$TODAY.csv")
    FAILED=$(grep -c "FAILED" "$SCRIPT_DIR/batch-results-$TODAY.csv")
    
    echo "   • Total Processed: $TOTAL"
    echo "   • Successful: $SUCCESS"
    echo "   • Failed: $FAILED"
    
    if [ $TOTAL -gt 0 ]; then
        echo "   • Success Rate: $(( (SUCCESS * 100) / TOTAL ))%"
    fi
    echo ""
    
    echo "🚨 High-Risk Users Today:"
    awk -F',' '$4 >= 90 && $1 == "SUCCESS" {print "   • @" $2 " - " $4 "% R4R Score"}' "$SCRIPT_DIR/batch-results-$TODAY.csv"
else
    echo "📊 No batch results found for today ($TODAY)"
fi

echo ""
echo "🔧 Commands:"
echo "   • View all results: ./simple-batch-processor.sh 5 10 results"
echo "   • Show high-risk: ./simple-batch-processor.sh 5 10 high-risk"
echo "   • Run manual batch: ./simple-batch-processor.sh [batch_size] [max_users]"
EOF

chmod +x "$SCRIPT_DIR/monitor-jobs.sh"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 What was created:"
echo "   • ✅ Cron jobs for automated batch processing"
echo "   • ✅ Log files for monitoring"
echo "   • ✅ Monitor script: $SCRIPT_DIR/monitor-jobs.sh"
echo ""
echo "🚀 Next steps:"
echo "   1. Monitor the first few runs: ./monitor-jobs.sh"
echo "   2. Check logs regularly: tail -f cron.log"
echo "   3. Review daily results: ./simple-batch-processor.sh 5 10 results"
echo ""
echo "⚠️ Important:"
echo "   • Make sure the server is running when cron jobs execute"
echo "   • Monitor disk space for log files"
echo "   • Check database connectivity regularly"
</rewritten_file> 