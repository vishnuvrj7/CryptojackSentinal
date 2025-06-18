# app.py
from flask import Flask, render_template, send_file
from flask_socketio import SocketIO, emit
import psutil
import time
import threading
import datetime
import os

app = Flask(__name__)
# Configure SocketIO to allow connections from any origin for local development
# In production, specify allowed origins for security
socketio = SocketIO(app, cors_allowed_origins="*")

# Store historical data for charts
# Max points to keep in history for the charts
MAX_CHART_POINTS = 30 
chart_data_history = {
    "labels": [''] * MAX_CHART_POINTS,
    "cpu": [0] * MAX_CHART_POINTS,
    "memory": [0] * MAX_CHART_POINTS,
    "network_rx": [0] * MAX_CHART_POINTS # Network received bytes per second
}

# Thresholds for anomaly detection
HIGH_CPU_THRESHOLD = 90 # Percentage
HIGH_CPU_DURATION_SECONDS = 10 # Duration in seconds to trigger an alert

# Keep track of high CPU occurrences
high_cpu_counter = 0

# Store alerts (for displaying in UI, not primary persistence)
alerts = []

# Define the path for the alerts log file
ALERTS_LOG_FILE = 'alerts.log'

# Initialize network counters globally for delta calculation
prev_net_io_counters = psutil.net_io_counters()
# Store the last time data was collected for accurate delta calculations
last_collection_time = time.time()


# Function to write any entry to the log file
def write_log_entry(timestamp, log_type, message):
    try:
        with open(ALERTS_LOG_FILE, 'a') as f: # 'a' for append mode
            f.write(f"{timestamp} [{log_type.upper()}]: {message}\n")
    except Exception as e:
        print(f"Error writing to alert log file: {e}")

# Function to get real-time system metrics
def get_system_metrics():
    global prev_net_io_counters, high_cpu_counter, last_collection_time

    cpu_percent = psutil.cpu_percent(interval=None) 
    memory_percent = psutil.virtual_memory().percent

    current_net_io_counters = psutil.net_io_counters()
    
    current_collection_time = time.time()
    time_delta = current_collection_time - last_collection_time
    last_collection_time = current_collection_time

    network_rx_kbps = 0
    if time_delta > 0: 
        network_rx_kbps = (current_net_io_counters.bytes_recv - prev_net_io_counters.bytes_recv) / time_delta / 1024.0
    network_rx_kbps = round(network_rx_kbps, 2)

    timestamp = datetime.datetime.now().strftime('%H:%M:%S')

    # Log all metrics to the file
    metric_log_message = (
        f"CPU: {cpu_percent:.1f}%, Mem: {memory_percent:.1f}%, Net (RX): {network_rx_kbps:.2f} KB/s"
    )
    write_log_entry(timestamp, "METRICS", metric_log_message)

    # Update history for UI charts
    chart_data_history["labels"].append(timestamp)
    chart_data_history["labels"].pop(0)
    chart_data_history["cpu"].append(cpu_percent)
    chart_data_history["cpu"].pop(0)
    chart_data_history["memory"].append(memory_percent)
    chart_data_history["memory"].pop(0)
    chart_data_history["network_rx"].append(network_rx_kbps)
    chart_data_history["network_rx"].pop(0)

    # Anomaly Detection Logic
    if cpu_percent > HIGH_CPU_THRESHOLD:
        high_cpu_counter += 1
        if high_cpu_counter * 0.5 >= HIGH_CPU_DURATION_SECONDS: 
            alert_message = f"High CPU usage detected: {cpu_percent:.1f}%"
            if not any(a['message'] == alert_message and (datetime.datetime.now() - datetime.datetime.strptime(a['timestamp'], '%H:%M:%S')).total_seconds() < HIGH_CPU_DURATION_SECONDS * 2 for a in alerts):
                 add_alert_to_ui(alert_message, type="high_cpu") 
            high_cpu_counter = 0 
    else:
        high_cpu_counter = 0 

    return {
        "cpu_usage": cpu_percent,
        "memory_usage": memory_percent,
        "network_activity": network_rx_kbps,
        "chart_history": chart_data_history,
        "alerts": alerts 
    }

# Function to get top processes
def get_top_processes(count=5):
    processes_objects = []
    # First pass: Get all process objects and prime their cpu_percent counters
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            p = psutil.Process(proc.info['pid'])
            # Call cpu_percent with interval=None to prime it for this specific process
            p.cpu_percent(interval=None) 
            processes_objects.append(p)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Introduce a short sleep to allow CPU usage to accumulate for individual processes
    time.sleep(0.05) # This will add a tiny delay to the process list update, but improves accuracy

    final_processes_data = []
    for p in processes_objects:
        try:
            final_processes_data.append({
                'name': p.name(),
                # Now call cpu_percent without interval to get the delta since the prime call
                'cpu': p.cpu_percent(interval=None), 
                'memory': p.memory_percent()
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    # Filter out processes with 0% CPU only if there are enough other processes to display
    # This ensures something is always displayed, but prioritizes active processes
    active_processes = [p for p in final_processes_data if p['cpu'] > 0]
    
    if len(active_processes) >= count:
        final_processes_data = active_processes
    # If not enough active processes, keep all of them (including 0% ones)
    
    final_processes_data.sort(key=lambda x: x['cpu'], reverse=True)
    return final_processes_data[:count]

# Function to add alert to the in-memory list (for UI) and emit to frontend
def add_alert_to_ui(message, type="warning"):
    current_time_str = datetime.datetime.now().strftime('%H:%M:%S')
    new_alert_entry = {
        "message": message,
        "timestamp": current_time_str,
        "type": type
    }
    
    # Add to in-memory list for UI display
    alerts.insert(0, new_alert_entry)
    if len(alerts) > 10: 
        alerts.pop()
    
    # Write to persistent log file
    write_log_entry(current_time_str, type, message)

    # Emit to frontend via SocketIO for real-time display
    socketio.emit('new_alert', {
        "message": message,
        "timestamp": current_time_str,
        "type": type
    })

# Background thread for sending real-time data
def background_monitor_thread():
    while True:
        try:
            metrics = get_system_metrics()
            top_processes = get_top_processes()
            
            socketio.emit('real_time_data', {
                'metrics': metrics,
                'processes': top_processes
            })
        except Exception as e:
            print(f"Error in background_monitor_thread: {e}")
        
        time.sleep(0.5)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def test_connect():
    print('Client connected')
    emit('status', {'data': 'Connected'})
    add_alert_to_ui("Monitoring session started.", type="info") 

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')
    write_log_entry(datetime.datetime.now().strftime('%H:%M:%S'), "INFO", "Client disconnected.")


# New route for downloading alert logs
@app.route('/download_alerts')
def download_alerts():
    if os.path.exists(ALERTS_LOG_FILE):
        return send_file(ALERTS_LOG_FILE, as_attachment=True, download_name='cryptojack_sentinel_log.log', mimetype='text/plain')
    else:
        return "No alert logs found.", 404

if __name__ == '__main__':
    # Initialize the alert log file if it doesn't exist
    if not os.path.exists(ALERTS_LOG_FILE):
        try:
            with open(ALERTS_LOG_FILE, 'w') as f:
                f.write(f"--- Cryptojack Sentinel Full Log - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---\n\n")
        except Exception as e:
            print(f"Error creating alert log file: {e}")

    monitor_thread = threading.Thread(target=background_monitor_thread)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    socketio.run(app, debug=False)
