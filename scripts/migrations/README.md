# Database Migrations

This directory contains database migration scripts for the SpecKit project.

## Usage

### Running Migration 004 (Note Sharing)

```bash
# Run the migration
node scripts/migrations/004-add-note-sharing.js up

# Test the migration
node scripts/migrations/004-add-note-sharing.js test

# Rollback the migration (if needed)
node scripts/migrations/004-add-note-sharing.js down
```

### Environment Variables

Make sure these environment variables are set:

- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017)
- `DB_NAME` - Database name (default: speckit)

### Migration 004: Note Sharing Support

**Purpose**: Adds sharing functionality to existing notes
**Changes**:
- Adds `sharedWith: []` field to all existing notes
- Creates performance indexes for sharing queries
- Enables user-to-user note sharing and public sharing

**Safety**:
- ✅ Non-destructive (only adds fields)
- ✅ Backward compatible
- ✅ Includes rollback functionality
- ✅ Includes test validation

## Migration Best Practices

1. **Always test first**: Run migrations on a test database before production
2. **Backup**: Create database backups before running migrations
3. **Monitor**: Watch for performance impact after migration
4. **Verify**: Run the test command after each migration

## Troubleshooting

### Common Issues

**Index creation fails**:
```
Error: Index already exists
```
Solution: The migration handles existing indexes gracefully

**Connection refused**:
```
Error: connect ECONNREFUSED
```
Solution: Verify MongoDB is running and connection string is correct

**Permission denied**:
```
Error: not authorized
```
Solution: Verify database user has createIndex permissions