import os
import sys
from pathlib import Path
from email.message import EmailMessage
import smtplib
from jinja2 import Environment, FileSystemLoader
from dotenv import load_dotenv

# Add paths for imports
current_file = Path(__file__).resolve()
utils_dir = current_file.parent
app_dir = utils_dir.parent
server_dir = app_dir.parent
root_dir = server_dir.parent

for path in [str(root_dir), str(server_dir), str(app_dir)]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Import tokens with fallbacks
try:
    from utils.tokens import generate_approval_token
except ImportError:
    try:
        from app.utils.tokens import generate_approval_token
    except ImportError:
        from server.app.utils.tokens import generate_approval_token

load_dotenv()
# Also try loading from server directory
load_dotenv(server_dir / ".env")

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# URL Configuration for deployment
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Setup Jinja2 environment with proper template path
template_dirs = [
    str(utils_dir / "templates"),  # Current directory structure
    str(app_dir / "utils" / "templates"),  # App directory structure
    str(server_dir / "app" / "utils" / "templates"),  # Full path
    "app/utils/templates",  # Fallback relative path
    "server/app/utils/templates"  # Full relative path
]

# Try to find templates directory
template_dir = None
for dir_path in template_dirs:
    if Path(dir_path).exists():
        template_dir = dir_path
        break

if template_dir:
    env = Environment(loader=FileSystemLoader(template_dir))
    print(f"📧 Templates loaded from: {template_dir}")
else:
    # Fallback - create templates inline if directory not found
    env = None
    print("⚠️ Templates directory not found, using inline templates")

def send_leave_action_email(leave_dict):
    try:
        # Check if email configuration is available
        print(f"📧 DEBUG: Checking email configuration...")
        print(f"EMAIL_HOST: {EMAIL_HOST}")
        print(f"EMAIL_USER: {EMAIL_USER}")
        print(f"EMAIL_PASS: {'***' if EMAIL_PASS else 'None'}")
        
        if not all([EMAIL_HOST, EMAIL_USER, EMAIL_PASS]):
            error_msg = f"Email configuration incomplete - HOST: {bool(EMAIL_HOST)}, USER: {bool(EMAIL_USER)}, PASS: {bool(EMAIL_PASS)}"
            print(f"❌ {error_msg}")
            return {"error": error_msg}
        
        # Validate URL configuration
        if not BACKEND_URL or not FRONTEND_URL:
            print("⚠️ URL configuration missing, using default localhost URLs")
            backend_url = "http://localhost:8000"
            frontend_url = "http://localhost:5173"
        else:
            backend_url = BACKEND_URL
            frontend_url = FRONTEND_URL
        
        print(f"🌐 Email will use URLs - Backend: {backend_url}, Frontend: {frontend_url}")
        
        # For production, get fresh leave data to show current status in email
        try:
            from models.db import leaves_collection
        except ImportError:
            try:
                from app.models.db import leaves_collection
            except ImportError:
                from server.app.models.db import leaves_collection
        
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
        
        # Ensure total_days field for template compatibility
        if 'days' in leave_dict and 'total_days' not in leave_dict:
            leave_dict['total_days'] = leave_dict['days']
        elif 'total_days' not in leave_dict and 'days' not in leave_dict:
            leave_dict['total_days'] = 'N/A'
            leave_dict['days'] = 'N/A'
        
        # Add URLs for template
        leave_dict['backend_url'] = backend_url
        leave_dict['frontend_url'] = frontend_url
        
        print(f"🔧 DEBUG - Email Template Data:")
        print(f"   Employee: {leave_dict.get('employee_name', 'N/A')}")
        print(f"   Leave Type: {leave_dict.get('leave_type', 'N/A')}")
        print(f"   Days: {leave_dict.get('days', 'N/A')} / Total Days: {leave_dict.get('total_days', 'N/A')}")
        print(f"   Status: {leave_dict.get('status', 'N/A')}")
        print(f"   Backend URL: {backend_url}")
        print(f"   Frontend URL: {frontend_url}")
        print(f"   Approval Token: {approval_token[:8]}...")
        print(f"   Rejection Token: {rejection_token[:8]}...")
        
        # Render email content
        if env:
            try:
                # Try to render AMP email with embedded form
                print("📧 Attempting to render AMP template...")
                amp_template = env.get_template("leave_action.amp.html")
                amp_content = amp_template.render(leave=leave_dict)
                print(f"✅ AMP template rendered successfully ({len(amp_content)} characters)")
                
                # Try to render HTML fallback email for non-AMP clients
                print("📧 Attempting to render HTML fallback template...")
                html_template = env.get_template("leave_action_fallback.html")
                html_content = html_template.render(leave=leave_dict)
                print(f"✅ HTML template rendered successfully ({len(html_content)} characters)")
                
                # Validate AMP content
                if not amp_content or len(amp_content) < 100:
                    print("⚠️ AMP content seems too short, using fallback")
                    amp_content, html_content = get_fallback_email_content(leave_dict, backend_url)
                elif "{{ leave." in amp_content:
                    print("⚠️ AMP template has unrendered variables, using fallback")
                    amp_content, html_content = get_fallback_email_content(leave_dict, backend_url)
                else:
                    print("✅ AMP template validation passed")
                    
            except Exception as template_error:
                print(f"❌ Template rendering failed: {template_error}")
                print(f"Template error details: {type(template_error).__name__}: {str(template_error)}")
                # Use fallback inline template
                amp_content, html_content = get_fallback_email_content(leave_dict, backend_url)
        else:
            print("📧 Using fallback inline email templates (no template environment)")
            # Use fallback inline template
            amp_content, html_content = get_fallback_email_content(leave_dict, backend_url)
        
        msg = EmailMessage()
        msg["Subject"] = f"Leave Request {leave_dict.get('status', 'Approval').title()} - {leave_dict.get('employee_name', 'Employee')}"
        msg["From"] = EMAIL_USER
        msg["To"] = leave_dict["manager_email"]
        
        # Add AMP-specific headers
        msg["X-Amp-Source-Origin"] = FRONTEND_URL if FRONTEND_URL else "https://leave-approval.vercel.app"
        msg["Content-Type"] = "multipart/alternative"
        
        # Set plain text as primary content
        text_content = f"""
Leave Request Approval Required

Employee: {leave_dict.get('employee_name', 'N/A')}
Department: {leave_dict.get('employee_department', 'N/A')}
Leave Type: {leave_dict.get('leave_type', 'N/A')}
Start Date: {leave_dict.get('start_date', 'N/A')}
End Date: {leave_dict.get('end_date', 'N/A')}
Days: {leave_dict.get('days', 'N/A')}
Reason: {leave_dict.get('reason', 'N/A')}

To approve or reject this leave request, please visit:
{backend_url}/api/leave/{leave_dict.get('_id')}/approve?token={leave_dict.get('approval_token')}

This is an automated notification from the Leave Management System.
        """.strip()
        
        msg.set_content(text_content)
        
        # Add HTML fallback content
        msg.add_alternative(html_content, subtype="html")
        
        # Add AMP content with proper MIME type for Gmail
        try:
            # Create AMP part manually for better control
            from email.mime.text import MIMEText
            amp_mime = MIMEText(amp_content, "html")
            amp_mime.set_type("text/x-amp-html")
            msg.attach(amp_mime)
            print("✅ AMP content attached with proper MIME type")
        except Exception as amp_error:
            print(f"⚠️ Failed to attach AMP content: {amp_error}")
            # Fallback: add as alternative
            msg.add_alternative(amp_content, subtype="html")
        
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


def get_fallback_email_content(leave_dict, backend_url):
    """Generate fallback email content when templates are not available"""
    
    # Basic HTML email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Leave Request Approval</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Leave Request Approval Required</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333; margin-top: 0;">Leave Request Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Employee:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('employee_name', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Department:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('employee_department', 'N/A')}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Leave Type:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('leave_type', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Start Date:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('start_date', 'N/A')}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">End Date:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('end_date', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Days:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('days', 'N/A')}</td>
                </tr>
                <tr style="background: #f0f0f0;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Reason:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{leave_dict.get('reason', 'N/A')}</td>
                </tr>
            </table>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{backend_url}/api/leave/{leave_dict.get('_id')}/approve?token={leave_dict.get('approval_token')}" 
                   style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block; font-weight: bold;">
                   ✅ APPROVE
                </a>
                <a href="{backend_url}/api/leave/{leave_dict.get('_id')}/reject?token={leave_dict.get('rejection_token')}" 
                   style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block; font-weight: bold;">
                   ❌ REJECT
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This is an automated notification. Please click one of the buttons above to approve or reject this leave request.
            </p>
        </div>
    </body>
    </html>
    """
    
    # Simple AMP content (fallback to basic HTML)
    amp_content = html_content
    
    return amp_content, html_content