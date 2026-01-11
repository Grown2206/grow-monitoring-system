# Nginx Reverse Proxy Configuration

## Overview

This Nginx configuration provides:
- **SSL/TLS encryption** for all traffic
- **Reverse proxy** for frontend and backend services
- **WebSocket support** for Socket.io connections
- **Rate limiting** to prevent abuse
- **Security headers** (HSTS, X-Frame-Options, etc.)
- **Let's Encrypt** support via Certbot

## Development vs Production

### Development (Self-Signed Certificate)
The Dockerfile automatically generates a self-signed certificate for local development.

**Browser Warning:** You'll see a security warning - this is expected. Click "Advanced" and proceed.

### Production (Let's Encrypt)

1. **Update domain name** in `conf.d/grow-system.conf`:
   ```nginx
   server_name grow.yourdomain.com;
   ```

2. **Add Certbot service** to `docker-compose.yml`:
   ```yaml
   certbot:
     image: certbot/certbot
     volumes:
       - ./certbot/conf:/etc/letsencrypt
       - ./certbot/www:/var/www/certbot
     entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
   ```

3. **Get initial certificate**:
   ```bash
   docker-compose run --rm certbot certonly --webroot \
     --webroot-path=/var/www/certbot \
     --email admin@yourdomain.com \
     --agree-tos \
     --no-eff-email \
     -d grow.yourdomain.com
   ```

4. **Update SSL paths** in `conf.d/grow-system.conf`:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/grow.yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/grow.yourdomain.com/privkey.pem;
   ```

5. **Reload Nginx**:
   ```bash
   docker-compose exec nginx nginx -s reload
   ```

## Rate Limiting

- **API endpoints**: 10 requests/second with burst of 10
- **General traffic**: 50 requests/second with burst of 20

Adjust in `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
```

## Security Headers

- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection

**HSTS** is commented out by default. Enable after confirming HTTPS works:
```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
```

## Monitoring

Check Nginx logs:
```bash
docker-compose logs -f nginx
```

Test configuration:
```bash
docker-compose exec nginx nginx -t
```

Reload without downtime:
```bash
docker-compose exec nginx nginx -s reload
```
