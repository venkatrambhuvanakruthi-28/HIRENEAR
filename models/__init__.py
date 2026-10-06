from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User
from .job import Job
from .application import Application
from .saved_job import SavedJob
from .notification import Notification

__all__ = ['db', 'User', 'Job', 'Application', 'SavedJob', 'Notification']
