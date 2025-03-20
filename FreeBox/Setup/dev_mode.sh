#!/bin/bash
echo "Switching to development mode..."

# Stop the hotspot services
echo "Stopping hotspot services..."
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

# Remove static IP from wlan0
echo "Removing static IP from wlan0..."
sudo ip addr flush dev wlan0
sudo ip link set wlan0 down

# Unblock WiFi in case it's disabled
echo "Restoring normal WiFi..."
sudo rfkill unblock wlan
sudo ip link set wlan0 up

# Restart network services
if systemctl list-units --full -all | grep -q "NetworkManager.service"; then
    echo "Restarting NetworkManager..."
    sudo systemctl restart NetworkManager
    echo "WiFi should now reconnect automatically."
elif systemctl list-units --full -all | grep -q "systemd-networkd.service"; then
    echo "Restarting systemd-networkd..."
    sudo systemctl restart systemd-networkd
else
    echo "No known network manager found. Try restarting manually."
fi
