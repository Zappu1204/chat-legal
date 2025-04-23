from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import psycopg2
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def check_and_create_database():
    """
    Check if the database exists, and create it if it doesn't
    """
    # Connect to PostgreSQL default database
    connection_string = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres"
    
    try:
        logger.info(f"Checking if database '{settings.POSTGRES_DB}' exists...")
        
        # Connect to the PostgreSQL server (using default 'postgres' database)
        conn = psycopg2.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database="postgres"
        )
        
        # Set autocommit mode to create database
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{settings.POSTGRES_DB}'")
        exists = cursor.fetchone()
        
        if not exists:
            logger.info(f"Database '{settings.POSTGRES_DB}' does not exist. Creating...")
            cursor.execute(f"CREATE DATABASE {settings.POSTGRES_DB}")
            logger.info(f"Database '{settings.POSTGRES_DB}' created successfully!")
        else:
            logger.info(f"Database '{settings.POSTGRES_DB}' already exists.")
        
        cursor.close()
        conn.close()
        
        # Log successful connection
        logger.info(f"Connection to PostgreSQL server at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT} successful!")
        return True
        
    except Exception as e:
        logger.error(f"Error connecting to PostgreSQL server or creating database: {e}")
        return False

# Try to create database if needed
database_ready = check_and_create_database()
if not database_ready:
    logger.warning("Unable to verify database existence or create it. Proceeding with configured connection.")

# Create SQLAlchemy engine
engine = create_engine(settings.get_database_uri)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()