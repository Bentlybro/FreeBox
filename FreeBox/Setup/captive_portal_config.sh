#!/bin/bash
# captive_portal_config.sh
# Configures the necessary components for a captive portal

echo "Configuring captive portal for FreeBox..."

# 1. Configure dnsmasq to redirect all DNS queries to our own IP
# This will modify the dnsmasq configuration to redirect all DNS queries
sudo bash -c 'cat > /etc/dnsmasq.conf <<EOT
# Interface to bind to
interface=wlan0

# DHCP range
dhcp-range=192.168.1.50,192.168.1.150,12h

# Set the gateway and DNS server to our device
dhcp-option=3,192.168.1.1
dhcp-option=6,192.168.1.1

# Capture all DNS queries
address=/#/192.168.1.1
EOT'

# 2. Configure iptables to redirect all HTTP traffic to our portal
# Backup current iptables rules
sudo iptables-save > /tmp/iptables.backup

# Clear existing rules
sudo iptables -t nat -F

# Allow established connections
sudo iptables -t nat -A PREROUTING -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Redirect all HTTP traffic to our server
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j DNAT --to-destination 192.168.1.1:80
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 443 -j DNAT --to-destination 192.168.1.1:80

# Save the iptables rules to be reloaded on boot
sudo bash -c 'cat > /etc/iptables.ipv4.nat <<EOT
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 80 -j DNAT --to-destination 192.168.1.1:80
-A PREROUTING -i wlan0 -p tcp -m tcp --dport 443 -j DNAT --to-destination 192.168.1.1:80
COMMIT
EOT'

# Add iptables restoration to rc.local for persistence
if [ ! -f /etc/rc.local ]; then
    sudo bash -c 'cat > /etc/rc.local <<EOT
#!/bin/sh -e
# rc.local
iptables-restore < /etc/iptables.ipv4.nat
exit 0
EOT'
    sudo chmod +x /etc/rc.local
else
    # Check if the line is already in rc.local, if not, add it before 'exit 0'
    if ! grep -q "iptables-restore < /etc/iptables.ipv4.nat" /etc/rc.local; then
        sudo sed -i '/exit 0/i iptables-restore < /etc/iptables.ipv4.nat' /etc/rc.local
    fi
fi

echo "Captive portal configuration completed successfully!"