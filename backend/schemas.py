from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SchemaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class PlayerBase(SchemaBase):
    first_name: str
    last_name: str
    jersey_number: int
    position: str = "OH"
    is_captain: bool = False
    is_active: bool = True

class PlayerCreate(PlayerBase):
    team_id: int

class PlayerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    is_captain: Optional[bool] = None
    is_active: Optional[bool] = None

class PlayerOut(PlayerBase):
    id: int
    team_id: int
    created_at: Optional[datetime] = None

class TeamBase(SchemaBase):
    name: str
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#00e5ff"
    secondary_color: str = "#0a192f"
    contact_email: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    contact_email: Optional[str] = None

class TeamOut(TeamBase):
    id: int
    players: List[PlayerOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class MatchSetOut(SchemaBase):
    id: int
    match_id: int
    set_number: int
    team_a_score: int
    team_b_score: int
    winning_team_id: Optional[int] = None
    status: str
    team_a_timeouts_used: int = 0
    team_b_timeouts_used: int = 0
    team_a_subs_used: int = 0
    team_b_subs_used: int = 0
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ScoringEventOut(SchemaBase):
    id: int
    match_id: int
    set_number: int
    event_type: str
    team_awarded: Optional[str] = None
    team_a_score_after: int
    team_b_score_after: int
    serving_team_after: Optional[str] = None
    team_a_rotation_after: int
    team_b_rotation_after: int
    details: Optional[str] = None
    created_at: Optional[datetime] = None

class MatchBase(SchemaBase):
    tournament_id: Optional[int] = None
    team_a_id: int
    team_b_id: int
    match_number: int = 1
    stage: str = "Regular Match"
    court: str = "Court 1"
    format: str = "best_of_3"
    scheduled_time: Optional[str] = None
    rules_override: Optional[Dict[str, Any]] = None

class MatchCreate(MatchBase):
    initial_serving_team: Optional[str] = "team_a"

class MatchUpdate(BaseModel):
    tournament_id: Optional[int] = None
    match_number: Optional[int] = None
    stage: Optional[str] = None
    court: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    scheduled_time: Optional[str] = None
    rules_override: Optional[Dict[str, Any]] = None

class MatchOut(MatchBase):
    id: int
    status: str
    winner_team_id: Optional[int] = None
    current_set_number: int
    team_a_sets_won: int
    team_b_sets_won: int
    current_serving_team: Optional[str] = None
    team_a_timeouts_remaining: int
    team_b_timeouts_remaining: int
    team_a_rotation: int
    team_b_rotation: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    team_a: Optional[TeamOut] = None
    team_b: Optional[TeamOut] = None
    winner: Optional[TeamOut] = None
    sets: List[MatchSetOut] = []

class MatchDetailOut(MatchOut):
    events: List[ScoringEventOut] = []

class TournamentBase(SchemaBase):
    name: str
    slug: Optional[str] = None
    location: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    banner_url: Optional[str] = None
    status: str = "upcoming"
    rules_config: Optional[Dict[str, Any]] = None

class TournamentCreate(TournamentBase):
    team_ids: Optional[List[int]] = []

class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    location: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    banner_url: Optional[str] = None
    status: Optional[str] = None
    rules_config: Optional[Dict[str, Any]] = None
    team_ids: Optional[List[int]] = None

class TournamentOut(TournamentBase):
    id: int
    teams: List[TeamOut] = []
    matches: List[MatchOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ScoringActionRequest(BaseModel):
    action: str
    player_id: Optional[int] = None
    serving_team: Optional[str] = None
    sub_in_player_id: Optional[int] = None
    sub_out_player_id: Optional[int] = None
    details: Optional[str] = None

class AuthRequest(BaseModel):
    pin: str

class AuthResponse(BaseModel):
    authenticated: bool
    role: str
    token: Optional[str] = None
