"""
FreeBox Flask Application
Core module that sets up the Flask application
"""

import os
from flask import Flask, send_from_directory, jsonify, request, make_response, redirect
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
import uuid
import mimetypes
import datetime
import psutil  # Import psutil for system stats
import shutil  # Import shutil for disk space information

# Import database module
from backend.database import init_db, get_all_files, add_chat_message, get_recent_chat_messages, record_visit, get_all_stats

# Initialize SocketIO
socketio = SocketIO()

# Track connected users by room
connected_users = {
    'main': {}  # room_id -> {sid: username}
}

def get_cpu_temperature():
    """
    Get CPU temperature in Celsius
    Returns None if temperature information is not available
    """
    try:
        # Try using psutil's sensors_temperatures()
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        
        # Different systems report CPU temp under different keys
        # Common keys: 'coretemp', 'k10temp', 'cpu_thermal'
        for chip_name, sensors in temps.items():
            if chip_name.lower() in ['coretemp', 'k10temp', 'cpu_thermal', 'cpu-thermal', 'cpu thermal']:
                # Take the first core or the package temperature
                if sensors:
                    return sensors[0].current
        
        # If we reach here, we didn't find a recognizable temperature sensor
        # Try the first available sensor as a fallback
        for chip_name, sensors in temps.items():
            if sensors:
                return sensors[0].current
                
        return None
    except Exception as e:
        print(f"Error getting CPU temperature: {e}")
        return None

def create_app():
    """Create and configure the Flask application"""
    # Create Flask app
    app = Flask(__name__, 
                static_folder='../frontend', 
                static_url_path='')
    
    # Enable Cross-Origin Resource Sharing
    CORS(app)
    
    # Initialize and configure the database
    init_db(app)
    
    # Initialize SocketIO with the app
    socketio.init_app(app, 
                     cors_allowed_origins="*", 
                     async_mode='eventlet',
                     logger=True, 
                     engineio_logger=True,
                     ping_timeout=60,
                     ping_interval=25)
    
    # Ensure the storage directory exists
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
    os.makedirs(storage_dir, exist_ok=True)
    
    # Add middleware to track visitors
    @app.before_request
    def track_visitor():
        # Skip tracking for static files and WebSocket connections
        if not request.path.startswith('/static') and 'socket.io' not in request.path:
            # Check if visitor has a cookie
            visitor_id = request.cookies.get('freebox_visitor')
            
            # If no cookie exists, this is a new session
            if not visitor_id:
                # Generate a unique visitor ID
                visitor_id = str(uuid.uuid4())
                
                # Record visitor for statistics
                record_visit(request.remote_addr)
    
    # Define routes
    @app.route('/')
    def index():
        """Serve the index.html file - the main entry point to the application."""
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
        response = make_response(send_from_directory(frontend_dir, 'index.html'))
        
        # Set or update visitor cookie
        visitor_id = request.cookies.get('freebox_visitor')
        if not visitor_id:
            visitor_id = str(uuid.uuid4())
            # Set cookie to expire in 30 days
            expire_date = datetime.datetime.now() + datetime.timedelta(days=30)
            response.set_cookie('freebox_visitor', visitor_id, expires=expire_date)
            
            # Record the visit in our database
            record_visit(request.remote_addr)
            
        return response

    # Captive Portal Detection Response Routes
    @app.route('/generate_204')  # Android
    @app.route('/gen_204')       # Android
    @app.route('/ncsi.txt')      # Windows
    @app.route('/connecttest.txt')  # Windows
    @app.route('/redirect')      # Various devices
    @app.route('/hotspot-detect.html')  # iOS
    @app.route('/library/test/success.html')  # iOS
    @app.route('/success.html')  # iOS/MacOS
    @app.route('/hotspotdetect.html')  # Some Apple devices
    @app.route('/kindle-wifi/wifistub.html')  # Kindle
    @app.route('/mobile/status.php')  # Various mobile devices
    @app.route('/check_network_status.txt')  # Various
    @app.route('/wpad.dat')      # Windows proxy detection
    def captive_portal_response():
        """Handle device captive portal detection requests"""
        user_agent = request.headers.get('User-Agent', '').lower()
        source_ip = request.remote_addr
        
        # Log the detection attempt for debugging
        print(f"Captive portal detection request from: {source_ip} ({user_agent}) at {request.path}")
        
        # Different responses based on the path or user agent
        if request.path in ['/generate_204', '/gen_204']:
            if 'android' in user_agent or 'dalvik' in user_agent:
                # Redirect to homepage for Android
                return redirect('/', code=302)
            else:
                # For Chrome browsers or other devices expecting a 204
                return '', 204
                
        elif request.path == '/ncsi.txt':
            # Microsoft connectivity test
            return 'Microsoft NCSI', 200, {'Content-Type': 'text/plain'}
            
        elif request.path == '/connecttest.txt':
            # Another Microsoft connectivity test
            return 'Microsoft Connect Test', 200, {'Content-Type': 'text/plain'}
            
        elif request.path == '/wpad.dat':
            # Windows proxy detection
            return 'function FindProxyForURL(url, host) { return "DIRECT"; }', 200, {'Content-Type': 'application/x-ns-proxy-autoconfig'}
            
        elif '/hotspot-detect' in request.path or '/library/test/success' in request.path or request.path == '/success.html':
            # Apple devices
            response = make_response("""
            <!DOCTYPE html>
            <HTML><HEAD>
            <TITLE>Success</TITLE>
            <meta http-equiv="refresh" content="0; url=http://192.168.1.1/">
            </HEAD><BODY>Success</BODY></HTML>
            """)
            response.headers['Content-Type'] = 'text/html'
            return response
            
        elif 'kindle' in user_agent or request.path == '/kindle-wifi/wifistub.html':
            # Kindle devices
            return "Kindle Wifi", 200
        
        # Generic response for everything else: redirect to homepage
        return redirect('/', code=302)
    
    @app.route('/api/status')
    def status():
        """Return the status of the FreeBox"""
        # Get CPU and memory usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Get CPU temperature
        cpu_temp = get_cpu_temperature()
        
        # Calculate used and total disk space where the storage directory is located
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
        disk_usage = shutil.disk_usage(storage_dir)
        
        return jsonify({
            'status': 'online',
            'name': 'FreeBox',
            'mode': 'hotspot',
            'timestamp': datetime.datetime.now().timestamp(),
            'system': {
                'cpu_percent': cpu_percent,
                'cpu_temperature': cpu_temp,
                'memory_percent': memory.percent,
                'memory_used': memory.used,
                'memory_total': memory.total,
                'disk_free': disk_usage.free,
                'disk_total': disk_usage.total,
                'disk_used': disk_usage.used
            }
        })
    
    @app.route('/api/stats')
    def stats():
        """Return statistics about the FreeBox"""
        stats_data = get_all_stats()
        
        # Add system stats
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Get CPU temperature
        cpu_temp = get_cpu_temperature()
        
        # Calculate used and total disk space where the storage directory is located
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
        disk_usage = shutil.disk_usage(storage_dir)
        
        stats_data['system'] = {
            'cpu_percent': cpu_percent,
            'cpu_temperature': cpu_temp,
            'memory_percent': memory.percent,
            'memory_used': memory.used,
            'memory_total': memory.total,
            'disk_free': disk_usage.free,
            'disk_total': disk_usage.total,
            'disk_used': disk_usage.used
        }
        
        # Broadcast stats to all connected clients
        socketio.emit('stats_updated', stats_data)
        
        return jsonify(stats_data)
    
    @app.route('/api/files')
    def list_files():
        """List all files in the database"""
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        files = get_all_files(limit, offset)
        return jsonify([file.to_dict() for file in files])
    
    # Register additional routes from other modules
    from backend.routes import uploads_bp
    app.register_blueprint(uploads_bp)
    
    # Register chat blueprint
    from backend.chat import chat_bp
    app.register_blueprint(chat_bp)
    
    # Setup SocketIO event handlers
    setup_socketio_events()
    
    return app

def setup_socketio_events():
    """Setup SocketIO event handlers for WebSockets"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        sid = request.sid
        print(f"Client connected with SID: {sid}")
        
        # Emit current stats to the newly connected client
        socketio.emit('stats_updated', get_all_stats(), room=sid)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        sid = request.sid
        print(f"Client disconnected: {sid}")
        
        # Find which rooms this user was in
        found_in_room = False
        for room, users in connected_users.items():
            if sid in users:
                username = users[sid]
                del users[sid]
                found_in_room = True
                
                print(f"User {username} with SID {sid} removed from room {room}")
                print(f"Remaining users in room {room}: {len(users)}")
                
                # Notify others that user has left
                socketio.emit('user_left', {
                    'username': username,
                    'room': room,
                    'message': f"{username} has left the room."
                }, room=room)
                
                # Send updated user count
                socketio.emit('user_count', {'count': len(users)}, room=room)
                
        if not found_in_room:
            print(f"Disconnected client {sid} was not found in any room")
            
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('join')
    def handle_join(data):
        """Handle a client joining a room"""
        sid = request.sid
        room = data.get('room', 'main')
        username = data.get('username', 'Anonymous')
        
        print(f"User {username} with SID {sid} is joining room {room}")
        
        # Join the Socket.IO room
        join_room(room)
        
        # Initialize room if it doesn't exist
        if room not in connected_users:
            connected_users[room] = {}
            print(f"Created new room: {room}")
        
        # Add user to room
        connected_users[room][sid] = username
        print(f"Added user {username} to room {room}. Total users: {len(connected_users[room])}")
        
        # Notify other users in the room
        socketio.emit('user_joined', {
            'username': username,
            'room': room,
            'message': f"{username} has joined the room."
        }, room=room, include_self=False)
        
        # Send recent messages to the user
        messages = get_recent_chat_messages(room)
        print(f"Sending {len(messages)} recent messages to user {username}")
        socketio.emit('chat_history', [message.to_dict() for message in messages], room=sid)
        
        # Send current user count to all users in the room
        user_count = len(connected_users[room])
        print(f"Broadcasting user count update: {user_count} users in room {room}")
        socketio.emit('user_count', {'count': user_count}, room=room)
        
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('leave')
    def handle_leave(data):
        """Handle a client leaving a room"""
        sid = request.sid
        room = data.get('room', 'main')
        username = data.get('username', 'Anonymous')
        
        leave_room(room)
        
        # Remove user from room
        if room in connected_users and sid in connected_users[room]:
            del connected_users[room][sid]
        
        # Notify other users in the room
        emit('user_left', {
            'username': username,
            'room': room,
            'message': f"{username} has left the room."
        }, room=room)
        
        # Send updated user count
        if room in connected_users:
            emit('user_count', {'count': len(connected_users[room])}, room=room)
            
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('chat_message')
    def handle_chat_message(data):
        """Handle a chat message from a client"""
        sid = request.sid
        room = data.get('room', 'main')
        username = data.get('username', 'Anonymous')
        message = data.get('message', '')
        
        if not message.strip():
            return
        
        print(f"Received message from {username} in room {room}: {message[:20]}...")
        print(f"Current users in room {room}: {connected_users.get(room, {})}")
        
        # Store the message in the database
        chat_msg = add_chat_message(
            username=username,
            message=message,
            room=room,
            user_ip=request.remote_addr
        )
        
        # Broadcast the message to everyone in the room
        socketio.emit('chat_message', chat_msg.to_dict(), room=room)
        
        # Log the broadcast
        print(f"Broadcasted message to room {room}")
        
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('file_uploaded')
    def handle_file_uploaded(data):
        """Handle notification that a file was uploaded"""
        emit('file_list_updated', {}, to=None)
        
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('request_stats_update')
    def handle_stats_request():
        """Handle client request for updated stats"""
        socketio.emit('stats_updated', get_all_stats(), room=request.sid) 