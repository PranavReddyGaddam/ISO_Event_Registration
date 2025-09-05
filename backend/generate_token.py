#!/usr/bin/env python3
"""
Script to generate Gmail API token.json for a new email address.
Run this script to authenticate and generate the token.json file.
"""

import os
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def generate_token():
    """Generate token.json for Gmail API authentication."""
    
    # Path to credentials.json (download from Google Cloud Console)
    credentials_path = Path(__file__).parent / "credentials.json"
    token_path = Path(__file__).parent / "token.json"
    
    print("🔧 Gmail API Token Generator")
    print("=" * 50)
    
    # Check if credentials.json exists
    if not credentials_path.exists():
        print("❌ Error: credentials.json not found!")
        print("\n📋 Please follow these steps:")
        print("1. Go to Google Cloud Console")
        print("2. Enable Gmail API")
        print("3. Create OAuth2 credentials (Desktop application)")
        print("4. Download credentials.json to this directory")
        print(f"5. Expected location: {credentials_path}")
        return False
    
    print("✅ Found credentials.json")
    
    creds = None
    
    # Check if token.json already exists
    if token_path.exists():
        print("📄 Loading existing token...")
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    
    # If there are no valid credentials, request authorization
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            creds.refresh(Request())
        else:
            print("🔐 Requesting new authorization...")
            print("\n📱 A browser window will open for authentication.")
            print("Please log in with your NEW email address.")
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(credentials_path), SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for next run
        print("💾 Saving token to token.json...")
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    print("✅ Token generated successfully!")
    print(f"📁 Token saved to: {token_path}")
    print("\n🎉 You can now use this email for sending emails from your application!")
    
    return True

if __name__ == '__main__':
    try:
        generate_token()
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure credentials.json is in the correct location")
        print("2. Ensure Gmail API is enabled in Google Cloud Console")
        print("3. Check that your OAuth consent screen is configured")
        print("4. Verify your email is added as a test user")
