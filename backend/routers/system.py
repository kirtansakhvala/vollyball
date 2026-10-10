from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db, check_db_health
from backend.models import Tournament, Team, Player, Match, MatchSet, ScoringEvent
from backend.auth import verify_scorer_access

router = APIRouter(prefix="/api/system", tags=["system"])

@router.get("/health")
def get_system_health():
    health_info = check_db_health()
    return {
        "app": "VolleyPro Scoring Engine",
        "timestamp": datetime.utcnow().isoformat(),
        "storage": health_info
    }

@router.get("/backup")
def export_database_backup(
    db: Session = Depends(get_db),
    auth: dict = Depends(verify_scorer_access)
):
    tournaments = db.query(Tournament).all()
    teams = db.query(Team).all()
    players = db.query(Player).all()
    matches = db.query(Match).all()
    sets = db.query(MatchSet).all()
    events = db.query(ScoringEvent).all()

    backup_data = {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "tournaments": [
            {
                "id": t.id, "name": t.name, "slug": t.slug, "location": t.location,
                "venue": t.venue, "start_date": t.start_date, "end_date": t.end_date,
                "banner_url": t.banner_url, "status": t.status, "rules_config": t.rules_config,
                "team_ids": [team.id for team in t.teams]
            } for t in tournaments
        ],
        "teams": [
            {
                "id": tm.id, "name": tm.name, "short_name": tm.short_name,
                "logo_url": tm.logo_url, "primary_color": tm.primary_color,
                "secondary_color": tm.secondary_color, "contact_email": tm.contact_email
            } for tm in teams
        ],
        "players": [
            {
                "id": p.id, "team_id": p.team_id, "first_name": p.first_name,
                "last_name": p.last_name, "jersey_number": p.jersey_number,
                "position": p.position, "is_captain": p.is_captain, "is_active": p.is_active
            } for p in players
        ],
        "matches": [
            {
                "id": m.id, "tournament_id": m.tournament_id, "team_a_id": m.team_a_id,
                "team_b_id": m.team_b_id, "match_number": m.match_number, "stage": m.stage,
                "court": m.court, "format": m.format, "status": m.status,
                "winner_team_id": m.winner_team_id, "current_set_number": m.current_set_number,
                "team_a_sets_won": m.team_a_sets_won, "team_b_sets_won": m.team_b_sets_won,
                "current_serving_team": m.current_serving_team,
                "team_a_timeouts_remaining": m.team_a_timeouts_remaining,
                "team_b_timeouts_remaining": m.team_b_timeouts_remaining,
                "team_a_rotation": m.team_a_rotation, "team_b_rotation": m.team_b_rotation,
                "scheduled_time": m.scheduled_time, "start_time": m.start_time,
                "end_time": m.end_time, "rules_override": m.rules_override
            } for m in matches
        ],
        "sets": [
            {
                "id": s.id, "match_id": s.match_id, "set_number": s.set_number,
                "team_a_score": s.team_a_score, "team_b_score": s.team_b_score,
                "winning_team_id": s.winning_team_id, "status": s.status,
                "team_a_timeouts_used": s.team_a_timeouts_used,
                "team_b_timeouts_used": s.team_b_timeouts_used,
                "team_a_subs_used": s.team_a_subs_used,
                "team_b_subs_used": s.team_b_subs_used,
                "start_time": s.start_time, "end_time": s.end_time
            } for s in sets
        ],
        "events": [
            {
                "id": e.id, "match_id": e.match_id, "set_number": e.set_number,
                "event_type": e.event_type, "team_awarded": e.team_awarded,
                "team_a_score_after": e.team_a_score_after,
                "team_b_score_after": e.team_b_score_after,
                "serving_team_after": e.serving_team_after,
                "team_a_rotation_after": e.team_a_rotation_after,
                "team_b_rotation_after": e.team_b_rotation_after,
                "snapshot_json": e.snapshot_json, "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else None
            } for e in events
        ]
    }
    return backup_data
