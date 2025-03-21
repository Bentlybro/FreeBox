#!/bin/bash
echo "Setting up the FreeBox environment..."

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
echo "Installing Python dependencies..."
pip install -r requirements.txt || { echo "Failed to install dependencies!"; exit 1; }
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
# Captive portal configuration
# Route all DNS requests to our server
address=/#/192.168.1.1
# Respond to all DNS requests with our IP
bogus-priv
domain-needed
# Do not read resolv.conf
no-resolv
# Do not forward queries
no-poll
dhcp-option=option:dns-server,192.168.1.1
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

echo "Setup complete! You can now reboot or manually start the hotspot using sudo ./hotspot_mode.sh"
