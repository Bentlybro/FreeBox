"""
FreeBox Database Module
Handles database operations and models for the FreeBox application
"""

import os
import datetime
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy
db = SQLAlchemy()

# Define models
class File(db.Model):
    """
    File model representing a file stored in the FreeBox
    """
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    size = db.Column(db.Integer, nullable=False)  # Size in bytes
    mime_type = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    download_count = db.Column(db.Integer, default=0)
    uploader_ip = db.Column(db.String(45), nullable=True)  # IPv6 addresses can be long
    description = db.Column(db.Text, nullable=True)
    file_hash = db.Column(db.String(64), nullable=True, index=True)  # SHA-256 hash is 64 chars
    
    def to_dict(self):
        """
        Convert file record to dictionary for API responses
        """
        return {
            'id': self.id,
            'filename': self.original_filename,
            'size': self.size,
            'mime_type': self.mime_type,
            'created_at': self.created_at.timestamp(),
            'download_count': self.download_count,
            'description': self.description
        }

class ChatMessage(db.Model):
    """
    Chat message model for the chat feature
    """
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    room = db.Column(db.String(50), default='main')
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    user_ip = db.Column(db.String(45), nullable=True)
    
    def to_dict(self):
        """
        Convert message to dictionary for API responses
        """
        return {
            'id': self.id,
            'username': self.username,
            'message': self.message,
            'room': self.room,
            'timestamp': self.timestamp.timestamp()
        }

class Stats(db.Model):
    """
    Statistics for the FreeBox
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def to_dict(self):
        """
        Convert stats to dictionary for API responses
        """
        return {
            'name': self.name,
            'value': self.value,
            'last_updated': self.last_updated.timestamp()
        }

class Visitor(db.Model):
    """
    Visitor record for unique IP tracking
    """
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), unique=True, nullable=False)
    first_visit = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_visit = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    visit_count = db.Column(db.Integer, default=1)
    
    def to_dict(self):
        """
        Convert visitor to dictionary for API responses
        """
        return {
            'ip_address': self.ip_address,
            'first_visit': self.first_visit.timestamp(),
            'last_visit': self.last_visit.timestamp(),
            'visit_count': self.visit_count
        }

# Start time of the server for uptime calculation
SERVER_START_TIME = datetime.datetime.utcnow()

def init_db(app):
    """
    Initialize the database with the Flask app
    """
    # Configure database
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'freebox.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize database with app
    db.init_app(app)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        
        # Initialize default stats if they don't exist
        init_default_stats()
        
    return db

def init_default_stats():
    """
    Initialize default stats if they don't exist
    """
    default_stats = [
        {'name': 'total_visits', 'value': 0},
        {'name': 'total_unique_visitors', 'value': 0},
        {'name': 'total_messages', 'value': 0},
        {'name': 'total_files_uploaded', 'value': 0},
        {'name': 'total_downloads', 'value': 0},
        {'name': 'total_bytes_uploaded', 'value': 0}
    ]
    
    for stat in default_stats:
        if not Stats.query.filter_by(name=stat['name']).first():
            db.session.add(Stats(name=stat['name'], value=stat['value']))
    
    db.session.commit()

def add_file(filename, original_filename, size, mime_type=None, uploader_ip=None, description=None, file_hash=None):
    """
    Add a file record to the database
    """
    file = File(
        filename=filename,
        original_filename=original_filename,
        size=size,
        mime_type=mime_type,
        uploader_ip=uploader_ip,
        description=description,
        file_hash=file_hash
    )
    db.session.add(file)
    db.session.commit()
    
    # Update stats
    increment_stat('total_files_uploaded')
    increment_stat('total_bytes_uploaded', size)
    
    return file


def get_file_by_id(file_id):
    """
    Get file record by ID
    """
    return File.query.get(file_id)


def get_file_by_filename(filename):
    """
    Get file record by filename
    """
    return File.query.filter_by(filename=filename).first()


def get_file_by_hash(file_hash):
    """
    Get file record by hash
    """
    return File.query.filter_by(file_hash=file_hash).first()


def increment_download_count(file_id):
    """
    Increment the download count for a file
    """
    file = get_file_by_id(file_id)
    if file:
        file.download_count += 1
        db.session.commit()
        
        # Update stats
        increment_stat('total_downloads')
        
        return True
    return False


def delete_file(file_id):
    """
    Delete a file record
    """
    file = get_file_by_id(file_id)
    if file:
        db.session.delete(file)
        db.session.commit()
        return True
    return False


def get_all_files(limit=100, offset=0):
    """
    Get all files with pagination
    """
    return File.query.order_by(File.created_at.desc()).limit(limit).offset(offset).all()


def add_chat_message(username, message, room='main', user_ip=None):
    """
    Add a chat message to the database
    """
    chat_message = ChatMessage(
        username=username,
        message=message,
        room=room,
        user_ip=user_ip
    )
    db.session.add(chat_message)
    db.session.commit()
    
    # Update stats
    increment_stat('total_messages')
    
    return chat_message


def get_recent_chat_messages(room='main', limit=50):
    """
    Get recent chat messages for a room
    """
    return ChatMessage.query.filter_by(room=room).order_by(
        ChatMessage.timestamp.desc()
    ).limit(limit).all()


def record_visit(ip_address):
    """
    Record a visit from an IP address
    """
    visitor = Visitor.query.filter_by(ip_address=ip_address).first()
    
    if visitor:
        # Existing visitor - update visit count
        visitor.visit_count += 1
        visitor.last_visit = datetime.datetime.utcnow()
    else:
        # New visitor
        visitor = Visitor(ip_address=ip_address)
        db.session.add(visitor)
        increment_stat('total_unique_visitors')
    
    # Increment total visits
    increment_stat('total_visits')
    
    db.session.commit()
    return visitor


def increment_stat(name, amount=1):
    """
    Increment a statistic by a given amount
    """
    stat = Stats.query.filter_by(name=name).first()
    
    if stat:
        stat.value += amount
        db.session.commit()
        return stat
    
    return None


def get_all_stats():
    """
    Get all statistics
    """
    stats = Stats.query.all()
    
    # Convert to dictionary
    stats_dict = {stat.name: stat.value for stat in stats}
    
    # Add uptime
    uptime_seconds = (datetime.datetime.utcnow() - SERVER_START_TIME).total_seconds()
    stats_dict['uptime_seconds'] = int(uptime_seconds)
    
    # Get detailed file stats
    files_count = File.query.count()
    messages_count = ChatMessage.query.count()
    visitors_count = Visitor.query.count()
    
    # Calculate total storage used (in bytes)
    total_storage = db.session.query(db.func.sum(File.size)).scalar() or 0
    
    # Calculate additional metrics
    most_downloaded = File.query.order_by(File.download_count.desc()).first()
    
    # Add calculated stats
    stats_dict['visitors_count'] = visitors_count
    stats_dict['files_count'] = files_count
    stats_dict['messages_count'] = messages_count
    stats_dict['total_storage'] = total_storage
    
    # Add most downloaded file information
    if most_downloaded:
        stats_dict['most_downloaded'] = {
            'id': most_downloaded.id,
            'filename': most_downloaded.original_filename,
            'download_count': most_downloaded.download_count
        }
    else:
        stats_dict['most_downloaded'] = None
    
    # Add current timestamp
    stats_dict['timestamp'] = datetime.datetime.utcnow().timestamp()
    
    return stats_dict 