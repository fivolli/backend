from pydantic import BaseModel
from typing import Optional
from typing import Literal, List
from datetime import datetime


class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str = "user"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PushTokenIn(BaseModel):
    token: str
    platform: Optional[str] = None


class PushTestIn(BaseModel):
    title: Optional[str] = None
    body: str


class NotificationPrefsIn(BaseModel):
    sos: bool
    volunteers: bool
    updates: bool


class MeResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: str
    role: str


class UpdateMeRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class CreateHelpRequest(BaseModel):
    kind: str
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    severity: Optional[str] = None  


class HelpRequestResponse(BaseModel):
    id: int
    status: str


class HelpRequestItem(BaseModel):
    id: int
    kind: str
    status: str
    created_at: datetime
    volunteer_name: Optional[str] = None
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    accepted_by: Optional[int] = None
    accepted_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    in_progress_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    reaction_minutes: Optional[int] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    reviewed_at: Optional[datetime] = None



    class Config:
        from_attributes = True


class HelpRequestDetail(BaseModel):
    id: int
    kind: str
    status: str
    created_at: datetime
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    accepted_by: Optional[int] = None
    accepted_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_phone: Optional[str] = None
    volunteer_lat: Optional[float] = None
    volunteer_lng: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    in_progress_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    reaction_minutes: Optional[int] = None
    rating: Optional[int] = None
    review_text: Optional[str] = None
    reviewed_at: Optional[datetime] = None



    class Config:
        from_attributes = True


class UpdateRequestStatus(BaseModel):
    status: str


class VolunteerApplyResponse(BaseModel):
    ok: bool = True


class OpenRequestItem(BaseModel):
    id: int
    kind: str
    status: str
    created_at: datetime
    user_name: Optional[str] = None
    severity: Optional[str] = None
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True


class AcceptRequestResponse(BaseModel):
    id: int
    status: str
    accepted_by: Optional[int] = None


class VolunteerMyItem(BaseModel):
    id: int
    kind: str
    status: str
    created_at: datetime
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    accepted_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    in_progress_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None


    class Config:
        from_attributes = True


class VolunteerUpdateStatus(BaseModel):
    status: str


class VolunteerRequestDetail(BaseModel):
    id: int
    user_id: int
    kind: str
    status: str
    created_at: datetime
    severity: Optional[str] = None
    symptoms: Optional[str] = None
    comments: Optional[str] = None
    accepted_by: Optional[int] = None
    accepted_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    in_progress_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None


    class Config:
        from_attributes = True

class CreateReview(BaseModel):
    rating: int
    review_text: Optional[str] = None

class VolunteerRating(BaseModel):
    volunteer_id: int
    avg_rating: float
    reviews_count: int


class ReviewFeedItem(BaseModel):
    request_id: int
    rating: int
    review_text: Optional[str] = None
    reviewed_at: datetime

    volunteer_id: int
    volunteer_name: Optional[str] = None

    user_id: int
    user_name: Optional[str] = None

    kind: str

class VolunteerReviewItem(BaseModel):
    request_id: int
    rating: int
    review_text: Optional[str] = None
    reviewed_at: datetime
    user_id: int
    user_name: Optional[str] = None
    kind: str

    
class ReviewsStats(BaseModel):
    avg_rating: float
    reviews_count: int

class LocationIn(BaseModel):
    volunteer_lat: float
    volunteer_lng: float

class LocationUpdateResponse(BaseModel):
    ok: bool = True

class HospitalItem(BaseModel):
    name: str
    lat: float
    lng: float
    distance_km: float
    address: Optional[str] = None
    phone: Optional[str] = None
    osm_type: Optional[str] = None
    osm_id: Optional[int] = None


class ChatSendIn(BaseModel):
    text: str


class ChatMessageOut(BaseModel):
    id: int
    request_id: int
    sender_id: int
    sender_role: str
    sender_name: Optional[str] = None
    text: str
    created_at: datetime


class VolunteerGeoUpdate(BaseModel):
    volunteer_lat: float
    volunteer_lng: float

class NearbyVolunteer(BaseModel):
    id: int
    name: str
    phone: str
    lat: float
    lng: float
    distance_km: float
    online_minutes_ago: int

class NearbyRequest(BaseModel):
    id: int
    kind: str
    severity: Optional[str] = None
    lat: float
    lng: float
    distance_km: float
    created_minutes_ago: int
    marker_color: str  
    address: Optional[str] = None
    symptoms: Optional[str] = None

class GeoSearchParams(BaseModel):
    lat: float
    lng: float
    radius_km: float = 5.0
    limit: int = 20


class VideoItem(BaseModel):
    id: int
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None


class AiHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class AiTriageIn(BaseModel):
    text: str
    lang: Optional[Literal["ru", "en", "ky", "kg"]] = None
    history: Optional[List[AiHistoryItem]] = None


class AiTriageOut(BaseModel):
    answer: str


class AiJobCreateOut(BaseModel):
    job_id: int
    status: Literal["pending", "processing", "done", "failed"]


class AiJobStatusOut(BaseModel):
    job_id: int
    status: Literal["pending", "processing", "done", "failed"]
    answer: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None



