# Cryptojack Sentinel

Cryptojack Sentinel is a real-time system resource monitoring web application designed to help detect potential cryptojacking attempts by tracking CPU usage, memory consumption, and network activity. It provides a user-friendly dashboard with live graphs, a top processes list, and an alert log for unusual resource spikes.

## Features

- **Real-time Monitoring:** Continuously displays live CPU, Memory, and Network (received data) usage.
- **Smooth Visualizations:** Graphs update every 0.5 seconds with smooth animations for a fluid user experience.
- **Anomaly Detection:** Alerts users to unusual and sustained high CPU consumption, indicating potential cryptojacking.
- **Top Processes:** Identifies and lists the applications currently consuming the most CPU resources.
- **Comprehensive Logging:** All system metrics and alerts are logged to a persistent `alerts.log` file.
- **Downloadable Logs:** Users can download the full activity log for further analysis.
- **User-Friendly Interface:** An aesthetically pleasing and responsive dashboard built with a modern design and a calm color palette.

## Technology Stack

### Backend:
- **Python:** The core language for server-side logic and system interaction.
- **Flask:** A lightweight Python web framework for handling HTTP requests and serving the frontend.
- **Flask-SocketIO:** Enables real-time, bi-directional communication between the server and the client.
- **psutil:** A cross-platform library used to retrieve system and process information (CPU, memory, network).

### Frontend:
- **HTML5:** For the structure of the web pages.
- **CSS3 (Tailwind CSS):** For rapid and responsive UI styling.
- **JavaScript (Vanilla JS):** For dynamic interactions, real-time data processing, and WebSocket communication.
- **Chart.js:** For rendering interactive and visually appealing data graphs.

## Local Setup Instructions

Follow these steps to set up and run Cryptojack Sentinel on your local machine.

### 1. Prerequisites
- Python 3.7 or higher installed on your system.
- `pip` (Python package installer) configured.

### 2. Clone the Repository (or recreate files)
If you have these files in a structured project folder already, skip this step. Otherwise, manually create the following folder structure and files:

```
cryptojack_sentinel/
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js
```

Place the respective code into each file as provided in the previous steps of our conversation.

### 3. Create a Python Virtual Environment (Recommended)
It's highly recommended to use a virtual environment to manage dependencies for your project.

Open your terminal or command prompt and navigate to the `cryptojack_sentinel` directory:

```bash
cd path/to/cryptojack_sentinel
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

- **On Windows:**
  ```bash
  .\venv\Scripts\activate
  ```
- **On macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```

### 4. Install Dependencies
With your virtual environment activated, install the required Python packages using `pip`:

```bash
pip install -r requirements.txt
```

The `requirements.txt` should contain:

```
Flask==2.3.3
Flask-SocketIO==5.3.0
python-engineio==4.3.1
python-socketio==5.8.0
psutil==5.9.8
Werkzeug==2.3.7
```

### 5. Run the Application
Once all dependencies are installed, you can start the Flask application:

```bash
python app.py
```

You should see output similar to this, indicating the server is running:

```
 * Serving Flask app 'app'
 * Debug mode: off
Client connected
Monitoring session started.
```

### 6. Access the Web Interface
Open your web browser and navigate to:

```
http://127.0.0.1:5000
```

You should now see the Cryptojack Sentinel dashboard displaying real-time system metrics.

## Usage

- **Live Metrics:** Observe the current CPU, Memory, and Network usage in the top cards.
- **Resource Usage History:** The main graph displays historical trends. It updates every 0.5 seconds.
- **Top Processes:** A dynamically updated list shows the top 5 processes consuming the most CPU. Even idle processes might show 0.0% CPU on an idle system, but active processes will show their consumption.
- **Alert Log:** This section displays alerts for sustained high CPU usage.
- **Download Logs:** Click the "Download Logs" button in the Alert Log section to download the `cryptojack_sentinel_log.log` file, which contains all recorded metrics and alerts.

## File Structure

```
cryptojack_sentinel/
├── app.py                  # Flask backend, SocketIO server, system monitoring logic, log writing, download endpoint.
├── requirements.txt        # Lists Python dependencies.
├── alerts.log              # Persistent log file storing all metrics and alerts.
├── templates/
│   └── index.html          # Main HTML dashboard page with UI structure and Chart.js integration.
└── static/
    ├── css/
    │   └── style.css       # Custom CSS for aesthetics and Tailwind directives.
    └── js/
        └── script.js       # Frontend JavaScript for WebSocket client, Chart.js updates, and UI interactions.
```

## Troubleshooting

### TypeError: `run_simple() got an unexpected keyword argument 'allow_unsafe_werkzeug':`
This error means your Werkzeug version does not support the `allow_unsafe_werkzeug` argument. Ensure you are using the `app.py` provided in the latest update, where this argument has been removed from `socketio.run()`.

### TypeError: `Object of type datetime is not JSON serializable:`
This occurs if `datetime` objects are being passed directly to `socketio.emit()`. Ensure `datetime` objects are converted to strings (e.g., using `.strftime('%H:%M:%S')`) before being sent from Python to JavaScript. Refer to the latest `app.py`.

### "No processes data available" or all 0% CPU for processes:
This can happen on very idle systems or due to the rapid polling of `psutil.Process().cpu_percent()`. The current `app.py` includes a small `time.sleep(0.05)` to help `psutil` gather more meaningful deltas for individual processes. If the issue persists, the system might genuinely be very idle.

### Graphs not updating / "Connecting..." status:
Ensure your `app.py` is running without errors. Check the browser's developer console for any WebSocket connection errors. Verify that `http://127.0.0.1:5000` is accessible.

### `alerts.log` only has header:
This means no alerts or metrics have been logged yet. The system needs to experience sustained high CPU usage (above 90% for 10 seconds) to trigger an alert. The "Monitoring session started." message should appear in the log upon client connection.

## 🔗 Related Projects

Here are other repositories developed by me that focus on detecting and preventing **crypto-jacking** attacks:

### [CryptoPatrol](https://github.com/vishnuvrj7/CryptoPatrol)
A lightweight **browser-based intrusion detection tool** that monitors real-time web activity to identify unauthorized cryptocurrency mining using a **Chrome extension** and a **Python Flask backend**.

- **Tech Stack**: JavaScript, HTML, Flask, Socket.IO  
- **Key Features**:
  - Live browser monitoring
  - Rule-based detection system
  - Easy to install and run

---

### [CryptoGuardML](https://github.com/vishnuvrj7/CryptoGuardML)
A **machine learning-based crypto-jacking detection system** that analyzes system-level performance metrics (CPU, memory, etc.) to identify mining behavior.

- **Tech Stack**: Python, Scikit-learn, Pandas, Matplotlib  
- **Key Features**:
  - Dataset analysis
  - ML model training & evaluation
  - Early-stage detection of crypto-mining activity

---

> Explore these tools to build a complete defense system against in-browser and system-level crypto-jacking threats.


## License
This project is open-source. You can find more details in the LICENSE file.
