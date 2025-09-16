"""Email provider selector. Defaults to Gmail until EMAIL_PROVIDER=sendgrid."""

import logging
from app.config import settings

logger = logging.getLogger(__name__)


def get_email_sender():
    # Deferred imports so startup is unaffected
    provider = (settings.email_provider or "").lower()
    logger.info(f"Email provider setting: {provider or 'unset (default gmail)'}")

    if provider == "sendgrid":
        from app.utils.sendgrid_email_sender import MinimalSendGridSender
        # from_email/reply_to come from env via config (optional)
        try:
            from app.config import settings as _s
            sender = MinimalSendGridSender(
                from_email=getattr(_s, "sendgrid_from_email", None),
                reply_to=getattr(_s, "sendgrid_reply_to_email", None),
            )
            logger.info("Using SendGrid email sender")
            return sender
        except Exception:
            logger.warning("Falling back to default SendGrid sender without config overrides")
            return MinimalSendGridSender()
    else:
        # Fallback to existing Gmail sender
        from app.utils.gmail_email_sender import gmail_email_sender
        logger.info("Using Gmail email sender")
        return gmail_email_sender


