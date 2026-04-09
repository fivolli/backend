from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean
from sqlalchemy.sql import func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    allergies = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String, nullable=False, default="user")
    
    volunteer_lat = Column(Float, nullable=True)
    volunteer_lng = Column(Float, nullable=True)
    volunteer_online_at = Column(DateTime(timezone=True), nullable=True)

class HelpRequest(Base):
    __tablename__ = "help_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    kind = Column(String, nullable=False)
    symptoms = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    

    severity = Column(String, nullable=True)  

    accepted_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)


    volunteer_lat = Column(Float, nullable=True)
    volunteer_lng = Column(Float, nullable=True)

    in_progress_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)

    rating = Column(Integer, nullable=True)
    review_text = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)




class PushToken(Base):
    __tablename__ = "push_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    token = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NotificationPrefs(Base):
    __tablename__ = "notification_prefs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    sos = Column(Boolean, nullable=False, default=True)
    volunteers = Column(Boolean, nullable=False, default=True)
    updates = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("help_requests.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AiJob(Base):
    __tablename__ = "ai_jobs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    lang = Column(String, nullable=False, default="ru")
    text = Column(Text, nullable=False)
    history_json = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending", index=True)  # pending|processing|done|failed
    answer = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)




