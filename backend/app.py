#!/usr/bin/env python3

"""
Flask backend for KV-Store Benchmark Visualization
"""

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import json
import pandas as pd
import numpy as np
from pathlib import Path
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# Set up paths
PROJECT_ROOT = Path(__file__).parent.parent
RESULTS_DIR = PROJECT_ROOT / 'data'

def load_synthesized_data():
    """Load and return the synthesized benchmark data"""
    try:
        with open(RESULTS_DIR / 'synthesized_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def process_data_for_charts(data):
    """Process the raw data into various formats for different charts"""
    if not data:
        return None
    
    results = {
        'throughput_by_workload': defaultdict(lambda: defaultdict(list)),
        'throughput_by_threads': defaultdict(lambda: defaultdict(list)),
        'latency_by_workload': defaultdict(lambda: defaultdict(list)),
        'scalability_data': defaultdict(lambda: defaultdict(list)),
        'best_performers': {},
        'workload_analysis': defaultdict(dict),
        'thread_scaling': defaultdict(lambda: defaultdict(list))
    }
    
    # Process each data point
    for entry in data['data']:
        db_name = entry['database']
        data_structure = entry['data_structure']
        workload = entry['workload']
        threads = entry['threads']
        
        # Combine data structure and database for cleaner names
        full_name = f"{db_name}"
        
        # Throughput data
        run_throughput = entry.get('run_throughput_ops_sec', 0)
        results['throughput_by_workload'][workload][full_name].append({
            'threads': threads,
            'throughput': run_throughput,
            'data_structure': data_structure
        })
        
        results['throughput_by_threads'][threads][full_name].append({
            'workload': workload,
            'throughput': run_throughput,
            'data_structure': data_structure
        })
        
        # Latency data
        read_latency = entry.get('run_read_avg_latency_us', 0)
        read_p95 = entry.get('run_read_95p_latency_us', 0)
        read_p99 = entry.get('run_read_99p_latency_us', 0)
        
        results['latency_by_workload'][workload][full_name].append({
            'threads': threads,
            'avg_latency': read_latency,
            'p95_latency': read_p95,
            'p99_latency': read_p99,
            'data_structure': data_structure
        })
        
        # Thread scaling data
        results['thread_scaling'][full_name][workload].append({
            'threads': threads,
            'throughput': run_throughput,
            'data_structure': data_structure
        })
    
    # Find best performers for each workload
    for workload in ['balanced', 'read_heavy', 'write_heavy', 'range_query']:
        best_throughput = 0
        best_db = None
        best_data_structure = None
        
        for entry in data['data']:
            if entry['workload'] == workload:
                throughput = entry.get('run_throughput_ops_sec', 0)
                if throughput > best_throughput:
                    best_throughput = throughput
                    best_db = entry['database']
                    best_data_structure = entry['data_structure']
        
        results['best_performers'][workload] = {
            'database': best_db,
            'data_structure': best_data_structure,
            'throughput': best_throughput
        }
    
    return results

@app.route('/')
def index():
    """Serve the main visualization page"""
    return send_from_directory('../frontend', 'index.html')

@app.route('/api/data')
def get_all_data():
    """Get the complete synthesized data"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No synthesized data found.'}), 404
    return jsonify(data)

@app.route('/api/overview')
def get_overview():
    """Get overview data for dashboard"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    processed = process_data_for_charts(data)
    if not processed:
        return jsonify({'error': 'Failed to process data.'}), 500
    
    return jsonify({
        'best_performers': processed['best_performers'],
        'metadata': data['metadata']
    })

@app.route('/api/throughput')
def get_throughput():
    """Get throughput comparison data"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    # Create throughput matrix for heatmap
    throughput_matrix = {}
    workloads = set()
    databases = set()
    
    for entry in data['data']:
        db = entry['database']
        workload = entry['workload']
        threads = entry['threads']
        throughput = entry.get('run_throughput_ops_sec', 0)
        
        key = f"{db}_{threads}t"
        if key not in throughput_matrix:
            throughput_matrix[key] = {}
        
        throughput_matrix[key][workload] = throughput
        workloads.add(workload)
        databases.add(db)
    
    return jsonify({
        'matrix': throughput_matrix,
        'workloads': sorted(list(workloads)),
        'databases': sorted(list(databases))
    })

@app.route('/api/latency')
def get_latency():
    """Get latency comparison data"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    latency_data = []
    for entry in data['data']:
        latency_data.append({
            'database': entry['database'],
            'data_structure': entry['data_structure'],
            'workload': entry['workload'],
            'threads': entry['threads'],
            'avg_latency': entry.get('run_read_avg_latency_us', 0),
            'p95_latency': entry.get('run_read_95p_latency_us', 0),
            'p99_latency': entry.get('run_read_99p_latency_us', 0),
            'throughput': entry.get('run_throughput_ops_sec', 0)
        })
    
    return jsonify(latency_data)

@app.route('/api/scalability')
def get_scalability():
    """Get thread scalability data"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    scalability_data = defaultdict(lambda: defaultdict(list))
    
    for entry in data['data']:
        db = entry['database']
        workload = entry['workload']
        threads = entry['threads']
        throughput = entry.get('run_throughput_ops_sec', 0)
        data_structure = entry['data_structure']
        
        scalability_data[db][workload].append({
            'threads': threads,
            'throughput': throughput,
            'data_structure': data_structure
        })
    
    # Sort by thread count for each database/workload combination
    for db in scalability_data:
        for workload in scalability_data[db]:
            scalability_data[db][workload].sort(key=lambda x: x['threads'])
    
    return jsonify(dict(scalability_data))

@app.route('/api/workload/<workload_name>')
def get_workload_analysis(workload_name):
    """Get detailed analysis for a specific workload"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    workload_data = [entry for entry in data['data'] if entry['workload'] == workload_name]
    
    if not workload_data:
        return jsonify({'error': f'No data found for workload {workload_name}'}), 404
    
    return jsonify(workload_data)

@app.route('/api/heatmap')
def get_heatmap_data():
    """Get data for performance heatmap"""
    data = load_synthesized_data()
    if not data:
        return jsonify({'error': 'No data found.'}), 404
    
    # Create heatmap data structure
    heatmap_data = []
    
    for entry in data['data']:
        heatmap_data.append({
            'database': entry['database'],
            'data_structure': entry['data_structure'],
            'workload': entry['workload'],
            'threads': entry['threads'],
            'throughput': entry.get('run_throughput_ops_sec', 0),
            'latency': entry.get('run_read_avg_latency_us', 0)
        })
    
    return jsonify(heatmap_data)

# Serve static files
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

if __name__ == '__main__':
    print(f"Starting KV-Store Benchmark Visualization Server...")
    print(f"Results directory: {RESULTS_DIR}")
    print(f"Access the dashboard at: http://localhost:5002")
    app.run(debug=True, host='0.0.0.0', port=5002) 