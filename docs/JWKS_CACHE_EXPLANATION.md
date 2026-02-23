# JWKS Cache System Explanation

## Overview

The JWT verification in this admin service uses **JWKS (JSON Web Key Set)** with a smart caching mechanism to verify Cognito tokens **locally** without making API calls to AWS Cognito for every request.

## How It Works

### 1. **Initial Setup (Constructor)**

```typescript
this.jwksClient = new JwksClient({
  jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
  cache: true,              // Enable caching
  cacheMaxAge: 600000,      // Cache for 10 minutes (in milliseconds)
  rateLimit: true,          // Prevent abuse
  jwksRequestsPerMinute: 10 // Max 10 requests per minute to JWKS endpoint
});
```

### 2. **Token Verification Flow**

```
Request with JWT
    ↓
[1] Extract token from Authorization header
    ↓
[2] Decode token header (WITHOUT verification)
    ↓
[3] Get Key ID (kid) from token header
    ↓
[4] Check if public key for this kid is in CACHE
    ↓
    YES → Use cached key (FAST - no API call)
    NO  → Fetch from Cognito JWKS endpoint (SLOW - one API call)
    ↓
[5] Verify token signature using public key
    ↓
[6] Validate token claims (issuer, expiration, etc.)
    ↓
[7] Extract user data and attach to request
```

## Cache System Details

### **What Gets Cached?**

The **public keys** from AWS Cognito used to verify JWT signatures. Each key has a unique `kid` (Key ID).

**Example JWKS response from Cognito:**
```json
{
  "keys": [
    {
      "kid": "abc123",
      "kty": "RSA",
      "use": "sig",
      "n": "0vx7agoebGc...",
      "e": "AQAB"
    },
    {
      "kid": "def456",
      "kty": "RSA",
      "use": "sig",
      "n": "xjlXKHwH...",
      "e": "AQAB"
    }
  ]
}
```

### **Cache Lifecycle**

```
Time 0:00 - First request arrives
  ↓ Cache MISS
  ↓ Fetch key from Cognito (API call)
  ↓ Store key in cache with timestamp
  ↓ Verify token

Time 0:01 - Second request arrives
  ↓ Cache HIT (key stored 1 min ago)
  ↓ Use cached key (NO API call)
  ↓ Verify token

Time 0:05 - Hundredth request arrives
  ↓ Cache HIT (key stored 5 min ago)
  ↓ Use cached key (NO API call)
  ↓ Verify token

Time 0:11 - Next request arrives
  ↓ Cache EXPIRED (key stored 11 min ago, maxAge = 10 min)
  ↓ Fetch fresh key from Cognito (API call)
  ↓ Update cache with new timestamp
  ↓ Verify token
```

### **Cache Benefits**

| Metric | Without Cache | With Cache (10 min) |
|--------|---------------|---------------------|
| API Calls per 1000 requests | 1000 | ~2 |
| Average latency | ~200-500ms | ~5-10ms |
| Cognito API costs | High | Minimal |
| Resilience | Low (depends on Cognito) | High (works during Cognito issues) |

## Key Configuration Options

### **cacheMaxAge: 600000 (10 minutes)**

**Why 10 minutes?**
- Cognito keys rotate rarely (days/weeks)
- 10 minutes balances freshness vs performance
- If key rotates, old tokens may fail until cache refreshes

**Recommendations:**
- **Production:** 10-30 minutes
- **Development:** 5-10 minutes
- **High-security:** 5 minutes

### **rateLimit: true**

Prevents accidental DDoS of Cognito's JWKS endpoint:
- Max 10 requests per minute to JWKS
- If exceeded, uses cached key even if expired
- Protects against key rotation flood attacks

### **cache: true**

Enables in-memory caching of public keys.

**Alternative: External Cache**
For multi-instance deployments, consider Redis:

```typescript
import { JwksClient } from 'jwks-rsa';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const jwksClient = new JwksClient({
  jwksUri: '...',
  cache: true,
  cacheMaxAge: 600000,
  // Custom cache implementation
  getKeysFromCache: async (kid: string) => {
    const cached = await redis.get(`jwks:${kid}`);
    return cached ? JSON.parse(cached) : null;
  },
  storeKeyInCache: async (kid: string, key: any) => {
    await redis.set(`jwks:${kid}`, JSON.stringify(key), 'EX', 600);
  }
});
```

## Security Considerations

### ✅ **What's Secure?**

1. **Signature Verification**: Every token is cryptographically verified
2. **Public Key Trust**: Keys come directly from AWS Cognito (HTTPS)
3. **Issuer Validation**: Checks token is from correct Cognito pool
4. **Expiration Checks**: Rejects expired tokens
5. **Key Rotation**: Automatically handles Cognito key rotation

### ⚠️ **What to Monitor?**

1. **Cache Hit Rate**: Should be >95% in production
2. **Token Rejections**: Spike may indicate attack or key rotation
3. **JWKS Fetch Failures**: Could mean Cognito outage

```typescript
// Add monitoring in getSigningKey method
this.logger.info(
  { kid, fromCache: !!cachedKey },
  'JWKS key fetch'
);
```

## Comparison: JWKS vs Other Methods

### **Method 1: Call Auth Service (Your Old Approach)**

```
Request → Admin Service → Auth Service → Cognito GetUser API → Response
Latency: 200-500ms | Cost: High | Single Point of Failure: Yes
```

### **Method 2: JWKS with Cache (Current Implementation)**

```
Request → Admin Service (verify locally with cached key) → Response
Latency: 5-10ms | Cost: Minimal | Single Point of Failure: No
```

### **Method 3: Cognito GetUser API (Direct)**

```
Request → Admin Service → Cognito GetUser API → Response
Latency: 100-300ms | Cost: Medium | Single Point of Failure: No
```

## Real-World Performance Example

**Scenario:** 10,000 requests per hour

| Method | API Calls/hr | Avg Latency | Monthly Cost |
|--------|-------------|-------------|--------------|
| Call Auth Service | 10,000 | 250ms | $$ (2 hops) |
| JWKS (10min cache) | ~20 | 15ms | $ (minimal) |
| Cognito GetUser | 10,000 | 150ms | $$$ (AWS API) |

## Troubleshooting

### **Issue: "Unable to verify token"**

**Possible Causes:**
1. Cognito key rotation happened and cache hasn't refreshed
2. Invalid token format
3. Network issue fetching JWKS

**Fix:**
- Wait for cache to expire (max 10 min)
- Restart service to clear cache
- Check Cognito JWKS endpoint accessibility

### **Issue: High latency on first request**

**Expected Behavior:**
- First request per key rotation: ~200ms (fetches from Cognito)
- Subsequent requests: ~5-10ms (uses cache)

**Optimization:**
```typescript
// Pre-warm cache on service start
async onModuleInit() {
  try {
    // Trigger JWKS fetch before first real request
    await this.jwksClient.getSigningKeys();
    this.logger.info('JWKS cache pre-warmed');
  } catch (error) {
    this.logger.warn('Failed to pre-warm JWKS cache');
  }
}
```

## Environment Variables Used

```env
PS_AUTH_VAR_AWS_COGNITO_REGION=your-region
PS_AUTH_VAR_AWS_COGNITO_USER_POOL_ID=your-pool-id
```

**Security Note:** These are **public** identifiers, not secrets. The actual security comes from:
1. Token signature verification
2. Token expiration
3. Cognito user authentication

## Summary

The JWKS cache system is:
- ⚡ **Fast**: Verifies tokens in 5-10ms
- 💰 **Cheap**: Minimal API calls to Cognito
- 🔒 **Secure**: Full cryptographic verification
- 🏗️ **Scalable**: Works across thousands of instances
- 🛡️ **Resilient**: Continues working during Cognito outages (within cache window)

This is the **industry standard** for JWT verification in microservices!
