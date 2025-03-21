#!/bin/bash
echo "Switching to Hotspot mode..."

# Unmask and enable hostapd
echo "Unmasking and enabling hostapd..."
sudo systemctl unmask hostapd
sudo systemctl enable hostapd

# Stop any conflicting network services
echo "Stopping any conflicting network services..."
sudo systemctl stop dhcpcd 2>/dev/null || echo "dhcpcd.service not found, skipping..."
sudo systemctl stop systemd-networkd 2>/dev/null
sudo systemctl stop NetworkManager 2>/dev/null

# Assign a static IP to wlan0
echo "Setting static IP for wlan0..."
sudo ip link set wlan0 down
sudo ip addr flush dev wlan0
sudo ip addr add 192.168.1.1/24 dev wlan0
sudo ip link set wlan0 up

# Ensure /etc/resolv.conf has a valid DNS server
echo "Fixing DNS configuration..."
sudo chattr -i /etc/resolv.conf 2>/dev/null || true
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
sudo chattr +i /etc/resolv.conf 2>/dev/null || true
echo "DNS configuration updated."

# Restart hostapd and dnsmasq (hotspot & DHCP)
echo "Starting hostapd and dnsmasq..."
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq

# Enable IP forwarding (for internet sharing if needed)
echo "Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1

echo "Hotspot mode enabled."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
BACKEND_DIR="$PARENT_DIR/web"

# Check if the web directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: Web directory not found at $BACKEND_DIR. Skipping Python app launch."
    exit 1
fi

echo "Starting Python backend..."
cd "$BACKEND_DIR" || { echo "Failed to enter web directory!"; exit 1; }

# Activate the virtual environment
if [ -f "$SCRIPT_DIR/activate_venv.sh" ]; then
    echo "Activating virtual environment..."
    source "$SCRIPT_DIR/activate_venv.sh"
    
    # Check if Flask is installed in the virtual environment
    if ! python3 -c "import flask" &>/dev/null; then
        echo "Flask not found in virtual environment. Installing requirements..."
        pip install -r "$SCRIPT_DIR/requirements.txt"
    fi
    
    # Run the Python app with the virtual environment
    echo "Starting web interface with virtual environment..."
    python3 run.py
else
    echo "Warning: Virtual environment activation script not found. Trying system Python..."
    # Try with system Python as fallback
    sudo python3 run.py
fi

echo "Backend started successfully!"
