#!/bin/bash

# MongoDB Benchmark Script
# Tests MongoDB (B+ Tree) with all workload patterns

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
YCSB_DIR="$PROJECT_ROOT/ycsb"
RESULTS_BASE_DIR="$PROJECT_ROOT/benchmarks/results/raw"

# Database configuration
DB_NAME="mongodb"
DB_TYPE="btree"
YCSB_BINDING="mongodb"

# Create organized results directory structure
RESULTS_DIR="$RESULTS_BASE_DIR/$DB_TYPE/$DB_NAME"
mkdir -p "$RESULTS_DIR"

# MongoDB connection parameters
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_DATABASE="ycsb"

echo "=== Starting MongoDB Benchmark ==="
echo "Database: $DB_NAME"
echo "Type: $DB_TYPE"
echo "Date: $(date)"
echo "Results will be saved to: $RESULTS_DIR"
echo "==================================="

# Check if MongoDB is running
if ! nc -z $MONGO_HOST $MONGO_PORT 2>/dev/null; then
    echo "Error: MongoDB is not running on $MONGO_HOST:$MONGO_PORT"
    echo "Please start MongoDB server before running the benchmark"
    echo "You can start MongoDB with: mongod --dbpath /usr/local/var/mongodb"
    exit 1
fi

# Check if mongo client is available
if ! command -v mongo &> /dev/null && ! command -v mongosh &> /dev/null; then
    echo "Error: MongoDB client (mongo or mongosh) is not available"
    echo "Please install MongoDB client tools"
    exit 1
fi

# Set the appropriate mongo client command
MONGO_CLIENT="mongo"
if command -v mongosh &> /dev/null; then
    MONGO_CLIENT="mongosh"
fi

# Workload configurations
WORKLOADS=("workload_read_heavy" "workload_write_heavy" "workload_balanced" "workload_range_query")
WORKLOAD_NAMES=("Read-Heavy" "Write-Heavy" "Balanced" "Range-Query")
WORKLOAD_DIRS=("read_heavy" "write_heavy" "balanced" "range_query")

# Thread counts for different load tests
THREAD_COUNTS=(1 4 8 16)

for i in "${!WORKLOADS[@]}"; do
    WORKLOAD="${WORKLOADS[$i]}"
    WORKLOAD_NAME="${WORKLOAD_NAMES[$i]}"
    WORKLOAD_DIR="${WORKLOAD_DIRS[$i]}"
    
    # Create workload-specific directory
    WORKLOAD_RESULTS_DIR="$RESULTS_DIR/$WORKLOAD_DIR"
    mkdir -p "$WORKLOAD_RESULTS_DIR"
    
    echo ""
    echo "--- Testing $WORKLOAD_NAME Workload ---"
    echo "Results directory: $WORKLOAD_RESULTS_DIR"
    
    for THREADS in "${THREAD_COUNTS[@]}"; do
        echo "Testing with $THREADS threads..."
        
        # Clear MongoDB data before each test
        $MONGO_CLIENT --host $MONGO_HOST:$MONGO_PORT $MONGO_DATABASE --eval "db.usertable.drop()" > /dev/null 2>&1
        
        # Results file with consistent naming (no timestamp)
        RESULT_FILE="$WORKLOAD_RESULTS_DIR/${DB_NAME}_${WORKLOAD_DIR}_${THREADS}threads.txt"
        
        # Load phase
        echo "  Loading data..."
        cd "$YCSB_DIR"
        ./bin/ycsb load $YCSB_BINDING -P "workloads/$WORKLOAD" \
            -p "mongodb.url=mongodb://$MONGO_HOST:$MONGO_PORT/$MONGO_DATABASE" \
            -threads $THREADS \
            -s > "$RESULT_FILE.load" 2>&1
        
        if [ $? -ne 0 ]; then
            echo "  ERROR: Load phase failed for $WORKLOAD_NAME with $THREADS threads"
            continue
        fi
        
        # Run phase
        echo "  Running workload..."
        ./bin/ycsb run $YCSB_BINDING -P "workloads/$WORKLOAD" \
            -p "mongodb.url=mongodb://$MONGO_HOST:$MONGO_PORT/$MONGO_DATABASE" \
            -threads $THREADS \
            -s > "$RESULT_FILE.run" 2>&1
        
        if [ $? -eq 0 ]; then
            echo "  ✓ Completed $WORKLOAD_NAME with $THREADS threads"
            
            # Combine load and run results
            {
                echo "=== MONGODB BENCHMARK RESULTS ==="
                echo "Database: $DB_NAME"
                echo "Type: $DB_TYPE"
                echo "Workload: $WORKLOAD_NAME ($WORKLOAD_DIR)"
                echo "Threads: $THREADS"
                echo "Date: $(date)"
                echo "Result File: $RESULT_FILE"
                echo ""
                echo "=== LOAD PHASE ==="
                cat "$RESULT_FILE.load"
                echo ""
                echo "=== RUN PHASE ==="
                cat "$RESULT_FILE.run"
            } > "$RESULT_FILE"
            
            # Clean up individual files
            rm "$RESULT_FILE.load" "$RESULT_FILE.run"
            
        else
            echo "  ✗ Failed $WORKLOAD_NAME with $THREADS threads"
        fi
        
        # Brief pause between tests
        sleep 2
    done
done

echo ""
echo "=== MongoDB Benchmark Complete ==="
echo "Results saved in: $RESULTS_DIR"
echo "Folder structure:"
echo "  $RESULTS_DIR/"
for workload_dir in "${WORKLOAD_DIRS[@]}"; do
    echo "    ├── $workload_dir/"
done
echo "===================================" 