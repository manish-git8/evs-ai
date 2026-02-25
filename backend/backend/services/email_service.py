"""
Email service for sending support ticket notifications.

This module handles sending email notifications for support tickets
to both users and administrators.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from config.settings import settings
from utils.audit_logger import log_error, log_action


def send_ticket_email(ticket_id: str, name: str, email: str, issue_text: str) -> bool:
    """
    Send ticket confirmation emails to user and admin.
    
    Sends two emails:
    1. Confirmation email to the user who submitted the ticket
    2. Notification email to the admin team
    
    Args:
        ticket_id: Unique ticket identifier
        name: Name of the user submitting the ticket
        email: Email address of the user
        issue_text: Description of the issue
        
    Returns:
        True if emails sent successfully, False otherwise
    """
    # Validate email format before attempting to send
    if not email or '@' not in email:
        log_error(
            "Invalid email address format",
            details={"email": email, "ticket_id": ticket_id, "error": "Email missing @ symbol or empty"},
            exc_info=False
        )
        return False
    
    # Normalize email (lowercase, strip whitespace)
    email = email.lower().strip()
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        # Email body for user confirmation
        user_body = f"""

Dear {name},

Thank you for contacting EVSProcure Support. Your ticket has been successfully created.

Ticket Details:
----------------------------------------------------
Ticket ID: {ticket_id}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Status: Open

Your Issue:
{issue_text}

Our support team will review your ticket and get back to you shortly.

Please keep this ticket ID ({ticket_id}) for future reference.

Best regards,
EVSProcure Support Team
"""
 
        # Send confirmation email to user
        user_msg = MIMEMultipart()
        user_msg['From'] = settings.SMTP_USERNAME
        user_msg['To'] = email
        user_msg['Subject'] = f"Support Ticket #{ticket_id} - EVSProcure Support Team"
        user_msg.attach(MIMEText(user_body, 'plain'))
        server.send_message(user_msg)
        log_action("ticket_email_sent", details={"recipient": email, "ticket_id": ticket_id, "type": "user"})
        
        # Email body for admin notification
        admin_body = f"""
New Support Ticket Received

Ticket Details:
----------------------------------------------------
Ticket ID: {ticket_id} 
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Status: Open
Submitted By: {name}
User Email: {email}

Issue Description:
{issue_text}

Please review and respond to this ticket.

---
This is an automated notification from EVSProcure Support System.
"""
 
        # Send notification email to admin
        admin_msg = MIMEMultipart()
        admin_msg['From'] = settings.SMTP_USERNAME
        admin_msg['To'] = settings.ADMIN_EMAIL
        admin_msg['Subject'] = f"New Support Ticket #{ticket_id} - Submitted by {name}"
        admin_msg.attach(MIMEText(admin_body, 'plain'))
        server.send_message(admin_msg)
        log_action("ticket_email_sent", details={"recipient": settings.ADMIN_EMAIL, "ticket_id": ticket_id, "type": "admin"})
        
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        log_error(
            "SMTP Authentication Error",
            details={"error": str(e), "ticket_id": ticket_id},
            exc_info=True
        )
        return False
    except smtplib.SMTPException as e:
        log_error(
            "SMTP Error",
            details={"error": str(e), "ticket_id": ticket_id},
            exc_info=True
        )
        return False
    except Exception as e:
        log_error(
            "Error sending email",
            details={"error": str(e), "ticket_id": ticket_id},
            exc_info=True
        )
        return False
