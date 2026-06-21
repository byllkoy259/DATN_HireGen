import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    notification_type: str | None = None
    action_url: str | None = None
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)