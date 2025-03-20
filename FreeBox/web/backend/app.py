"""
FreeBox Flask Application
Core module that sets up the Flask application
"""

import os
from flask import Flask, send_from_directory, jsonify, request, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
import uuid
import mimetypes
import datetime

# Import database module
from backend.database import init_db, get_all_files, add_chat_message, get_recent_chat_messages, record_visit, get_all_stats

# Initialize SocketIO
socketio = SocketIO()

# Track connected users by room
connected_users = {
    'main': {}  # room_id -> {sid: username}
}

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
    socketio.init_app(app, cors_allowed_origins="*")
    
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
        """Serve the main page"""
        # Set or update visitor cookie
        response = make_response(send_from_directory(app.static_folder, 'index.html'))
        
        # Check if visitor already has a cookie
        visitor_id = request.cookies.get('freebox_visitor')
        if not visitor_id:
            visitor_id = str(uuid.uuid4())
            # Set cookie to expire in 30 days
            expire_date = datetime.datetime.now() + datetime.timedelta(days=30)
            response.set_cookie('freebox_visitor', visitor_id, expires=expire_date)
            
        return response
    
    @app.route('/api/status')
    def status():
        """Return the status of the FreeBox"""
        return jsonify({
            'status': 'online',
            'name': 'FreeBox',
            'mode': 'hotspot'
        })
    
    @app.route('/api/stats')
    def stats():
        """Return statistics about the FreeBox"""
        stats_data = get_all_stats()
        
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
        print(f"Client connected: {request.sid}")
        
        # Emit current stats to the newly connected client
        socketio.emit('stats_updated', get_all_stats(), room=request.sid)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        sid = request.sid
        print(f"Client disconnected: {sid}")
        
        # Find which rooms this user was in
        for room, users in connected_users.items():
            if sid in users:
                username = users[sid]
                del users[sid]
                
                # Notify others that user has left
                emit('user_left', {
                    'username': username,
                    'room': room,
                    'message': f"{username} has left the room."
                }, room=room)
                
                # Send updated user count
                emit('user_count', {'count': len(users)}, room=room)
                
                # Update stats for all clients
                socketio.emit('stats_updated', get_all_stats())
    
    @socketio.on('join')
    def handle_join(data):
        """Handle a client joining a room"""
        sid = request.sid
        room = data.get('room', 'main')
        username = data.get('username', 'Anonymous')
        
        join_room(room)
        
        # Initialize room if it doesn't exist
        if room not in connected_users:
            connected_users[room] = {}
        
        # Add user to room
        connected_users[room][sid] = username
        
        # Notify other users in the room
        emit('user_joined', {
            'username': username,
            'room': room,
            'message': f"{username} has joined the room."
        }, room=room, include_self=False)
        
        # Send recent messages to the user
        messages = get_recent_chat_messages(room)
        emit('chat_history', [message.to_dict() for message in messages])
        
        # Send current user count to all users in the room
        emit('user_count', {'count': len(connected_users[room])}, room=room)
        
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
        room = data.get('room', 'main')
        username = data.get('username', 'Anonymous')
        message = data.get('message', '')
        
        if not message.strip():
            return
        
        # Store the message in the database
        chat_msg = add_chat_message(
            username=username,
            message=message,
            room=room,
            user_ip=request.remote_addr
        )
        
        # Broadcast the message to everyone in the room
        emit('chat_message', chat_msg.to_dict(), room=room)
        
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