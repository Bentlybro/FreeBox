#!/bin/bash

# Get script directory and ensure the script is run as root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ "$(id -u)" -ne 0 ]; then
    echo "This script needs to be run as root. Use sudo."
    exit 1
fi

echo "Starting FreeBox auto connectivity service..."

# Function to check internet connectivity
check_connectivity() {
    echo "Checking WiFi connectivity..."
    
    # Wait for wlan0 to be available
    MAX_TRIES=30
    tries=0
    
    while ! ip link show wlan0 &>/dev/null; do
        tries=$((tries+1))
        echo "Waiting for wlan0 interface... ($tries/$MAX_TRIES)"
        sleep 2
        
        if [ "$tries" -ge "$MAX_TRIES" ]; then
            echo "wlan0 interface not found after 60 seconds, switching to hotspot mode."
            return 1
        fi
    done
    
    # Try to connect to WiFi using NetworkManager
    if command -v nmcli >/dev/null; then
        echo "NetworkManager detected, enabling WiFi..."
        nmcli radio wifi on
        sleep 2
    fi
    
    # Check if we're already connected to a WiFi network
    if iwconfig wlan0 | grep -q "ESSID:\"" | grep -v "ESSID:\"\""; then
        echo "Already connected to WiFi."
        return 0
    fi
    
    # Wait for WiFi connection for up to 60 seconds
    echo "Waiting up to 60 seconds for WiFi connection..."
    
    for i in {1..30}; do
        # Check if we have connectivity using multiple methods
        if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1 || ping -c 1 -W 2 1.1.1.1 >/dev/null 2>&1; then
            echo "Internet connectivity confirmed."
            return 0
        elif iwconfig wlan0 | grep -q "ESSID:\"" | grep -v "ESSID:\"\""; then
            echo "Connected to WiFi but no internet. Waiting for internet..."
        else
            echo "Waiting for WiFi connection... ($i/30)"
        fi
        
        sleep 2
    done
    
    echo "Failed to connect to WiFi after 60 seconds."
    return 1
}

# Main functionality
main() {
    # Check if we have internet connectivity
    if check_connectivity; then
        echo "WiFi connected successfully. Running in client mode."
        
        # Get the directory of the backend and start it
        PARENT_DIR="$(cd "$SCRIPT_DIR/.." &>/dev/null && pwd)"
        BACKEND_DIR="$PARENT_DIR/web"
        
        # Check if the web directory exists
        if [ ! -d "$BACKEND_DIR" ]; then
            echo "Error: Web directory not found at $BACKEND_DIR."
            exit 1
        fi
        
        echo "Starting FreeBox backend in client mode..."
        cd "$BACKEND_DIR" || { echo "Failed to enter web directory!"; exit 1; }
        
        # Activate the virtual environment and start the app
        if [ -f "$SCRIPT_DIR/activate_venv.sh" ]; then
            echo "Activating virtual environment..."
            source "$SCRIPT_DIR/activate_venv.sh"
            python3 run.py
        else
            echo "Virtual environment not found, using system Python..."
            python3 run.py
        fi
    else
        echo "WiFi connection failed. Starting hotspot mode..."
        # Run the hotspot mode script
        "$SCRIPT_DIR/hotspot_mode.sh"
    fi
}

# Run the main function
main

exit 0 