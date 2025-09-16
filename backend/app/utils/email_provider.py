"""Email provider selector. Defaults to Gmail until EMAIL_PROVIDER=sendgrid."""

from app.config import settings


def get_email_sender():
    # Deferred imports so startup is unaffected
    if settings.email_provider.lower() == "sendgrid":
        from app.utils.sendgrid_email_sender import MinimalSendGridSender
        # from_email/reply_to come from env via config (optional)
        try:
            from app.config import settings as _s
            return MinimalSendGridSender(
                from_email=getattr(_s, "sendgrid_from_email", None),
                reply_to=getattr(_s, "sendgrid_reply_to_email", None),
            )
        except Exception:
            return MinimalSendGridSender()
    else:
        # Fallback to existing Gmail sender
        from app.utils.gmail_email_sender import gmail_email_sender
        return gmail_email_sender


