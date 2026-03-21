"""add unique constraint on display_name

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the old admin seed user and its related data
    op.execute("""
        DELETE FROM audit_log WHERE actor_id IN (
            SELECT id FROM users WHERE email = 'admin@soundcloud-discuss.com'
        )
    """)
    op.execute("""
        DELETE FROM posts WHERE author_id IN (
            SELECT id FROM users WHERE email = 'admin@soundcloud-discuss.com'
        )
    """)
    op.execute("""
        DELETE FROM track_moderators WHERE user_id IN (
            SELECT id FROM users WHERE email = 'admin@soundcloud-discuss.com'
        )
    """)
    op.execute("DELETE FROM users WHERE email = 'admin@soundcloud-discuss.com'")
    op.create_index(op.f('ix_users_display_name'), 'users', ['display_name'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_display_name'), table_name='users')
