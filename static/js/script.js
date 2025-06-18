// static/js/script.js
document.addEventListener('DOMContentLoaded', function () {
    // Connect to the Socket.IO server running on Flask
    const socket = io('http://127.0.0.1:5000'); 

    const CHART_POINTS = 30; // Number of data points to display on the charts

    // Utility function to create initial empty data arrays
    const createInitialData = (length, value = 0) => Array(length).fill(value);
    const createInitialLabels = (length) => Array(length).fill('');
    
    // Main chart data structure
    const chartData = {
        labels: createInitialLabels(CHART_POINTS),
        datasets: [
            {
                label: 'CPU Usage',
                data: createInitialData(CHART_POINTS),
                borderColor: 'rgb(8, 145, 178)', // Cyan-600
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                fill: true,
                tension: 0.4, // Smooth lines
                pointRadius: 0, // Hide points
                borderWidth: 2,
            },
            {
                label: 'Memory Usage',
                data: createInitialData(CHART_POINTS),
                borderColor: 'rgb(124, 58, 237)', // Violet-600
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
            {
                label: 'Network Activity (KB/s)',
                data: createInitialData(CHART_POINTS),
                borderColor: 'rgb(217, 119, 6)', // Amber-600
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            }
        ]
    };

    // Common options for all Chart.js instances
    const commonChartOptions = {
        maintainAspectRatio: false, // Important for responsiveness
        responsive: true,
        animation: {
            duration: 150 // Smoother animation for 0.5s updates
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100, // Max for CPU/Memory % (Network will scale automatically)
                grid: {
                    color: 'rgba(203, 213, 225, 0.5)', // Light grid lines
                    drawBorder: false,
                },
                ticks: {
                    color: 'rgb(100, 116, 139)', // Tick label color
                    font: { size: 10 }
                }
            },
            x: {
                grid: {
                    display: false, // Hide x-axis grid lines
                },
                ticks: {
                    color: 'rgb(100, 116, 139)', // Tick label color
                    font: { size: 10 },
                    maxRotation: 0, // Prevent labels from rotating
                    minRotation: 0,
                    // Callback to wrap long labels if needed (not strictly required for H:M:S)
                    callback: function(value, index, values) {
                        const label = this.getLabelForValue(value);
                        if (label.length > 16) { // Example: wrap if longer than 16 chars
                            return label.match(/.{1,8}/g); // Break into 8-char segments
                        }
                        return label;
                    }
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    color: 'rgb(51, 65, 85)', // Legend text color
                    font: {
                        weight: '500'
                    }
                }
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false, // Show tooltip even if not directly over a point
                backgroundColor: 'rgba(15, 23, 42, 0.8)', // Dark tooltip background
                titleFont: { weight: 'bold' },
                bodyFont: { size: 12 },
                cornerRadius: 4,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            // Dynamically add unit based on dataset label
                            const unit = label.includes('Network') ? ' KB/s' : '%';
                            label += context.parsed.y.toFixed(1) + unit;
                        }
                        return label;
                    }
                }
            }
        }
    };
    
    // Specific options for mini charts (simplified)
    const miniChartOptions = {
        ...commonChartOptions,
        scales: { y: { display: false }, x: { display: false } }, // Hide axes for mini charts
        plugins: { legend: { display: false }, tooltip: { enabled: false } } // Hide legend and tooltip
    };

    // Initialize Chart.js instances
    const mainChartCtx = document.getElementById('main-chart').getContext('2d');
    const mainChart = new Chart(mainChartCtx, {
        type: 'line',
        data: chartData,
        options: commonChartOptions
    });

    const cpuMiniChart = new Chart(document.getElementById('cpu-mini-chart').getContext('2d'), {
        type: 'line',
        data: { labels: chartData.labels, datasets: [chartData.datasets[0]] },
        options: miniChartOptions
    });
    const memMiniChart = new Chart(document.getElementById('mem-mini-chart').getContext('2d'), {
        type: 'line',
        data: { labels: chartData.labels, datasets: [chartData.datasets[1]] },
        options: miniChartOptions
    });
    const netMiniChart = new Chart(document.getElementById('net-mini-chart').getContext('2d'), {
        type: 'line',
        data: { labels: chartData.labels, datasets: [chartData.datasets[2]] },
        // For network, y-axis might go higher than 100, so remove max:100 constraint
        options: { ...miniChartOptions, scales: { y: { beginAtZero: true, display: false }, x: { display: false } } }
    });

    // Get references to DOM elements
    const cpuUsageText = document.getElementById('cpu-usage-text');
    const memUsageText = document.getElementById('mem-usage-text');
    const netUsageText = document.getElementById('net-usage-text');
    const processListEl = document.getElementById('process-list');
    const alertListEl = document.getElementById('alert-list');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    let noAlertsMessage = alertListEl.querySelector('div'); // Reference to the "No alerts" message

    // Function to add an alert to the log
    function addAlert(message, type) {
        if (noAlertsMessage) {
            alertListEl.innerHTML = ''; // Remove "No alerts" message if first alert arrives
            noAlertsMessage = null;
        }

        const timestamp = new Date().toLocaleTimeString();
        const alertEl = document.createElement('div');
        alertEl.className = 'alert-item-enter p-3 rounded-lg flex items-start space-x-3';
        
        // Apply different styles based on alert type
        if (type === 'high_cpu') {
            alertEl.classList.add('bg-red-50', 'text-red-800');
        } else if (type === 'warning') {
            alertEl.classList.add('bg-amber-50', 'text-amber-800');
        } else { // Default or general info
            alertEl.classList.add('bg-blue-50', 'text-blue-800');
        }

        // Unicode icons for alerts
        const icon = `<div class="w-5 h-5 flex-shrink-0 mt-0.5">${type === 'high_cpu' ? 
            `&#x26A0;&#xFE0F;` : // Warning sign emoji
            `&#x1F6A8;` // Police car light emoji or similar for general alerts
        }</div>`;

        alertEl.innerHTML = `
            ${icon}
            <div>
                <p class="font-semibold text-sm">${message}</p>
                <p class="text-xs opacity-80">${timestamp}</p>
            </div>
        `;
        alertListEl.prepend(alertEl); // Add new alert to the top
        
        // Trigger CSS animation for new alert
        requestAnimationFrame(() => {
             alertEl.classList.add('alert-item-enter-active');
        });
        
        // Update status indicator to red if it's a high CPU alert
        if (type === 'high_cpu') {
            statusIndicator.classList.remove('bg-green-100', 'text-green-800');
            statusIndicator.classList.add('bg-red-100', 'text-red-800');
            statusText.textContent = "Alert Detected!";
        }
    }

    // Function to update the top processes list
    function updateProcessList(processes) {
        processListEl.innerHTML = ''; // Clear existing list
        if (processes.length === 0) {
            processListEl.innerHTML = '<div class="text-center text-slate-400 py-16">No processes data available.</div>';
            return;
        }

        processes.forEach(p => {
            const width = Math.min(p.cpu, 100); // Ensure bar doesn't exceed 100%
            const processEl = document.createElement('div');
            processEl.className = 'flex items-center space-x-4 text-sm';
            processEl.innerHTML = `
                <span class="font-medium text-slate-700 w-28 truncate">${p.name}</span>
                <div class="flex-1 bg-slate-200 rounded-full h-2.5">
                    <div class="bg-cyan-600 h-2.5 rounded-full" style="width: ${width}%"></div>
                </div>
                <span class="font-mono text-slate-500 w-16 text-right">${p.cpu.toFixed(1)}%</span>
            `;
            processListEl.appendChild(processEl);
        });
    }
            
    // Socket.IO event listeners
    socket.on('connect', function() {
        console.log('Connected to server');
        statusIndicator.classList.remove('bg-red-100', 'text-red-800');
        statusIndicator.classList.add('bg-green-100', 'text-green-800');
        statusText.textContent = "Monitoring Active";
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        statusIndicator.classList.remove('bg-green-100', 'text-green-800');
        statusIndicator.classList.add('bg-red-100', 'text-red-800');
        statusText.textContent = "Disconnected";
    });

    // Listener for real-time data from the backend
    socket.on('real_time_data', function(data) {
        const metrics = data.metrics;
        const processes = data.processes;

        // Update live metrics text
        cpuUsageText.textContent = `${metrics.cpu_usage.toFixed(1)}%`;
        memUsageText.textContent = `${metrics.memory_usage.toFixed(1)}%`;
        netUsageText.textContent = `${metrics.network_activity.toFixed(1)} KB/s`;

        // Update main chart history
        chartData.labels = metrics.chart_history.labels;
        chartData.datasets[0].data = metrics.chart_history.cpu;
        chartData.datasets[1].data = metrics.chart_history.memory;
        chartData.datasets[2].data = metrics.chart_history.network_rx;

        mainChart.update();
        cpuMiniChart.update();
        memMiniChart.update();
        netMiniChart.update();

        // Update process list
        updateProcessList(processes);
    });

    // Listener for new alerts from the backend
    socket.on('new_alert', function(alert) {
        addAlert(alert.message, alert.type);
    });
});
