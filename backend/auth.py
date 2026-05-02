from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

# Change cette clé en production
SECRET_KEY = "photobooth-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 9  # 9h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Utilisateurs en dur (à remplacer par une DB en v2)
USERS = {
    "admin": {
        "username": "BR0029EL",
        "hashed_password": pwd_context.hash("7329Benjamin@"),
        "role": "admin",
    },
    "user": {
        "username": "user",
        "hashed_password": pwd_context.hash("7369Mathilde@"),
        "role": "user",
    },
}


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = next((u for u in USERS.values() if u["username"] == username), None)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def is_localhost(request: Request) -> bool:
    """Vérifie si la requête vient du Pi lui-même via le header Host."""
    host = request.headers.get("host", "").split(":")[0]
    return host in ("127.0.0.1", "::1", "localhost")


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme)
) -> dict:
    """
    - Si JWT valide → utilise le JWT (admin ou user)
    - Sinon si localhost → user automatique (kiosk)
    - Sinon → 401
    """
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            role = payload.get("role")
            if username:
                return {"username": username, "role": role}
        except JWTError:
            pass

    if is_localhost(request):
        return {"username": "pi", "role": "user"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Non authentifié",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Vérifie que l'utilisateur est admin."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user
