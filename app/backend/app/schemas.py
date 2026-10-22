from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

# Lengths mirror the String(200) / String(100) columns in models.py, so an
# over-long value is a 422 here instead of a database error (HTTP 500) on Postgres.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Department = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class EmployeeBase(BaseModel):
    name: Name
    department: Department
    start_date: date


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(EmployeeBase):
    pass


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
