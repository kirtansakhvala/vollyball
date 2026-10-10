from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Match, MatchSet, Team
from backend.schemas import MatchCreate, MatchUpdate, MatchOut, MatchDetailOut
from backend.auth import verify_scorer_access

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("", response_model=List[MatchOut])
def get_matches(
    tournament_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Match)
    if tournament_id:
        query = query.filter(Match.tournament_id == tournament_id)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    return query.order_by(Match.created_at.desc()).all()

@router.post("", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(
    payload: MatchCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    if payload.team_a_id == payload.team_b_id:
        raise HTTPException(status_code=400, detail="Team A and Team B cannot be the same team.")

    team_a = db.query(Team).filter(Team.id == payload.team_a_id).first()
    team_b = db.query(Team).filter(Team.id == payload.team_b_id).first()
    if not team_a or not team_b:
        raise HTTPException(status_code=404, detail="One or both teams not found.")

    match = Match(
        tournament_id=payload.tournament_id,
        team_a_id=payload.team_a_id,
        team_b_id=payload.team_b_id,
        match_number=payload.match_number,
        stage=payload.stage,
        court=payload.court,
        format=payload.format,
        status="scheduled",
        current_set_number=1,
        team_a_sets_won=0,
        team_b_sets_won=0,
        current_serving_team=payload.initial_serving_team or "team_a",
        team_a_timeouts_remaining=2,
        team_b_timeouts_remaining=2,
        team_a_rotation=1,
        team_b_rotation=1,
        scheduled_time=payload.scheduled_time,
        rules_override=payload.rules_override
    )
    db.add(match)
    db.flush()

    initial_set = MatchSet(
        match_id=match.id,
        set_number=1,
        team_a_score=0,
        team_b_score=0,
        status="live"
    )
    db.add(initial_set)
    db.commit()
    db.refresh(match)
    return match

@router.get("/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.put("/{match_id}", response_model=MatchOut)
def update_match(
    match_id: int,
    payload: MatchUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(match, key, value)

    db.commit()
    db.refresh(match)
    return match

@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(
    match_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    db.delete(match)
    db.commit()
    return None
