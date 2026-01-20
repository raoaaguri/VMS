# Login Event Logging - Monitoring & Analysis Guide

## Event Log Monitoring

Now that comprehensive event logging is in place, here's how to monitor, analyze, and act on login events.

---

## 1. Real-Time Monitoring

### View Live Login Events
```bash
# Terminal 1: Start watching logs
tail -f /var/log/app.log | grep "LOGIN EVENT"

# Output:
# [a1b2c3] 📊 LOGIN EVENT CREATED
# [x8y9z0] 📊 LOGIN EVENT FAILED
# [m1n2o3] 📊 LOGIN EVENT CREATED
```

### Monitor Only Failed Logins
```bash
tail -f /var/log/app.log | grep "LOGIN EVENT FAILED"

# Alerts you immediately when login fails
```

### Track Service-Level Events
```bash
tail -f /var/log/app.log | grep "AUTHENTICATION SERVICE EVENT"

# Shows all authentication service events (success/failure)
```

---

## 2. Analytics & Reporting

### Count Successful Logins (Last 24 Hours)
```bash
grep "USER_LOGIN_SUCCESS" /var/log/app.log | wc -l
# Output: 342 successful logins
```

### Count Failed Logins (Last 24 Hours)
```bash
grep "USER_LOGIN_FAILED" /var/log/app.log | wc -l
# Output: 18 failed logins
```

### Success Rate Calculation
```bash
SUCCESS=$(grep "USER_LOGIN_SUCCESS" /var/log/app.log | wc -l)
FAILED=$(grep "USER_LOGIN_FAILED" /var/log/app.log | wc -l)
TOTAL=$((SUCCESS + FAILED))
RATE=$((SUCCESS * 100 / TOTAL))
echo "Success Rate: ${RATE}%"
# Output: Success Rate: 95%
```

### Failure Breakdown by Category
```bash
grep "USER_LOGIN_FAILED" /var/log/app.log | grep -oP "errorCategory: \K[^,]*" | sort | uniq -c | sort -rn

# Output:
#      8 AUTHENTICATION_FAILED
#      5 VALIDATION_ERROR
#      3 ACCOUNT_INACTIVE
#      2 VENDOR_NOT_APPROVED
```

### Average Response Time
```bash
grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep -oP "responseTime: \"\K[0-9]*" | awk '{sum+=$1; count++} END {print "Average: " sum/count "ms"}'

# Output: Average: 245ms
```

### Slowest Logins
```bash
grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep -oP "responseTime: \"\K[0-9]*" | sort -rn | head -5

# Output:
# 1250
# 985
# 876
# 654
# 523
```

---

## 3. Security Monitoring

### Detect Brute Force Attempts
```bash
# Failed login attempts by IP (more than 5 in 1 hour = suspicious)
grep "USER_LOGIN_FAILED" /var/log/app.log | grep -oP "clientIp: \K[^,]*" | sort | uniq -c | sort -rn | awk '$1 > 5 {print "ALERT: " $2 " had " $1 " failed attempts"}'

# Output:
# ALERT: 192.168.1.50 had 12 failed attempts
# ALERT: 10.0.0.99 had 7 failed attempts
```

### Track Failed Attempts by User Email
```bash
grep "USER_LOGIN_FAILED" /var/log/app.log | grep -oP 'email: "[^"]*' | sort | uniq -c | sort -rn | awk '$1 > 3 {print "SUSPICIOUS: " $2 " failed " $1 " times"}'

# Output:
# SUSPICIOUS: vendor@company.com failed 5 times
# SUSPICIOUS: admin@example.com failed 4 times
```

### Find Accounts That Are Locked Out
```bash
# Multiple ACCOUNT_INACTIVE failures = account flagged
grep "USER_LOGIN_FAILED.*ACCOUNT_INACTIVE" /var/log/app.log | grep -oP 'email: "[^"]*' | sort | uniq -c | sort -rn

# Output:
#      2 oldvendor@company.com
#      1 testuser@example.com
```

### Identify Unapproved Vendor Login Attempts
```bash
grep "VENDOR_NOT_APPROVED" /var/log/app.log | grep -oP 'email: "[^"]*' | sort | uniq

# Output:
# newvendor1@company.com
# newvendor2@example.com
# newvendor3@corp.org
```

### Track Suspicious IPs
```bash
# IPs with multiple failure categories
grep "USER_LOGIN_FAILED" /var/log/app.log | awk -F'[: ]' '{print $NF}' | sort | uniq -c | sort -rn | head -10

# Output:
#      12 192.168.1.50
#       8 10.0.0.99
#       6 203.45.67.89
```

---

## 4. Trend Analysis

### Logins by Hour of Day
```bash
grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep -oP '(?<=T)\d{2}(?=:)' | sort | uniq -c | sort -n

# Output:
#      5 08
#     15 09
#     42 10
#     38 11
#     8 12
#     ...
# Shows peak login times
```

### Logins by Role
```bash
grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep -oP 'role: \K[^,]*' | sort | uniq -c

# Output:
#    285 VENDOR
#     57 ADMIN
```

### Vendor Success vs Admin Success
```bash
VENDOR_SUCCESS=$(grep "USER_LOGIN_SUCCESS.*role: VENDOR" /var/log/app.log | wc -l)
ADMIN_SUCCESS=$(grep "USER_LOGIN_SUCCESS.*role: ADMIN" /var/log/app.log | wc -l)

echo "Vendor Logins: $VENDOR_SUCCESS"
echo "Admin Logins: $ADMIN_SUCCESS"
echo "Ratio: 1 Admin : $((VENDOR_SUCCESS / ADMIN_SUCCESS)) Vendors"

# Output:
# Vendor Logins: 285
# Admin Logins: 57
# Ratio: 1 Admin : 5 Vendors
```

---

## 5. Monitoring Dashboards

### Shell Script for Monitoring Dashboard
```bash
#!/bin/bash

# monitor-logins.sh - Real-time monitoring dashboard

while true; do
  clear
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║           LOGIN EVENT MONITORING DASHBOARD                 ║"
  echo "║                    $(date '+%Y-%m-%d %H:%M:%S')                ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Summary Stats
  SUCCESS=$(grep "USER_LOGIN_SUCCESS" /var/log/app.log | wc -l)
  FAILED=$(grep "USER_LOGIN_FAILED" /var/log/app.log | wc -l)
  TOTAL=$((SUCCESS + FAILED))
  RATE=$((SUCCESS * 100 / TOTAL))
  
  echo "📊 Overall Statistics:"
  echo "   ✅ Successful: $SUCCESS"
  echo "   ❌ Failed: $FAILED"
  echo "   📈 Success Rate: ${RATE}%"
  echo ""
  
  # Failure Breakdown
  echo "📋 Failures by Category:"
  grep "USER_LOGIN_FAILED" /var/log/app.log | grep -oP "errorCategory: \K[^,]*" | sort | uniq -c | sort -rn | while read count category; do
    echo "   $category: $count"
  done
  echo ""
  
  # Top IPs
  echo "🌐 Top IP Addresses:"
  grep "LOGIN EVENT" /var/log/app.log | grep -oP "clientIp: \K[^,]*" | sort | uniq -c | sort -rn | head -5 | while read count ip; do
    echo "   $ip: $count attempts"
  done
  echo ""
  
  # Performance
  AVG_TIME=$(grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep -oP "responseTime: \"\K[0-9]*" | awk '{sum+=$1; count++} END {printf "%.0f", sum/count}')
  echo "⚡ Performance:"
  echo "   Average Response Time: ${AVG_TIME}ms"
  echo ""
  
  echo "Press Ctrl+C to exit. Refreshing in 10 seconds..."
  sleep 10
done
```

Run the dashboard:
```bash
chmod +x monitor-logins.sh
./monitor-logins.sh
```

---

## 6. Alert Setup

### Bash Script for Automated Alerts
```bash
#!/bin/bash

# alert-logins.sh - Alert on suspicious activity

LOG_FILE="/var/log/app.log"
LAST_CHECK=$(date -d "5 minutes ago" '+%Y-%m-%dT%H:%M')

# Check 1: High failure rate
FAILURES=$(grep "USER_LOGIN_FAILED" "$LOG_FILE" | awk -v after="$LAST_CHECK" '$0 > after' | wc -l)
if [ "$FAILURES" -gt 10 ]; then
  echo "🚨 ALERT: High login failure rate ($FAILURES failures in last 5 minutes)"
  # Send email or webhook notification
fi

# Check 2: Brute force detection
BRUTE_FORCE=$(grep "USER_LOGIN_FAILED" "$LOG_FILE" | grep -oP "clientIp: \K[^,]*" | sort | uniq -c | awk '$1 > 5 {print $2}')
if [ ! -z "$BRUTE_FORCE" ]; then
  echo "🚨 ALERT: Possible brute force attack from: $BRUTE_FORCE"
fi

# Check 3: Account lockout
LOCKED=$(grep "USER_LOGIN_FAILED.*ACCOUNT_INACTIVE" "$LOG_FILE" | grep -oP 'email: "[^"]*' | uniq)
if [ ! -z "$LOCKED" ]; then
  echo "⚠️  WARNING: Inactive account login attempts: $LOCKED"
fi

# Check 4: Vendor approval issues
UNAPPROVED=$(grep "VENDOR_NOT_APPROVED" "$LOG_FILE" | grep -oP 'email: "[^"]*' | uniq -c | sort -rn)
if [ ! -z "$UNAPPROVED" ]; then
  echo "ℹ️  INFO: Unapproved vendor login attempts detected"
  echo "$UNAPPROVED"
fi
```

Run every 5 minutes via cron:
```bash
*/5 * * * * /home/user/alert-logins.sh >> /var/log/alerts.log
```

---

## 7. Database Integration

### Store Events in Database
```sql
-- Create table for persistent event storage
CREATE TABLE login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID,
  email VARCHAR(255),
  role VARCHAR(50),
  vendor_id UUID,
  client_ip VARCHAR(45),
  user_agent TEXT,
  response_time_ms INTEGER,
  error_category VARCHAR(100),
  failure_reason VARCHAR(100),
  token_issued BOOLEAN,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_email (email),
  INDEX idx_client_ip (client_ip),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);

-- Query successful logins in last 24 hours
SELECT email, COUNT(*) as login_count, MAX(created_at) as last_login
FROM login_events
WHERE event_type = 'USER_LOGIN_SUCCESS'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY login_count DESC;

-- Find failed attempts by IP
SELECT client_ip, COUNT(*) as failed_attempts, GROUP_CONCAT(DISTINCT email)
FROM login_events
WHERE event_type = 'USER_LOGIN_FAILED'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY client_ip
HAVING failed_attempts > 5;

-- Analyze failure reasons
SELECT error_category, failure_reason, COUNT(*) as count
FROM login_events
WHERE event_type = 'USER_LOGIN_FAILED'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_category, failure_reason
ORDER BY count DESC;

-- Performance statistics
SELECT 
  AVG(response_time_ms) as avg_time,
  MIN(response_time_ms) as min_time,
  MAX(response_time_ms) as max_time,
  COUNT(*) as total_attempts
FROM login_events
WHERE event_type = 'USER_LOGIN_SUCCESS'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 8. Reporting Examples

### Daily Report Query
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(CASE WHEN event_type = 'USER_LOGIN_SUCCESS' THEN 1 END) as successful,
  COUNT(CASE WHEN event_type = 'USER_LOGIN_FAILED' THEN 1 END) as failed,
  ROUND(COUNT(CASE WHEN event_type = 'USER_LOGIN_SUCCESS' THEN 1 END) * 100 / 
        COUNT(*), 2) as success_rate,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms
FROM login_events
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Weekly User Activity
```sql
SELECT 
  WEEK(created_at) as week,
  role,
  COUNT(DISTINCT email) as unique_users,
  COUNT(*) as total_attempts,
  ROUND(COUNT(CASE WHEN event_type = 'USER_LOGIN_SUCCESS' THEN 1 END) * 100 / 
        COUNT(*), 2) as success_rate
FROM login_events
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY WEEK(created_at), role
ORDER BY week DESC, role;
```

---

## 9. Common Issues & Solutions

### Issue: High Failed Login Rate
**Cause Options:**
1. Invalid credentials being submitted
2. System maintenance/downtime
3. Password reset issues
4. Brute force attack

**Investigation Steps:**
```bash
# Check which errors dominate
grep "USER_LOGIN_FAILED" /var/log/app.log | tail -100 | grep -oP "errorCategory: \K[^,]*" | sort | uniq -c

# If AUTHENTICATION_FAILED: Password issues
# If ACCOUNT_INACTIVE: Maintenance
# If VENDOR_NOT_APPROVED: Workflow issue
```

### Issue: Slow Login Performance
**Symptom:** `responseTime` consistently > 500ms

**Investigation:**
```bash
# Check if database queries are slow
grep "responseTime:" /var/log/app.log | grep -E "[5-9][0-9]{2,}ms|[0-9]{4,}ms" | tail -20

# Correlate with database query logs
# Check network latency to database server
# Monitor server CPU/memory during peak login times
```

### Issue: Vendor Lockout
**Symptom:** Repeated VENDOR_NOT_APPROVED failures

**Solution:**
```sql
-- Check vendor status
SELECT id, email, status FROM vendors WHERE status != 'ACTIVE';

-- Update vendor to ACTIVE
UPDATE vendors SET status = 'ACTIVE' WHERE id = 'vendor-123';
```

---

## 10. Best Practices for Event Monitoring

✅ **DO:**
- Monitor success/failure rates daily
- Set alerts for failure rate > 10%
- Track response times for performance
- Review security alerts weekly
- Archive events monthly
- Correlate with system changes

❌ **DON'T:**
- Log sensitive data (passwords, tokens)
- Keep events forever (archive after 90 days)
- Ignore brute force patterns
- Assume single failure is attack
- Check logs manually (use automated scripts)

---

## Summary

With event logging in place:

✅ Real-time visibility into login attempts  
✅ Historical audit trail for compliance  
✅ Security threat detection  
✅ Performance monitoring  
✅ User behavior analytics  
✅ Automated alerting capabilities  
✅ Data-driven system improvements  

Monitor these events daily to maintain a secure and performant authentication system.

