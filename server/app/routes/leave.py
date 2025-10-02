from fastapi import APIRouter, HTTPException, Depends, Request, status, Form
from app.models.db import leaves_collection, users_collection, tokens_collection
from app.models.schemas import LeaveRequestCreate, LeaveRequest, LeaveActionRequest
from app.utils.auth import verify_token, verify_password
from app.utils.email import send_leave_action_email, notify_employee
from app.utils.tokens import verify_token as verify_approval_token, use_token, revoke_tokens_for_leave
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List

router = APIRouter()

@router.post("/submit")
def submit_leave(leave: LeaveRequestCreate, user_id: str = Depends(verify_token)):
    print(f"🚀 DEBUG: Leave submission started for user_id: {user_id}")
    print(f"📝 DEBUG: Leave data received: {leave.model_dump()}")
    
    try:
        # Get user details
        print(f"👤 DEBUG: Looking up user with ID: {user_id}")
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            print(f"❌ DEBUG: User not found for ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"✅ DEBUG: User found: {user.get('username', user.get('email', f'User_{user_id[:8]}'))} ({user.get('email', 'No email set')})")
        
        # Find manager by email
        print(f"👔 DEBUG: Looking up manager with email: {leave.manager_email}")
        manager = users_collection.find_one({"email": leave.manager_email})
        if not manager:
            print(f"❌ DEBUG: Manager not found for email: {leave.manager_email}")
            raise HTTPException(status_code=404, detail="Manager not found")
        
        manager_id_short = str(manager["_id"])[:8]
        manager_name = manager.get('username', manager.get('email', f'Manager_{manager_id_short}'))
        print(f"✅ DEBUG: Manager found: {manager_name} ({manager.get('email', 'No email set')})")
        
        # Create leave request
        leave_dict = leave.model_dump()
        
        # Calculate number of days
        from datetime import datetime as dt
        start_date = dt.fromisoformat(leave.start_date)
        end_date = dt.fromisoformat(leave.end_date)
        days = (end_date - start_date).days + 1  # Include both start and end dates
        
        leave_dict.update({
            "employee_id": ObjectId(user_id),
            "manager_id": ObjectId(manager["_id"]),
            "status": "pending",
            "is_action_taken": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "employee_name": user.get("full_name", user.get("username", user.get("email", f"Employee_{user_id[:8]}"))),
            "employee_email": user.get("email", ""),
            "employee_department": user.get("department", "General"),
            "days": days  # Add calculated days field
        })
        
        print(f"📅 DEBUG: Calculated {days} days for leave from {leave.start_date} to {leave.end_date}")
        
        print(f"💾 DEBUG: Inserting leave request into database...")
        result = leaves_collection.insert_one(leave_dict)
        print(f"✅ DEBUG: Leave request inserted with ID: {result.inserted_id}")
        
        # Try to send email to manager (optional)
        try:
            leave_dict["_id"] = result.inserted_id
            print(f"📧 DEBUG: Attempting to send email notification...")
            send_leave_action_email(leave_dict)
            print(f"✅ DEBUG: Email notification sent successfully")
        except Exception as e:
            print(f"❌ DEBUG: Email notification failed: {str(e)}")
            # Continue processing even if email fails
        
        print(f"🎉 DEBUG: Leave submission completed successfully")
        return {"leave_request_id": str(result.inserted_id), "status": "pending"}
        
    except HTTPException as he:
        print(f"❌ DEBUG: HTTP Exception in leave submission: {he.detail}")
        raise he
    except Exception as e:
        print(f"❌ DEBUG: Unexpected error in leave submission: {str(e)}")
        print(f"❌ DEBUG: Error type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/my-requests", response_model=List[dict])
def get_my_requests(user_id: str = Depends(verify_token)):
    leaves = list(leaves_collection.find({"employee_id": ObjectId(user_id)}))
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        leave["manager_id"] = str(leave["manager_id"])
        if leave.get("approver_id"):
            leave["approver_id"] = str(leave["approver_id"])
    return leaves

@router.get("/pending-approvals", response_model=List[dict])
def get_pending_approvals(user_id: str = Depends(verify_token)):
    # Check if user is a manager
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_manager"):
        raise HTTPException(status_code=403, detail="Access denied. Manager role required.")
    
    leaves = list(leaves_collection.find({
        "manager_id": ObjectId(user_id), 
        "status": "pending",
        "is_action_taken": False
    }))
    
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        leave["manager_id"] = str(leave["manager_id"])
        if leave.get("approver_id"):
            leave["approver_id"] = str(leave["approver_id"])
    return leaves

@router.get("/processed-approvals", response_model=List[dict])
def get_processed_approvals(user_id: str = Depends(verify_token)):
    # Check if user is a manager
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_manager"):
        raise HTTPException(status_code=403, detail="Access denied. Manager role required.")
    
    leaves = list(leaves_collection.find({
        "manager_id": ObjectId(user_id), 
        "is_action_taken": True
    }).sort("action_timestamp", -1))  # Sort by most recent first
    
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        leave["manager_id"] = str(leave["manager_id"])
        if leave.get("approver_id"):
            leave["approver_id"] = str(leave["approver_id"])
    return leaves

@router.post("/{leave_id}/approve")
def approve_leave(leave_id: str, action_data: LeaveActionRequest, user_id: str = Depends(verify_token)):
    return process_leave_action(leave_id, "approved", user_id, action_data.comments)

@router.post("/{leave_id}/reject") 
def reject_leave(leave_id: str, action_data: LeaveActionRequest, user_id: str = Depends(verify_token)):
    return process_leave_action(leave_id, "rejected", user_id, action_data.comments)

def process_leave_action(leave_id: str, action: str, user_id: str, comments: Optional[str] = None):
    # Find leave request
    leave = leaves_collection.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave.get("is_action_taken"):
        raise HTTPException(status_code=400, detail="Action already taken on this leave request")
    
    # Verify user is the assigned manager
    if str(leave["manager_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Only the assigned manager can process this leave request")
    
    # Update leave status
    update_data = {
        "status": action,
        "is_action_taken": True,
        "approver_id": ObjectId(user_id),
        "action_timestamp": datetime.now(timezone.utc).isoformat(),
        "processed_via": "dashboard"
    }
    
    if comments:
        update_data["comments"] = comments
    
    leaves_collection.update_one({"_id": ObjectId(leave_id)}, {"$set": update_data})
    
    # Revoke any pending email tokens for this leave
    revoke_tokens_for_leave(leave_id)
    
    # Notify employee
    notify_employee(leave, action)
    
    return {
        "status": action,
        "message": f"Leave request {action} successfully.",
        "comments": comments
    }

def process_leave_action_with_password(leave_id: str, action: str, manager_id: str, password: str, comments: Optional[str] = None):
    # Find leave request
    leave = leaves_collection.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave.get("is_action_taken"):
        raise HTTPException(status_code=400, detail=f"This leave request has already been {leave.get('status', 'processed')}. No further action is required.")
    
    # Verify manager password
    manager = users_collection.find_one({"_id": ObjectId(manager_id)})
    if not manager or not verify_password(password, manager["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid manager password. Please check your password and try again.")
    
    # Verify user is the assigned manager
    if str(leave["manager_id"]) != manager_id:
        raise HTTPException(status_code=403, detail="Only the assigned manager can process this leave request")
    
    # Convert action to proper status (maintain consistency with API endpoints)
    status = "approved" if action == "approve" else "rejected" if action == "reject" else action
    
    # Update leave status
    update_data = {
        "status": status,
        "is_action_taken": True,
        "approver_id": ObjectId(manager_id),
        "action_timestamp": datetime.now(timezone.utc).isoformat(),
        "processed_via": "email"  # Mark that this was processed via email
    }
    
    if comments:
        update_data["comments"] = comments
    
    leaves_collection.update_one({"_id": ObjectId(leave_id)}, {"$set": update_data})
    
    # Notify employee
    notify_employee(leave, status)
    
    return {
        "status": status,
        "message": f"Leave request {status} successfully via email.",
        "comments": comments
    }

@router.post("/approve-from-email")
async def approve_from_email(
    leave_id: str = Form(...),
    manager_id: str = Form(...),
    password: str = Form(...),
    action: str = Form(...),
    comments: str = Form("")
):
    """
    Handle leave approval/rejection directly from AMP email with password verification
    """
    try:
        # Use the password verification function
        result = process_leave_action_with_password(leave_id, action, manager_id, password, comments)
        
        # Return success response for AMP email
        return {
            "status": "success",
            "message": result["message"],
            "action": action
        }
    except HTTPException as e:
        # Return error response for AMP email
        return {
            "status": "error",
            "message": str(e.detail),
            "action": action
        }
    except Exception as e:
        # Return generic error for unexpected issues
        return {
            "status": "error", 
            "message": "An unexpected error occurred",
            "action": action
        }

@router.post("/approve-with-token")
async def approve_with_token(
    token: str = Form(...),
    leave_id: str = Form(...),
    manager_id: str = Form(...),
    password: str = Form(...),
    action: str = Form(...),
    comments: str = Form("")
):
    """
    Handle leave approval from AMP email with token + password verification
    Enhanced security: Both token AND password required
    """
    try:
        print(f"🔧 DEBUG - Received approval request:")
        print(f"   Token: {token[:8]}...")
        print(f"   Leave ID: {leave_id}")
        print(f"   Manager ID: {manager_id}")
        print(f"   Action: '{action}'")
        print(f"   Password provided: {bool(password)}")
        print(f"   Comments: '{comments}'")
        
        # Verify the token first
        token_doc = verify_approval_token(token)
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired security token. Please request a new approval email.")
        
        # Verify token matches the request
        if (token_doc["leave_id"] != leave_id or 
            token_doc["manager_id"] != manager_id or 
            token_doc["action"] != action):
            raise HTTPException(status_code=400, detail="Token validation failed. Security mismatch detected.")
        
        # Now verify password (manager requirement)
        manager = users_collection.find_one({"_id": ObjectId(manager_id)})
        print(f"🔧 DEBUG - Password verification:")
        print(f"   Manager found: {manager is not None}")
        print(f"   Manager ID: {manager_id}")
        print(f"   Received password: '{password}' (length: {len(password) if password else 0})")
        print(f"   Manager has hashed_password: {bool(manager and 'hashed_password' in manager)}")
        
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found in database.")
            
        if not manager.get("hashed_password"):
            raise HTTPException(status_code=400, detail="Manager password not set in database.")
            
        password_valid = verify_password(password, manager["hashed_password"])
        print(f"   Password verification result: {password_valid}")
        
        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid manager password. Please check your password and try again.")
        
        # Process the leave action
        result = process_leave_action_with_password(leave_id, action, manager_id, password, comments)
        
        # Mark token as used
        use_token(token)
        
        # Revoke other tokens for this leave request
        revoke_tokens_for_leave(leave_id)
        
        return {
            "success": True,
            "message": result["message"],
            "status": result["status"]  # Return the converted status (approved/rejected)
        }
        
    except Exception as e:
        # Don't catch HTTPException - let it bubble up for proper status codes
        if isinstance(e, HTTPException):
            raise e
        print(f"Token approval error: {str(e)}")
        return {
            "status": "error",
            "message": "An unexpected error occurred during approval",
            "action": action
        }

@router.post("/redirect-reject")
async def redirect_reject(
    leave_id: str = Form(...),
    token: str = Form(...),
    frontend_url: str = Form(...)
):
    """
    AMP-compliant endpoint for rejection redirect
    Returns redirect URL for AMP.navigateTo action
    """
    try:
        # Verify the token
        token_doc = verify_approval_token(token)
        if not token_doc:
            return {
                "status": "error",
                "message": "Invalid or expired security token. Please request a new approval email."
            }
        
        # Verify token matches the request and is for rejection
        if (token_doc["leave_id"] != leave_id or token_doc["action"] != "reject"):
            return {
                "status": "error",
                "message": "Token validation failed. Security mismatch detected."
            }
        
        # Build the redirect URL with parameters
        redirect_url = f"{frontend_url}/manager-dashboard?action=reject&leave_id={leave_id}&token={token}"
        
        return {
            "status": "success",
            "redirect_url": redirect_url,
            "message": "Redirecting to manager dashboard for rejection workflow"
        }
        
    except Exception as e:
        print(f"Redirect rejection error: {str(e)}")
        return {
            "status": "error",
            "message": "An unexpected error occurred"
        }

@router.get("/reject-with-token")
async def reject_with_token(
    token: str,
    redirect: str = None
):
    """
    Handle leave rejection via token link - redirects to dashboard
    Token provides secure access, but rejection requires dashboard interaction
    """
    try:
        # Get frontend URL dynamically from environment
        import os
        default_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        
        if not redirect:
            redirect = f"{default_frontend_url}/manager/dashboard"
        
        # Verify the token
        token_doc = verify_approval_token(token)
        if not token_doc:
            # Redirect to dashboard with error message
            return f"<html><body><script>window.location.href='{redirect}?error=invalid_token';</script></body></html>"
        
        # Verify it's a rejection token
        if token_doc["action"] != "reject":
            return f"<html><body><script>window.location.href='{redirect}?error=invalid_action';</script></body></html>"
        
        # Mark token as used
        use_token(token)
        
        # Redirect to dashboard with leave ID for rejection
        dashboard_url = f"{redirect}?reject_leave={token_doc['leave_id']}&token_verified=true"
        
        return f"""
        <html>
        <head><title>Redirecting to Dashboard</title></head>
        <body>
            <h2>Redirecting to Manager Dashboard</h2>
            <p>You will be redirected to complete the rejection process...</p>
            <script>
                setTimeout(function() {{
                    window.location.href = '{dashboard_url}';
                }}, 2000);
            </script>
            <p><a href="{dashboard_url}">Click here if not redirected automatically</a></p>
        </body>
        </html>
        """
        
    except Exception as e:
        print(f"Token rejection error: {str(e)}")
        return f"<html><body><script>window.location.href='{redirect}?error=token_error';</script></body></html>"

@router.post("/debug/fix-leave-days")
def fix_leave_days():
    """Fix missing days field in existing leave records"""
    try:
        from datetime import datetime as dt
        leaves = list(leaves_collection.find({"days": {"$exists": False}}))
        updated_count = 0
        
        for leave in leaves:
            try:
                start_date = dt.fromisoformat(leave['start_date'])
                end_date = dt.fromisoformat(leave['end_date'])
                days = (end_date - start_date).days + 1
                
                leaves_collection.update_one(
                    {"_id": leave["_id"]},
                    {"$set": {"days": days}}
                )
                updated_count += 1
                print(f"Updated leave {leave['_id']} with {days} days")
            except Exception as e:
                print(f"Failed to update leave {leave.get('_id')}: {e}")
        
        return {
            "message": f"Updated {updated_count} leave records with days field",
            "updated_count": updated_count
        }
    except Exception as e:
        return {"error": f"Failed to fix leave days: {str(e)}"}

@router.get("/debug/check-leave-status/{leave_id}")
def check_leave_status(leave_id: str):
    """Debug endpoint to check leave request status"""
    try:
        leave = leaves_collection.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            return {"error": "Leave request not found"}
        
        # Convert ObjectIds to strings for JSON serialization
        leave["_id"] = str(leave["_id"])
        leave["employee_id"] = str(leave["employee_id"])
        leave["manager_id"] = str(leave["manager_id"])
        if "approver_id" in leave:
            leave["approver_id"] = str(leave["approver_id"])
        
        return {
            "leave_id": leave_id,
            "status": leave.get("status"),
            "is_action_taken": leave.get("is_action_taken"),
            "action_timestamp": leave.get("action_timestamp"),
            "processed_via": leave.get("processed_via"),
            "comments": leave.get("comments", "No comments"),
            "full_leave_data": leave
        }
    except Exception as e:
        return {"error": f"Failed to check leave status: {str(e)}"}

@router.get("/debug/list-recent-leaves")
def list_recent_leaves():
    """Debug endpoint to list recent leave requests"""
    try:
        leaves = list(leaves_collection.find().sort("created_at", -1).limit(10))
        
        formatted_leaves = []
        for leave in leaves:
            formatted_leaves.append({
                "leave_id": str(leave["_id"]),
                "employee_name": leave.get("employee_name", "Unknown"),
                "status": leave.get("status"),
                "is_action_taken": leave.get("is_action_taken"),
                "leave_type": leave.get("leave_type"),
                "start_date": leave.get("start_date"),
                "end_date": leave.get("end_date"),
                "created_at": leave.get("created_at"),
                "action_timestamp": leave.get("action_timestamp"),
                "processed_via": leave.get("processed_via")
            })
        
        return {
            "recent_leaves": formatted_leaves,
            "count": len(formatted_leaves)
        }
    except Exception as e:
        return {"error": f"Failed to list leaves: {str(e)}"}

@router.post("/debug/reset-leave-action/{leave_id}")
def reset_leave_action(leave_id: str):
    """Reset a leave request back to pending status"""
    try:
        leave = leaves_collection.find_one({"_id": ObjectId(leave_id)})
        if not leave:
            return {"error": "Leave request not found"}
        
        # Reset the leave back to pending
        update_result = leaves_collection.update_one(
            {"_id": ObjectId(leave_id)},
            {"$set": {
                "status": "pending",
                "is_action_taken": False
            },
            "$unset": {
                "approver_id": "",
                "action_timestamp": "",
                "processed_via": "",
                "comments": ""
            }}
        )
        
        if update_result.modified_count > 0:
            return {
                "message": "Leave request reset to pending status",
                "leave_id": leave_id,
                "previous_status": leave.get("status"),
                "new_status": "pending"
            }
        else:
            return {"error": "Failed to reset leave request"}
    except Exception as e:
        return {"error": f"Failed to reset leave action: {str(e)}"}

@router.post("/debug/create-test-leave")
def create_test_leave(employee_email: str = None, manager_email: str = None):
    """Create a test leave request to demonstrate AMP email approval - NO HARDCODED VALUES"""
    try:
        from datetime import datetime as dt, timedelta
        
        # Dynamically get first available employee and manager if not specified
        if not employee_email:
            # Find any non-manager user as employee
            user = users_collection.find_one({"is_manager": {"$ne": True}})
            if not user:
                # If no non-managers found, use any user
                user = users_collection.find_one({})
        else:
            user = users_collection.find_one({"email": employee_email})
        
        if not manager_email:
            # Find any manager user
            manager = users_collection.find_one({"is_manager": True})
            if not manager:
                # If no managers found, find any user with manager role
                manager = users_collection.find_one({"role": "manager"})
                if not manager:
                    return {"error": "No manager found in database. Please create a manager user first."}
        else:
            manager = users_collection.find_one({"email": manager_email})
        
        if not user:
            return {"error": f"Employee user not found{' for email: ' + employee_email if employee_email else ''}"}
        if not manager:
            return {"error": f"Manager user not found{' for email: ' + manager_email if manager_email else ''}"}
        
        # Dynamically create test leave data
        tomorrow = dt.now() + timedelta(days=1)
        day_after = dt.now() + timedelta(days=3)
        calculated_days = (day_after - tomorrow).days + 1
        
        test_leave = {
            "start_date": tomorrow.strftime("%Y-%m-%d"),
            "end_date": day_after.strftime("%Y-%m-%d"),
            "leave_type": "annual",
            "reason": "Testing AMP email approval functionality",
            "manager_email": manager.get("email"),
            "employee_id": ObjectId(user["_id"]),
            "manager_id": ObjectId(manager["_id"]),
            "status": "pending",
            "is_action_taken": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "employee_name": user.get("full_name", user.get("username", user.get("email", "Unknown Employee"))),
            "employee_email": user.get("email", ""),
            "employee_department": user.get("department", "Unknown Department"),
            "days": calculated_days
        }
        
        result = leaves_collection.insert_one(test_leave)
        test_leave["_id"] = result.inserted_id
        
        # Send AMP email
        try:
            from app.utils.email import send_leave_action_email
            send_leave_action_email(test_leave)
            email_sent = True
            email_error = None
        except Exception as e:
            email_sent = False
            email_error = str(e)
        
        return {
            "message": "Test leave request created successfully (NO HARDCODED VALUES)",
            "leave_id": str(result.inserted_id),
            "employee": f"{test_leave['employee_name']} <{test_leave['employee_email']}>",
            "manager": f"{manager.get('full_name', manager.get('username', 'Manager'))} <{test_leave['manager_email']}>",
            "dates": f"{test_leave['start_date']} to {test_leave['end_date']}",
            "days": calculated_days,
            "amp_email_sent": email_sent,
            "email_error": email_error,
            "note": f"Dynamic test created - Employee: {user.get('email')} → Manager: {manager.get('email')}"
        }
    except Exception as e:
        return {"error": f"Failed to create test leave: {str(e)}"}
