from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Table
)
from sqlalchemy.orm import relationship
from backend.database import Base

tournament_teams = Table(
    'tournament_teams',
    Base.metadata,
    Column('tournament_id', Integer, ForeignKey('tournaments.id', ondelete='CASCADE'), primary_key=True),
    Column('team_id', Integer, ForeignKey('teams.id', ondelete='CASCADE'), primary_key=True),
    Column('seed', Integer, nullable=True),
    Column('group_name', String(50), nullable=True)
)

class Tournament(Base):
    __tablename__ = 'tournaments'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=True)
    location = Column(String(150), nullable=True)
    venue = Column(String(150), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    banner_url = Column(String(500), nullable=True)
    status = Column(String(30), default='upcoming')
    rules_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teams = relationship('Team', secondary=tournament_teams, back_populates='tournaments')
    matches = relationship('Match', back_populates='tournament', cascade='all, delete-orphan')

class Team(Base):
    __tablename__ = 'teams'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    short_name = Column(String(10), nullable=True)
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(30), default='#00e5ff')
    secondary_color = Column(String(30), default='#0a192f')
    contact_email = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    players = relationship('Player', back_populates='team', cascade='all, delete-orphan')
    tournaments = relationship('Tournament', secondary=tournament_teams, back_populates='teams')

class Player(Base):
    __tablename__ = 'players'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    jersey_number = Column(Integer, nullable=False)
    position = Column(String(20), default='OH')
    is_captain = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship('Team', back_populates='players')

class Match(Base):
    __tablename__ = 'matches'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tournament_id = Column(Integer, ForeignKey('tournaments.id', ondelete='SET NULL'), nullable=True)
    team_a_id = Column(Integer, ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    team_b_id = Column(Integer, ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    match_number = Column(Integer, default=1)
    stage = Column(String(50), default='Regular Match')
    court = Column(String(50), default='Court 1')
    format = Column(String(20), default='best_of_3')
    status = Column(String(20), default='scheduled')
    winner_team_id = Column(Integer, ForeignKey('teams.id', ondelete='SET NULL'), nullable=True)
    
    current_set_number = Column(Integer, default=1)
    team_a_sets_won = Column(Integer, default=0)
    team_b_sets_won = Column(Integer, default=0)
    
    current_serving_team = Column(String(10), default='team_a')
    team_a_timeouts_remaining = Column(Integer, default=2)
    team_b_timeouts_remaining = Column(Integer, default=2)
    
    team_a_rotation = Column(Integer, default=1)
    team_b_rotation = Column(Integer, default=1)
    
    scheduled_time = Column(String(50), nullable=True)
    start_time = Column(String(50), nullable=True)
    end_time = Column(String(50), nullable=True)
    rules_override = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tournament = relationship('Tournament', back_populates='matches')
    team_a = relationship('Team', foreign_keys=[team_a_id])
    team_b = relationship('Team', foreign_keys=[team_b_id])
    winner = relationship('Team', foreign_keys=[winner_team_id])
    
    sets = relationship('MatchSet', back_populates='match', cascade='all, delete-orphan', order_by='MatchSet.set_number')
    events = relationship('ScoringEvent', back_populates='match', cascade='all, delete-orphan', order_by='ScoringEvent.id')

class MatchSet(Base):
    __tablename__ = 'match_sets'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey('matches.id', ondelete='CASCADE'), nullable=False)
    set_number = Column(Integer, nullable=False)
    team_a_score = Column(Integer, default=0)
    team_b_score = Column(Integer, default=0)
    winning_team_id = Column(Integer, ForeignKey('teams.id', ondelete='SET NULL'), nullable=True)
    status = Column(String(20), default='live')
    team_a_timeouts_used = Column(Integer, default=0)
    team_b_timeouts_used = Column(Integer, default=0)
    team_a_subs_used = Column(Integer, default=0)
    team_b_subs_used = Column(Integer, default=0)
    start_time = Column(String(50), nullable=True)
    end_time = Column(String(50), nullable=True)

    match = relationship('Match', back_populates='sets')
    winner = relationship('Team', foreign_keys=[winning_team_id])

class ScoringEvent(Base):
    __tablename__ = 'scoring_events'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey('matches.id', ondelete='CASCADE'), nullable=False)
    set_number = Column(Integer, nullable=False)
    event_type = Column(String(30), nullable=False)
    team_awarded = Column(String(10), nullable=True)
    
    team_a_score_after = Column(Integer, default=0)
    team_b_score_after = Column(Integer, default=0)
    serving_team_after = Column(String(10), nullable=True)
    team_a_rotation_after = Column(Integer, default=1)
    team_b_rotation_after = Column(Integer, default=1)
    
    snapshot_json = Column(JSON, nullable=True)
    details = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship('Match', back_populates='events')
