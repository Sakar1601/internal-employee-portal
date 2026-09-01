from datetime import date

from pydantic import BaseModel, ConfigDict


class EmployeeBase(BaseModel):
    name: str
    department: str
    start_date: date


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(EmployeeBase):
    pass


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
