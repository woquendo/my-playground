/**
 * Migration: 20251113000002_add_user_roles
 * 
 * Adds role-based access control (RBAC) to the users table.
 * Enables differentiation between standard users and administrators.
 * 
 * Roles:
 * - 'user': Standard access (default)
 * - 'admin': Administrative access with full permissions
 */

/**
 * Run migration (up)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function up(connection) {
    // Add role column to users table
    await connection.query(`
        ALTER TABLE users 
        ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' 
        COMMENT 'User role: user (standard access) or admin (full access)' 
        AFTER bio;
    `);

    // Update dev user to admin role
    await connection.query(`
        UPDATE users 
        SET role = 'admin' 
        WHERE username = 'devuser'
        LIMIT 1;
    `);

    // Add index on role for efficient filtering
    await connection.query(`
        ALTER TABLE users 
        ADD INDEX idx_role (role);
    `);
}

/**
 * Rollback migration (down)
 * @param {import('mysql2/promise').Connection} connection
 */
export async function down(connection) {
    // Remove role index
    await connection.query(`
        ALTER TABLE users 
        DROP INDEX idx_role;
    `);

    // Remove role column
    await connection.query(`
        ALTER TABLE users 
        DROP COLUMN role;
    `);
}
