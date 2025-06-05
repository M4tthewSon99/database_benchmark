// KV-Store Benchmark Comprehensive Visualization Dashboard

const API_BASE = "http://localhost:5002/api";

// Global data storage
let globalData = null;

// Track which sections have been loaded
let sectionsLoaded = {
    overview: false,
    workloads: false,
    scalability: false,
    latency: false,
    design: false,
};

// Color schemes for different data structures
const colors = {
    hashtable_inmemory: {
        redis: "#8B5CF6",
        memcached: "#A855F7",
    },
    btree: {
        mongodb: "#3B82F6",
    },
    lsm_tree: {
        rocksdb: "#10B981",
    },
};

// Data structure mapping for cleaner display names
const dataStructureNames = {
    hashtable_inmemory: "Hashtable",
    btree: "B+ Tree",
    lsm_tree: "LSM Tree",
};

// Load all data and initialize dashboard
async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/data`);
        globalData = await response.json();

        if (globalData.error) {
            showError(globalData.error);
            return;
        }

        // Initialize only the overview section first
        await loadOverviewDashboard();
        sectionsLoaded.overview = true;

        console.log("Dashboard loaded successfully");
    } catch (error) {
        console.error("Error loading data:", error);
        showError(
            "Error loading data. Please ensure the backend server is running."
        );
    }
}

// Error display function
function showError(message) {
    document.getElementById(
        "overview-section"
    ).innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">${message}</div>`;
}

// Section navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll(".section-content").forEach((section) => {
        section.classList.add("hidden");
    });

    // Show selected section
    document
        .getElementById(`${sectionName}-section`)
        .classList.remove("hidden");

    // Update navigation tabs
    document.querySelectorAll(".nav-tab").forEach((tab) => {
        tab.classList.remove("active");
    });
    event.target.classList.add("active");

    // Load section data if not already loaded
    loadSectionData(sectionName);
}

// Load data for specific sections when they're first accessed
async function loadSectionData(sectionName) {
    if (sectionsLoaded[sectionName] || !globalData) {
        return;
    }

    try {
        switch (sectionName) {
            case "comparison":
                await loadComparisonAnalysis();
                break;
            case "workloads":
                await loadWorkloadAnalysis();
                break;
            case "scalability":
                await loadScalabilityAnalysis();
                break;
            case "latency":
                await loadLatencyAnalysis();
                break;
            case "design":
                await loadDesignAnalysis();
                break;
        }
        sectionsLoaded[sectionName] = true;
    } catch (error) {
        console.error(`Error loading ${sectionName} section:`, error);
    }
}

// 1. Performance Overview Dashboard
async function loadOverviewDashboard() {
    try {
        const overviewResponse = await fetch(`${API_BASE}/overview`);
        const overviewData = await overviewResponse.json();

        // Update summary cards
        updateSummaryCards(overviewData.best_performers);

        // Create overall throughput chart
        createOverallThroughputChart();
    } catch (error) {
        console.error("Error loading overview:", error);
    }
}

function updateSummaryCards(bestPerformers) {
    // Map workload names to correct element IDs
    const workloadMapping = {
        read_heavy: "readHeavy",
        write_heavy: "writeHeavy",
        balanced: "balanced",
        range_query: "rangeQuery",
    };

    Object.keys(workloadMapping).forEach((workload) => {
        const data = bestPerformers[workload];
        if (data) {
            const elementPrefix = workloadMapping[workload];
            const winnerElement = document.getElementById(
                `${elementPrefix}Winner`
            );
            const throughputElement = document.getElementById(
                `${elementPrefix}Throughput`
            );

            if (winnerElement && throughputElement) {
                winnerElement.textContent = `${data.database} (${
                    dataStructureNames[data.data_structure]
                })`;
                throughputElement.textContent = `${Math.round(
                    data.throughput
                ).toLocaleString()} ops/sec`;
            } else {
                console.warn(
                    `Elements not found for ${workload}: ${elementPrefix}Winner, ${elementPrefix}Throughput`
                );
            }
        }
    });
}

function createOverallThroughputChart() {
    const traces = [];
    const databases = ["redis", "memcached", "mongodb", "rocksdb"];
    const workloads = ["balanced", "read_heavy", "write_heavy", "range_query"];

    workloads.forEach((workload) => {
        const trace = {
            x: [],
            y: [],
            name: workload
                .replace("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
            type: "bar",
            text: [],
            textposition: "auto",
        };

        databases.forEach((db) => {
            // Find all data points for this database and workload across all thread counts
            const dataPoints = globalData.data.filter(
                (d) => d.database === db && d.workload === workload
            );

            if (dataPoints.length > 0) {
                // Find the data point with maximum throughput across all thread configurations
                const bestDataPoint = dataPoints.reduce((max, current) => {
                    return current.run_throughput_ops_sec >
                        max.run_throughput_ops_sec
                        ? current
                        : max;
                });

                trace.x.push(db.toUpperCase());
                trace.y.push(bestDataPoint.run_throughput_ops_sec);
                trace.text.push(
                    Math.round(
                        bestDataPoint.run_throughput_ops_sec
                    ).toLocaleString()
                );
            }
        });

        traces.push(trace);
    });

    const layout = {
        title: "Peak Performance Comparison (Best Threading Configuration)",
        xaxis: { title: "Database" },
        yaxis: { title: "Throughput (ops/sec)" },
        barmode: "group",
        height: 500,
    };

    Plotly.newPlot("overallThroughputChart", traces, layout);
}

// 2. Data Structure Comparison Analysis
async function loadComparisonAnalysis() {
    createWorkloadComparisonCharts();
    createPerformanceHeatmap();
    generateResearchInsights();
}

function createWorkloadComparisonCharts() {
    // Map workload names to correct element IDs
    const workloadMapping = {
        read_heavy: "readHeavy",
        write_heavy: "writeHeavy",
        balanced: "balanced",
        range_query: "rangeQuery",
    };

    Object.keys(workloadMapping).forEach((workload) => {
        const chartId = `${workloadMapping[workload]}Comparison`;
        const element = document.getElementById(chartId);

        if (!element) {
            console.warn(
                `Element ${chartId} not found, skipping chart creation`
            );
            return;
        }

        const workloadData = globalData.data.filter(
            (d) => d.workload === workload
        );

        const traces = [];
        const databases = [...new Set(workloadData.map((d) => d.database))];

        databases.forEach((db) => {
            const dbData = workloadData.filter((d) => d.database === db);
            if (dbData.length === 0) return;

            // Sort by thread count to ensure proper line progression
            dbData.sort((a, b) => a.threads - b.threads);

            const dataStructure = dbData[0].data_structure;

            const trace = {
                x: dbData.map((d) => d.threads), // Use numerical values for proper ordering
                y: dbData.map((d) => d.run_throughput_ops_sec),
                name: `${db} (${dataStructureNames[dataStructure]})`,
                type: "scatter",
                mode: "lines+markers",
                line: {
                    color: colors[dataStructure][db],
                    width: 3,
                },
                marker: {
                    size: 8,
                    color: colors[dataStructure][db],
                },
            };

            traces.push(trace);
        });

        const layout = {
            title: `${workload
                .replace("_", " ")
                .replace(/\b\w/g, (l) =>
                    l.toUpperCase()
                )} Workload Thread Scaling`,
            xaxis: {
                title: "Thread Count",
                type: "linear",
                tickvals: [1, 4, 8, 16],
                ticktext: ["1", "4", "8", "16"],
            },
            yaxis: { title: "Throughput (ops/sec)" },
            height: 400,
            margin: { t: 40, b: 40 },
            legend: {
                orientation: "v",
                x: 1.02,
                y: 1,
            },
        };

        Plotly.newPlot(chartId, traces, layout);
    });
}

function createPerformanceHeatmap() {
    const element = document.getElementById("performanceHeatmap");
    if (!element) {
        console.warn("performanceHeatmap element not found");
        return;
    }

    const heatmapData = [];
    const databases = [];
    const workloads = [];

    // Create matrix data
    const matrix = {};
    globalData.data.forEach((d) => {
        const key = `${d.database}_${d.threads}t`;
        if (!matrix[key]) {
            matrix[key] = {};
            databases.push(key);
        }
        matrix[key][d.workload] = d.run_throughput_ops_sec;
        if (!workloads.includes(d.workload)) {
            workloads.push(d.workload);
        }
    });

    // Convert to Plotly format
    const z = [];
    const cleanDatabases = [...new Set(databases)].sort();
    const cleanWorkloads = [...new Set(workloads)].sort();

    cleanDatabases.forEach((db) => {
        const row = [];
        cleanWorkloads.forEach((workload) => {
            row.push(matrix[db] ? matrix[db][workload] || 0 : 0);
        });
        z.push(row);
    });

    const trace = {
        z: z,
        x: cleanWorkloads,
        y: cleanDatabases,
        type: "heatmap",
        colorscale: "Viridis",
        showscale: true,
    };

    const layout = {
        title: "Performance Heatmap (Throughput)",
        xaxis: { title: "Workload" },
        yaxis: { title: "Database (Thread Count)" },
        height: 500,
    };

    Plotly.newPlot("performanceHeatmap", [trace], layout);
}

function generateResearchInsights() {
    const element = document.getElementById("researchInsights");
    if (!element) {
        console.warn("researchInsights element not found");
        return;
    }

    const insights = [
        {
            title: "Threading Scalability Patterns",
            color: "border-blue-500",
            textColor: "text-blue-700",
            findings: [
                "RocksDB (LSM Tree) achieves peak performance at 4-8 threads (118K-119K ops/sec) with optimal threading at 4 threads",
                "Redis (Hashtable) demonstrates consistent linear scaling across all workloads with clean progression from 42K → 104K ops/sec",
                "MongoDB (B+ Tree) shows thread saturation beyond 8 threads with performance degradation at 16 threads",
                "Memcached exhibits scaling bottlenecks with performance plateaus or decreases beyond 8 threads",
            ],
        },
        {
            title: "Data Structure Performance Rankings",
            color: "border-green-500",
            textColor: "text-green-700",
            findings: [
                "Read-Heavy Workloads (16 threads): RocksDB (118,765) > Redis (98,135) > Memcached (56,625) > MongoDB (45,537)",
                "Range Query Performance: RocksDB (67,331) dominates, MongoDB (25,830) provides moderate performance, Redis (2,244) fails catastrophically",
                "Balanced Workloads: Redis leads with 103K ops/sec, followed by RocksDB at 92K ops/sec",
                "Range queries expose 30x performance gap between best (RocksDB) and worst (Redis) implementations",
            ],
        },
        {
            title: "Threading Sweet Spots & Bottlenecks",
            color: "border-purple-500",
            textColor: "text-purple-700",
            findings: [
                "RocksDB: 4-8 threads optimal, minimal degradation at 16 threads",
                "Redis: Scales linearly, 16 threads beneficial across all workloads",
                "MongoDB: 8 threads optimal, 16 threads show contention issues",
                "Memcached: 8 threads peak, performance degrades beyond this point",
            ],
        },
        {
            title: "Architectural Trade-offs Revealed",
            color: "border-orange-500",
            textColor: "text-orange-700",
            findings: [
                "LSM trees excel at reads when properly cached (RocksDB's 119K ops/sec) despite write-optimization design",
                "Hashtables dominate balanced workloads but fail catastrophically on range queries (97% performance drop)",
                "B+ Trees provide consistent but moderate performance across all operations",
                "Memory contention becomes significant bottleneck beyond 8 threads for most systems",
            ],
        },
    ];

    const insightsHtml = insights
        .map(
            (insight) => `
        <div class="border-l-4 ${
            insight.color
        } pl-6 py-4 bg-gray-50 rounded-r-lg">
            <h4 class="font-bold text-lg ${insight.textColor} mb-3">${
                insight.title
            }</h4>
            <ul class="space-y-2">
                ${insight.findings
                    .map(
                        (finding) => `
                    <li class="text-sm text-gray-700">
                        <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        ${finding}
                    </li>
                `
                    )
                    .join("")}
            </ul>
        </div>
    `
        )
        .join("");

    element.innerHTML = insightsHtml;
}

// 3. Workload-Specific Deep Dives
async function loadWorkloadAnalysis() {
    createWorkloadAnalysisCharts();
}

function createWorkloadAnalysisCharts() {
    // Map workload names to correct element IDs
    const workloadMapping = {
        read_heavy: "readHeavy",
        write_heavy: "writeHeavy",
        balanced: "balanced",
        range_query: "rangeQuery",
    };

    const threadCounts = [1, 4, 8, 16];

    Object.keys(workloadMapping).forEach((workload) => {
        const workloadKey = workloadMapping[workload];

        threadCounts.forEach((threadCount) => {
            const chartId = `${workloadKey}${threadCount}Thread${
                threadCount === 1 ? "" : "s"
            }`;
            const element = document.getElementById(chartId);

            if (!element) {
                console.warn(
                    `Element ${chartId} not found, skipping chart creation`
                );
                return;
            }

            const workloadData = globalData.data.filter(
                (d) => d.workload === workload && d.threads === threadCount
            );

            if (workloadData.length === 0) {
                console.warn(
                    `No data found for ${workload} with ${threadCount} threads`
                );
                return;
            }

            const trace = {
                x: workloadData.map((d) => d.database),
                y: workloadData.map((d) => d.run_throughput_ops_sec),
                type: "bar",
                marker: {
                    color: workloadData.map(
                        (d) => colors[d.data_structure][d.database]
                    ),
                },
                text: workloadData.map((d) =>
                    Math.round(d.run_throughput_ops_sec).toLocaleString()
                ),
                textposition: "auto",
                showlegend: false,
            };

            const layout = {
                xaxis: {
                    title: "",
                    tickfont: { size: 10 },
                },
                yaxis: {
                    title: "ops/sec",
                    titlefont: { size: 10 },
                    tickfont: { size: 9 },
                },
                height: 200,
                margin: { t: 10, b: 40, l: 60, r: 10 },
                font: { size: 9 },
            };

            Plotly.newPlot(chartId, [trace], layout);
        });
    });
}

// 4. Threading Scalability Analysis
async function loadScalabilityAnalysis() {
    createScalabilityChart();
}

function createScalabilityChart() {
    const databases = [...new Set(globalData.data.map((d) => d.database))];
    const workloads = [
        {
            name: "balanced",
            displayName: "Balanced",
            chartId: "balancedScalabilityChart",
            color: "#1f77b4",
        },
        {
            name: "read_heavy",
            displayName: "Read Heavy",
            chartId: "readHeavyScalabilityChart",
            color: "#ff7f0e",
        },
        {
            name: "write_heavy",
            displayName: "Write Heavy",
            chartId: "writeHeavyScalabilityChart",
            color: "#2ca02c",
        },
        {
            name: "range_query",
            displayName: "Range Query",
            chartId: "rangeQueryScalabilityChart",
            color: "#d62728",
        },
    ];

    workloads.forEach((workload) => {
        const element = document.getElementById(workload.chartId);
        if (!element) {
            console.warn(`${workload.chartId} element not found`);
            return;
        }

        const traces = [];

        databases.forEach((db) => {
            const dbData = globalData.data.filter(
                (d) => d.database === db && d.workload === workload.name
            );
            dbData.sort((a, b) => a.threads - b.threads);

            if (dbData.length === 0) return;

            const dataStructure = dbData[0].data_structure;
            const singleThreadPerf = dbData.find(
                (d) => d.threads === 1
            )?.run_throughput_ops_sec;

            if (!singleThreadPerf) return;

            // Calculate scaling efficiency as percentage
            const efficiencyData = dbData.map((d) => {
                const idealPerformance = singleThreadPerf * d.threads;
                const actualPerformance = d.run_throughput_ops_sec;
                return (actualPerformance / idealPerformance) * 100;
            });

            const trace = {
                x: dbData.map((d) => d.threads),
                y: efficiencyData,
                name: `${db} (${dataStructureNames[dataStructure]})`,
                type: "scatter",
                mode: "lines+markers",
                line: {
                    color: colors[dataStructure][db],
                    width: 3,
                },
                marker: {
                    size: 8,
                    color: colors[dataStructure][db],
                },
            };

            traces.push(trace);
        });

        // Add ideal 100% efficiency line
        traces.push({
            x: [1, 4, 8, 16],
            y: [100, 100, 100, 100],
            name: "Ideal 100% Efficiency",
            type: "scatter",
            mode: "lines",
            line: { dash: "dash", color: "gray", width: 2 },
            showlegend: false,
        });

        const layout = {
            title: `${workload.displayName} Scaling Efficiency`,
            xaxis: {
                title: "Thread Count",
                type: "linear",
                tickvals: [1, 4, 8, 16],
                ticktext: ["1", "4", "8", "16"],
            },
            yaxis: {
                title: "Efficiency (%)",
                range: [0, 110],
            },
            height: 400,
            margin: { t: 40, b: 40, l: 60, r: 10 },
            legend: {
                orientation: "h",
                x: 0,
                y: -0.2,
                xanchor: "left",
                yanchor: "top",
            },
        };

        Plotly.newPlot(workload.chartId, traces, layout);
    });
}

// 5. Latency Analysis
async function loadLatencyAnalysis() {
    createLatencyPercentilesChart();
}

function createLatencyPercentilesChart() {
    const workloads = [
        {
            name: "balanced",
            displayName: "Balanced",
            chartId: "balancedLatencyChart",
        },
        {
            name: "read_heavy",
            displayName: "Read Heavy",
            chartId: "readHeavyLatencyChart",
        },
        {
            name: "write_heavy",
            displayName: "Write Heavy",
            chartId: "writeHeavyLatencyChart",
        },
        {
            name: "range_query",
            displayName: "Range Query",
            chartId: "rangeQueryLatencyChart",
        },
    ];

    workloads.forEach((workload) => {
        const element = document.getElementById(workload.chartId);
        if (!element) {
            console.warn(`${workload.chartId} element not found`);
            return;
        }

        const databases = [...new Set(globalData.data.map((d) => d.database))];

        // Use different metrics for range queries vs regular operations
        const metrics =
            workload.name === "range_query"
                ? [
                      "run_scan_avg_latency_us",
                      "run_scan_95p_latency_us",
                      "run_scan_99p_latency_us",
                  ]
                : [
                      "run_read_avg_latency_us",
                      "run_read_95p_latency_us",
                      "run_read_99p_latency_us",
                  ];

        const metricNames = ["Average", "95th Percentile", "99th Percentile"];

        const traces = metrics.map((metric, idx) => ({
            x: databases,
            y: databases.map((db) => {
                // Try 8 threads first, then fallback to other thread counts
                let data = globalData.data.find(
                    (d) =>
                        d.database === db &&
                        d.workload === workload.name &&
                        d.threads === 8
                );

                // If no data for 8 threads, try other thread counts
                if (!data || !data[metric]) {
                    data = globalData.data.find(
                        (d) =>
                            d.database === db &&
                            d.workload === workload.name &&
                            d[metric] !== undefined &&
                            d[metric] !== null &&
                            d[metric] > 0
                    );
                }

                return data && data[metric] ? data[metric] : 0;
            }),
            name: metricNames[idx],
            type: "bar",
            marker: {
                color:
                    idx === 0 ? "#60A5FA" : idx === 1 ? "#F59E0B" : "#EF4444",
            },
        }));

        const layout = {
            title: `${workload.displayName} Latency Percentiles`,
            xaxis: { title: "Database" },
            yaxis: { title: "Latency (μs)" },
            barmode: "group",
            height: 400,
            margin: { t: 40, b: 40, l: 60, r: 10 },
            legend: {
                orientation: "h",
                x: 0,
                y: -0.2,
                xanchor: "left",
                yanchor: "top",
            },
        };

        Plotly.newPlot(workload.chartId, traces, layout);
    });
}

// 6. Design Impact Analysis
async function loadDesignAnalysis() {
    // Static section with comprehensive analysis - no charts needed
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", loadData);

// Export functions for global access
window.showSection = showSection;
