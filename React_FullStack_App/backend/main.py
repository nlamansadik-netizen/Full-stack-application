import os
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from pydantic import BaseModel, Field
from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection

# Load values from .env when present.
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "intern_story_app")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
SEED_USER_USERNAME = os.getenv("SEED_USER_USERNAME", "intern")
SEED_USER_PASSWORD = os.getenv("SEED_USER_PASSWORD", "intern123")
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# Use a pure-passlib scheme to avoid bcrypt backend issues on newer Python versions.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]
users_collection: Collection = db["users"]
stories_collection: Collection = db["stories"]

app = FastAPI(title="Intern Story App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6, max_length=120)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    username: str


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=1000)
    category: str = Field(min_length=1, max_length=50)


class StoryResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    createdAt: str
    createdBy: str


class StoryListResponse(BaseModel):
    items: list[StoryResponse]
    totalMatched: int
    returnedCount: int


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, UnknownHashError):
        # If old/unsupported hash formats exist, treat as invalid credentials.
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize_story(story: dict[str, Any]) -> StoryResponse:
    return StoryResponse(
        id=str(story["_id"]),
        title=story["title"],
        description=story["description"],
        category=story["category"],
        createdAt=story["createdAt"].isoformat(),
        createdBy=story["createdBy"],
    )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = users_collection.find_one({"username": username})
    if user is None:
        raise credentials_exception

    return user


@app.on_event("startup")
def startup_seed_user() -> None:
    users_collection.create_index("username", unique=True)
    stories_collection.create_index("createdByUserId")

    existing_user = users_collection.find_one({"username": SEED_USER_USERNAME})
    if existing_user is None:
        users_collection.insert_one(
            {
                "username": SEED_USER_USERNAME,
                "hashed_password": hash_password(SEED_USER_PASSWORD),
                "createdAt": datetime.now(timezone.utc),
            }
        )
        return

    # Keep the teaching account deterministic across hash-scheme changes.
    should_rotate_seed_hash = not verify_password(
        SEED_USER_PASSWORD, existing_user.get("hashed_password", "")
    )
    if should_rotate_seed_hash:
        users_collection.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {"hashed_password": hash_password(SEED_USER_PASSWORD)}},
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/register", response_model=MeResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> MeResponse:
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")

    insert_result = users_collection.insert_one(
        {
            "username": username,
            "hashed_password": hash_password(payload.password),
            "createdAt": datetime.now(timezone.utc),
        }
    )

    return MeResponse(id=str(insert_result.inserted_id), username=username)


@app.post("/api/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = users_collection.find_one({"username": payload.username.strip()})
    if not user or not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(subject=user["username"])
    return TokenResponse(access_token=token)


@app.get("/api/me", response_model=MeResponse)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=str(current_user["_id"]), username=current_user["username"])


@app.get("/api/stories", response_model=StoryListResponse)
def list_stories(
    category: str | None = None,
    q: str | None = None,
    sort: str = Query("newest"),
    limit: int = Query(50, ge=1, le=50),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StoryListResponse:
    filters: dict[str, Any] = {
        "createdByUserId": str(current_user["_id"])
    }

    if category and category.strip():
        filters["category"] = category.strip()

    if q and q.strip():
        keyword = q.strip()
        filters["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"description": {"$regex": keyword, "$options": "i"}},
        ]

    if sort not in {"newest", "oldest"}:
        raise HTTPException(
            status_code=400,
            detail="sort must be 'newest' or 'oldest'",
        )

    sort_direction = -1 if sort == "newest" else 1

    total_matched = stories_collection.count_documents(filters)

    cursor = (
        stories_collection.find(filters)
        .sort("createdAt", sort_direction)
        .limit(limit)
    )

    stories = [serialize_story(story) for story in cursor]

    return StoryListResponse(
        items=stories,
        totalMatched=total_matched,
        returnedCount=len(stories),
    )


@app.post("/api/stories", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
def create_story(
    payload: StoryCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StoryResponse:
    doc = {
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "createdAt": datetime.now(timezone.utc),
        "createdBy": current_user["username"],
        "createdByUserId": str(current_user["_id"]),
    }
    insert_result = stories_collection.insert_one(doc)
    created_story = stories_collection.find_one({"_id": insert_result.inserted_id})
    if created_story is None:
        raise HTTPException(status_code=500, detail="Story was not saved")
    return serialize_story(created_story)


@app.get("/api/stories/{story_id}", response_model=StoryResponse)
def get_story(
    story_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StoryResponse:
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=404, detail="Story not found")

    story = stories_collection.find_one(
        {
            "_id": ObjectId(story_id),
            "createdByUserId": str(current_user["_id"]),
        }
    )
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    return serialize_story(story)


@app.put("/api/stories/{story_id}", response_model=StoryResponse)
def update_story(
    story_id: str,
    payload: StoryCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> StoryResponse:
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=404, detail="Story not found")

    updated_story = stories_collection.find_one_and_update(
        {
            "_id": ObjectId(story_id),
            "createdByUserId": str(current_user["_id"]),
        },
        {
            "$set": {
                "title": payload.title,
                "description": payload.description,
                "category": payload.category,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated_story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    return serialize_story(updated_story)