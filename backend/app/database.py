"""
database.py
------------
Sets up the SQLAlchemy engine, session factory, and declarative Base.

Why SQLite:
The assignment asks for SQLite. SQLAlchemy gives us an ORM layer so the
rest of the app (models.py, routers) never has to write raw SQL.

`check_same_thread=False` is required because FastAPI can serve a single
request across multiple threads/async tasks, but SQLite by default only
allows the thread that created the connection to use it.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The .db file will be created in the backend/ folder the first time the app runs.
SQLALCHEMY_DATABASE_URL = "sqlite:///./zoom_clone.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Each instance of SessionLocal is a database session (a "conversation" with the DB).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models (in models.py) inherit from this Base class.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency: opens a DB session for a single request,
    yields it to the route function, and always closes it afterwards
    (even if the route raises an exception).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
