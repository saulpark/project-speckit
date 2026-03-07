import json
import secrets
from typing import Optional
from app.models import Note
from app.extensions import db


class NoteService:
    """Service layer for Note CRUD operations"""

    MAX_CONTENT_SIZE = 2 * 1024 * 1024  # 2 MB

    @staticmethod
    def create_note(user_id: int, title: str, content_delta: str) -> Note:
        """
        Creates a new note with validation.

        Args:
            user_id: ID of the note owner
            title: Note title
            content_delta: Quill Delta JSON string

        Returns:
            Note instance

        Raises:
            ValueError: If content is invalid or too large
        """
        # Validate JSON
        try:
            json.loads(content_delta)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON content")

        # Check size
        if len(content_delta.encode('utf-8')) > NoteService.MAX_CONTENT_SIZE:
            raise ValueError("Content exceeds maximum size of 2 MB")

        note = Note(
            user_id=user_id,
            title=title,
            content_delta=content_delta
        )
        db.session.add(note)
        db.session.commit()
        return note

    @staticmethod
    def get_note_by_id(note_id: int) -> Optional[Note]:
        """
        Retrieves a single note by ID.

        Args:
            note_id: Note ID

        Returns:
            Note instance or None if not found
        """
        return db.session.get(Note, note_id)

    @staticmethod
    def get_all_notes(user_id: int) -> list[Note]:
        """
        Retrieves all notes for a user, ordered by update time descending.

        Args:
            user_id: User ID

        Returns:
            List of Note instances
        """
        return Note.query.filter_by(user_id=user_id).order_by(Note.updated_at.desc()).all()

    @staticmethod
    def update_note(note_id: int, title: str, content_delta: str) -> Note:
        """
        Updates an existing note.

        Args:
            note_id: Note ID
            title: New title
            content_delta: New content (Quill Delta JSON)

        Returns:
            Updated Note instance

        Raises:
            ValueError: If note not found or content invalid
        """
        note = NoteService.get_note_by_id(note_id)
        if not note:
            raise ValueError("Note not found")

        # Validate JSON
        try:
            json.loads(content_delta)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON content")

        # Check size
        if len(content_delta.encode('utf-8')) > NoteService.MAX_CONTENT_SIZE:
            raise ValueError("Content exceeds maximum size of 2 MB")

        note.title = title
        note.content_delta = content_delta
        db.session.commit()
        return note

    @staticmethod
    def delete_note(note_id: int) -> bool:
        """
        Deletes a note.

        Args:
            note_id: Note ID

        Returns:
            True if successful

        Raises:
            ValueError: If note not found
        """
        note = NoteService.get_note_by_id(note_id)
        if not note:
            raise ValueError("Note not found")

        db.session.delete(note)
        db.session.commit()
        return True

    @staticmethod
    def share_note(note_id: int) -> str:
        """
        Generates share token and enables sharing.

        Args:
            note_id: Note ID

        Returns:
            Generated share_token

        Raises:
            ValueError: If note not found
        """
        note = NoteService.get_note_by_id(note_id)
        if not note:
            raise ValueError("Note not found")

        note.is_shared = True
        if not note.share_token:
            note.share_token = secrets.token_urlsafe(32)
        db.session.commit()
        return note.share_token

    @staticmethod
    def unshare_note(note_id: int) -> bool:
        """
        Disables sharing and clears token.

        Args:
            note_id: Note ID

        Returns:
            True if successful

        Raises:
            ValueError: If note not found
        """
        note = NoteService.get_note_by_id(note_id)
        if not note:
            raise ValueError("Note not found")

        note.is_shared = False
        db.session.commit()
        return True

    @staticmethod
    def get_note_by_token(share_token: str) -> Optional[Note]:
        """
        Retrieves a shared note by its public token.

        Args:
            share_token: Public share token

        Returns:
            Note instance if shared and token matches, else None
        """
        note = Note.query.filter_by(share_token=share_token, is_shared=True).first()
        return note
