#!/usr/bin/env python3
"""
FreeBox Web Application Main Entry Point
This script starts the Flask application that serves the FreeBox web interface.
"""

import os
import eventlet
# Patch standard library to work with eventlet
eventlet.monkey_patch()

from backend.app import create_app, socketio

if __name__ == "__main__":
    # Create the application instance
    app = create_app()
    print("Starting Flask app...")
    
    # In hotspot mode, we bind to all interfaces (0.0.0.0)
    # so the server is accessible from other devices on the network
    socketio.run(
        app,
        host="0.0.0.0",
        port=80,  # Standard HTTP port
        debug=False,  # Disable debug mode in production
        use_reloader=False  # Disable reloader for production
    ) 
    print("Starting FreeBox web interface...")
    print("The FreeBox web interface will be available at http://192.168.1.1")
    print("Press Ctrl+C to stop the server")