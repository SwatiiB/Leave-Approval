import os
from email.message import EmailMessage
import smtplib
from jinja2 import Environment, FileSystemLoader
from dotenv import load_dotenv
from app.utils.tokens import generate_approval_token

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# URL Configuration for deployment
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

env = Environment(loader=FileSystemLoader("app/utils/templates"))

def send_leave_action_email(leave_dict):
    try:
        # Check if email configuration is available
        if not all([EMAIL_HOST, EMAIL_USER, EMAIL_PASS]):
            print("Email configuration not available, skipping email notification")
            return
        
        # Validate URL configuration
        if not BACKEND_URL or not FRONTEND_URL:
            print("URL configuration missing, using default localhost URLs")
            backend_url = "http://localhost:8000"
            frontend_url = "http://localhost:5173"
        else:
            backend_url = BACKEND_URL
            frontend_url = FRONTEND_URL
        
        print(f"Email will use URLs - Backend: {backend_url}, Frontend: {frontend_url}")
        
        # For production, get fresh leave data to show current status in email
        from app.models.db import leaves_collection
        from bson import ObjectId
        
        # Get the latest leave data if _id exists
        if '_id' in leave_dict:
            fresh_leave = leaves_collection.find_one({"_id": ObjectId(leave_dict['_id'])})
            if fresh_leave:
                # Update leave_dict with fresh data
                leave_dict.update(fresh_leave)
                leave_dict['_id'] = str(fresh_leave['_id'])
                leave_dict['manager_id'] = str(fresh_leave['manager_id'])
                leave_dict['employee_id'] = str(fresh_leave['employee_id'])
        
        # Generate one-time tokens for approval and rejection
        leave_id = str(leave_dict['_id'])
        manager_id = str(leave_dict['manager_id'])
        
        # Generate tokens (24 hours validity)
        approval_token = generate_approval_token(leave_id, manager_id, "approve", 24)
        rejection_token = generate_approval_token(leave_id, manager_id, "reject", 24)
        
        # Add tokens to leave_dict for template
        leave_dict['approval_token'] = approval_token
        leave_dict['rejection_token'] = rejection_token
        
        # Add URLs for template
        leave_dict['backend_url'] = backend_url
        leave_dict['frontend_url'] = frontend_url
        
        print(f"🔧 DEBUG - Email Template URLs:")
        print(f"   Backend URL: {backend_url}")
        print(f"   Frontend URL: {frontend_url}")
        print(f"   Approval Token: {approval_token[:8]}...")
        print(f"   Rejection Token: {rejection_token[:8]}...")
        
        # Render AMP email with embedded form
        amp_template = env.get_template("leave_action.amp.html")
        amp_content = amp_template.render(leave=leave_dict)
        
        # Render HTML fallback email for non-AMP clients (like Outlook)
        html_template = env.get_template("leave_action_fallback.html")
        html_content = html_template.render(leave=leave_dict)
        
        msg = EmailMessage()
        msg["Subject"] = f"Leave Request {leave_dict.get('status', 'Approval').title()} - {leave_dict.get('employee_name', 'Employee')}"
        msg["From"] = EMAIL_USER
        msg["To"] = leave_dict["manager_email"]
        
        # Set HTML as primary content for better compatibility
        msg.set_content("Please enable HTML to view this email properly.")
        msg.add_alternative(html_content, subtype="html")
        msg.add_alternative(amp_content, subtype="x-amp-html")
        
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        
        status_text = leave_dict.get('status', 'pending')
        print(f"Multi-format email notification sent successfully for {status_text} leave request from {leave_dict.get('employee_name', 'Employee')}")
        print(f"Email formats: HTML (fallback) + AMP (interactive) sent to {leave_dict['manager_email']}")
        print(f"Generated tokens - Approval: {approval_token[:8]}..., Rejection: {rejection_token[:8]}...")
        
    except Exception as e:
        # Log the error but don't fail the leave submission
        print(f"Failed to send email notification: {str(e)}")
        print("Leave request was still processed successfully")

def notify_employee(leave, action):
    # Notify employee of status change
    pass  # Implement as needed

def send_password_reset_otp(recipient_email: str, otp: str):
    try:
        print(f"📧 DEBUG: send_password_reset_otp called with recipient_email='{recipient_email}', otp='{otp}'")
        
        if not all([EMAIL_HOST, EMAIL_USER, EMAIL_PASS]):
            missing_vars = []
            if not EMAIL_HOST: missing_vars.append("EMAIL_HOST")
            if not EMAIL_USER: missing_vars.append("EMAIL_USER") 
            if not EMAIL_PASS: missing_vars.append("EMAIL_PASS")
            
            error_msg = f"Email configuration not available. Missing: {', '.join(missing_vars)}"
            print(error_msg)
            raise Exception(error_msg)

        print(f"📧 DEBUG: Email config - HOST: {EMAIL_HOST}, USER: {EMAIL_USER}, PASS: {'SET' if EMAIL_PASS else 'NOT SET'}")

        subject = "Your Password Reset OTP - Leave Management System"
        html_content = f"""
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Password Reset OTP</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
                  <p style="font-size: 16px; margin-bottom: 20px;">You have requested to reset your password for the Leave Management System.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #667eea;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #666;">Your One-Time Password (OTP) is:</p>
                    <h2 style="margin: 0; font-size: 32px; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">{otp}</h2>
                  </div>
                  
                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;"><strong>Important:</strong></p>
                    <ul style="margin: 10px 0; color: #856404;">
                      <li>This OTP expires in <strong>10 minutes</strong></li>
                      <li>You can only use this OTP <strong>once</strong></li>
                      <li>If you didn't request this, please ignore this email</li>
                    </ul>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                  </p>
                </div>
              </body>
            </html>
        """

        # Plain text version
        text_content = f"""
Password Reset Request - Leave Management System

You have requested to reset your password.

Your One-Time Password (OTP) is: {otp}

Important:
- This OTP expires in 10 minutes
- You can only use this OTP once
- If you didn't request this, please ignore this email

This is an automated message. Please do not reply to this email.
        """

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = recipient_email
        msg.set_content(text_content.strip())
        msg.add_alternative(html_content, subtype="html")

        print(f"📧 DEBUG: Email message created - From: {EMAIL_USER}, To: {recipient_email}, Subject: {subject}")

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            print(f"📧 DEBUG: SMTP login successful, sending message...")
            server.send_message(msg)
            print(f"📧 DEBUG: Message sent successfully via SMTP")

        print(f"✅ Password reset OTP sent to {recipient_email}")
    except Exception as e:
        print(f"❌ Failed to send password reset OTP: {str(e)}")
        raise e