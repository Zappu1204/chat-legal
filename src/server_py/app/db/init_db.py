from sqlalchemy.orm import Session
from sqlalchemy import inspect
from app.db.database import SessionLocal, engine, Base
from app.db.db_setup import create_tables
from app.models.models import Role, User
from app.core.config import settings
from app.core.security import get_password_hash
import logging

logger = logging.getLogger(__name__)

def check_connection():
    """
    Check if the database connection is working
    """
    try:
        # Try to connect to the database
        with engine.connect() as connection:
            logger.info(f"Successfully connected to database '{settings.POSTGRES_DB}'")
            return True
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return False

def check_tables_exist():
    """
    Check if all required tables exist in the database
    """
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        required_tables = ['users', 'roles', 'user_roles', 'chats', 'messages', 'refresh_tokens']
        
        missing_tables = [table for table in required_tables if table not in existing_tables]
        
        if missing_tables:
            logger.info(f"Missing tables: {', '.join(missing_tables)}. Will create all tables.")
            return False
        else:
            logger.info("All required tables exist in the database.")
            return True
    except Exception as e:
        logger.error(f"Error checking tables: {e}")
        return False

# Create tables if they don't exist
def init_db():
    """Initialize the database with tables and initial data"""
    # Check database connection first
    if not check_connection():
        logger.error("Database connection failed. Cannot initialize database.")
        raise ConnectionError("Failed to connect to the database. Please check your database configuration.")
    
    # Use the new create_tables function to ensure tables exist
    tables_created = create_tables()
    if not tables_created:
        logger.error("Failed to create tables. Database initialization cannot proceed.")
        raise RuntimeError("Failed to create database tables. Please check logs for details.")
    
    # Create roles and admin user
    db = SessionLocal()
    try:
        create_initial_roles(db)
        create_first_admin_user(db)
        db.commit()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()
    
    logger.info("Database initialization completed")

def create_initial_roles(db: Session):
    """Create initial roles if they don't exist"""
    # Check if roles exist
    roles = db.query(Role).all()
    
    if not roles:
        logger.info("Creating initial roles...")
        admin_role = Role(name="ROLE_ADMIN", description="Administrator with full access")
        user_role = Role(name="ROLE_USER", description="Regular user")
        moderator_role = Role(name="ROLE_MODERATOR", description="Moderator with elevated permissions")
        
        db.add_all([admin_role, user_role, moderator_role])
        db.commit()
        logger.info("Initial roles created successfully")
    else:
        logger.info(f"Found {len(roles)} existing roles, skipping role creation")

def create_first_admin_user(db: Session):
    """Create the first admin user if no admin exists"""
    # Check if admin user exists
    admin_role = db.query(Role).filter(Role.name == "ROLE_ADMIN").first()
    
    if not admin_role:
        logger.error("Admin role not found. Cannot create admin user.")
        return
    
    admin_exists = db.query(User).join(User.roles).filter(Role.name == "ROLE_ADMIN").first()
    
    if not admin_exists:
        logger.info("Creating first admin user...")
        
        hashed_password = get_password_hash(settings.FIRST_ADMIN_PASSWORD)
        admin_user = User(
            username=settings.FIRST_ADMIN_USERNAME,
            email=settings.FIRST_ADMIN_EMAIL,
            password=hashed_password,
            is_active=True
        )
        
        # Add admin role
        admin_user.roles = [admin_role]
        
        db.add(admin_user)
        db.commit()
        logger.info(f"First admin user created: {settings.FIRST_ADMIN_USERNAME}")
    else:
        logger.info(f"Admin user already exists: {admin_exists.username}")