from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Team
from backend.schemas import TeamCreate, TeamUpdate, TeamOut, PlayerOut
from backend.auth import verify_scorer_access

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("", response_model=List[TeamOut])
def get_teams(db: Session = Depends(get_db)):
    return db.query(Team).order_by(Team.name.asc()).all()

@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    team = Team(
        name=payload.name,
        short_name=payload.short_name or payload.name[:3].upper(),
        logo_url=payload.logo_url,
        primary_color=payload.primary_color or "#00e5ff",
        secondary_color=payload.secondary_color or "#0a192f",
        contact_email=payload.contact_email
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.put("/{team_id}", response_model=TeamOut)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, key, value)

    db.commit()
    db.refresh(team)
    return team

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db.delete(team)
    db.commit()
    return None

@router.get("/{team_id}/roster", response_model=List[PlayerOut])
def get_team_roster(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team.players
