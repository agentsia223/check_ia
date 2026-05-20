from django.test import SimpleTestCase
from rest_framework.settings import api_settings


class RestFrameworkSettingsTest(SimpleTestCase):
    def test_unauthenticated_user_does_not_require_django_auth_app(self):
        self.assertIsNone(api_settings.UNAUTHENTICATED_USER)
