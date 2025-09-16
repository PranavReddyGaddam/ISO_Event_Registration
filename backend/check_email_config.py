#!/usr/bin/env python3
"""
Check email configuration and diagnose issues.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def check_environment():
    """Check environment variables and configuration."""
    print("🔍 Email Configuration Check")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = backend_dir / ".env"
    print(f"📄 .env file exists: {env_file.exists()}")
    
    if env_file.exists():
        print(f"📄 .env file size: {env_file.stat().st_size} bytes")
    
    # Check environment variables
    required_vars = [
        'GMAIL_EMAIL',
        'GMAIL_APP_PASSWORD',
        'SUPABASE_URL',
        'SUPABASE_KEY',
        'SUPABASE_SERVICE_KEY'
    ]
    
    print("\n🔧 Environment Variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if 'PASSWORD' in var or 'KEY' in var:
                print(f"  ✅ {var}: {'*' * min(len(value), 20)}")
            else:
                print(f"  ✅ {var}: {value}")
        else:
            print(f"  ❌ {var}: NOT SET")
    
    # Check token.json
    token_path = backend_dir / "token.json"
    print(f"\n🎫 Token Configuration:")
    print(f"  📄 token.json exists: {token_path.exists()}")
    
    if token_path.exists():
        try:
            import json
            with open(token_path, 'r') as f:
                token_data = json.load(f)
                print(f"  📊 Token keys: {list(token_data.keys())}")
                if 'token' in token_data:
                    print(f"  🔑 Token type: {type(token_data['token'])}")
        except Exception as e:
            print(f"  ❌ Error reading token: {e}")
    
    # Check Python packages
    print(f"\n📦 Required Packages:")
    required_packages = [
        'googleapiclient',
        'google.oauth2',
        'google.auth'
    ]
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}: Available")
        except ImportError:
            print(f"  ❌ {package}: NOT INSTALLED")
    
    # Test settings loading
    print(f"\n⚙️ Settings Test:")
    try:
        from app.config import settings
        print(f"  ✅ Settings loaded successfully")
        print(f"  📧 Gmail Email: {settings.gmail_email}")
        print(f"  🔑 App Password: {'*' * len(settings.gmail_app_password) if settings.gmail_app_password else 'NOT SET'}")
    except Exception as e:
        print(f"  ❌ Settings error: {e}")

if __name__ == "__main__":
    check_environment()
