"""
Enhanced email validation utilities for the backend.
"""

import re
from typing import Optional, Tuple
from pydantic import EmailStr, validator
from email_validator import validate_email, EmailNotValidError


# Common TLD typos and their corrections
TLD_TYPOS = {
    'con': 'com',
    'cpm': 'com', 
    'co': 'com',
    'cm': 'com',
    'c0m': 'com',
    'c0n': 'com',
    'ogr': 'org',
    'n3t': 'net',
    'ed': 'edu',
    'edv': 'edu',
    'edh': 'edu',
    'edj': 'edu',
    'edk': 'edu',
    'edl': 'edu',
    'edn': 'edu',
    'edm': 'edu',
    'edb': 'edu',
    'edg': 'edu',
    'edf': 'edu',
    'edr': 'edu',
    'edt': 'edu',
    'edy': 'edu',
    'edc': 'edu',
    'edx': 'edu',
    'edz': 'edu',
    'edw': 'edu',
    'edq': 'edu',
    'edp': 'edu',
    'eds': 'edu',
    'ed1': 'edu',
    'ed2': 'edu',
    'ed3': 'edu',
    'ed4': 'edu',
    'ed5': 'edu',
    'ed6': 'edu',
    'ed7': 'edu',
    'ed8': 'edu',
    'ed9': 'edu',
    'ed0': 'edu',
    'g0v': 'gov',
}

# Common domain typos and their corrections
DOMAIN_TYPOS = {
    'gmail.con': 'gmail.com',
    'gmail.cpm': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yahoo.con': 'yahoo.com',
    'hotmail.con': 'hotmail.com',
    'outlook.con': 'outlook.com',
    # Common .edu typos
    'gmail.ed': 'gmail.edu',
    'gmail.edv': 'gmail.edu',
    'gmail.edh': 'gmail.edu',
    'gmail.edj': 'gmail.edu',
    'gmail.edk': 'gmail.edu',
    'gmail.edl': 'gmail.edu',
    'gmail.edn': 'gmail.edu',
    'gmail.edm': 'gmail.edu',
    'gmail.edb': 'gmail.edu',
    'gmail.edg': 'gmail.edu',
    'gmail.edf': 'gmail.edu',
    'gmail.edr': 'gmail.edu',
    'gmail.edt': 'gmail.edu',
    'gmail.edy': 'gmail.edu',
    'gmail.edc': 'gmail.edu',
    'gmail.edx': 'gmail.edu',
    'gmail.edz': 'gmail.edu',
    'gmail.edw': 'gmail.edu',
    'gmail.edq': 'gmail.edu',
    'gmail.edp': 'gmail.edu',
    'gmail.eds': 'gmail.edu',
    'gmail.ed1': 'gmail.edu',
    'gmail.ed2': 'gmail.edu',
    'gmail.ed3': 'gmail.edu',
    'gmail.ed4': 'gmail.edu',
    'gmail.ed5': 'gmail.edu',
    'gmail.ed6': 'gmail.edu',
    'gmail.ed7': 'gmail.edu',
    'gmail.ed8': 'gmail.edu',
    'gmail.ed9': 'gmail.edu',
    'gmail.ed0': 'gmail.edu',
    # Common university domain typos
    'harvard.ed': 'harvard.edu',
    'mit.ed': 'mit.edu',
    'stanford.ed': 'stanford.edu',
    'berkeley.ed': 'berkeley.edu',
    'ucla.ed': 'ucla.edu',
    'yale.ed': 'yale.edu',
    'princeton.ed': 'princeton.edu',
    'columbia.ed': 'columbia.edu',
    'cornell.ed': 'cornell.edu',
    'duke.ed': 'duke.edu',
    'northwestern.ed': 'northwestern.edu',
    'brown.ed': 'brown.edu',
    'dartmouth.ed': 'dartmouth.edu',
    'vanderbilt.ed': 'vanderbilt.edu',
    'rice.ed': 'rice.edu',
    'washington.ed': 'washington.edu',
    'georgetown.ed': 'georgetown.edu',
    'emory.ed': 'emory.edu',
    'carnegie.ed': 'carnegie.edu',
    'nyu.ed': 'nyu.edu',
    'usc.ed': 'usc.edu',
    'tufts.ed': 'tufts.edu',
    'wake.ed': 'wake.edu',
    'virginia.ed': 'virginia.edu',
    'unc.ed': 'unc.edu',
    'michigan.ed': 'michigan.edu',
    'wisconsin.ed': 'wisconsin.edu',
    'illinois.ed': 'illinois.edu',
    'purdue.ed': 'purdue.edu',
    'indiana.ed': 'indiana.edu',
    'ohio.ed': 'ohio.edu',
    'penn.ed': 'penn.edu',
    'rutgers.ed': 'rutgers.edu',
    'maryland.ed': 'maryland.edu',
    'georgia.ed': 'georgia.edu',
    'florida.ed': 'florida.edu',
    'texas.ed': 'texas.edu',
    'arizona.ed': 'arizona.edu',
    'california.ed': 'california.edu',
    'oregon.ed': 'oregon.edu',
    'washington.ed': 'washington.edu',
}

# Common email provider typos
PROVIDER_TYPOS = {
    'gmial': 'gmail',
    'gmaill': 'gmail',
    'gmai': 'gmail',
    'gmail.': 'gmail',
    'yahooo': 'yahoo',
    'yaho': 'yahoo',
    'hotmial': 'hotmail',
    'hotmai': 'hotmail',
    'outlok': 'outlook',
    'outloo': 'outlook',
    'outlook.': 'outlook',
}


def validate_email_with_suggestions(email: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validate email with typo detection and suggestions.
    
    Returns:
        Tuple of (is_valid, error_message, suggestion)
    """
    email = email.strip().lower()
    
    # Basic format check
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return False, "Invalid email format", None
    
    # Split email into parts
    try:
        local_part, domain = email.split('@', 1)
    except ValueError:
        return False, "Invalid email format", None
    
    if not local_part or not domain:
        return False, "Invalid email format", None
    
    # Check for exact domain typos (like gmail.con -> gmail.com)
    if domain in DOMAIN_TYPOS:
        return False, "Please check your email address for typos", None
    
    # Check for common TLD typos (like .con -> .com)
    domain_parts = domain.split('.')
    tld = domain_parts[-1]
    
    if tld in TLD_TYPOS:
        return False, "Please check your email address for typos", None
    
    # Check for common provider typos (be more specific to avoid false positives)
    for typo, correction in PROVIDER_TYPOS.items():
        # Only flag if the typo is present and the correction is not already in the domain
        if typo in domain and correction not in domain:
            return False, "Please check your email address for typos", None
    
    # Check for formatting issues
    if '..' in domain or domain.startswith('.') or domain.endswith('.'):
        return False, "Email contains invalid formatting", None
    
    # Use email-validator for final validation
    try:
        validate_email(email, check_deliverability=False)
        return True, None, None
    except EmailNotValidError as e:
        return False, str(e), None


def enhanced_email_validator(cls, v: str) -> str:
    """
    Pydantic validator for enhanced email validation with typo detection.
    """
    is_valid, error_msg, suggestion = validate_email_with_suggestions(v)
    
    if not is_valid:
        raise ValueError(error_msg or "Invalid email address")
    
    return v


# Example usage in Pydantic models:
# @validator("email")
# def validate_email(cls, v: str) -> str:
#     return enhanced_email_validator(cls, v)
