# transactions/signals.py
# Django signal — fires automatically whenever a Transaction is saved
# If status changes TO 'cancelled' or 'failed' on a withdrawal → refund USD

from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.db.models import F
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(pre_save, sender='transactions.Transaction')
def refund_on_withdrawal_cancel(sender, instance, **kwargs):
    """
    Automatically refunds USD to user when a withdrawal is cancelled/failed.
    Fires BEFORE every Transaction.save() — checks if status changed to cancelled/failed.
    """
    # Only care about withdrawals
    if instance.type != 'withdraw':
        return

    # Only trigger on cancel or fail
    if instance.status not in ('cancelled', 'failed'):
        return

    # Check if this is an existing record (has pk) — not a new one
    if not instance.pk:
        return

    try:
        # Get the OLD status from DB before this save
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    # Only refund if status is CHANGING to cancelled/failed (not already was)
    if old.status == instance.status:
        return  # status didn't change, don't refund again

    # Only refund if it was previously pending
    if old.status != 'pending':
        return  # already processed, don't double-refund

    # ── REFUND: add usd_amount back to user balance ──────────
    User.objects.filter(pk=instance.user_id).update(
        usd_balance=F('usd_balance') + instance.usd_amount
    )

    # Append refund note
    refund_note = f' | AUTO-REFUNDED ${float(instance.usd_amount):.2f} to user.'
    instance.notes = (instance.notes or '') + refund_note

    print(f'[SIGNAL] Refunded ${float(instance.usd_amount):.2f} to user_id={instance.user_id} — Tx #{instance.pk}')