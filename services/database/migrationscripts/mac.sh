#!/bin/bash
# Coffelist Database Migrations Runner (Mac/Linux)
# Usage: ./run-migrations.sh
# Note: Comment out migrations you've already run to avoid errors

set -e  # Exit on any error

DB_CONTAINER="coffelist-db"
DB_USER="coffeeadmin"
DB_NAME="coffelist"
MIGRATIONS_DIR="./migrations"

echo "🔄 Running Coffelist database migrations..."
echo "================================================"

# Check if Docker container is running
if ! docker ps | grep -q $DB_CONTAINER; then
    echo "❌ Error: Container '$DB_CONTAINER' is not running"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

# Function to run a migration
run_migration() {
    local migration_file=$1
    echo ""
    echo "▶️  Running: $migration_file"
    if docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$MIGRATIONS_DIR/$migration_file"; then
        echo "✅ Success: $migration_file"
    else
        echo "❌ Failed: $migration_file"
        exit 1
    fi
}

# Run migrations in order
# Comment out any migrations you've already run
run_migration "001_add_users.sql"
run_migration "002_add_roastery_owners.sql"
run_migration "003_add_session_table.sql"
run_migration "004_add_credentials_table.sql"

echo ""
echo "================================================"
echo "✨ All migrations completed successfully!"
echo ""