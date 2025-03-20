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
sudo chattr -i /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
sudo chattr +i /etc/resolv.conf
echo "DNS configuration locked."

# Restart hostapd and dnsmasq (hotspot & DHCP)
echo "Starting hostapd and dnsmasq..."
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq

# Enable IP forwarding (for internet sharing if needed)
echo "Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1

echo "Hotspot mode enabled."

# Move to the backend directory and run the Python app
BACKEND_DIR="../web"

if [ -d "$BACKEND_DIR" ]; then
    echo "Starting Python backend..."
    cd "$BACKEND_DIR" || { echo "Failed to enter backend directory!"; exit 1; }
    nohup python3 run.py > backend.log 2>&1 &  # Run in background & log output
    echo "Backend started successfully!"
else
    echo "Error: Backend directory not found at $BACKEND_DIR. Skipping Python app launch."l
fi
