# Deployment Guide

## Quick Deploy

### Local Development
```bash
git clone <repository>
cd project-speckit
npm install
cp .env.example .env
npm run dev
```

### Production Setup
```bash
# 1. Environment
export NODE_ENV=production
export JWT_SECRET=$(openssl rand -hex 32)
export MONGODB_URI="mongodb://localhost:27017/speckit"

# 2. Build & Start
npm run build
npm start

# 3. Process Management (PM2)
npm install -g pm2
pm2 start ecosystem.config.js
```

## Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-64-char-secret
JWT_EXPIRES_IN=24h
MONGODB_URI=mongodb://mongo:27017/speckit
```

## Health Checks
- `GET /health` - Service status
- `GET /auth/health` - Auth service status

## Monitoring
- CPU/Memory usage
- Database connections
- API response times
- Error rates
- Security alerts

## Backup Strategy
- Database: Daily MongoDB dumps
- Environment configs
- SSL certificates
- Application logs