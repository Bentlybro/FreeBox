"""
FreeBox Routes Module
Contains route definitions for file uploads and downloads
"""

import os
import mimetypes
import uuid
from flask import Blueprint, request, jsonify, send_file, current_app, abort
from werkzeug.utils import secure_filename
from backend.database import add_file, get_file_by_id, get_file_by_filename, increment_download_count, delete_file, get_all_stats
from backend.app import socketio
import psutil

# Create a blueprint for upload-related routes
uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    
    # Get optional description
    description = request.form.get('description', '')
    
    # Get optional custom filename
    custom_filename = request.form.get('custom_filename', '')
    
    # Generate a unique filename to prevent overwriting
    original_filename = secure_filename(file.filename)
    
    # If a custom filename was provided, use it as the original filename but secure it
    if custom_filename:
        original_filename = secure_filename(custom_filename)
    
    filename_parts = os.path.splitext(original_filename)
    unique_filename = f"{filename_parts[0]}_{uuid.uuid4().hex[:8]}{filename_parts[1]}"
    
    # Get the storage directory
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
    
    # Ensure storage directory exists
    if not os.path.exists(storage_dir):
        try:
            os.makedirs(storage_dir)
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to create storage directory: {str(e)}'}), 500
    
    # Save the file to the storage directory
    file_path = os.path.join(storage_dir, unique_filename)
    
    try:
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        file_type = mimetypes.guess_type(original_filename)[0] or 'application/octet-stream'
        
        # Add to database
        file_record = add_file(
            filename=unique_filename,
            original_filename=original_filename,
            size=file_size,
            mime_type=file_type,
            uploader_ip=request.remote_addr,
            description=description
        )
        
        # Notify all clients that a new file was uploaded
        socketio.emit('file_list_updated', {})
        
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
        
        return jsonify({
            'success': True,
            'file': file_record.to_dict()
        })
    except Exception as e:
        # Remove the file if it was created but failed to add to database
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        return jsonify({'success': False, 'error': str(e)}), 500

@uploads_bp.route('/api/download/<int:file_id>', methods=['GET'])
def download_file_by_id(file_id):
    """Download a file from storage by ID"""
    file_record = get_file_by_id(file_id)
    
    if not file_record:
        abort(404)
    
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
    file_path = os.path.join(storage_dir, file_record.filename)
    
    if not os.path.exists(file_path):
        abort(404)
    
    # Check if this is a preview request
    is_preview = request.args.get('preview', 'false').lower() == 'true'
    
    if not is_preview:
        # Only increment download count for actual downloads, not previews
        increment_download_count(file_id)
        
        # Emit event to notify clients about the download
        file_data = file_record.to_dict()
        socketio.emit('file_downloaded', {'file': file_data})
        
        # Update stats for all clients
        socketio.emit('stats_updated', get_all_stats())
    
    # Determine content type
    content_type = file_record.mime_type or mimetypes.guess_type(file_record.original_filename)[0] or 'application/octet-stream'
    
    # For video files, ensure proper streaming capabilities
    is_video = content_type.startswith('video/')
    
    # For previews of large text files, we might want to read only the first part
    # This is especially important for very large text files
    if is_preview and content_type.startswith('text/') and os.path.getsize(file_path) > 1024 * 1024:  # If larger than 1MB
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read(1024 * 1024)  # Read first 1MB
            
            if len(content) == 1024 * 1024:
                content += "\n\n... (file truncated for preview) ..."
        
        return content, 200, {'Content-Type': content_type}
    
    # For video files in preview mode, we want to enable partial content support for streaming
    if is_preview and is_video:
        response = send_file(
            file_path,
            mimetype=content_type,
            as_attachment=False,  # Never force download for video preview
            download_name=file_record.original_filename,
            conditional=True  # Enable partial content support
        )
        # Add headers for proper video streaming
        response.headers.add('Accept-Ranges', 'bytes')
        return response
    
    # Default handling for other file types
    return send_file(
        file_path,
        mimetype=content_type,
        as_attachment=not is_preview,  # Don't force download in preview mode
        download_name=file_record.original_filename
    )

@uploads_bp.route('/api/download/filename/<path:filename>', methods=['GET'])
def download_file_by_name(filename):
    """Download a file from storage by filename"""
    filename = secure_filename(filename)
    file_record = get_file_by_filename(filename)
    
    if not file_record:
        abort(404)
    
    # Before calling download_file_by_id, get the updated file record after incrementing download count
    increment_download_count(file_record.id)
    updated_file = get_file_by_id(file_record.id)
    
    # Emit event to notify clients about the download
    socketio.emit('file_downloaded', {'file': updated_file.to_dict()})
    
    # Update stats for all clients
    socketio.emit('stats_updated', get_all_stats())
    
    # Use the existing route but skip the increment since we already did it
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
    file_path = os.path.join(storage_dir, file_record.filename)
    
    if not os.path.exists(file_path):
        abort(404)
    
    # Determine content type
    content_type = file_record.mime_type or mimetypes.guess_type(file_record.original_filename)[0] or 'application/octet-stream'
    
    return send_file(
        file_path,
        mimetype=content_type,
        as_attachment=True,
        download_name=file_record.original_filename
    )

@uploads_bp.route('/api/files/<int:file_id>', methods=['DELETE'])
def delete_file_route(file_id):
    """Delete a file from storage"""
    file_record = get_file_by_id(file_id)
    
    if not file_record:
        return jsonify({'success': False, 'error': 'File not found'}), 404
    
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
    file_path = os.path.join(storage_dir, file_record.filename)
    
    try:
        # Delete from filesystem if it exists
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        if delete_file(file_id):
            # Notify all clients that the file list has changed
            socketio.emit('file_list_updated', {})
            
            # Update stats for all clients
            socketio.emit('stats_updated', get_all_stats())
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to delete from database'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@uploads_bp.route('/api/server-status', methods=['GET'])
def server_status():
    """Return server status information that can help clients optimize uploads"""
    try:
        # Get CPU and memory usage data
        cpu_percent = psutil.cpu_percent(interval=0.5)
        memory = psutil.virtual_memory()
        
        # Calculate available memory percentage (100 - used_percent)
        available_memory_percent = 100 - memory.percent
        
        # Based on server load, suggest the optimal number of concurrent uploads
        # Prioritize CPU availability since it's typically the bottleneck for file processing
        if cpu_percent > 80:
            recommended_concurrent = 1
        elif cpu_percent > 60:
            recommended_concurrent = 3
        elif cpu_percent > 40:
            recommended_concurrent = 5
        elif cpu_percent > 20:
            recommended_concurrent = 8
        else:
            # Very low CPU usage - allow more concurrent uploads
            recommended_concurrent = 12
            
        # Further adjust based on available memory
        if available_memory_percent < 20:
            # Critical memory situation - reduce concurrent uploads
            recommended_concurrent = max(1, recommended_concurrent // 3)
        elif available_memory_percent < 40:
            # Low memory - reduce concurrent uploads
            recommended_concurrent = max(1, recommended_concurrent // 2)
            
        return jsonify({
            'success': True,
            'server_load': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'available_memory_percent': available_memory_percent
            },
            'recommended_concurrent_uploads': recommended_concurrent
        })
    except Exception as e:
        # If there's an error with psutil, default to conservative values
        return jsonify({
            'success': True,
            'server_load': {
                'cpu_percent': 0,
                'memory_percent': 0,
                'available_memory_percent': 0
            },
            'recommended_concurrent_uploads': 4,  # Increased default from 2 to 4
            'error': str(e)
        }) 