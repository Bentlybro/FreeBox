# FreeBox

FreeBox is an offline file sharing and communication platform inspired by PirateBox. It creates a WiFi hotspot that allows anyone in range to connect, share files, and communicate without requiring internet access.

## Features

- **WiFi Hotspot**: Creates a WiFi access point that users can connect to
- **Web Interface**: User-friendly interface for interacting with the FreeBox
- **File Sharing**: Upload and download files through the web interface
- **Offline Access**: Works completely offline, no internet required

## Directory Structure

- `Setup/`: Contains scripts for setting up and configuring the FreeBox
  - `setup.sh`: Initial setup script for configuring the system
  - `dev_mode.sh`: Script to enable development mode
  - `hotspot_mode.sh`: Script to enable the hotspot mode
- `web/`: Contains the web interface code
  - `backend/`: Python Flask backend code
  - `frontend/`: HTML, CSS, and JavaScript files for the UI
  - `storage/`: Storage location for uploaded files
  - `requirements.txt`: Python dependencies
  - `run.py`: Script to run the web interface

## Installation

1. Clone this repository onto your Raspberry Pi
2. Run the setup script to configure your system:

```bash
cd FreeBox/Setup
sudo ./setup.sh
```

3. Install the required Python packages:

```bash
cd ../web
pip install -r requirements.txt
```

## Usage

### Starting the FreeBox

To start the FreeBox in hotspot mode:

```bash
cd FreeBox/Setup
sudo ./hotspot_mode.sh
```

This will create a WiFi hotspot named "FreeBox" that users can connect to.

### Starting the Web Interface

To start the web interface:

```bash
cd FreeBox/web
sudo python run.py
```

Once running, users connected to the FreeBox WiFi network can access the web interface by navigating to http://192.168.1.1 in their web browser.

### Switching to Development Mode

To switch back to normal mode for development:

```bash
cd FreeBox/Setup
sudo ./dev_mode.sh
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE). 