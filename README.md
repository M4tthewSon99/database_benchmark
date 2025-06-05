# Database Benchmark Visualization Dashboard

**The entire benchmark folder (including YCSB binding scripts) are too big to upload, so I'm only uploading the test scripts, the data collected, and the dashboard.**

A comprehensive web-based visualization platform for analyzing and comparing key-value database performance across different data structures and workload patterns.

## Overview

This dashboard provides interactive visualizations and analysis of benchmark results from four key-value databases, each representing different underlying data structures:

-   **Hash Table (In-Memory)**: Redis, Memcached
-   **B+ Tree**: MongoDB
-   **LSM Tree**: RocksDB

## Benchmark Specifications

### Test Configuration

-   **Total Benchmark Runs**: 60 complete test scenarios
-   **Thread Counts**: 1, 4, 8, 16 threads per workload
-   **Record Count**: 100,000 records per test
-   **Operation Count**: 100,000 operations per test
-   **Field Configuration**: 10 fields per record, 100 bytes per field
-   **Request Distribution**: Zipfian distribution for realistic access patterns

### Workload Types

#### 1. Balanced Workload

-   **Operation Mix**: 50% reads, 50% writes
-   **Use Case**: General-purpose mixed operations
-   **Purpose**: Tests overall database performance under typical application loads

#### 2. Read-Heavy Workload (YCSB Workload B)

-   **Operation Mix**: 90% reads, 10% writes
-   **Use Case**: Caching and content delivery scenarios
-   **Purpose**: Evaluates read optimization and caching effectiveness

#### 3. Write-Heavy Workload (YCSB Workload A)

-   **Operation Mix**: 10% reads, 90% writes (50% updates, 40% inserts)
-   **Use Case**: Data ingestion and logging systems
-   **Purpose**: Tests write performance, consistency, and durability

#### 4. Range Query Workload (YCSB Workload E)

-   **Operation Mix**: 95% range scans, 5% inserts
-   **Use Case**: Analytics and sequential data processing
-   **Purpose**: Evaluates sequential access patterns and range query optimization

### Performance Results Summary

-   See in Final Report.pdf

## Dashboard Features

### 1. Performance Overview

-   Summary cards showing best performers for each workload
-   Overall throughput comparison across all databases
-   Peak performance metrics by threading configuration

### 2. Data Structure Comparison

-   Thread scaling analysis for each workload type
-   Performance heatmap visualization
-   Research insights and architectural trade-offs

### 3. Workload-Specific Analysis

-   Detailed performance breakdown by thread count
-   Workload-specific optimization patterns
-   Threading sweet spots identification

### 4. Scalability Analysis

-   Threading efficiency calculations (% of ideal performance)
-   Scaling bottleneck identification
-   Optimal thread configuration recommendations

### 5. Latency Analysis

-   Average, 95th, and 99th percentile latency metrics
-   Latency vs throughput trade-offs
-   Response time distribution analysis

### 6. Design Impact Analysis

-   Architectural implications of data structure choices
-   Performance trade-offs between consistency and speed
-   Use case recommendations based on workload patterns

## Technology Stack

### Backend

-   **Framework**: Flask (Python)
-   **API Design**: RESTful endpoints
-   **Data Processing**: Pandas, NumPy
-   **CORS Support**: Cross-origin resource sharing enabled

### Frontend

-   **Visualization**: Plotly.js for interactive charts
-   **Styling**: Tailwind CSS for responsive design
-   **Navigation**: Single-page application with section-based routing
-   **Charts**: Heatmaps, line charts, bar charts, efficiency plots

### Data Format

-   **Input**: Synthesized JSON data from YCSB benchmark runs
-   **Processing**: Real-time data transformation for chart rendering
-   **Caching**: Client-side data caching for improved performance

## Installation & Setup

### Prerequisites

-   Python 3.x
-   Flask and required Python packages
-   Modern web browser with JavaScript enabled

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
cd backend
python app.py
```

### Access

-   **Backend API**: http://localhost:5002/api
-   **Dashboard**: http://localhost:5002
-   **Data Files**: Located in `./data/` directory

## API Endpoints

### Core Data Endpoints

-   `GET /api/data` - Complete synthesized benchmark data
-   `GET /api/overview` - Summary statistics and best performers
-   `GET /api/throughput` - Throughput comparison matrix
-   `GET /api/latency` - Latency analysis data
-   `GET /api/scalability` - Thread scaling performance data
-   `GET /api/heatmap` - Performance heatmap data
-   `GET /api/workload/<workload_name>` - Workload-specific analysis

### Static Files

-   `GET /` - Main dashboard interface
-   `GET /<path:path>` - Frontend static assets

## Data Structure

### Input Data Schema

```json
{
    "metadata": {
        "generated_at": "timestamp",
        "total_runs": 60,
        "workloads": ["balanced", "read_heavy", "write_heavy", "range_query"],
        "thread_counts": [1, 4, 8, 16]
    },
    "data": [
        {
            "database": "redis",
            "data_structure": "hashtable_inmemory",
            "workload": "balanced",
            "threads": 16,
            "run_throughput_ops_sec": 103519.67,
            "run_read_avg_latency_us": 145.2,
            "run_read_95p_latency_us": 287.0,
            "run_read_99p_latency_us": 431.0
        }
    ]
}
```
