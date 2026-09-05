from sqlalchemy.orm import Session
from models import Flight
from schemas import FlightOut


def list_flights(db: Session) -> list[FlightOut]:
    """List all available flights."""
    flights = db.query(Flight).all()
    return [FlightOut.model_validate(f) for f in flights]


def get_flight_by_id(db: Session, flight_id: int) -> FlightOut | None:
    """Get a flight by its ID."""
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    return FlightOut.model_validate(flight) if flight else None