from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-shared-secret-key-pme-analytix-2026")
JWT_ALGORITHM = "HS256"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency that extracts the Bearer token from the Authorization header,
    validates the JWT signature using the shared secret key, and returns the payload.
    """
    token = credentials.credentials
    try:
        # Decode and verify the signature using the shared secret key
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Le jeton d'authentification a expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton d'authentification invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
