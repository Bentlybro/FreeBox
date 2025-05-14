# FreeBox

FreeBox is an offline file sharing and communication platform inspired by PirateBox. It creates a WiFi hotspot that allows anyone in range to connect, share files, and communicate without requiring internet access.

<details>
<summary><b>✨ Features</b></summary>

- **WiFi Hotspot**: Creates a WiFi access point that users can connect to
- **Web Interface**: User-friendly interface for interacting with the FreeBox
- **File Sharing**: Upload and download files through the web interface
- **File Previewing**: Preview images, videos, text files, and code directly in the browser
- **Video Playback**: Built-in video player for MP4, WebM and other common formats
- **Upload Progress**: Real-time progress tracking for file uploads
- **Custom Renaming**: Rename files before uploading them
- **File Descriptions**: Add descriptions to individual files or groups of files
- **Offline Access**: Works completely offline, no internet required
- **Auto-Switching**: Automatically switches between client and hotspot modes based on WiFi availability
</details>

<details>
<summary><b>📁 Directory Structure</b></summary>

- `Setup/`: Contains scripts for setting up and configuring the FreeBox
  - `setup.sh`: Initial setup script for configuring the system
  - `dev_mode.sh`: Script to enable development mode
  - `hotspot_mode.sh`: Script to enable the hotspot mode
  - `freebox_autostart.sh`: Script that checks WiFi and starts appropriate mode
  - `install_service.sh`: Installs the auto-switching service
  - `freebox.service`: Systemd service file for auto-starting FreeBox
- `web/`: Contains the web interface code
  - `backend/`: Python Flask backend code
  - `frontend/`: HTML, CSS, and JavaScript files for the UI
  - `storage/`: Storage location for uploaded files
  - `requirements.txt`: Python dependencies
  - `run.py`: Script to run the web interface
</details>

## Quick Start Guide

1. **Install FreeBox**:
   ```bash
   cd FreeBox/Setup
   sudo ./setup.sh
   ```

2. **Start the Service**:
   ```bash
   sudo ./install_service.sh
   ```

3. **Access FreeBox**:
   - Connect to the "FreeBox" WiFi network
   - Open http://192.168.1.1 in your browser

## Installation

<details>
<summary><b>Detailed Installation Steps</b></summary>

1. Clone this repository onto your Raspberry Pi
2. Run the setup script to configure your system:

```bash
cd FreeBox/Setup
sudo ./setup.sh
```

The setup script automatically:
- Installs system dependencies
- Creates a Python virtual environment
- Installs all required Python packages
- Configures network settings for the hotspot mode

After installation, it's recommended to reboot your Raspberry Pi:
```bash
sudo reboot
```
</details>

## Usage Options

### Auto-Starting Service (Recommended)

<details>
<summary><b>Install as Auto-Starting Service</b></summary>

The recommended way to use FreeBox is to install it as a service that starts automatically on boot:

```bash
cd FreeBox/Setup
sudo ./install_service.sh
```

This will:
- Create a systemd service that starts on boot
- Try to connect to WiFi for 60 seconds
- If connection fails, automatically switch to hotspot mode
- Start the web interface in the appropriate mode

After installation, you can control the service with:
```bash
sudo systemctl start freebox    # Start the service
sudo systemctl stop freebox     # Stop the service
sudo systemctl restart freebox  # Restart the service
sudo systemctl status freebox   # Check status
```
</details>

### Manual Operation

<details>
<summary><b>Start in Hotspot Mode</b></summary>

To manually start the FreeBox in hotspot mode:

```bash
cd FreeBox/Setup
sudo ./hotspot_mode.sh
```

This will create a WiFi hotspot named "FreeBox" that users can connect to.
</details>

<details>
<summary><b>Start Web Interface Only</b></summary>

To manually start just the web interface:

```bash
cd FreeBox/web
sudo python run.py
```
</details>

<details>
<summary><b>Development Mode</b></summary>

Development mode disables the hotspot functionality and restores normal WiFi connectivity on your Raspberry Pi. This is useful when you need to:
- Connect your Raspberry Pi to the internet for updates
- Work on the FreeBox code with network access
- Return to normal WiFi operation temporarily

To switch to development mode:

```bash
cd FreeBox/Setup
sudo ./dev_mode.sh
```

This script will:
1. Stop the hostapd and dnsmasq services (hotspot)
2. Remove the static IP from the wlan0 interface
3. Unblock WiFi if it was disabled
4. Restart the appropriate network manager
5. Allow your Raspberry Pi to connect to regular WiFi networks

**Note**: If you have the auto-switching service installed, you should stop it first:

```bash
# First stop the service
sudo systemctl stop freebox

# Then run the dev mode script
cd FreeBox/Setup
sudo ./dev_mode.sh
```

If you want to temporarily disable the auto-switching service from starting on boot:

```bash
sudo systemctl disable freebox
```

To re-enable it later:

```bash
sudo systemctl enable freebox
```
</details>

## Access

Once running, users connected to the FreeBox WiFi network can access the web interface by navigating to http://192.168.1.1 in their web browser.

<details>
<summary><b>📸 Screenshots</b></summary>

![image](https://github.com/user-attachments/assets/af4e9777-bc9f-42ab-be58-7199bac524cb)
![image](https://github.com/user-attachments/assets/93d21137-b103-4dd6-8fa9-2e2e463a1d8d)
![image](https://github.com/user-attachments/assets/d7924de8-b5bc-471c-8485-41bfbaeef7c0)
![image](https://github.com/user-attachments/assets/47046e70-6d82-4eaf-bd6f-b3afcf12e725)
![image](https://github.com/user-attachments/assets/457b61d3-7f4c-4fe9-a410-73e0a34ad373)
</details>

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE). 
