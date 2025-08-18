# users/signals.py
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_delete
from .models import User, Profile, ProfilePic
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def ensure_profile_exists(sender, instance: User, created: bool, **kwargs):
    """
    Create a Profile row when a User is created. Use transaction.atomic to avoid races.
    """
    if created:
        try:
            Profile.objects.create(user=instance)
        except Exception:
            logger.exception("Failed to create profile for user %s", instance.email)


@receiver(pre_delete, sender=User)
def cleanup_profile_pic(sender, instance: User, **kwargs):
    """
    Ensure profile pic file is removed when User removed.
    """
    try:
        pic = getattr(instance, "profile_pic", None)
        if pic:
            pic.delete()
    except Exception:
        logger.exception("Failed to delete profile pic for user %s", instance.email)
