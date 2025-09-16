import os
import unittest

from backend.sendgrid_quickstart import build_message, send_example_email


class TestSendgridQuickstart(unittest.TestCase):
    def test_build_message_minimal(self):
        msg = build_message()
        # Basic sanity checks
        self.assertIsNotNone(msg)

    @unittest.skipUnless(os.environ.get("SENDGRID_API_KEY"), "SENDGRID_API_KEY not set")
    def test_send_example_email_real(self):
        # This sends a real email when API key and emails are configured
        response = send_example_email()
        self.assertTrue(getattr(response, "status_code", 0) in (200, 202))


if __name__ == "__main__":
    unittest.main()


