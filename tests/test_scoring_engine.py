import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.models import Tournament, Team, Player, Match, MatchSet, ScoringEvent
from backend.scoring_engine import VolleyballScoringEngine

TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_scoring.db'))
TEST_DB_URL = f'sqlite:///{TEST_DB_PATH}'

@pytest.fixture(scope='function')
def db_session():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
        
    engine = create_engine(TEST_DB_URL, connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    
    yield session
    
    session.close()
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

def test_rally_scoring_and_sideout_rotation(db_session):
    team_a = Team(name='Hawks', short_name='HWK', primary_color='#00e5ff')
    team_b = Team(name='Titans', short_name='TTN', primary_color='#ff0055')
    db_session.add_all([team_a, team_b])
    db_session.commit()

    match = Match(
        team_a_id=team_a.id,
        team_b_id=team_b.id,
        format='best_of_3',
        status='live',
        current_set_number=1,
        current_serving_team='team_a',
        team_a_rotation=1,
        team_b_rotation=1
    )
    db_session.add(match)
    db_session.commit()

    # 1. Team A scores while serving -> No rotation
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_a')
    assert match.sets[0].team_a_score == 1
    assert match.sets[0].team_b_score == 0
    assert match.current_serving_team == 'team_a'
    assert match.team_a_rotation == 1
    assert match.team_b_rotation == 1

    # 2. Team B scores on Team A serve (Side-out) -> Team B rotates to 2
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_b')
    assert match.sets[0].team_a_score == 1
    assert match.sets[0].team_b_score == 1
    assert match.current_serving_team == 'team_b'
    assert match.team_b_rotation == 2
    assert match.team_a_rotation == 1

    # 3. Team B scores again on own serve -> No rotation
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_b')
    assert match.sets[0].team_a_score == 1
    assert match.sets[0].team_b_score == 2
    assert match.current_serving_team == 'team_b'
    assert match.team_b_rotation == 2

def test_undo_rally_point(db_session):
    team_a = Team(name='Team Alpha', short_name='ALP')
    team_b = Team(name='Team Beta', short_name='BET')
    db_session.add_all([team_a, team_b])
    db_session.commit()

    match = Match(
        team_a_id=team_a.id,
        team_b_id=team_b.id,
        format='best_of_3',
        status='live',
        current_set_number=1,
        current_serving_team='team_a'
    )
    db_session.add(match)
    db_session.commit()

    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_a')
    assert match.sets[0].team_a_score == 1

    # Undo point
    VolleyballScoringEngine.apply_action(db_session, match, 'undo')
    assert match.sets[0].team_a_score == 0
    assert len(match.events) == 0

def test_set_win_and_deciding_set(db_session):
    team_a = Team(name='Team 1', short_name='T1')
    team_b = Team(name='Team 2', short_name='T2')
    db_session.add_all([team_a, team_b])
    db_session.commit()

    match = Match(
        team_a_id=team_a.id,
        team_b_id=team_b.id,
        format='best_of_3',
        status='live',
        current_set_number=1,
        current_serving_team='team_a'
    )
    db_session.add(match)
    
    set1 = MatchSet(match=match, set_number=1, team_a_score=24, team_b_score=20, status='live')
    db_session.add(set1)
    db_session.commit()

    # Score point 25 -> Set 1 won by Team A
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_a')
    assert match.team_a_sets_won == 1
    assert match.current_set_number == 2
    assert match.status == 'live'

    # Set 2: Advance to 0-24, then Team B scores point 25 -> Set 2 won by Team B
    set2 = [s for s in match.sets if s.set_number == 2][0]
    set2.team_b_score = 24
    db_session.commit()
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_b')
    assert match.team_b_sets_won == 1
    assert match.current_set_number == 3 # Deciding set!

    target_pts = VolleyballScoringEngine.get_set_target_points(match.format, match.current_set_number)
    assert target_pts == 15

    # Advance Set 3 to 14-13
    set3 = [s for s in match.sets if s.set_number == 3][0]
    set3.team_a_score = 14
    set3.team_b_score = 13
    db_session.commit()

    # Score point 15 (15-13, win by 2) -> Match completed!
    VolleyballScoringEngine.apply_action(db_session, match, 'point_team_a')
    assert match.team_a_sets_won == 2
    assert match.status == 'completed'
    assert match.winner_team_id == team_a.id