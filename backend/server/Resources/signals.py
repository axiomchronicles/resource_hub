# resources/signals.py
import os
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import ResourceFile

@receiver(post_delete, sender=ResourceFile)
def delete_resourcefile_blob(sender, instance: ResourceFile, **kwargs):
    try:
        if instance.file:
            storage = instance.file.storage
            if storage.exists(instance.file.name):
                storage.delete(instance.file.name)
    except Exception:
        pass
 