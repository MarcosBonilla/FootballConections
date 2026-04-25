---
name: postgresql-optimization
description: 'PostgreSQL-specific development assistant focusing on unique PostgreSQL features, advanced data types, and PostgreSQL-exclusive capabilities. Covers JSONB operations, array types, custom types, range/geometric types, full-text search, window functions, and PostgreSQL extensions ecosystem.'
---

# PostgreSQL Development Assistant

Expert PostgreSQL guidance for ${selection} (or entire project if no selection). Focus on PostgreSQL-specific features, optimization patterns, and advanced capabilities.

## 🔧 PostgreSQL-Specific Features

### JSONB Operations
```sql
-- GIN index for JSONB performance
CREATE INDEX idx_events_data_gin ON events USING gin(data);

-- JSONB containment and path queries
SELECT * FROM events 
WHERE data @> '{"type": "login"}'
  AND data #>> '{user,role}' = 'admin';
```

### Array Operations
```sql
-- GIN index for arrays
CREATE INDEX idx_products_categories ON products USING gin(categories);

SELECT * FROM posts WHERE 'postgresql' = ANY(tags);
SELECT * FROM posts WHERE tags && ARRAY['database', 'sql'];
```

### Window Functions & Analytics
```sql
SELECT 
  product_id,
  sale_date,
  amount,
  SUM(amount) OVER (PARTITION BY product_id ORDER BY sale_date) as running_total,
  AVG(amount) OVER (PARTITION BY product_id ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg,
  DENSE_RANK() OVER (PARTITION BY EXTRACT(month FROM sale_date) ORDER BY amount DESC) as monthly_rank,
  LAG(amount, 1) OVER (PARTITION BY product_id ORDER BY sale_date) as prev_amount
FROM sales;
```

### Full-Text Search
```sql
CREATE INDEX idx_documents_search ON documents USING gin(search_vector);

SELECT *, ts_rank(search_vector, plainto_tsquery('postgresql')) as rank
FROM documents 
WHERE search_vector @@ plainto_tsquery('postgresql')
ORDER BY rank DESC;
```

## ⚡ PostgreSQL Performance Tuning

### Query Optimization
```sql
-- Always use EXPLAIN ANALYZE for performance analysis
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'::date
GROUP BY u.id, u.name;

-- Slow queries via pg_stat_statements
SELECT query, calls, total_time, mean_time, rows,
       100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

### Index Strategies
```sql
-- Composite indexes
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_users ON users(created_at) WHERE status = 'active';

-- Expression indexes
CREATE INDEX idx_users_lower_email ON users(lower(email));

-- Covering indexes to avoid table lookups
CREATE INDEX idx_orders_covering ON orders(user_id, status) INCLUDE (total, created_at);
```

## 🛠️ Common Query Patterns

### Pagination
```sql
-- ❌ BAD: OFFSET for large datasets
SELECT * FROM products ORDER BY id OFFSET 10000 LIMIT 20;

-- ✅ GOOD: Cursor-based pagination
SELECT * FROM products 
WHERE id > $last_id 
ORDER BY id 
LIMIT 20;
```

### JSON Queries
```sql
-- ❌ BAD
SELECT * FROM users WHERE data::text LIKE '%admin%';

-- ✅ GOOD: JSONB operators and GIN index
SELECT * FROM users WHERE data @> '{"role": "admin"}';
```

### Common Table Expressions (CTEs)
```sql
-- Recursive queries for hierarchical data
WITH RECURSIVE category_tree AS (
  SELECT id, name, parent_id, 1 as level
  FROM categories 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.name, c.parent_id, ct.level + 1
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY level, name;
```

## 📊 PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram matching (fuzzy search)
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- Remove accents from text
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- GIN indexes for btree types
```

## 📋 Optimization Checklist

### Query Analysis
- [ ] Run EXPLAIN ANALYZE for expensive queries
- [ ] Check for sequential scans on large tables
- [ ] Verify appropriate join algorithms
- [ ] Review WHERE clause selectivity

### Index Strategy
- [ ] Create indexes for frequently queried columns
- [ ] Use composite indexes for multi-column searches
- [ ] Consider partial indexes for filtered queries
- [ ] Remove unused or duplicate indexes
- [ ] Use `pg_stat_user_indexes` to detect unused indexes

### Performance Monitoring
- [ ] Set up `pg_stat_statements`
- [ ] Monitor connection pool usage (use pgbouncer for high concurrency)
- [ ] Regular VACUUM and ANALYZE
- [ ] Track database growth

### Security Review
- [ ] Use parameterized queries exclusively
- [ ] Implement Row Level Security (RLS) where needed
- [ ] Audit sensitive data access
- [ ] Use secure connection methods (SSL/TLS)

Focus on providing specific, actionable PostgreSQL optimizations that improve query performance, security, and maintainability while leveraging PostgreSQL's advanced features.
