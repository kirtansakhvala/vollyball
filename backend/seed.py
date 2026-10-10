from backend.database import SessionLocal, init_db
from backend.models import Tournament, Team, Player, Match, MatchSet
from backend.scoring_engine import VolleyballScoringEngine

def seed_initial_data():
    init_db()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Tournament).first():
            print("[Seed] Database already contains records. Skipping seed to preserve data.")
            return

        print("[Seed] Seeding sample tournament, teams, and matches...")

        # 1. Create Teams
        hawks = Team(
            name="Pacific Hawks",
            short_name="HWK",
            primary_color="#00e5ff",
            secondary_color="#0a192f",
            contact_email="coach@pacifichawks.com"
        )
        titans = Team(
            name="Titan Spikers",
            short_name="TTN",
            primary_color="#ff9100",
            secondary_color="#1a0a2f",
            contact_email="coach@titanspikers.com"
        )
        avalanche = Team(
            name="Denver Avalanche",
            short_name="AVL",
            primary_color="#00e676",
            secondary_color="#051f15",
            contact_email="contact@denveravalanche.org"
        )
        solars = Team(
            name="Solar Flares",
            short_name="SOL",
            primary_color="#ff1744",
            secondary_color="#20050e",
            contact_email="team@solarflaresvc.com"
        )

        db.add_all([hawks, titans, avalanche, solars])
        db.flush()

        # 2. Add Players to Hawks
        db.add_all([
            Player(team_id=hawks.id, first_name="Kaito", last_name="Tanaka", jersey_number=4, position="OH", is_captain=True),
            Player(team_id=hawks.id, first_name="Marcus", last_name="Vance", jersey_number=7, position="MB"),
            Player(team_id=hawks.id, first_name="Elena", last_name="Rostova", jersey_number=10, position="S"),
            Player(team_id=hawks.id, first_name="Lucas", last_name="Silva", jersey_number=12, position="OPP"),
            Player(team_id=hawks.id, first_name="Leo", last_name="Chen", jersey_number=2, position="L"),
            Player(team_id=hawks.id, first_name="David", last_name="Miller", jersey_number=9, position="DS"),
        ])

        # Add Players to Titans
        db.add_all([
            Player(team_id=titans.id, first_name="Aaron", last_name="Judge", jersey_number=99, position="OPP", is_captain=True),
            Player(team_id=titans.id, first_name="Dante", last_name="Moretti", jersey_number=11, position="OH"),
            Player(team_id=titans.id, first_name="Sam", last_name="Kowalski", jersey_number=5, position="MB"),
            Player(team_id=titans.id, first_name="Alex", last_name="Novak", jersey_number=8, position="S"),
            Player(team_id=titans.id, first_name="Julian", last_name="Reyes", jersey_number=1, position="L"),
        ])

        # 3. Create Tournament
        tournament = Tournament(
            name="Pacific Invitational Championship 2026",
            slug="pacific-invitational-2026",
            location="Seattle, WA",
            venue="Key Arena Court 1",
            start_date="2026-10-15",
            end_date="2026-10-18",
            status="active",
            rules_config={"default_format": "best_of_3", "points_per_set": 25, "deciding_set_points": 15}
        )
        tournament.teams.extend([hawks, titans, avalanche, solars])
        db.add(tournament)
        db.flush()

        # 4. Create Matches
        match1 = Match(
            tournament_id=tournament.id,
            team_a_id=hawks.id,
            team_b_id=titans.id,
            match_number=1,
            stage="Championship Grand Final",
            court="Center Stadium Court",
            format="best_of_3",
            status="live",
            current_set_number=1,
            current_serving_team="team_a",
            team_a_timeouts_remaining=2,
            team_b_timeouts_remaining=2,
            team_a_rotation=1,
            team_b_rotation=1,
            scheduled_time="2026-10-15 18:00"
        )
        db.add(match1)
        db.flush()

        set1 = MatchSet(
            match_id=match1.id,
            set_number=1,
            team_a_score=14,
            team_b_score=12,
            status="live"
        )
        db.add(set1)

        match2 = Match(
            tournament_id=tournament.id,
            team_a_id=avalanche.id,
            team_b_id=solars.id,
            match_number=2,
            stage="Bronze Medal Match",
            court="Court 2",
            format="best_of_3",
            status="scheduled",
            current_set_number=1,
            current_serving_team="team_a",
            team_a_timeouts_remaining=2,
            team_b_timeouts_remaining=2,
            team_a_rotation=1,
            team_b_rotation=1,
            scheduled_time="2026-10-15 20:00"
        )
        db.add(match2)
        db.flush()

        set_m2 = MatchSet(
            match_id=match2.id,
            set_number=1,
            team_a_score=0,
            team_b_score=0,
            status="live"
        )
        db.add(set_m2)

        db.commit()
        print("[Seed] Successfully seeded initial tournament and matches.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()
