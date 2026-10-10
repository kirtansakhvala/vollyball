import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import Tournament, Team, Match
from backend.schemas import TournamentCreate, TournamentUpdate, TournamentOut
from backend.auth import verify_scorer_access

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])

def generate_slug(name: str) -> str:
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    return re.sub(r'[-\s]+', '-', slug).strip('-')

@router.get("", response_model=List[TournamentOut])
def get_tournaments(db: Session = Depends(get_db)):
    return db.query(Tournament).order_by(Tournament.created_at.desc()).all()

@router.post("", response_model=TournamentOut, status_code=status.HTTP_201_CREATED)
def create_tournament(
    payload: TournamentCreate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    slug = payload.slug or generate_slug(payload.name)
    existing = db.query(Tournament).filter(Tournament.slug == slug).first()
    if existing:
        slug = f"{slug}-{int(func.random() * 1000)}"

    tournament = Tournament(
        name=payload.name,
        slug=slug,
        location=payload.location,
        venue=payload.venue,
        start_date=payload.start_date,
        end_date=payload.end_date,
        banner_url=payload.banner_url,
        status=payload.status or 'upcoming',
        rules_config=payload.rules_config or {"default_format": "best_of_3", "points_per_set": 25, "deciding_set_points": 15}
    )

    if payload.team_ids:
        teams = db.query(Team).filter(Team.id.in_(payload.team_ids)).all()
        tournament.teams.extend(teams)

    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament

@router.get("/{tournament_id}", response_model=TournamentOut)
def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament

@router.put("/{tournament_id}", response_model=TournamentOut)
def update_tournament(
    tournament_id: int,
    payload: TournamentUpdate,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "team_ids" and value is not None:
            teams = db.query(Team).filter(Team.id.in_(value)).all()
            tournament.teams = teams
        else:
            setattr(tournament, key, value)

    db.commit()
    db.refresh(tournament)
    return tournament

@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    db.delete(tournament)
    db.commit()
    return None

@router.post("/{tournament_id}/teams/{team_id}", response_model=TournamentOut)
def add_team_to_tournament(
    tournament_id: int,
    team_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not tournament or not team:
        raise HTTPException(status_code=404, detail="Tournament or Team not found")

    if team not in tournament.teams:
        tournament.teams.append(team)
        db.commit()
        db.refresh(tournament)

    return tournament

@router.delete("/{tournament_id}/teams/{team_id}", response_model=TournamentOut)
def remove_team_from_tournament(
    tournament_id: int,
    team_id: int,
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    team = db.query(Team).filter(Team.id == team_id).first()
    if not tournament or not team:
        raise HTTPException(status_code=404, detail="Tournament or Team not found")

    if team in tournament.teams:
        tournament.teams.remove(team)
        db.commit()
        db.refresh(tournament)

    return tournament

@router.get("/{tournament_id}/standings")
def get_tournament_standings(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    standings = {}
    for team in tournament.teams:
        standings[team.id] = {
            "team_id": team.id,
            "team_name": team.name,
            "short_name": team.short_name,
            "logo_url": team.logo_url,
            "primary_color": team.primary_color,
            "played": 0,
            "won": 0,
            "lost": 0,
            "sets_won": 0,
            "sets_lost": 0,
            "points_won": 0,
            "points_lost": 0,
            "points": 0
        }

    matches = db.query(Match).filter(
        Match.tournament_id == tournament_id,
        Match.status == 'completed'
    ).all()

    for m in matches:
        if m.team_a_id in standings and m.team_b_id in standings:
            t_a = standings[m.team_a_id]
            t_b = standings[m.team_b_id]

            t_a["played"] += 1
            t_b["played"] += 1

            t_a["sets_won"] += m.team_a_sets_won
            t_a["sets_lost"] += m.team_b_sets_won
            t_b["sets_won"] += m.team_b_sets_won
            t_b["sets_lost"] += m.team_a_sets_won

            for s in m.sets:
                t_a["points_won"] += s.team_a_score
                t_a["points_lost"] += s.team_b_score
                t_b["points_won"] += s.team_b_score
                t_b["points_lost"] += s.team_a_score

            if m.winner_team_id == m.team_a_id:
                t_a["won"] += 1
                t_b["lost"] += 1
                t_a["points"] += 3 if (m.team_b_sets_won <= 1) else 2
                if m.team_b_sets_won >= 2:
                    t_b["points"] += 1
            elif m.winner_team_id == m.team_b_id:
                t_b["won"] += 1
                t_a["lost"] += 1
                t_b["points"] += 3 if (m.team_a_sets_won <= 1) else 2
                if m.team_a_sets_won >= 2:
                    t_a["points"] += 1

    standings_list = list(standings.values())
    standings_list.sort(key=lambda x: (
        x["points"],
        x["won"],
        (x["sets_won"] - x["sets_lost"]),
        (x["points_won"] - x["points_lost"])
    ), reverse=True)

    return {
        "tournament_id": tournament_id,
        "tournament_name": tournament.name,
        "standings": standings_list
    }
