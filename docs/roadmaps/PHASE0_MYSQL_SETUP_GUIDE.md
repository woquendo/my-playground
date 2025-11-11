# Phase 0: MySQL Database Setup Guide

**Status:** 📋 PREREQUISITE  
**Required Before:** Phase 1 (Core Infrastructure)  
**Estimated Time:** 30-45 minutes  
**Difficulty:** Beginner-Friendly

---

## 📋 Overview

This guide walks you through installing and configuring MySQL 8.0 on Windows 11 using the native MySQL Installer. This setup is required before beginning Phase 8 (Database Migration), but we're setting it up now so it's ready when needed.

### What You'll Accomplish

- ✅ Install MySQL 8.0 on Windows 11
- ✅ Configure MySQL as a Windows service
- ✅ Install MySQL Workbench (GUI tool)
- ✅ Create development database
- ✅ Set up connection credentials
- ✅ Test database connection
- ✅ Verify Node.js can connect to MySQL

---

## 🎯 Prerequisites

Before starting, ensure you have:

- ✅ Windows 11 (any edition - Home, Pro, or Enterprise)
- ✅ Administrator access on your computer
- ✅ At least 2GB free disk space
- ✅ Internet connection for downloading MySQL
- ✅ Node.js installed (you already have this ✅)
- ✅ Project dependencies installed (`npm install mysql2 dotenv` ✅)

**Note:** This guide uses **Option 1: Native MySQL Installer** - no Docker or virtualization required!

---

## 📥 Step 1: Download MySQL Installer

### 1.1 Navigate to MySQL Download Page

1. Open your browser and go to: https://dev.mysql.com/downloads/installer/
2. You'll see two installer options:
   - **mysql-installer-web-community** (smaller, ~2MB - downloads components during install)
   - **mysql-installer-community** (larger, ~400MB - includes all components)

### 1.2 Choose Installer

**Recommended:** Choose the **web installer** (smaller download)

- Click on **"mysql-installer-web-community-8.x.x.msi"**
- Click **"No thanks, just start my download"** (no Oracle account needed)

### 1.3 Download Location

- Save to your `Downloads` folder
- File name will be similar to: `mysql-installer-web-community-8.0.35.0.msi`

---

## 🔧 Step 2: Install MySQL

### 2.1 Run the Installer

1. Locate the downloaded `.msi` file in your Downloads folder
2. **Right-click** → **Run as administrator**
3. Click **"Yes"** on the User Account Control prompt

### 2.2 Choose Setup Type

The installer will show several setup types:

1. **Developer Default** ⭐ (RECOMMENDED)
   - Includes: MySQL Server, MySQL Workbench, MySQL Shell, connectors
   - Best for development work
   - ~500MB disk space

2. **Server Only**
   - Only MySQL Server (no GUI tools)
   - Minimal installation (~200MB)

3. **Full**
   - All MySQL products
   - ~1.5GB disk space

4. **Custom**
   - Choose specific components

**Choose:** ✅ **Developer Default**

Click **"Next"**

### 2.3 Check Requirements

The installer will check for required software:

- **Microsoft Visual C++ Redistributable**
- **.NET Framework**

If any are missing:
1. The installer will list them
2. Click **"Execute"** to install missing requirements
3. Wait for installation to complete
4. Click **"Next"**

### 2.4 Installation

1. Review the products to be installed:
   - MySQL Server 8.0.x
   - MySQL Workbench 8.0.x
   - MySQL Shell 8.0.x
   - Connector/ODBC
   - Connector/J (Java)
   - Connector/Python
   - MySQL Router
   - Samples and Examples

2. Click **"Execute"** to begin installation
3. Wait while components download and install (5-10 minutes)
4. All items should show green checkmarks when complete
5. Click **"Next"**

---

## ⚙️ Step 3: Configure MySQL Server

### 3.1 Type and Networking

**Config Type:**
- Choose: ✅ **Development Computer**
- This optimizes MySQL for development (less memory usage)

**Connectivity:**
- Port: ✅ **3306** (default - keep this)
- X Protocol Port: ✅ **33060** (default - keep this)
- ✅ Check "Open Windows Firewall ports for network access"

**Advanced Configuration:**
- Keep defaults

Click **"Next"**

### 3.2 Authentication Method

You'll see two options:

1. **Use Strong Password Encryption for Authentication** (RECOMMENDED) ⭐
   - Uses caching_sha2_password (MySQL 8.0 default)
   - More secure
   - Compatible with mysql2 npm package

2. **Use Legacy Authentication Method**
   - Uses mysql_native_password (MySQL 5.x style)
   - Better compatibility with older software

**Choose:** ✅ **Use Strong Password Encryption**

Click **"Next"**

### 3.3 Accounts and Roles

**Root Password:**

This is THE most important step!

1. Enter a password for the MySQL root user
2. **For development, use something simple:** `dev123` or `Dev123!`
3. Re-enter password to confirm

**⚠️ IMPORTANT:** Remember this password! You'll need it in your `.env` file.

**MySQL User Accounts (Optional):**

You can create additional users now or later. For now:
- Skip creating additional users
- Click **"Next"**

### 3.4 Windows Service

**Configure MySQL as Windows Service:**

- ✅ Check "Configure MySQL Server as a Windows Service"
- Service Name: ✅ **MySQL80** (default)
- ✅ Check "Start the MySQL Server at System Startup"
  - This means MySQL will auto-start when Windows boots
- Run Windows Service as: ✅ **Standard System Account**

Click **"Next"**

### 3.5 Server File Permissions

**Grant Full Access to the Data Directory:**

- Choose: ✅ **Yes, grant full access to the user running the Windows Service**

Click **"Next"**

### 3.6 Apply Configuration

1. Review the configuration steps to be executed
2. Click **"Execute"**
3. Wait while configuration completes (1-2 minutes):
   - Writing configuration file
   - Updating Windows Firewall rules
   - Adjusting Windows service
   - Initializing database
   - Starting server
   - Applying security settings
   - Updating Start menu links

4. All steps should show green checkmarks
5. Click **"Finish"**

---

## 🎨 Step 4: Configure MySQL Router (Optional)

The installer may offer to configure MySQL Router:

- For local development: **Skip this step**
- Click **"Next"**

---

## 📋 Step 5: Connect to Server

### 5.1 Connection Check

The installer will test the connection:

1. It will show: "Check that the server is running and you can connect"
2. Username: `root`
3. Password: *(enter the password you set earlier)*
4. Click **"Check"**
5. Should show: ✅ **"Connection succeeded"**
6. Click **"Next"**

---

## ✅ Step 6: Apply Configuration

1. The installer will show final configuration steps
2. Click **"Execute"**
3. Wait for completion
4. Click **"Finish"**

---

## 🎉 Step 7: Complete Installation

1. Installation is complete! 
2. You'll see: "MySQL Server 8.0.x is installed"
3. Click **"Next"**
4. Click **"Finish"**

Optional checkboxes:
- ✅ "Start MySQL Workbench after setup" (recommended to test)

---

## 🔍 Step 8: Verify MySQL Installation

### 8.1 Check MySQL Service

Open PowerShell and run:

```powershell
Get-Service MySQL*
```

**Expected Output:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MySQL80            MySQL80
```

✅ Status should be **"Running"**

### 8.2 Check MySQL Version

```powershell
# Navigate to MySQL bin directory
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Check version
.\mysql --version
```

**Expected Output:**
```
mysql  Ver 8.0.35 for Win64 on x86_64 (MySQL Community Server - GPL)
```

### 8.3 Connect to MySQL via Command Line

```powershell
# Still in the bin directory
.\mysql -u root -p
```

- Press Enter
- Type your root password
- Press Enter

**Expected Output:**
```
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.35 MySQL Community Server - GPL

Copyright (c) 2000, 2023, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
```

✅ You're now connected to MySQL!

### 8.4 Test Basic Commands

At the `mysql>` prompt, try these commands:

```sql
-- Show databases
SHOW DATABASES;

-- Output will show:
-- +--------------------+
-- | Database           |
-- +--------------------+
-- | information_schema |
-- | mysql              |
-- | performance_schema |
-- | sys                |
-- +--------------------+

-- Check current user
SELECT USER();

-- Output: root@localhost

-- Exit MySQL
EXIT;
```

---

## 🗄️ Step 9: Create Development Database

### 9.1 Connect to MySQL

```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysql -u root -p
# Enter password
```

### 9.2 Create Database

```sql
-- Create database for your project
CREATE DATABASE myplayground_dev
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Verify it was created
SHOW DATABASES;

-- You should see myplayground_dev in the list

-- Select the database
USE myplayground_dev;

-- Check current database
SELECT DATABASE();
-- Output: myplayground_dev

-- Exit MySQL
EXIT;
```

✅ Development database created!

---

## 🎨 Step 10: Explore MySQL Workbench (Optional but Recommended)

### 10.1 Open MySQL Workbench

1. Click Windows Start menu
2. Search for "MySQL Workbench"
3. Click to open

### 10.2 Connect to Your Database

1. You'll see "MySQL Connections" section
2. Should see a connection named: **"Local instance MySQL80"**
3. Click on it
4. Enter your root password
5. Click **"OK"**

### 10.3 Explore the Interface

**Left Panel - Navigator:**
- **Schemas** - View databases and tables
- Expand `myplayground_dev` to see your database

**Center Panel - Query Editor:**
- Write and execute SQL queries

**Bottom Panel - Output:**
- Query results appear here

### 10.4 Run a Test Query

In the Query Editor, type:

```sql
-- Show current database
SELECT DATABASE();

-- Show current time
SELECT NOW();

-- Create a test table
CREATE TABLE test_connection (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO test_connection (message) VALUES ('MySQL is working!');

-- Query the data
SELECT * FROM test_connection;
```

**Execute the query:**
- Click the lightning bolt icon ⚡
- Or press: `Ctrl + Shift + Enter`

**Expected Result:**
```
+----+--------------------+---------------------+
| id | message            | created_at          |
+----+--------------------+---------------------+
|  1 | MySQL is working!  | 2025-11-10 14:30:45 |
+----+--------------------+---------------------+
```

✅ MySQL Workbench is working!

### 10.5 Clean Up Test Table (Optional)

```sql
DROP TABLE test_connection;
```

---

## 🔐 Step 11: Configure Environment Variables

### 11.1 Create `.env` File

In your project root (`C:\Users\willi\Desktop\My Playground\my-playground`), create a file named `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=dev123
DB_NAME=myplayground_dev

# Feature Flags
USE_DATABASE=false
DEBUG=true

# Server Configuration
PORT=8000

# Application Settings
NODE_ENV=development
```

**⚠️ Important:**
- Replace `dev123` with YOUR actual MySQL root password
- Keep this file secure (it's already in `.gitignore`)

### 11.2 Verify `.env` is in `.gitignore`

Check your `.gitignore` file:

```bash
# Should contain:
.env
*.env.local
```

✅ Your database credentials won't be committed to Git!

---

## 🧪 Step 12: Test Node.js MySQL Connection

### 12.1 Create Test Script

Create a new file: `scripts/test-mysql-connection.js`

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('========================================');
    console.log('  MySQL Connection Test');
    console.log('========================================\n');

    try {
        console.log('📡 Attempting to connect to MySQL...');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        console.log(`   User: ${process.env.DB_USER}`);
        console.log(`   Database: ${process.env.DB_NAME}\n`);

        // Create connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'myplayground_dev'
        });

        console.log('✅ Successfully connected to MySQL!\n');

        // Test 1: Check MySQL version
        console.log('🔍 Test 1: Check MySQL version');
        const [versionRows] = await connection.query('SELECT VERSION() as version');
        console.log(`   MySQL Version: ${versionRows[0].version}`);
        console.log('   ✅ PASSED\n');

        // Test 2: Check current database
        console.log('🔍 Test 2: Check current database');
        const [dbRows] = await connection.query('SELECT DATABASE() as db');
        console.log(`   Current Database: ${dbRows[0].db}`);
        console.log('   ✅ PASSED\n');

        // Test 3: Test query execution
        console.log('🔍 Test 3: Test query execution');
        const [testRows] = await connection.query('SELECT 1 + 1 AS result');
        console.log(`   Query Result: 1 + 1 = ${testRows[0].result}`);
        console.log('   ✅ PASSED\n');

        // Test 4: Check character set
        console.log('🔍 Test 4: Check character set');
        const [charsetRows] = await connection.query(
            "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
            [process.env.DB_NAME || 'myplayground_dev']
        );
        console.log(`   Character Set: ${charsetRows[0].DEFAULT_CHARACTER_SET_NAME}`);
        console.log(`   Collation: ${charsetRows[0].DEFAULT_COLLATION_NAME}`);
        console.log('   ✅ PASSED\n');

        // Test 5: Check privileges
        console.log('🔍 Test 5: Check user privileges');
        const [privRows] = await connection.query('SHOW GRANTS FOR CURRENT_USER()');
        console.log('   User has the following grants:');
        privRows.forEach(row => {
            const grant = Object.values(row)[0];
            console.log(`   - ${grant}`);
        });
        console.log('   ✅ PASSED\n');

        // Clean up
        await connection.end();
        console.log('🔌 Connection closed');

        console.log('\n========================================');
        console.log('  ✅ ALL TESTS PASSED!');
        console.log('  MySQL is ready for development.');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ CONNECTION FAILED!\n');
        console.error('Error:', error.message);
        console.error('\n📋 Troubleshooting Steps:');
        console.error('   1. Check if MySQL service is running:');
        console.error('      Get-Service MySQL*');
        console.error('   2. Verify credentials in .env file');
        console.error('   3. Ensure database exists:');
        console.error('      mysql -u root -p');
        console.error('      SHOW DATABASES;');
        console.error('   4. Check port 3306 is not blocked');
        console.error('\n');
        process.exit(1);
    }
}

// Run the test
testConnection();
```

### 12.2 Create scripts Directory

If you don't have a `scripts` folder:

```powershell
mkdir scripts
```

### 12.3 Run the Test

```powershell
node scripts/test-mysql-connection.js
```

**Expected Output:**

```
========================================
  MySQL Connection Test
========================================

📡 Attempting to connect to MySQL...
   Host: localhost
   Port: 3306
   User: root
   Database: myplayground_dev

✅ Successfully connected to MySQL!

🔍 Test 1: Check MySQL version
   MySQL Version: 8.0.35
   ✅ PASSED

🔍 Test 2: Check current database
   Current Database: myplayground_dev
   ✅ PASSED

🔍 Test 3: Test query execution
   Query Result: 1 + 1 = 2
   ✅ PASSED

🔍 Test 4: Check character set
   Character Set: utf8mb4
   Collation: utf8mb4_unicode_ci
   ✅ PASSED

🔍 Test 5: Check user privileges
   User has the following grants:
   - GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD...
   ✅ PASSED

🔌 Connection closed

========================================
  ✅ ALL TESTS PASSED!
  MySQL is ready for development.
========================================
```

🎉 **If you see this output, MySQL is fully configured and working!**

---

## 📝 Step 13: Add MySQL Path to Windows PATH (Optional but Recommended)

This allows you to run `mysql` commands from any directory without typing the full path.

### 13.1 Copy MySQL Bin Path

The MySQL bin directory is typically:
```
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

### 13.2 Add to System PATH

**Option A: Via Windows Settings (Recommended)**

1. Press `Win + X` → Click "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path"
5. Click "Edit"
6. Click "New"
7. Paste: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
8. Click "OK" on all dialogs

**Option B: Via PowerShell (Quick)**

```powershell
# Run PowerShell as Administrator
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Make it permanent (requires admin)
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\MySQL\MySQL Server 8.0\bin",
    "Machine"
)
```

### 13.3 Verify PATH Update

Close and reopen PowerShell, then:

```powershell
# This should now work from any directory
mysql --version
```

**Expected Output:**
```
mysql  Ver 8.0.35 for Win64 on x86_64 (MySQL Community Server - GPL)
```

✅ You can now run `mysql` commands from anywhere!

---

## 🔧 Step 14: Configure MySQL for Optimal Development

### 14.1 Adjust MySQL Configuration (Optional)

For better development experience, you can tweak MySQL settings.

**Edit MySQL Configuration:**

1. Navigate to: `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
2. Open with Notepad (as Administrator)
3. Add/modify these settings:

```ini
[mysqld]
# Increase max connections for development
max_connections=200

# Increase query cache (if needed)
query_cache_size=32M
query_cache_type=1

# Enable slow query log for debugging
slow_query_log=1
slow_query_log_file="C:/ProgramData/MySQL/MySQL Server 8.0/Data/slow-query.log"
long_query_time=2

# UTF-8 support
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

[client]
default-character-set=utf8mb4
```

4. Save the file
5. Restart MySQL service:

```powershell
Restart-Service MySQL80
```

---

## 🎯 Step 15: Quick Reference Commands

### PowerShell Commands

```powershell
# Check MySQL service status
Get-Service MySQL80

# Start MySQL service
Start-Service MySQL80

# Stop MySQL service
Stop-Service MySQL80

# Restart MySQL service
Restart-Service MySQL80
```

### MySQL Commands

```powershell
# Connect to MySQL
mysql -u root -p

# Connect to specific database
mysql -u root -p myplayground_dev

# Run SQL file
mysql -u root -p myplayground_dev < schema.sql

# Backup database
mysqldump -u root -p myplayground_dev > backup.sql

# Restore database
mysql -u root -p myplayground_dev < backup.sql
```

### Common SQL Commands

```sql
-- Show all databases
SHOW DATABASES;

-- Create database
CREATE DATABASE database_name;

-- Delete database
DROP DATABASE database_name;

-- Use database
USE database_name;

-- Show tables
SHOW TABLES;

-- Describe table structure
DESCRIBE table_name;

-- Show table creation statement
SHOW CREATE TABLE table_name;

-- Check current user
SELECT USER();

-- Check current database
SELECT DATABASE();

-- Exit MySQL
EXIT;
-- or
QUIT;
```

---

## 🐛 Troubleshooting

### Issue 1: MySQL Service Won't Start

**Symptoms:**
```powershell
Get-Service MySQL80
# Status: Stopped
```

**Solutions:**

1. **Check if port 3306 is in use:**
   ```powershell
   netstat -ano | findstr :3306
   ```
   - If another process is using port 3306, stop it or change MySQL port

2. **Check MySQL error log:**
   - Location: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err`
   - Open the `.err` file with Notepad to see error details

3. **Restart with verbose logging:**
   ```powershell
   # Stop service
   Stop-Service MySQL80
   
   # Start manually to see errors
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysqld --console
   ```

4. **Reinstall MySQL:**
   - Uninstall via "Add or Remove Programs"
   - Delete `C:\ProgramData\MySQL` folder
   - Reinstall using this guide

---

### Issue 2: Access Denied Error

**Symptoms:**
```
ERROR 1045 (28000): Access denied for user 'root'@'localhost'
```

**Solutions:**

1. **Verify password in .env file:**
   - Check `.env` file: `DB_PASSWORD=your_password`
   - Ensure no extra spaces or quotes

2. **Reset root password:**
   ```powershell
   # Stop MySQL
   Stop-Service MySQL80
   
   # Start in safe mode
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   .\mysqld --skip-grant-tables
   
   # In another PowerShell window
   mysql -u root
   
   # Reset password
   FLUSH PRIVILEGES;
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
   EXIT;
   
   # Restart MySQL normally
   Stop-Process -Name mysqld
   Start-Service MySQL80
   ```

---

### Issue 3: Can't Connect via Node.js

**Symptoms:**
```
Error: ER_NOT_SUPPORTED_AUTH_MODE
```

**Solutions:**

1. **Use caching_sha2_password authentication:**
   ```sql
   mysql -u root -p
   ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'your_password';
   FLUSH PRIVILEGES;
   ```

2. **Verify mysql2 package is installed:**
   ```powershell
   npm list mysql2
   # Should show: mysql2@3.x.x
   ```

---

### Issue 4: Character Encoding Issues

**Symptoms:**
- Emoji or special characters display incorrectly
- Strange characters in database

**Solutions:**

1. **Verify database charset:**
   ```sql
   SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
   FROM information_schema.SCHEMATA
   WHERE SCHEMA_NAME = 'myplayground_dev';
   
   -- Should show: utf8mb4, utf8mb4_unicode_ci
   ```

2. **Fix database charset:**
   ```sql
   ALTER DATABASE myplayground_dev
   CHARACTER SET utf8mb4
   COLLATE utf8mb4_unicode_ci;
   ```

---

## ✅ Verification Checklist

Before proceeding to Phase 1, verify:

- [ ] MySQL 8.0 is installed
- [ ] MySQL service is running (`Get-Service MySQL80` shows "Running")
- [ ] MySQL Workbench is installed and working
- [ ] Can connect via command line (`mysql -u root -p`)
- [ ] Development database exists (`myplayground_dev`)
- [ ] `.env` file created with correct credentials
- [ ] `.env` is in `.gitignore`
- [ ] Node.js test script passes all tests
- [ ] `mysql` command works from any directory (optional)

---

## 🎉 Next Steps

**Congratulations!** MySQL is fully configured and ready. You can now:

1. ✅ **Continue with current development** - MySQL is installed but not yet used
   - Your application still uses localStorage/JSON files
   - MySQL is ready for when you reach Phase 8

2. ✅ **Proceed to Phase 8** (when ready) - See: [`docs/roadmaps/PHASE8_DATABASE_MIGRATION_ROADMAP.md`](./PHASE8_DATABASE_MIGRATION_ROADMAP.md)
   - Create database schema
   - Implement MySQL repositories
   - Migrate data from JSON/localStorage to MySQL

3. ✅ **Practice MySQL** (optional) - Get familiar with MySQL Workbench and SQL queries

---

## 📚 Additional Resources

### MySQL Documentation
- Official MySQL 8.0 Docs: https://dev.mysql.com/doc/refman/8.0/en/
- MySQL Workbench Manual: https://dev.mysql.com/doc/workbench/en/

### Tutorials
- MySQL Tutorial: https://www.mysqltutorial.org/
- SQL Tutorial: https://www.w3schools.com/sql/

### Tools
- MySQL Workbench: Installed with MySQL
- DBeaver: https://dbeaver.io/ (alternative GUI tool)
- HeidiSQL: https://www.heidisql.com/ (another good option)

---

## 🔒 Security Notes

### For Development (Current Setup)

✅ **Good for development:**
- Simple root password
- No remote access
- Local connections only
- Service runs as system account

### For Production (Future)

When deploying to production:

⚠️ **Required changes:**
- [ ] Use strong, random passwords
- [ ] Create dedicated application user (not root)
- [ ] Limit user privileges (least privilege principle)
- [ ] Enable SSL/TLS for connections
- [ ] Configure firewall rules
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Update MySQL regularly

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Next Document:** [Phase 1: Core Infrastructure](./COMPLETE_MODERNIZATION_ROADMAP.md#phase-1-core-infrastructure)
