# FreeBox Web Interface

The FreeBox web interface provides a user-friendly way to interact with FreeBox, allowing users to upload, download, and share files through a modern web UI.

## Directory Structure

- `backend/` - Flask API server
- `frontend/` - HTML, CSS, and JavaScript for the user interface
- `storage/` - Location where uploaded files are stored

## Requirements

- Python 3.6+
- Flask and other dependencies (listed in `requirements.txt`)

## Installation

1. Install the required Python packages:

```bash
pip install -r requirements.txt
```

## Usage

### Running in Development Mode

For development and testing on your local machine:

```bash
python run.py
```

This will start the Flask development server on port 80 (requires root/admin privileges).

### Running in Hotspot Mode

When FreeBox is configured in hotspot mode, the web interface will be automatically available at:

```
http://192.168.1.1
```

Users connected to the FreeBox WiFi network can access this URL to view, upload, and download files.

## Development Notes

### Backend API Endpoints

- `GET /api/status` - Get the current status of FreeBox
- `GET /api/files` - List all available files in storage
- `POST /api/upload` - Upload a new file
- `GET /api/download/<filename>` - Download a specific file
- `DELETE /api/delete/<filename>` - Delete a specific file

### Frontend Structure

- `index.html` - Main page
- `css/style.css` - Styles
- `js/app.js` - JavaScript for the UI
- `img/` - Images and icons

## Security Considerations

The FreeBox web interface includes several security features:

1. Filenames are sanitized to prevent path traversal attacks
2. File types are properly detected using MIME types
3. Cross-Origin Resource Sharing (CORS) is enabled for the API

However, since FreeBox is designed for open file sharing in a local network, there are no user accounts or authentication. Anyone with access to the network can upload, download, or delete files.

## License

This project is open source and available under the MIT License. 