from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Employee


def test_employee_model_fields():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    emp = Employee(name="Ada Lovelace", department="Engineering", start_date=date(2024, 1, 1))
    db.add(emp)
    db.commit()
    db.refresh(emp)

    assert emp.id is not None
    assert emp.name == "Ada Lovelace"
    assert emp.department == "Engineering"
    assert emp.start_date == date(2024, 1, 1)
