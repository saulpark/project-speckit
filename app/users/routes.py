from flask import render_template, request, redirect, url_for, flash, abort
from flask_login import login_required, current_user
from app.users import bp
from app.services.user_service import UserService


def _ensure_own_user(id):
    """Abort 403 if the requested user ID is not the current user."""
    if id != current_user.id:
        abort(403)


@bp.route('/<int:id>')
@login_required
def view_user(id):
    """View own profile."""
    _ensure_own_user(id)
    user = UserService.get_user_by_id(id)
    if not user:
        abort(404)

    note_count = len(user.notes)
    return render_template('users/view.html', user=user, note_count=note_count)


@bp.route('/<int:id>/password', methods=['GET'])
@login_required
def edit_password(id):
    """Show change password form."""
    _ensure_own_user(id)
    user = UserService.get_user_by_id(id)
    if not user:
        abort(404)

    return render_template('users/password.html', user=user)


@bp.route('/<int:id>/password', methods=['POST'])
@login_required
def update_password(id):
    """Update own password."""
    _ensure_own_user(id)

    old_password = request.form.get('old_password', '')
    new_password = request.form.get('new_password', '')
    confirm_password = request.form.get('confirm_password', '')

    if not old_password or not new_password:
        flash('All fields are required', 'danger')
        return redirect(url_for('users.edit_password', id=id))

    if new_password != confirm_password:
        flash('New passwords do not match', 'danger')
        return redirect(url_for('users.edit_password', id=id))

    try:
        UserService.update_password(id, old_password, new_password)
        flash('Password updated successfully', 'success')
        return redirect(url_for('users.view_user', id=id))
    except ValueError as e:
        flash(str(e), 'danger')
        return redirect(url_for('users.edit_password', id=id))
