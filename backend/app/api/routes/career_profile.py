from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.career_profile import CareerProfile
from app.models.project import Project
from app.models.skill import Skill
from app.models.experience import Experience
from app.models.education import Education
from app.models.achievement import Achievement
from app.schemas.career_profile import CareerProfileResponse, CareerProfileUpdate
from app.schemas.project import ProjectResponse, ProjectCreate, ProjectUpdate
from app.schemas.skill import SkillResponse, SkillCreate
from app.schemas.experience import ExperienceResponse, ExperienceCreate, ExperienceUpdate
from app.schemas.education import EducationResponse, EducationCreate
from app.schemas.achievement import AchievementResponse, AchievementCreate

router = APIRouter(prefix="/profile", tags=["Career Profile"])

@router.get("/", response_model=CareerProfileResponse)
async def get_career_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

@router.patch("/", response_model=CareerProfileResponse)
async def update_career_profile(data: CareerProfileUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile

# Projects
@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).filter(Project.user_id == current_user.id))
    return result.scalars().all()

@router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    prof = res.scalars().first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile not found")
    proj = Project(**data.model_dump(), user_id=current_user.id, profile_id=prof.id)
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).filter(Project.id == project_id, Project.user_id == current_user.id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(proj, k, v)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).filter(Project.id == project_id, Project.user_id == current_user.id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(proj)
    await db.commit()
    return {"ok": True}

# Skills
@router.get("/skills", response_model=List[SkillResponse])
async def list_skills(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Skill).filter(Skill.user_id == current_user.id))
    return result.scalars().all()

@router.post("/skills", response_model=SkillResponse)
async def create_skill(data: SkillCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    prof = res.scalars().first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile not found")
    skill = Skill(**data.model_dump(), user_id=current_user.id, profile_id=prof.id)
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill

@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Skill).filter(Skill.id == skill_id, Skill.user_id == current_user.id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.delete(skill)
    await db.commit()
    return {"ok": True}

# Experiences
@router.get("/experiences", response_model=List[ExperienceResponse])
async def list_experiences(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Experience).filter(Experience.user_id == current_user.id))
    return result.scalars().all()

@router.post("/experiences", response_model=ExperienceResponse)
async def create_experience(data: ExperienceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    prof = res.scalars().first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile not found")
    exp = Experience(**data.model_dump(), user_id=current_user.id, profile_id=prof.id)
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.patch("/experiences/{experience_id}", response_model=ExperienceResponse)
async def update_experience(experience_id: int, data: ExperienceUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Experience).filter(Experience.id == experience_id, Experience.user_id == current_user.id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(exp, k, v)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.delete("/experiences/{experience_id}")
async def delete_experience(experience_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Experience).filter(Experience.id == experience_id, Experience.user_id == current_user.id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    await db.delete(exp)
    await db.commit()
    return {"ok": True}

# Education
@router.get("/education", response_model=List[EducationResponse])
async def list_education(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Education).filter(Education.user_id == current_user.id))
    return result.scalars().all()

@router.post("/education", response_model=EducationResponse)
async def create_education(data: EducationCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    prof = res.scalars().first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile not found")
    edu = Education(**data.model_dump(), user_id=current_user.id, profile_id=prof.id)
    db.add(edu)
    await db.commit()
    await db.refresh(edu)
    return edu

@router.delete("/education/{education_id}")
async def delete_education(education_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Education).filter(Education.id == education_id, Education.user_id == current_user.id))
    edu = result.scalars().first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education not found")
    await db.delete(edu)
    await db.commit()
    return {"ok": True}

# Achievements
@router.get("/achievements", response_model=List[AchievementResponse])
async def list_achievements(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Achievement).filter(Achievement.user_id == current_user.id))
    return result.scalars().all()

@router.post("/achievements", response_model=AchievementResponse)
async def create_achievement(data: AchievementCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    prof = res.scalars().first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile not found")
    ach = Achievement(**data.model_dump(), user_id=current_user.id, profile_id=prof.id)
    db.add(ach)
    await db.commit()
    await db.refresh(ach)
    return ach

@router.delete("/achievements/{achievement_id}")
async def delete_achievement(achievement_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Achievement).filter(Achievement.id == achievement_id, Achievement.user_id == current_user.id))
    ach = result.scalars().first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await db.delete(ach)
    await db.commit()
    return {"ok": True}
