---
name: postgresql-code-review
description: 'PostgreSQL-specific code review assistant focusing on PostgreSQL best practices, anti-patterns, and unique quality standards. Covers JSONB operations, array usage, custom types, schema design, function optimization, and PostgreSQL-exclusive security features like Row Level Security (RLS).'
---

# PostgreSQL Code Review Assistant

Expert PostgreSQL code review for ${selection} (or entire project if no selection). Focus on PostgreSQL-specific best practices, anti-patterns, and quality standards.

## 🎯 PostgreSQL-Specific Review Areas

### JSONB Best Practices
```sql
-- ❌ BAD: Inefficient JSONB usage (no index support)
SELECT * FROM orders WHERE data->>'status' = 'shipped';

-- ✅ GOOD: Indexable JSONB queries
CREATE INDEX idx_orders_status ON orders USING gin((data->'status'));
SELECT * FROM orders WHERE data @> '{"status": "shipped"}';

-- ✅ GOOD: JSONB validation constraint
ALTER TABLE orders ADD CONSTRAINT valid_status 
CHECK (data->>'status' IN ('pending', 'shipped', 'delivered'));
```

### Array Operations Review
```sql
-- ❌ BAD: No index on array column
SELECT * FROM products WHERE 'electronics' = ANY(categories);

-- ✅ GOOD: GIN indexed array queries
CREATE INDEX idx_products_categories ON products USING gin(categories);
SELECT * FROM products WHERE categories @> ARRAY['electronics'];
```

### PostgreSQL Schema Design
```sql
-- ❌ BAD: Not using PostgreSQL features
CREATE TABLE users (
  id INTEGER,
  email VARCHAR(255),
  created_at TIMESTAMP
);

-- ✅ GOOD: PostgreSQL-optimized schema
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,       -- Case-insensitive email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_metadata ON users USING gin(metadata);
```

### Custom Types and Domains
```sql
-- ❌ BAD: Using generic types
CREATE TABLE transactions (
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status VARCHAR(20)
);

-- ✅ GOOD: PostgreSQL custom types
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GBP', 'JPY');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE DOMAIN positive_amount AS DECIMAL(10,2) CHECK (VALUE > 0);

CREATE TABLE transactions (
  amount positive_amount NOT NULL,
  currency currency_code NOT NULL,
  status transaction_status DEFAULT 'pending'
);
```

### Trigger Functions
```sql
-- ✅ GOOD: Optimized trigger — use CURRENT_TIMESTAMP, fire only when needed
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modified_time_trigger
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_modified_time();
```

## 🔍 PostgreSQL-Specific Anti-Patterns

### Performance Anti-Patterns
- **Not using GIN/GiST** for JSONB, arrays, or full-text search columns
- **Misusing JSONB**: treating it like a simple string field
- **Poor partition key selection**: not leveraging PostgreSQL partitioning
- **Missing TIMESTAMPTZ**: using `TIMESTAMP` instead of `TIMESTAMPTZ`

### Schema Design Issues
- **Using VARCHAR** instead of `TEXT` or `CITEXT`
- **Missing CHECK constraints** for data validation
- **Not using ENUM types** for limited value sets
- **Missing JSONB structure**: unstructured JSONB without validation

## 🛡️ PostgreSQL Security Review

### Row Level Security (RLS)
```sql
-- ✅ GOOD: Implementing RLS
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_data_policy ON sensitive_data
  FOR ALL TO application_role
  USING (user_id = current_setting('app.current_user_id')::INTEGER);
```

### Privilege Management
```sql
-- ❌ BAD: Overly broad permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;

-- ✅ GOOD: Granular permissions
GRANT SELECT, INSERT, UPDATE ON specific_table TO app_user;
GRANT USAGE ON SEQUENCE specific_table_id_seq TO app_user;
```

## 🎯 PostgreSQL Code Quality Checklist

### Schema Design
- [ ] Using appropriate PostgreSQL data types (CITEXT, JSONB, arrays)
- [ ] Leveraging ENUM types for constrained values
- [ ] Implementing proper CHECK constraints
- [ ] Using TIMESTAMPTZ instead of TIMESTAMP
- [ ] Defining custom domains for reusable constraints

### Performance Considerations
- [ ] Appropriate index types (GIN for JSONB/arrays, GiST for ranges)
- [ ] JSONB queries using containment operators (`@>`, `?`)
- [ ] Array operations using PostgreSQL-specific operators
- [ ] Proper use of window functions and CTEs
- [ ] Cursor-based pagination instead of OFFSET on large tables

### PostgreSQL Features Utilization
- [ ] Extensions used where appropriate (`uuid-ossp`, `pg_trgm`, `pgcrypto`)
- [ ] Stored procedures in PL/pgSQL when beneficial
- [ ] RLS implementation for multi-tenant security
- [ ] Audit trails with PostgreSQL features

### Security and Compliance
- [ ] Row Level Security (RLS) where needed
- [ ] Proper role and privilege management
- [ ] Parameterized queries exclusively (no string interpolation)
- [ ] Sensitive data encrypted at rest

## 📝 Review Guidelines

1. **Data Type Optimization**: Ensure PostgreSQL-specific types are used appropriately
2. **Index Strategy**: Review index types; use GIN/GiST for appropriate columns
3. **JSONB Structure**: Validate JSONB schema design and query patterns
4. **Function Quality**: Review PL/pgSQL functions for efficiency
5. **Extension Usage**: Verify appropriate use of PostgreSQL extensions
6. **Security**: Review RLS, privileges, and parameterized queries

Focus on PostgreSQL's unique capabilities — don't treat it as a generic SQL database.
