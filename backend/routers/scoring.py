from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Match, ScoringEvent
from backend.schemas import ScoringActionRequest, MatchDetailOut, ScoringEventOut, AuthRequest, AuthResponse
from backend.scoring_engine import VolleyballScoringEngine
from backend.auth import verify_scorer_access
from backend.websocket_manager import ws_manager
from backend.config import settings

router = APIRouter(prefix="/api", tags=["scoring"])

@router.post("/auth/verify", response_model=AuthResponse)
def verify_pin(payload: AuthRequest):
    if payload.pin == settings.SCORER_PIN or payload.pin == settings.ADMIN_SECRET:
        role = "admin" if payload.pin == settings.ADMIN_SECRET else "scorer"
        return AuthResponse(authenticated=True, role=role, token=payload.pin)
    raise HTTPException(status_code=401, detail="Invalid PIN or access code.")

@router.post("/matches/{match_id}/action", response_model=MatchDetailOut)
async def perform_scoring_action(
    match_id: int,
    payload: ScoringActionRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    updated_match = VolleyballScoringEngine.apply_action(
        db=db,
        match=match,
        action=payload.action,
        player_id=payload.player_id,
        serving_team=payload.serving_team,
        sub_in_player_id=payload.sub_in_player_id,
        sub_out_player_id=payload.sub_out_player_id,
        details=payload.details
    )

    match_data = MatchDetailOut.model_validate(updated_match).model_dump(mode="json")

    await ws_manager.broadcast_match_update(match_id, {
        "type": "MATCH_UPDATE",
        "action": payload.action,
        "match": match_data
    })

    return updated_match

@router.get("/matches/{match_id}/events", response_model=List[ScoringEventOut])
def get_match_events(match_id: int, db: Session = Depends(get_db)):
    events = db.query(ScoringEvent).filter(
        ScoringEvent.match_id == match_id
    ).order_by(ScoringEvent.id.desc()).all()
    return events
