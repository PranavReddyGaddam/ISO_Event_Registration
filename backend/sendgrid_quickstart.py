import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def build_message() -> Mail:
    return Mail(
        from_email=os.environ.get("SENDGRID_FROM_EMAIL", "from_email@example.com"),
        to_emails=os.environ.get("SENDGRID_TO_EMAIL", "to@example.com"),
        subject="Sending with Twilio SendGrid is Fun",
        html_content="<strong>and easy to do anywhere, even with Python</strong>",
    )


def send_example_email():
    message = build_message()
    try:
        sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
        # sg.set_sendgrid_data_residency("eu")
        # uncomment the above line if you are sending mail using a regional EU subuser
        response = sg.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
        return response
    except Exception as e:
        print(str(e))
        raise


if __name__ == "__main__":
    send_example_email()


