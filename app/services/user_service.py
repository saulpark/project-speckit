from typing import Optional
from app.models import User
from app.extensions import db


class UserService:
    """Service layer for User operations"""

    @staticmethod
    def create_user(email: str, password: str) -> User:
        """
        Creates a new user.

        Args:
            email: User email (unique)
            password: Plain text password (will be hashed)

        Returns:
            User instance

        Raises:
            ValueError: If email already exists or invalid
        """
        # Check if user already exists
        existing_user = UserService.get_user_by_email(email)
        if existing_user:
            raise ValueError("Email already registered")

        # Validate email format
        if not email or '@' not in email:
            raise ValueError("Invalid email format")

        # Validate password
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[User]:
        """
        Retrieves a user by ID.

        Args:
            user_id: User ID

        Returns:
            User instance or None if not found
        """
        return db.session.get(User, user_id)

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """
        Retrieves a user by email.

        Args:
            email: User email

        Returns:
            User instance or None if not found
        """
        return User.query.filter_by(email=email).first()

    @staticmethod
    def authenticate(email: str, password: str) -> Optional[User]:
        """
        Authenticates a user by email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            User instance if credentials valid, None otherwise
        """
        user = UserService.get_user_by_email(email)
        if user and user.check_password(password):
            return user
        return None

    @staticmethod
    def update_password(user_id: int, old_password: str, new_password: str) -> bool:
        """
        Updates a user's password.

        Args:
            user_id: User ID
            old_password: Current password for verification
            new_password: New password

        Returns:
            True if successful

        Raises:
            ValueError: If user not found, old password incorrect, or new password invalid
        """
        user = UserService.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.check_password(old_password):
            raise ValueError("Current password is incorrect")

        if not new_password or len(new_password) < 6:
            raise ValueError("New password must be at least 6 characters")

        user.set_password(new_password)
        db.session.commit()
        return True

    @staticmethod
    def delete_user(user_id: int) -> bool:
        """
        Deletes a user (and all their notes via cascade).

        Args:
            user_id: User ID

        Returns:
            True if successful

        Raises:
            ValueError: If user not found
        """
        user = UserService.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        db.session.delete(user)
        db.session.commit()
        return True

    @staticmethod
    def get_all_users() -> list[User]:
        """
        Retrieves all users (admin function).

        Returns:
            List of User instances
        """
        return User.query.order_by(User.created_at.desc()).all()
