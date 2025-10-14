"""
Cognito Pre-Signup Lambda Trigger
Validates user email addresses against an allowlist stored in environment variable.

Environment Variables:
- ALLOWED_SIGNUP_EMAILS: Comma-separated list of allowed email addresses
                         If empty or not set, all sign-ups are allowed (no restriction)

Behavior:
- Empty allowlist: Allow all sign-ups (no restriction)
- Populated allowlist: Only allow sign-ups from emails in the list
- Case-insensitive email matching
- Auto-confirms email for allowed users
"""
import json
import os


def handler(event, context):
    """
    Handle Cognito Pre-Signup trigger event.

    Args:
        event: Cognito Pre-Signup event
        context: Lambda context

    Returns:
        Modified event with auto-confirm flags for allowed users

    Raises:
        Exception: If user email is not in allowlist (prevents sign-up)
    """
    try:
        # Get user email from event
        user_email = event['request']['userAttributes'].get('email', '').strip().lower()

        if not user_email:
            raise Exception("Email is required for sign-up")

        # Get allowlist from environment variable
        allowed_emails_str = os.environ.get('ALLOWED_SIGNUP_EMAILS', '').strip()

        # If allowlist is empty, allow all sign-ups (no restriction)
        if not allowed_emails_str:
            print(f"No email allowlist configured - allowing sign-up for: {user_email}")

            # Auto-confirm email for all users when no allowlist
            event['response']['autoConfirmUser'] = True
            event['response']['autoVerifyEmail'] = True

            return event

        # Parse allowlist (comma-separated emails)
        allowed_emails = [
            email.strip().lower()
            for email in allowed_emails_str.split(',')
            if email.strip()
        ]

        # Check if user email is in allowlist
        if user_email in allowed_emails:
            print(f"Email allowlist check passed for: {user_email}")

            # Auto-confirm user and verify email
            event['response']['autoConfirmUser'] = True
            event['response']['autoVerifyEmail'] = True

            return event
        else:
            # Email not in allowlist - reject sign-up
            print(f"Email allowlist check failed for: {user_email}")
            print(f"Allowed emails: {allowed_emails}")

            raise Exception(
                f"Sign-up not allowed. Your email ({user_email}) is not authorized to create an account. "
                f"Please contact the administrator for access."
            )

    except Exception as e:
        # Log error details
        print(f"Pre-signup validation error: {str(e)}")
        print(f"Event: {json.dumps(event, default=str)}")

        # Re-raise to prevent sign-up
        raise
