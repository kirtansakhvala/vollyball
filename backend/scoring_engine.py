from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.models import Match, MatchSet, ScoringEvent

class VolleyballScoringEngine:
    @staticmethod
    def get_set_target_points(format_type: str, set_number: int, rules_override: Optional[Dict[str, Any]] = None) -> int:
        if rules_override and "set_points" in rules_override:
            return rules_override["set_points"].get(str(set_number), 25)
            
        if format_type == "best_of_3":
            return 15 if set_number == 3 else 25
        elif format_type == "best_of_5":
            return 15 if set_number == 5 else 25
        elif format_type == "single_set":
            return 25
        return 25

    @staticmethod
    def get_required_sets_to_win(format_type: str) -> int:
        if format_type == "best_of_3":
            return 2
        elif format_type == "best_of_5":
            return 3
        return 1

    @staticmethod
    def check_set_winner(set_obj: MatchSet, target_points: int, win_by: int = 2) -> Optional[str]:
        a = set_obj.team_a_score
        b = set_obj.team_b_score
        
        if a >= target_points and (a - b) >= win_by:
            return "team_a"
        if b >= target_points and (b - a) >= win_by:
            return "team_b"
        return None

    @classmethod
    def apply_action(
        cls,
        db: Session,
        match: Match,
        action: str,
        player_id: Optional[int] = None,
        serving_team: Optional[str] = None,
        sub_in_player_id: Optional[int] = None,
        sub_out_player_id: Optional[int] = None,
        details: Optional[str] = None
    ) -> Match:
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        current_set = db.query(MatchSet).filter(
            MatchSet.match_id == match.id,
            MatchSet.set_number == match.current_set_number
        ).first()

        if not current_set and action != "undo":
            current_set = MatchSet(
                match_id=match.id,
                set_number=match.current_set_number,
                team_a_score=0,
                team_b_score=0,
                status="live",
                start_time=now_str
            )
            db.add(current_set)
            db.flush()

        if action == "start":
            if match.status == "completed":
                raise HTTPException(status_code=400, detail="Cannot start a completed match.")
            match.status = "live"
            if not match.start_time:
                match.start_time = now_str
            if current_set and not current_set.start_time:
                current_set.start_time = now_str
            
            event = ScoringEvent(
                match_id=match.id,
                set_number=match.current_set_number,
                event_type="start_match",
                team_a_score_after=current_set.team_a_score if current_set else 0,
                team_b_score_after=current_set.team_b_score if current_set else 0,
                serving_team_after=match.current_serving_team,
                team_a_rotation_after=match.team_a_rotation,
                team_b_rotation_after=match.team_b_rotation,
                details=details or "Match started"
            )
            db.add(event)
            db.commit()
            db.refresh(match)
            return match

        if action == "pause":
            if match.status != "live":
                raise HTTPException(status_code=400, detail="Only live matches can be paused.")
            match.status = "paused"
            db.commit()
            db.refresh(match)
            return match

        if action == "resume":
            if match.status != "paused":
                raise HTTPException(status_code=400, detail="Only paused matches can be resumed.")
            match.status = "live"
            db.commit()
            db.refresh(match)
            return match

        if action == "finish":
            match.status = "completed"
            match.end_time = now_str
            if current_set and current_set.status == "live":
                current_set.status = "completed"
                current_set.end_time = now_str
            
            if match.team_a_sets_won > match.team_b_sets_won:
                match.winner_team_id = match.team_a_id
            elif match.team_b_sets_won > match.team_a_sets_won:
                match.winner_team_id = match.team_b_id
                
            db.commit()
            db.refresh(match)
            return match

        if action == "change_ends":
            event = ScoringEvent(
                match_id=match.id,
                set_number=match.current_set_number,
                event_type="change_ends",
                team_a_score_after=current_set.team_a_score,
                team_b_score_after=current_set.team_b_score,
                serving_team_after=match.current_serving_team,
                team_a_rotation_after=match.team_a_rotation,
                team_b_rotation_after=match.team_b_rotation,
                details="Court sides swapped"
            )
            db.add(event)
            db.commit()
            db.refresh(match)
            return match

        if action == "set_serving_team":
            if serving_team not in ["team_a", "team_b"]:
                raise HTTPException(status_code=400, detail="Invalid serving team.")
            match.current_serving_team = serving_team
            db.commit()
            db.refresh(match)
            return match

        if action in ["timeout_team_a", "timeout_team_b"]:
            if match.status != "live":
                raise HTTPException(status_code=400, detail="Match must be live to take a timeout.")
            
            if action == "timeout_team_a":
                if match.team_a_timeouts_remaining <= 0:
                    raise HTTPException(status_code=400, detail="Team A has no timeouts remaining in this set.")
                match.team_a_timeouts_remaining -= 1
                current_set.team_a_timeouts_used += 1
                team_awarded = "team_a"
                detail_text = f"Timeout called by {match.team_a.name if match.team_a else 'Team A'}"
            else:
                if match.team_b_timeouts_remaining <= 0:
                    raise HTTPException(status_code=400, detail="Team B has no timeouts remaining in this set.")
                match.team_b_timeouts_remaining -= 1
                current_set.team_b_timeouts_used += 1
                team_awarded = "team_b"
                detail_text = f"Timeout called by {match.team_b.name if match.team_b else 'Team B'}"

            snapshot = cls._create_state_snapshot(match, current_set)
            event = ScoringEvent(
                match_id=match.id,
                set_number=match.current_set_number,
                event_type="timeout",
                team_awarded=team_awarded,
                team_a_score_after=current_set.team_a_score,
                team_b_score_after=current_set.team_b_score,
                serving_team_after=match.current_serving_team,
                team_a_rotation_after=match.team_a_rotation,
                team_b_rotation_after=match.team_b_rotation,
                snapshot_json=snapshot,
                details=detail_text
            )
            db.add(event)
            db.commit()
            db.refresh(match)
            return match

        if action in ["sub_team_a", "sub_team_b"]:
            if match.status != "live":
                raise HTTPException(status_code=400, detail="Match must be live for substitutions.")
            
            snapshot = cls._create_state_snapshot(match, current_set)
            if action == "sub_team_a":
                current_set.team_a_subs_used += 1
                team_awarded = "team_a"
                team_name = match.team_a.name if match.team_a else "Team A"
            else:
                current_set.team_b_subs_used += 1
                team_awarded = "team_b"
                team_name = match.team_b.name if match.team_b else "Team B"

            event = ScoringEvent(
                match_id=match.id,
                set_number=match.current_set_number,
                event_type="substitution",
                team_awarded=team_awarded,
                team_a_score_after=current_set.team_a_score,
                team_b_score_after=current_set.team_b_score,
                serving_team_after=match.current_serving_team,
                team_a_rotation_after=match.team_a_rotation,
                team_b_rotation_after=match.team_b_rotation,
                snapshot_json=snapshot,
                details=details or f"Substitution for {team_name}"
            )
            db.add(event)
            db.commit()
            db.refresh(match)
            return match

        if action == "undo":
            return cls._perform_undo(db, match)

        if action in ["point_team_a", "point_team_b"]:
            if match.status == "completed":
                raise HTTPException(status_code=400, detail="Match is already completed.")
            
            if match.status in ["scheduled", "paused"]:
                match.status = "live"
                if not match.start_time:
                    match.start_time = now_str

            pre_snapshot = cls._create_state_snapshot(match, current_set)
            scoring_team = "team_a" if action == "point_team_a" else "team_b"
            previous_server = match.current_serving_team

            if scoring_team == "team_a":
                current_set.team_a_score += 1
            else:
                current_set.team_b_score += 1

            # Side-out Rotation: receiving team rotates when winning rally
            if previous_server != scoring_team:
                match.current_serving_team = scoring_team
                if scoring_team == "team_a":
                    match.team_a_rotation = (match.team_a_rotation % 6) + 1
                else:
                    match.team_b_rotation = (match.team_b_rotation % 6) + 1

            target_pts = cls.get_set_target_points(match.format, match.current_set_number, match.rules_override)
            set_winner = cls.check_set_winner(current_set, target_pts)

            match_finished = False

            if set_winner:
                current_set.status = "completed"
                current_set.end_time = now_str
                if set_winner == "team_a":
                    current_set.winning_team_id = match.team_a_id
                    match.team_a_sets_won += 1
                else:
                    current_set.winning_team_id = match.team_b_id
                    match.team_b_sets_won += 1

                req_sets = cls.get_required_sets_to_win(match.format)
                if match.team_a_sets_won >= req_sets or match.team_b_sets_won >= req_sets:
                    match.status = "completed"
                    match.end_time = now_str
                    match.winner_team_id = match.team_a_id if match.team_a_sets_won >= req_sets else match.team_b_id
                    match_finished = True
                else:
                    match.current_set_number += 1
                    match.team_a_timeouts_remaining = 2
                    match.team_b_timeouts_remaining = 2
                    
                    next_set = MatchSet(
                        match_id=match.id,
                        set_number=match.current_set_number,
                        team_a_score=0,
                        team_b_score=0,
                        status="live",
                        start_time=now_str
                    )
                    db.add(next_set)
                    db.flush()

            event_type = "set_won" if set_winner else "point"
            if match_finished:
                event_type = "match_finish"
                
            scoring_team_name = match.team_a.name if (scoring_team == "team_a" and match.team_a) else (match.team_b.name if match.team_b else scoring_team)
            event_detail = f"Point scored by {scoring_team_name}"
            if set_winner:
                event_detail += f" - Set {current_set.set_number} won!"
            if match_finished:
                event_detail += f" - Match won by {scoring_team_name}!"

            event = ScoringEvent(
                match_id=match.id,
                set_number=current_set.set_number,
                event_type=event_type,
                team_awarded=scoring_team,
                team_a_score_after=current_set.team_a_score,
                team_b_score_after=current_set.team_b_score,
                serving_team_after=match.current_serving_team,
                team_a_rotation_after=match.team_a_rotation,
                team_b_rotation_after=match.team_b_rotation,
                snapshot_json=pre_snapshot,
                details=details or event_detail
            )
            db.add(event)
            db.commit()
            db.refresh(match)
            return match

        raise HTTPException(status_code=400, detail=f"Unsupported scoring action: {action}")

    @classmethod
    def _create_state_snapshot(cls, match: Match, current_set: MatchSet) -> Dict[str, Any]:
        return {
            "match_status": match.status,
            "winner_team_id": match.winner_team_id,
            "current_set_number": match.current_set_number,
            "team_a_sets_won": match.team_a_sets_won,
            "team_b_sets_won": match.team_b_sets_won,
            "current_serving_team": match.current_serving_team,
            "team_a_timeouts_remaining": match.team_a_timeouts_remaining,
            "team_b_timeouts_remaining": match.team_b_timeouts_remaining,
            "team_a_rotation": match.team_a_rotation,
            "team_b_rotation": match.team_b_rotation,
            "set_id": current_set.id if current_set else None,
            "set_number": current_set.set_number if current_set else 1,
            "team_a_score": current_set.team_a_score if current_set else 0,
            "team_b_score": current_set.team_b_score if current_set else 0,
            "set_status": current_set.status if current_set else "live",
            "set_winning_team_id": current_set.winning_team_id if current_set else None,
            "team_a_timeouts_used": current_set.team_a_timeouts_used if current_set else 0,
            "team_b_timeouts_used": current_set.team_b_timeouts_used if current_set else 0,
            "team_a_subs_used": current_set.team_a_subs_used if current_set else 0,
            "team_b_subs_used": current_set.team_b_subs_used if current_set else 0
        }

    @classmethod
    def _perform_undo(cls, db: Session, match: Match) -> Match:
        last_event = db.query(ScoringEvent).filter(
            ScoringEvent.match_id == match.id
        ).order_by(ScoringEvent.id.desc()).first()

        if not last_event:
            raise HTTPException(status_code=400, detail="No scoring actions to undo.")

        snapshot = last_event.snapshot_json
        if not snapshot:
            db.delete(last_event)
            db.commit()
            db.refresh(match)
            return match

        if snapshot.get("current_set_number", match.current_set_number) < match.current_set_number:
            extra_set = db.query(MatchSet).filter(
                MatchSet.match_id == match.id,
                MatchSet.set_number == match.current_set_number
            ).first()
            if extra_set:
                db.delete(extra_set)

        match.status = snapshot.get("match_status", match.status)
        match.winner_team_id = snapshot.get("winner_team_id", None)
        match.current_set_number = snapshot.get("current_set_number", match.current_set_number)
        match.team_a_sets_won = snapshot.get("team_a_sets_won", match.team_a_sets_won)
        match.team_b_sets_won = snapshot.get("team_b_sets_won", match.team_b_sets_won)
        match.current_serving_team = snapshot.get("current_serving_team", match.current_serving_team)
        match.team_a_timeouts_remaining = snapshot.get("team_a_timeouts_remaining", match.team_a_timeouts_remaining)
        match.team_b_timeouts_remaining = snapshot.get("team_b_timeouts_remaining", match.team_b_timeouts_remaining)
        match.team_a_rotation = snapshot.get("team_a_rotation", match.team_a_rotation)
        match.team_b_rotation = snapshot.get("team_b_rotation", match.team_b_rotation)

        set_id = snapshot.get("set_id")
        if set_id:
            target_set = db.query(MatchSet).filter(MatchSet.id == set_id).first()
            if target_set:
                target_set.team_a_score = snapshot.get("team_a_score", target_set.team_a_score)
                target_set.team_b_score = snapshot.get("team_b_score", target_set.team_b_score)
                target_set.status = snapshot.get("set_status", "live")
                target_set.winning_team_id = snapshot.get("set_winning_team_id", None)
                target_set.team_a_timeouts_used = snapshot.get("team_a_timeouts_used", target_set.team_a_timeouts_used)
                target_set.team_b_timeouts_used = snapshot.get("team_b_timeouts_used", target_set.team_b_timeouts_used)
                target_set.team_a_subs_used = snapshot.get("team_a_subs_used", target_set.team_a_subs_used)
                target_set.team_b_subs_used = snapshot.get("team_b_subs_used", target_set.team_b_subs_used)

        db.delete(last_event)
        db.commit()
        db.refresh(match)
        return match
