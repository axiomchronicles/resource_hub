# users/admin.py
import csv
import io
from typing import Any
from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter
from django.contrib.admin.utils import unquote
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminPasswordChangeForm, PasswordResetForm
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.utils.timesince import timesince
from django import forms
from django.utils import timezone
from django.utils.encoding import force_str  # converts UUID to string

from .models import User as ApiUser, Profile, ProfilePic, OTP


# ---------------------------
# Forms
# ---------------------------
class ApiUserCreationForm(forms.ModelForm):
    """Form used when creating a new API user from admin (allows setting password)."""
    password1 = forms.CharField(
        label=_("Password"),
        required=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        help_text=_("Raw password (will be hashed). Leave empty to create an unusable password."),
    )
    password2 = forms.CharField(
        label=_("Password confirmation"),
        required=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        help_text=_("Enter the same password again to confirm."),
    )

    class Meta:
        model = ApiUser
        fields = (
            "email",
            "first_name",
            "last_name",
            "phone",
            "dob",
            "university",
            "course",
            "year",
            "is_active",
            "is_email_verified",
        )

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get("password1")
        p2 = cleaned.get("password2")
        if p1 or p2:
            if p1 != p2:
                raise forms.ValidationError(_("Passwords did not match."))
        return cleaned

    def save(self, commit=True):
        user: ApiUser = super().save(commit=False)
        raw = self.cleaned_data.get("password1")
        if raw:
            user.set_password(raw)
        else:
            user.set_unusable_password()
        if commit:
            user.save()
        return user


class ApiUserChangeForm(forms.ModelForm):
    """Form used when editing an existing user. Password is edited via separate admin view."""
    class Meta:
        model = ApiUser
        fields = (
            "email",
            "first_name",
            "last_name",
            "phone",
            "dob",
            "university",
            "course",
            "year",
            "is_active",
            "is_email_verified",
            "consent",
        )


# ---------------------------
# Inlines
# ---------------------------
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name = _("Profile")
    fk_name = "user"
    extra = 0
    readonly_fields = ("updated_via",)
    classes = ("collapse",)


class ProfilePicInline(admin.StackedInline):
    model = ProfilePic
    fk_name = "user"
    extra = 0
    readonly_fields = ("uploaded_at", "size", "mime_type", "original_filename", "preview")
    fields = ("file", "original_filename", "mime_type", "size", "uploaded_at", "preview")
    classes = ("collapse",)

    def preview(self, obj):
        if not obj or not getattr(obj, "file", None):
            return "(no image)"
        try:
            url = obj.file.url
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:80px; max-width:80px; object-fit:cover; border-radius:6px; border:1px solid #ccc;" />'
                "</a>",
                url,
            )
        except Exception:
            return "(image unavailable)"
    preview.short_description = _("Preview")


# ---------------------------
# Filters
# ---------------------------
class EmailVerifiedFilter(SimpleListFilter):
    title = _("email verified")
    parameter_name = "is_email_verified"

    def lookups(self, request, model_admin):
        return (
            ("1", _("Verified")),
            ("0", _("Not verified")),
        )

    def queryset(self, request, queryset):
        if self.value() == "1":
            return queryset.filter(is_email_verified=True)
        if self.value() == "0":
            return queryset.filter(is_email_verified=False)
        return queryset


# ---------------------------
# ApiUser Admin
# ---------------------------
@admin.register(ApiUser)
class ApiUserAdmin(admin.ModelAdmin):
    form = ApiUserChangeForm
    add_form = ApiUserCreationForm
    inlines = (ProfileInline, ProfilePicInline)

    list_display = (
        "email_link",
        "full_name",
        "phone",
        "status_badge",
        "email_verified_badge",
        "year_badge",
        "age_display",
        "last_active",
        "profile_thumbnail",
        "created_at",
    )
    list_filter = ("is_active", EmailVerifiedFilter, "year", "created_at")
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "last_login", "age_display", "full_name")
    list_editable = ("phone",)
    list_select_related = ("profile", "profile_pic")
    list_per_page = 40

    fieldsets = (
        (_("Account Info"), {"fields": ("email",)}),
        (_("Personal Info"), {"fields": ("first_name", "last_name", "phone", "dob")}),
        (_("Academic"), {"fields": ("university", "course", "year")}),
        (_("Status"), {"fields": ("is_active", "is_email_verified", "consent")}),
        (_("Timestamps"), {"fields": ("created_at", "updated_at", "last_login")}),
    )

    actions = [
        "deactivate_selected",
        "activate_selected",
        "export_selected_csv",
        "export_selected_emails",
        "mark_emails_verified",
        "send_password_reset_email_action",
    ]

    # ---------------------------
    # Queryset optimization
    # ---------------------------
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # select related where we can
        return qs.select_related("profile", "profile_pic")

    # ---------------------------
    # List / computed helpers
    # ---------------------------
    @admin.display(description="Email", ordering="email")
    def email_link(self, obj):
        """
        Build admin change URL dynamically (works regardless of app_label/model_name)
        and ensure the PK is converted to string (handles UUID PKs).
        """
        app_label = obj._meta.app_label
        model_name = obj._meta.model_name
        url = reverse(f"admin:{app_label}_{model_name}_change", args=(force_str(obj.pk),))
        return format_html('<a href="{}">{}</a>', url, obj.email)

    email_link.short_description = "Email"
    email_link.admin_order_field = "email"

    @admin.display(description=_("Full name"))
    def full_name(self, obj: ApiUser):
        return obj.full_name or "-"

    @admin.display(description=_("Age"))
    def age_display(self, obj: ApiUser):
        try:
            a = obj.age()
            return a if a is not None else "-"
        except Exception:
            return "-"

    @admin.display(description=_("Last active"), ordering="last_login")
    def last_active(self, obj: ApiUser):
        if obj.last_login:
            return f"{timesince(obj.last_login)} ago"
        return "-"

    @admin.display(description=_("Profile"), ordering=None)
    def profile_thumbnail(self, obj: ApiUser):
        pic = getattr(obj, "profile_pic", None)
        if pic and getattr(pic, "file", None):
            url = pic.file.url
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:40px; max-width:40px; object-fit:cover; border-radius:4px; border:1px solid #ccc;" />'
                "</a>",
                url,
            )
        return "-"

    @admin.display(description=_("Status"), ordering="is_active")
    def status_badge(self, obj: ApiUser):
        color = "green" if obj.is_active else "red"
        label = _("Active") if obj.is_active else _("Inactive")
        return format_html('<span style="color:{}; font-weight:bold;">{}</span>', color, label)

    @admin.display(description=_("Email Verified"), ordering="is_email_verified")
    def email_verified_badge(self, obj: ApiUser):
        color = "green" if obj.is_email_verified else "orange"
        label = _("Verified") if obj.is_email_verified else _("Pending")
        return format_html('<span style="color:{}; font-weight:bold;">{}</span>', color, label)

    @admin.display(description=_("Year"))
    def year_badge(self, obj: ApiUser):
        if obj.year:
            return format_html('<span style="font-weight:bold; color:#007bff;">{} {}</span>', _("Year"), obj.year)
        return "-"

    # ---------------------------
    # Actions
    # ---------------------------
    @admin.action(description=_("Deactivate selected users"))
    def deactivate_selected(self, request: HttpRequest, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, _("%d user(s) deactivated.") % updated, messages.SUCCESS)

    @admin.action(description=_("Activate selected users"))
    def activate_selected(self, request: HttpRequest, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, _("%d user(s) activated.") % updated, messages.SUCCESS)

    @admin.action(description=_("Export selected users (CSV)"))
    def export_selected_csv(self, request: HttpRequest, queryset):
        # permission check
        if not request.user.has_perm("users.view_user"):
            self.message_user(request, _("You do not have permission to export users."), level=messages.ERROR)
            return

        meta = self.model._meta
        field_names = ["id", "email", "first_name", "last_name", "phone", "university", "course", "year", "dob", "is_active", "is_email_verified", "created_at"]

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(field_names)
        for obj in queryset:
            writer.writerow([getattr(obj, f) for f in field_names])

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="users_export.csv"'
        return response

    @admin.action(description=_("Export selected emails"))
    def export_selected_emails(self, request: HttpRequest, queryset):
        emails = list(queryset.values_list("email", flat=True))
        self.message_user(request, ", ".join(emails))

    @admin.action(description=_("Mark selected users as email verified"))
    def mark_emails_verified(self, request: HttpRequest, queryset):
        updated = queryset.update(is_email_verified=True)
        self.message_user(request, _("%d user(s) marked as verified.") % updated, messages.SUCCESS)

    @admin.action(description=_("Send password reset email to selected users"))
    def send_password_reset_email_action(self, request: HttpRequest, queryset):
        if not request.user.has_perm("auth.change_user"):
            self.message_user(request, _("You don't have permission to send password reset emails."), level=messages.ERROR)
            return

        sent = 0
        for user in queryset:
            # Use Django's PasswordResetForm to send the email via configured EMAIL_BACKEND
            form = PasswordResetForm({"email": user.email})
            if form.is_valid():
                form.save(request=request, use_https=request.is_secure(), email_template_name="registration/password_reset_email.html")
                sent += 1
        self.message_user(request, _("%d password reset email(s) sent.") % sent, messages.SUCCESS)

    # ---------------------------
    # Custom admin urls (password change)
    # ---------------------------
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<path:object_id>/set-password/",
                self.admin_site.admin_view(self.user_set_password),
                name="users_apiuser_set_password",
            ),
        ]
        return custom + urls

    def response_change(self, request, obj):
        """
        After saving user, redirect back to change page (default behavior preserved).
        """
        return super().response_change(request, obj)

    def user_set_password(self, request: HttpRequest, object_id):
        obj = self.get_object(request, unquote(object_id))
        if obj is None:
            self.message_user(request, _("User not found."), level=messages.ERROR)
            return HttpResponseRedirect(reverse("admin:users_apiuser_changelist"))

        if not request.user.has_perm("auth.change_user"):
            self.message_user(request, _("Permission denied."), level=messages.ERROR)
            return HttpResponseRedirect(reverse("admin:users_apiuser_change", args=(object_id,)))

        if request.method == "POST":
            form = AdminPasswordChangeForm(user=obj, data=request.POST)
            if form.is_valid():
                form.save()
                self.message_user(request, _("Password changed successfully."), level=messages.SUCCESS)
                url = reverse("admin:users_apiuser_change", args=(object_id,))
                return HttpResponseRedirect(url)
        else:
            form = AdminPasswordChangeForm(user=obj)

        context = dict(
            self.admin_site.each_context(request),
            title=_("Change password: %s") % obj.email,
            form=form,
            object=obj,
            opts=self.model._meta,
            original=obj,
        )

        from django.template.response import TemplateResponse

        return TemplateResponse(request, "admin/auth/user/change_password.html", context)

    # ---------------------------
    # Hook into change view to show quick links
    # ---------------------------
    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, unquote(object_id))
        if obj:
            extra_context.update(
                {
                    "password_change_url": reverse("admin:users_apiuser_set_password", args=(object_id,)),
                    "send_reset_url": reverse("admin:users_apiuser_changelist"),
                }
            )
        return super().change_view(request, object_id, form_url, extra_context)

    # ---------------------------
    # Permissions: be explicit about add/change/delete
    # ---------------------------
    def has_add_permission(self, request):
        # only allow staff/superuser
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        return request.user.is_staff

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff or request.user == obj

    # ---------------------------
    # Save model tweaks (ensure timestamps)
    # ---------------------------
    def save_model(self, request, obj, form, change):
        if not change:
            # new user created; ensure password handled in add_form
            pass
        super().save_model(request, obj, form, change)


# ---------------------------
# Profile Admin
# ---------------------------
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "updated_via", "created_at", "updated_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    readonly_fields = ("created_at", "updated_at")


# ---------------------------
# ProfilePic Admin
# ---------------------------
@admin.register(ProfilePic)
class ProfilePicAdmin(admin.ModelAdmin):
    list_display = ("user", "original_filename", "size", "uploaded_at", "preview")
    search_fields = ("user__email", "original_filename")
    readonly_fields = ("size", "uploaded_at")
    fields = ("user", "file", "original_filename", "mime_type", "size", "uploaded_at", "preview")

    def preview(self, obj):
        if not obj or not getattr(obj, "file", None):
            return "(no image)"
        try:
            url = obj.file.url
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:100px; max-width:150px; object-fit:cover; border-radius:6px; border:1px solid #ccc;" />'
                "</a>",
                url,
            )
        except Exception:
            return "(image unavailable)"
    preview.short_description = _("Preview")


# ---------------------------
# OTP Admin
# ---------------------------
@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ("user", "code", "expires_at", "is_verified", "created_at")
    search_fields = ("user__email", "code")
    readonly_fields = ("created_at",)
    list_filter = ("is_verified",)
    actions = ["mark_verified", "export_otps_csv"]

    def has_add_permission(self, request):
        return False

    @admin.action(description=_("Mark selected OTPs as verified"))
    def mark_verified(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, _("%d OTP(s) marked verified.") % updated, messages.SUCCESS)

    @admin.action(description=_("Export selected OTPs (CSV)"))
    def export_otps_csv(self, request, queryset):
        if not request.user.has_perm("users.view_otp"):
            self.message_user(request, _("You do not have permission to export OTPs."), level=messages.ERROR)
            return

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        field_names = ["id", "user_email", "code", "expires_at", "is_verified", "created_at"]
        writer.writerow(field_names)
        for otp in queryset:
            writer.writerow([otp.id, otp.user.email, otp.code, otp.expires_at.isoformat(), otp.is_verified, otp.created_at.isoformat()])

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="otps_export.csv"'
        return response
