"""
FreeBox Captive Portal Module
Contains routes and functionality for the captive portal
"""

from flask import Blueprint, request, redirect, Response, render_template

# Create a blueprint for captive portal related routes
captive_bp = Blueprint('captive_portal', __name__)

@captive_bp.route('/generate_204', methods=['GET'])
def generate_204():
    """
    Handle Android captive portal detection
    Android devices check this URL to determine if they're behind a captive portal
    """
    # Redirect to the main page
    return redirect('/', code=302)

@captive_bp.route('/ncsi.txt', methods=['GET'])
def windows_ncsi():
    """
    Handle Windows captive portal detection
    Windows tries to download this file to check internet connectivity
    """
    # Redirect to the main page
    return redirect('/', code=302)

@captive_bp.route('/connecttest.txt', methods=['GET'])
def windows_connect_test():
    """Alternative Windows connectivity test"""
    return redirect('/', code=302)

@captive_bp.route('/redirect', methods=['GET'])
def redirect_to_portal():
    """Generic redirect endpoint"""
    return redirect('/', code=302)

@captive_bp.route('/hotspot-detect.html', methods=['GET'])
def apple_captive_portal():
    """
    Handle Apple captive portal detection
    Apple devices check this URL to determine if they're behind a captive portal
    """
    return redirect('/', code=302)

@captive_bp.route('/success.txt', methods=['GET'])
def success_txt():
    """Another common captive portal test URL"""
    return redirect('/', code=302)

@captive_bp.route('/library/test/success.html', methods=['GET'])
def success_html():
    """Another Apple captive portal test"""
    return redirect('/', code=302)

@captive_bp.route('/kindle-wifi/wifistub.html', methods=['GET'])
def kindle_wifi():
    """Kindle captive portal detection"""
    return redirect('/', code=302)

@captive_bp.route('/mobile/status.php', methods=['GET'])
def mobile_status():
    """Another common captive portal test URL"""
    return redirect('/', code=302)

@captive_bp.route('/check_network_status.txt', methods=['GET'])
def network_status():
    """Another common captive portal test"""
    return redirect('/', code=302)

# For DNS hijacking (when we catch all domains)
@captive_bp.route('/', methods=['GET'], host='<string:domain>')
def catch_all_domains(domain):
    """
    Catch all DNS requests to any domain
    This only works if we use wildcard DNS resolution in dnsmasq
    and if Flask is configured to handle subdomain routing
    """
    # Skip our own domain
    if domain in ['192.168.1.1', 'freebox.local']:
        return None  # Let the regular routes handle it
    
    # Redirect all other domains to our captive portal
    return redirect('http://192.168.1.1/', code=302) 