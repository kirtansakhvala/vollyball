import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db
from backend.models import Tournament, Team, Player, Match, MatchSet
from backend.config import settings

TEST_PERSIST_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_persistence_archive.db'))
TEST_PERSIST_URL = f'sqlite:///{TEST_PERSIST_DB}'

@pytest.fixture(scope='module')
def persistent_db_setup():
    if os.path.exists(TEST_PERSIST_DB):
        os.remove(TEST_PERSIST_DB)

    engine = create_engine(TEST_PERSIST_URL, connect_args={'check_same_thread': False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield {'client': client, 'engine': engine, 'TestingSession': TestingSession}

    app.dependency_overrides.clear()
    engine.dispose()
    if os.path.exists(TEST_PERSIST_DB):
        try:
            os.remove(TEST_PERSIST_DB)
        except Exception:
            pass

def test_full_ten_step_lifecycle_and_restart(persistent_db_setup):
    client = persistent_db_setup['client']
    headers = {'X-Scorer-PIN': settings.SCORER_PIN}

    # Step 1: Create a tournament
    t_res = client.post('/api/tournaments', json={
        'name': 'National Volleyball Championship 2026',
        'location': 'Denver, CO',
        'venue': 'Apex Arena',
        'start_date': '2026-10-15',
        'end_date': '2026-10-18'
    }, headers=headers)
    assert t_res.status_code == 201
    tournament_id = t_res.json()['id']

    # Step 2: Create two teams and their players
    team_a_res = client.post('/api/teams', json={
        'name': 'Pacific Wave',
        'short_name': 'WAV',
        'primary_color': '#00e5ff',
        'secondary_color': '#0a192f'
    }, headers=headers)
    assert team_a_res.status_code == 201
    team_a_id = team_a_res.json()['id']

    team_b_res = client.post('/api/teams', json={
        'name': 'Thunder Storm',
        'short_name': 'THU',
        'primary_color': '#ff9100',
        'secondary_color': '#1a0a2f'
    }, headers=headers)
    assert team_b_res.status_code == 201
    team_b_id = team_b_res.json()['id']

    # Add players to Team A
    p1 = client.post('/api/players', json={
        'team_id': team_a_id,
        'first_name': 'Alex',
        'last_name': 'Morgan',
        'jersey_number': 7,
        'position': 'OH',
        'is_captain': True
    }, headers=headers)
    assert p1.status_code == 201

    p2 = client.post('/api/players', json={
        'team_id': team_b_id,
        'first_name': 'Carlos',
        'last_name': 'Silva',
        'jersey_number': 10,
        'position': 'S',
        'is_captain': True
    }, headers=headers)
    assert p2.status_code == 201

    # Add teams to tournament
    client.post(f'/api/tournaments/{tournament_id}/teams/{team_a_id}', headers=headers)
    client.post(f'/api/tournaments/{tournament_id}/teams/{team_b_id}', headers=headers)

    # Step 3: Create a match
    m_res = client.post('/api/matches', json={
        'tournament_id': tournament_id,
        'team_a_id': team_a_id,
        'team_b_id': team_b_id,
        'format': 'best_of_3',
        'stage': 'Championship Finals',
        'court': 'Center Court'
    }, headers=headers)
    assert m_res.status_code == 201
    match_id = m_res.json()['id']

    # Step 4: Award points to both teams
    pt1 = client.post(f'/api/matches/{match_id}/action', json={'action': 'point_team_a'}, headers=headers)
    assert pt1.status_code == 200
    assert pt1.json()['sets'][0]['team_a_score'] == 1

    pt2 = client.post(f'/api/matches/{match_id}/action', json={'action': 'point_team_b'}, headers=headers)
    assert pt2.status_code == 200
    assert pt2.json()['sets'][0]['team_b_score'] == 1
    assert pt2.json()['current_serving_team'] == 'team_b'

    # Step 5: Complete a set (advance to 24-22, then score point 25)
    session = persistent_db_setup['TestingSession']()
    m_db = session.query(Match).filter(Match.id == match_id).first()
    m_db.sets[0].team_a_score = 24
    m_db.sets[0].team_b_score = 22
    session.commit()
    session.close()

    win_pt = client.post(f'/api/matches/{match_id}/action', json={'action': 'point_team_a'}, headers=headers)
    assert win_pt.status_code == 200
    data = win_pt.json()
    assert data['team_a_sets_won'] == 1
    assert data['current_set_number'] == 2

    # Step 6: Verify the saved set score in database
    set1_data = [s for s in data['sets'] if s['set_number'] == 1][0]
    assert set1_data['team_a_score'] == 25
    assert set1_data['team_b_score'] == 22
    assert set1_data['status'] == 'completed'

    # Step 7: Close all database connections and dispose engine
    persistent_db_setup['engine'].dispose()

    # Step 8: Restart application connecting to the exact same DB file
    new_engine = create_engine(TEST_PERSIST_URL, connect_args={'check_same_thread': False})
    NewSession = sessionmaker(autocommit=False, autoflush=False, bind=new_engine)

    def restart_get_db():
        db = NewSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = restart_get_db
    restarted_client = TestClient(app)

    # Step 9 & 10: Fetch tournament, teams, match and scorecard; verify all records preserved
    re_t = restarted_client.get(f'/api/tournaments/{tournament_id}')
    assert re_t.status_code == 200
    assert re_t.json()['name'] == 'National Volleyball Championship 2026'
    assert len(re_t.json()['teams']) == 2

    re_m = restarted_client.get(f'/api/matches/{match_id}')
    assert re_m.status_code == 200
    m_data = re_m.json()
    assert m_data['team_a_sets_won'] == 1
    assert m_data['current_set_number'] == 2
    assert len(m_data['sets']) == 2
    assert m_data['sets'][0]['team_a_score'] == 25
    assert m_data['sets'][0]['team_b_score'] == 22

    # Verify players exist
    re_players = restarted_client.get(f'/api/players?team_id={team_a_id}')
    assert re_players.status_code == 200
    player_list = re_players.json()
    assert len(player_list) == 1
    assert player_list[0]['first_name'] == 'Alex'

    # Verify timeouts and system health endpoint
    health_res = restarted_client.get('/api/system/health')
    assert health_res.status_code == 200
    assert health_res.json()['storage']['status'] == 'healthy'
    assert health_res.json()['storage']['table_count'] >= 6

    # Verify backup export
    backup_res = restarted_client.get('/api/system/backup', headers=headers)
    assert backup_res.status_code == 200
    assert len(backup_res.json()['tournaments']) >= 1
    assert len(backup_res.json()['matches']) >= 1

    new_engine.dispose()

def test_unauthorized_scoring_rejected(persistent_db_setup):
    client = persistent_db_setup['client']
    res = client.post('/api/matches/1/action', json={'action': 'point_team_a'})
    assert res.status_code == 401

    res_bad = client.post('/api/matches/1/action', json={'action': 'point_team_a'}, headers={'X-Scorer-PIN': 'wrong_pin'})
    assert res_bad.status_code == 401

def test_timeout_and_subs(persistent_db_setup):
    client = persistent_db_setup['client']
    headers = {'X-Scorer-PIN': settings.SCORER_PIN}

    # Start match 1
    client.post('/api/matches/1/action', json={'action': 'start'}, headers=headers)

    # Take timeout for team A
    to_res = client.post('/api/matches/1/action', json={'action': 'timeout_team_a'}, headers=headers)
    assert to_res.status_code == 200
    assert to_res.json()['team_a_timeouts_remaining'] == 1

    # Take second timeout for team A
    to2_res = client.post('/api/matches/1/action', json={'action': 'timeout_team_a'}, headers=headers)
    assert to2_res.status_code == 200
    assert to2_res.json()['team_a_timeouts_remaining'] == 0

    # Third timeout should fail (max 2 per set)
    to3_res = client.post('/api/matches/1/action', json={'action': 'timeout_team_a'}, headers=headers)
    assert to3_res.status_code == 400

    # Test substitution
    sub_res = client.post('/api/matches/1/action', json={'action': 'sub_team_a', 'details': '#7 out, #12 in'}, headers=headers)
    assert sub_res.status_code == 200