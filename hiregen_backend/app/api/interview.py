import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import User, Application, JobDescription, Interview, Notification
from app.schemas.interview import InterviewCreate, InterviewResponse
from app.api.deps import get_current_hr

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    interview_in: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_hr: User = Depends(get_current_hr)
):
    app_result = await db.execute(
        select(Application)
        .join(JobDescription, Application.job_id == JobDescription.id)
        .where(
            Application.id == interview_in.application_id,
            JobDescription.hr_id == current_hr.id
        )
    )
    application = app_result.scalars().first()

    if not application:
        raise HTTPException(
            status_code=403,
            detail="Không tìm thấy đơn ứng tuyển, hoặc bạn không có quyền lên lịch phỏng vấn này."
        )

    new_interview = Interview(
        application_id=interview_in.application_id,
        hr_id=current_hr.id,
        scheduled_time=interview_in.scheduled_time.replace(tzinfo=None),
        meeting_link=interview_in.meeting_link,
        notes=interview_in.notes
    )
    db.add(new_interview)

    application.status = "interviewing"

    from datetime import timedelta
    local_time = interview_in.scheduled_time + timedelta(hours=7)
    formatted_time = local_time.strftime('%H:%M %d/%m/%Y')

    notification = Notification(
        user_id=application.candidate_id,
        title="Bạn có một lịch phỏng vấn mới!",
        message=f"Nhà tuyển dụng đã lên lịch phỏng vấn với bạn vào lúc {formatted_time}. Vui lòng kiểm tra chi tiết."
    )
    db.add(notification)

    await db.commit()
    await db.refresh(new_interview)
    return new_interview

from app.api.deps import get_current_user

@router.get("/candidate/me", response_model=List[InterviewResponse])
async def get_my_interviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Interview)
        .join(Application, Interview.application_id == Application.id)
        .where(Application.candidate_id == current_user.id)
        .order_by(Interview.scheduled_time.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()