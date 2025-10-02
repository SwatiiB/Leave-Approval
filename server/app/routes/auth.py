from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.db import users_collection, password_resets_collection
from app.models.schemas import Token, UserCreate, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.auth import verify_password, get_password_hash, create_access_token, verify_token
from bson import ObjectId
from datetime import timedelta
import os
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone, timedelta as td
import random

router = APIRouter()

@router.post("/register")
def register_user(user_data: UserCreate):
    # Create user document
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role,
        "department": user_data.department,
        "is_manager": user_data.role == "manager",
        "is_hr": user_data.role == "hr"
    }

    try:
        result = users_collection.insert_one(user_dict)
    except DuplicateKeyError as e:
        # Determine which unique field caused the violation
        message = str(e)
        if "unique_email" in message or "email" in message:
            raise HTTPException(status_code=400, detail="Email already registered")
        if "unique_username" in message or "username" in message:
            raise HTTPException(status_code=400, detail="Username already taken")
        raise HTTPException(status_code=400, detail="User already exists")

    return {"user_id": str(result.inserted_id), "message": "User registered successfully"}

@router.post("/forgot")
def forgot_password(req: ForgotPasswordRequest):
    print(f"🔍 DEBUG: Forgot password request for email: {req.email}")
    
    user = users_collection.find_one({"email": req.email})
    if not user:
        print(f"❌ DEBUG: User not found for email: {req.email}")
        # Do not reveal whether the email exists
        return {"message": "If the email exists, an OTP has been sent"}

    print(f"✅ DEBUG: User found for email: {req.email}")
    
    # Generate a secure 6-digit OTP using secrets module
    import secrets
    import time
    
    # Generate OTP with timestamp component to ensure uniqueness
    base_otp = secrets.randbelow(1000000)
    timestamp_component = int(time.time()) % 1000  # Last 3 digits of timestamp
    otp = f"{(base_otp + timestamp_component) % 1000000:06d}"
    
    expires_at = datetime.now(timezone.utc) + td(minutes=10)

    print(f"🔑 DEBUG: Generated unique OTP {otp} for {req.email}")

    # Store or upsert OTP with additional security
    password_resets_collection.update_one(
        {"email": req.email},
        {
            "$set": {
                "email": req.email, 
                "otp": otp, 
                "expires_at": expires_at.isoformat(), 
                "used": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "attempts": 0  # Track failed attempts
            }
        },
        upsert=True
    )

    # Send email
    email_sent = False
    try:
        from app.utils.email import send_password_reset_otp
        print(f"📧 DEBUG: About to send OTP email to: {req.email}")
        send_password_reset_otp(req.email, otp)
        email_sent = True
        print(f"✅ DEBUG: OTP email sent successfully to {req.email}")
    except Exception as e:
        # Log the error but don't fail the request for security
        print(f"❌ DEBUG: Failed to send OTP email: {str(e)}")
        print("This could be due to missing email configuration (EMAIL_HOST, EMAIL_USER, EMAIL_PASS)")

    if not email_sent:
        # In development, be more explicit about the error
        import os
        if not os.getenv("EMAIL_HOST") or not os.getenv("EMAIL_USER") or not os.getenv("EMAIL_PASS"):
            print("ERROR: Email configuration missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.")
    
    return {"message": "If the email exists, an OTP has been sent"}

# Alternate path for clients expecting /forgot-password
@router.post("/forgot-password")
def forgot_password_alt(req: ForgotPasswordRequest):
    return forgot_password(req)

@router.post("/reset")
def reset_password(req: ResetPasswordRequest):
    record = password_resets_collection.find_one({"email": req.email})
    if not record or record.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Check attempt limit (max 3 attempts)
    attempts = record.get("attempts", 0)
    if attempts >= 3:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")

    # Validate expiry
    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")

    if record.get("otp") != req.otp:
        # Increment failed attempts
        password_resets_collection.update_one(
            {"email": req.email},
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Update user's password
    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    print(f"🔐 DEBUG: Password reset for user: {user.get('username', 'Unknown')} ({user.get('email')})")
    print(f"📝 DEBUG: Preserving user details - Full Name: {user.get('full_name')}, Role: {user.get('role')}, Department: {user.get('department')}")
    
    # Store original user details for verification
    original_details = {
        "username": user.get("username"),
        "email": user.get("email"), 
        "full_name": user.get("full_name"),
        "role": user.get("role"),
        "department": user.get("department"),
        "is_manager": user.get("is_manager"),
        "is_hr": user.get("is_hr")
    }
    
    # ONLY update the password hash - all other details remain unchanged
    update_result = users_collection.update_one(
        {"_id": user["_id"]}, 
        {"$set": {"hashed_password": get_password_hash(req.new_password)}}
    )
    
    # Verify that only the password was updated
    updated_user = users_collection.find_one({"_id": user["_id"]})
    verification_details = {
        "username": updated_user.get("username"),
        "email": updated_user.get("email"),
        "full_name": updated_user.get("full_name"), 
        "role": updated_user.get("role"),
        "department": updated_user.get("department"),
        "is_manager": updated_user.get("is_manager"),
        "is_hr": updated_user.get("is_hr")
    }
    
    # Check if any non-password fields were accidentally changed
    if original_details != verification_details:
        print(f"⚠️  WARNING: User details changed during password reset!")
        print(f"Original: {original_details}")
        print(f"After: {verification_details}")
    else:
        print(f"✅ VERIFIED: All user details preserved during password reset")
    
    # Mark OTP as used and reset attempts
    password_resets_collection.update_one(
        {"email": req.email}, 
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )

    print(f"🎉 DEBUG: Password reset completed successfully for {req.email}")
    return {"message": "Password has been reset successfully"}

# Alternate path for clients expecting /reset-password
@router.post("/reset-password")
def reset_password_alt(req: ResetPasswordRequest):
    return reset_password(req)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Try to find user by username or email
    user = users_collection.find_one({
        "$or": [
            {"username": form_data.username},
            {"email": form_data.username}
        ]
    })
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username/email or password")
    
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"]},
        expires_delta=timedelta(minutes=60*24)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_current_user(user_id: str = Depends(verify_token)):
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return user data without password
    user_data = {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "department": user["department"],
        "is_manager": user.get("is_manager", False),
        "is_hr": user.get("is_hr", False)
    }
    
    return user_data

@router.post("/test-email")
def test_email():
    """Test endpoint to verify email configuration"""
    try:
        from app.utils.email import send_leave_action_email
        
        # Create test leave data
        test_leave = {
            "employee_name": "Test Employee",
            "manager_email": "manager@company.com",  # Replace with actual manager email for testing
            "leave_type": "Annual Leave",
            "start_date": "2025-09-01",
            "end_date": "2025-09-03",
            "reason": "Family vacation - This is a test email"
        }
        
        send_leave_action_email(test_leave)
        return {"message": "Test email sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email test failed: {str(e)}")

@router.post("/test-otp")
def test_otp_email():
    """Test endpoint to verify OTP email configuration"""
    import os
    
    # Check configuration first
    missing_vars = []
    if not os.getenv("EMAIL_HOST"): missing_vars.append("EMAIL_HOST")
    if not os.getenv("EMAIL_USER"): missing_vars.append("EMAIL_USER") 
    if not os.getenv("EMAIL_PASS"): missing_vars.append("EMAIL_PASS")
    
    if missing_vars:
        return {
            "error": f"Email configuration missing: {', '.join(missing_vars)}",
            "message": "Please set these environment variables in a .env file or your system environment"
        }
    
    try:
        from app.utils.email import send_password_reset_otp
        test_email = "test@example.com"  # Change this to your email for testing
        test_otp = "123456"
        
        send_password_reset_otp(test_email, test_otp)
        return {"message": f"Test OTP email sent successfully to {test_email}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OTP email test failed: {str(e)}")

@router.post("/debug/create-manager")
def create_test_manager():
    """Create a test manager for debugging"""
    try:
        test_manager = {
            "username": "testmanager",
            "email": "manager@company.com",
            "hashed_password": get_password_hash("password123"),
            "full_name": "Test Manager",
            "role": "manager",
            "department": "Management",
            "is_manager": True,
            "is_hr": False
        }
        
        # Check if manager already exists
        existing = users_collection.find_one({"email": "manager@company.com"})
        if existing:
            return {"message": "Manager already exists", "email": "manager@company.com"}
        
        result = users_collection.insert_one(test_manager)
        return {
            "message": "Test manager created successfully",
            "manager_id": str(result.inserted_id),
            "email": "manager@company.com",
            "password": "password123"
        }
    except Exception as e:
        return {"error": "Failed to create manager: " + str(e)}

@router.get("/managers")
def get_all_managers():
    """Get all managers in the database"""
    try:
        # Find all managers
        managers = list(users_collection.find({"is_manager": True}))
        
        if not managers:
            # Check if there are any users with role 'manager'
            managers = list(users_collection.find({"role": "manager"}))
        
        # Convert ObjectId to string and remove sensitive data
        manager_list = []
        for manager in managers:
            manager_data = {
                "id": str(manager["_id"]),
                "email": manager.get("email", "N/A"),
                "full_name": manager.get("full_name", "N/A"),
                "username": manager.get("username", "N/A"),
                "department": manager.get("department", "N/A"),
                "role": manager.get("role", "N/A"),
                "is_manager": manager.get("is_manager", False),
                "is_hr": manager.get("is_hr", False),
                "created_at": manager.get("created_at", "N/A")
            }
            manager_list.append(manager_data)
        
        # Get total user count
        total_users = users_collection.count_documents({})
        
        return {
            "managers": manager_list,
            "total_managers": len(manager_list),
            "total_users": total_users,
            "message": f"Found {len(manager_list)} manager(s) out of {total_users} total users"
        }
        
    except Exception as e:
        return {"error": f"Failed to fetch managers: {str(e)}"}

@router.get("/users")
def get_all_users():
    """Get all users in the database (for debugging)"""
    try:
        users = list(users_collection.find({}))
        
        user_list = []
        for user in users:
            user_data = {
                "id": str(user["_id"]),
                "email": user.get("email", "N/A"),
                "full_name": user.get("full_name", "N/A"),
                "username": user.get("username", "N/A"),
                "department": user.get("department", "N/A"),
                "role": user.get("role", "N/A"),
                "is_manager": user.get("is_manager", False),
                "is_hr": user.get("is_hr", False),
                "created_at": user.get("created_at", "N/A")
            }
            user_list.append(user_data)
        
        return {
            "users": user_list,
            "total_users": len(user_list),
            "message": f"Found {len(user_list)} user(s) in the database"
        }
        
    except Exception as e:
        return {"error": f"Failed to fetch users: {str(e)}"}