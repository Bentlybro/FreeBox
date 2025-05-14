#!/bin/bash
echo "Setting up the FreeBox environment..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PARENT_DIR/web"

# Update system and install necessary packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv hostapd dnsmasq iptables

# Ensure Python is installed
echo "Checking Python installation..."
python3 --version || { echo "Python installation failed!"; exit 1; }

# Create a virtual environment
echo "Creating Python virtual environment..."
python3 -m venv ../venv
source ../venv/bin/activate

# Install required Python packages in the virtual environment
echo "Installing Python dependencies from web/requirements.txt..."
pip install -r "$WEB_DIR/requirements.txt" || { echo "Failed to install dependencies!"; exit 1; }
deactivate

# Create activation script for other scripts to use
cat > ./activate_venv.sh <<EOT
#!/bin/bash
source "\$(dirname "\${BASH_SOURCE[0]}")/../venv/bin/activate"
EOT
chmod +x ./activate_venv.sh

# Do NOT stop services yet, just configure them

# Assign static IP to wlan0
echo "Setting static IP for wlan0 (Will apply after reboot or manual restart)..."
sudo bash -c 'cat >> /etc/dhcpcd.conf <<EOT
interface wlan0
static ip_address=192.168.1.1/24
nohook wpa_supplicant
EOT'
echo "Note: You need to restart dhcpcd or reboot for changes to take effect."

# Configure DHCP server (dnsmasq) - Does NOT start it
sudo bash -c 'cat > /etc/dnsmasq.conf <<EOT
interface=wlan0
dhcp-range=192.168.1.50,192.168.1.150,12h
EOT'

# Configure hostapd (WiFi access point) - Does NOT start it
sudo bash -c 'cat > /etc/hostapd/hostapd.conf <<EOT
interface=wlan0
driver=nl80211
ssid=FreeBox
hw_mode=g
channel=6
wmm_enabled=0
auth_algs=1
ignore_broadcast_ssid=0
EOT'

# Ensure hostapd uses our config (but don't start it)
sudo sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd

# Enable IP forwarding (but don't apply it immediately)
sudo sed -i 's|#net.ipv4.ip_forward=1|net.ipv4.ip_forward=1|' /etc/sysctl.conf
echo "Note: IP forwarding is configured but not yet applied. Run 'sudo sysctl -p' when you are ready."

echo "Setup complete!"
echo ""
echo "To install the auto-switching service (start as hotspot if WiFi fails):"
echo "  sudo ./install_service.sh"
echo ""
echo "Alternatively, you can manually start the hotspot using:"
echo "  sudo ./hotspot_mode.sh"
echo ""
echo "It's recommended to reboot your system after installation."
