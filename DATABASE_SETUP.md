# 🗄️ Database Setup for Leaderboard

The Ethos Review Analyzer works perfectly without a database - you can analyze profiles and see all the review patterns immediately. The database is only needed if you want to persist analysis results in a leaderboard.

## ✅ Current Functionality (No Database Required)
- ✅ Profile search and analysis
- ✅ Review pattern detection
- ✅ Time gap analysis with color coding
- ✅ Enhanced farming score calculation
- ✅ Shareable profile URLs
- ✅ Full dark mode theme

## 📊 Optional: Leaderboard Persistence

To enable the leaderboard that saves analysis results:

### 1. **Get a Free Neon PostgreSQL Database**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string from your dashboard

### 2. **Set Environment Variable**
```bash
# Option 1: Export in your shell
export DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# Option 2: Create a .env file
echo 'DATABASE_URL="your-connection-string-here"' > .env
```

### 3. **Restart the Server**
```bash
./restart-dev.sh
```

The database will automatically:
- ✅ Create required tables
- ✅ Set up indexes for performance
- ✅ Save analysis results as users search profiles

## 🎯 How It Works

**Without Database:**
- Search profiles → Get instant analysis
- Results are temporary (not saved)
- Leaderboard shows "No profiles analyzed yet"

**With Database:**
- Search profiles → Get instant analysis + save to leaderboard
- Each search updates the user's entry in the database
- Leaderboard shows live rankings with timestamps
- Data persists across server restarts

## 🔧 Benefits of Database Setup

- **Organic Growth**: Leaderboard builds naturally as users search
- **Live Rankings**: See real farming scores across all analyzed users  
- **Timestamps**: Track when each profile was last analyzed
- **Persistence**: Data survives server restarts and deployments
- **Performance**: Optimized queries for large datasets

## 🚀 No Database? No Problem!

The core analysis functionality is fully operational without any database setup. You can:

1. Search for any Ethos user
2. See comprehensive review analysis
3. View reciprocal review patterns
4. Analyze time gaps between reviews
5. Get farming risk scores
6. Share profile analysis URLs

The database is purely for persistence and leaderboard features! 