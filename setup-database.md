# 🗄️ Neon Database Setup

## 📋 **Prerequisites**
- Neon PostgreSQL database instance
- Connection string from your Neon dashboard

## 🔧 **Setup Instructions**

### 1. **Set Environment Variable**

Add your Neon connection string as an environment variable:

```bash
# Option 1: Export in your shell
export DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# Option 2: Create a .env file (add to .gitignore)
echo 'DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"' > .env
```

### 2. **Start the Application**

```bash
deno task start
```

The database will automatically:
- ✅ Connect to your Neon instance
- ✅ Create required tables (`leaderboard_entries`, `batch_jobs`)
- ✅ Set up indexes for optimal performance

### 3. **Populate Test Data**

```bash
# Populate with 8 test profiles
curl -X POST http://localhost:8000/api/populate-test-data

# Verify the data
curl http://localhost:8000/api/leaderboard
```

## 📊 **Database Schema**

### `leaderboard_entries` Table
```sql
CREATE TABLE leaderboard_entries (
  userkey VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER NOT NULL,
  reviews_given INTEGER NOT NULL,
  reviews_received INTEGER NOT NULL,
  reciprocal_reviews INTEGER NOT NULL,
  farming_score INTEGER NOT NULL,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'moderate', 'high')),
  quick_reciprocations INTEGER NOT NULL,
  avg_reciproca_time DECIMAL(10,2) NOT NULL,
  last_analyzed TIMESTAMP NOT NULL,
  analysis_version VARCHAR(20) NOT NULL,
  processing_time INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `batch_jobs` Table
```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  batch_size INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  processed_count INTEGER DEFAULT 0
);
```

## 🚀 **Benefits of Database Persistence**

- **Data Survives Server Restarts**: No more losing data when code changes
- **Scalable**: Handle thousands of profiles efficiently
- **Production Ready**: Same database for local development and production
- **Query Performance**: Optimized indexes for fast filtering and sorting
- **Data Integrity**: ACID compliance and proper constraints

## 🔍 **Verification**

After setup, you should see:

```
✅ Connected to Neon PostgreSQL database
✅ Database tables initialized
🍋 Fresh ready 
    Local: http://localhost:8000/
```

## 🛠️ **Troubleshooting**

**Connection Issues:**
- Verify your DATABASE_URL is correct
- Check that your Neon database is active
- Ensure SSL mode is enabled (`sslmode=require`)

**Permission Issues:**
- Verify your database user has CREATE TABLE permissions
- Check that the database exists in your Neon project 