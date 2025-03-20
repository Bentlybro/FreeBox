#!/bin/bash
# This script starts the FreeBox web interface

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Navigate to the parent directory
cd "$SCRIPT_DIR/.."

# Check if the web requirements are installed
if [ ! -f "./web/requirements.txt" ]; then
    echo "Error: FreeBox web interface not found!"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3 to use the FreeBox web interface."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed. Please install pip to manage Python packages."
    exit 1
fi

# Install requirements if needed
echo "Checking for required Python packages..."
pip3 install -r ./web/requirements.txt

# Start the web interface
echo "Starting FreeBox web interface..."
echo "The FreeBox web interface will be available at http://192.168.1.1"
echo "Press Ctrl+C to stop the server"

# Make sure the storage directory exists
mkdir -p ./web/storage

# Start the web interface
cd ./web
sudo python3 run.py 