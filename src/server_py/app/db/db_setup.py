import time
import logging
from sqlalchemy import inspect
from app.db.database import engine, Base, check_and_create_database
from app.core.config import settings

logger = logging.getLogger(__name__)

def ensure_database_exists():
    """Ensure that the database exists before attempting to create tables"""
    retry_count = 0
    max_retries = 5
    
    while retry_count < max_retries:
        if check_and_create_database():
            logger.info(f"Database '{settings.POSTGRES_DB}' is ready.")
            return True
        
        retry_count += 1
        wait_time = retry_count * 2
        logger.warning(f"Failed to create/verify database. Retrying in {wait_time} seconds... ({retry_count}/{max_retries})")
        time.sleep(wait_time)
    
    logger.error(f"Failed to create/verify database after {max_retries} attempts.")
    return False

def create_tables():
    """Create all tables defined in models"""
    try:
        # Ensure database exists first
        if not ensure_database_exists():
            logger.error("Cannot create tables: database not available")
            return False
            
        # Check if tables already exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            logger.info(f"Found existing tables: {', '.join(existing_tables)}")
        else:
            logger.info("No existing tables found. Creating all tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        logger.info(f"Tables in database: {', '.join(created_tables)}")
        
        # Verify specific required tables
        required_tables = ['users', 'roles', 'user_roles', 'chats', 'messages', 'refresh_tokens']
        missing_tables = [table for table in required_tables if table not in created_tables]
        
        if missing_tables:
            logger.error(f"Failed to create some tables: {', '.join(missing_tables)}")
            return False
        else:
            logger.info("All required tables created successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False