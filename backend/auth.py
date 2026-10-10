from fastapi import Header, HTTPException, status
from typing import Optional
from backend.config import settings

def verify_scorer_access(
    x_scorer_pin: Optional[str] = Header(None, alias="X-Scorer-PIN"),
    authorization: Optional[str] = Header(None)
):
    if x_scorer_pin and (x_scorer_pin == settings.SCORER_PIN or x_scorer_pin == settings.ADMIN_SECRET):
        return {"role": "scorer", "authenticated": True}
        
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        if token == settings.SCORER_PIN or token == settings.ADMIN_SECRET:
            return {"role": "scorer", "authenticated": True}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Valid Scorer PIN or Admin Secret required for scoring/admin actions."
    )

def verify_admin_access(
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    authorization: Optional[str] = Header(None)
):
    if x_admin_secret and x_admin_secret == settings.ADMIN_SECRET:
        return {"role": "admin", "authenticated": True}

    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        if token == settings.ADMIN_SECRET or token == settings.SCORER_PIN:
            return {"role": "admin", "authenticated": True}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authorization required."
    )
