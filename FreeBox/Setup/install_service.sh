#!/bin/bash

# Ensure script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "This script needs to be run as root. Use sudo."
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ABSOLUTE_PATH="$SCRIPT_DIR/freebox_autostart.sh"

echo "Installing FreeBox auto-connect service..."

# Make the autostart script executable
chmod +x "$ABSOLUTE_PATH"

# Update path in service file
ESCAPED_PATH=$(echo "$ABSOLUTE_PATH" | sed 's/\//\\\//g')
sed -i "s/\/home\/pi\/FreeBox\/Setup\/freebox_autostart.sh/$ESCAPED_PATH/g" "$SCRIPT_DIR/freebox.service"

# Copy service file to systemd directory
cp "$SCRIPT_DIR/freebox.service" /etc/systemd/system/

# Reload systemd to recognize the new service
systemctl daemon-reload

# Enable the service to start at boot
systemctl enable freebox.service

echo "FreeBox service installed and enabled!"
echo "It will now start automatically on boot."
echo ""
echo "You can manually control it with these commands:"
echo "- Start:   sudo systemctl start freebox"
echo "- Stop:    sudo systemctl stop freebox"
echo "- Status:  sudo systemctl status freebox"
echo "- Restart: sudo systemctl restart freebox"
echo ""
echo "To start it now, run: sudo systemctl start freebox"
echo "To see the logs, run: sudo journalctl -u freebox -f"

exit 0 