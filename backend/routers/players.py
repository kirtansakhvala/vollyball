from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Player, Team
from backend.schemas import PlayerCreate, PlayerUpdate, PlayerOut
from backend.auth import verify_scorer_access

router = APIRouter(prefix="/api/players", tags=["players"])

@router.get("", response_model=List[PlayerOut])
def get_players(team_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Player)
    if team_id:
        query = query.filter(Player.team_id == team_id)
    return query.order_by(Player.jersey_number.asc()).all()

@router.post("", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def create_player(
    payload: PlayerCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing_jersey = db.query(Player).filter(
        Player.team_id == payload.team_id,
        Player.jersey_number == payload.jersey_number
    ).first()
    if existing_jersey:
        raise HTTPException(
            status_code=400,
            detail=f"Jersey #{payload.jersey_number} is already assigned on this team."
        )

    player = Player(
        team_id=payload.team_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        jersey_number=payload.jersey_number,
        position=payload.position or "OH",
        is_captain=payload.is_captain,
        is_active=payload.is_active
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player

@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.put("/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    payload: PlayerUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(player, key, value)

    db.commit()
    db.refresh(player)
    return player

@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(
    player_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    db.delete(player)
    db.commit()
    return None
