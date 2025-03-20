"""
FreeBox Chat Module
Handles the chat functionality for FreeBox
"""

from flask import Blueprint, request, jsonify
from backend.database import add_chat_message, get_recent_chat_messages

# Create a blueprint for chat-related routes
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chat/messages', methods=['GET'])
def get_messages():
    """Get recent chat messages"""
    room = request.args.get('room', 'main')
    limit = request.args.get('limit', 50, type=int)
    
    messages = get_recent_chat_messages(room, limit)
    return jsonify([message.to_dict() for message in messages])

@chat_bp.route('/api/chat/messages', methods=['POST'])
def post_message():
    """Post a new chat message (non-WebSocket fallback)"""
    data = request.json
    
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    username = data.get('username', 'Anonymous')
    message = data.get('message', '')
    room = data.get('room', 'main')
    
    if not message.strip():
        return jsonify({'success': False, 'error': 'Message cannot be empty'}), 400
    
    # Add message to database
    chat_message = add_chat_message(
        username=username,
        message=message,
        room=room,
        user_ip=request.remote_addr
    )
    
    # Note: In a WebSocket implementation, we would emit to all clients here
    # But this endpoint is a fallback for clients without WebSocket support
    
    return jsonify({
        'success': True,
        'message': chat_message.to_dict()
    })

@chat_bp.route('/api/chat/rooms', methods=['GET'])
def get_rooms():
    """Get available chat rooms"""
    # For now, we only have the main room, but this can be expanded
    rooms = [
        {
            'id': 'main',
            'name': 'Main Room',
            'description': 'The main FreeBox chat room'
        }
    ]
    return jsonify(rooms) 