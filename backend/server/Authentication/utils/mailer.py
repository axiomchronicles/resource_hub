# utils/email_utils.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


Attachment = Tuple[str, bytes, str]  # (filename, content_bytes, mimetype)


def send_email(
    subject: str,
    recipient_list: List[str],
    from_email: Optional[str] = None,
    *,
    text_message: Optional[str] = None,
    html_message: Optional[str] = None,
    template_name: Optional[str] = None,
    template_html_name: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[Attachment]] = None,
    fail_silently: bool = False,
) -> bool:
    """
    Send an email. Supports rendering Django templates with context for plain-text
    and HTML variants.

    Priority:
      1. If template_html_name provided -> render HTML from it.
      2. If template_name provided -> render plain-text from it.
      3. If html_message/text_message provided directly -> use them.

    Args:
        subject: email subject
        recipient_list: list of recipient email addresses
        from_email: sender email (defaults to settings.DEFAULT_FROM_EMAIL)
        text_message: plain text body (optional)
        html_message: html body (optional)
        template_name: path to plain-text template (optional)
        template_html_name: path to HTML template (optional)
        context: dict passed to template renderer (optional)
        attachments: list of tuples (filename, bytes, mimetype) to attach
        fail_silently: if True, exceptions are suppressed and False returned on error

    Returns:
        True if send succeeded (at least one recipient), False otherwise.
    """
    from_email = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None)
    context = context or {}
    attachments = attachments or []

    # Render templates if provided
    try:
        if template_html_name:
            html_message = render_to_string(template_html_name, context)

        if template_name:
            # If template_name is provided, render plain text. If not provided and html exists, derive text.
            text_message = render_to_string(template_name, context)

        # If we have HTML but no plain text, auto-generate a text version
        if html_message and not text_message:
            text_message = strip_tags(html_message)

        if not (text_message or html_message):
            raise ValueError("Either text_message, html_message, template_name or template_html_name must be provided.")

        # Build the EmailMultiAlternatives message
        msg = EmailMultiAlternatives(subject=subject, body=text_message or "", from_email=from_email, to=recipient_list)

        if html_message:
            msg.attach_alternative(html_message, "text/html")

        # Attach files if provided: (filename, bytes, mimetype)
        for filename, content_bytes, mimetype in attachments:
            try:
                msg.attach(filename, content_bytes, mimetype)
            except Exception:
                # attempt attaching without mimetype as fallback
                try:
                    msg.attach(filename, content_bytes)
                except Exception:
                    logger.exception("Failed to attach file %s", filename)

        # send (blocking). In production you can call this from a background worker.
        sent_count = msg.send(fail_silently=fail_silently)

        if sent_count:
            logger.info("Email sent: subject=%s recipients=%s context_keys=%s", subject, recipient_list, list(context.keys()))
            return True

        logger.warning("Email not sent (send returned 0): subject=%s recipients=%s", subject, recipient_list)
        return False

    except Exception as exc:
        logger.exception("Error sending email (subject=%s, recipients=%s): %s", subject, recipient_list, exc)
        if not fail_silently:
            raise
        return False
