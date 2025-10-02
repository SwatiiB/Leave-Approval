from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str = Depends(oauth2_scheme)):
    print(f"🔐 DEBUG: Token verification started")
    print(f"🔑 DEBUG: Token received: {token[:20]}..." if token else "❌ DEBUG: No token received")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"🔍 DEBUG: Decoding JWT token...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        print(f"👤 DEBUG: Extracted user_id from token: {user_id}")
        
        if user_id is None:
            print(f"❌ DEBUG: No user_id found in token payload")
            raise credentials_exception
            
        print(f"✅ DEBUG: Token verification successful for user: {user_id}")
        return user_id
    except JWTError as e:
        print(f"❌ DEBUG: JWT Error during token verification: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"❌ DEBUG: Unexpected error during token verification: {str(e)}")
        raise credentials_exception
