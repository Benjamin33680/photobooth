from fastapi import APIRouter, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from pydantic import BaseModel
from auth import authenticate_user, create_access_token, is_localhost

router = APIRouter()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
        )
    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
    })
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        username=user["username"],
    )


@router.get("/me")
async def get_me(request: Request):
    """Retourne les infos de l'utilisateur courant."""
    if is_localhost(request):
        return {"username": "pi", "role": "user", "auto": True}
    return {"username": None, "role": None, "auto": False}
