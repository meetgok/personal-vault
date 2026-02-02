#!/bin/bash

# Personal Vault Sync Host Launcher

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔐 Personal Vault Sync Host${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    
    # Generate random token
    RANDOM_TOKEN=$(openssl rand -hex 16)
    
    cat > .env << EOF
SYNC_PORT=3000
SYNC_TOKEN=${RANDOM_TOKEN}
EOF
    
    echo -e "${GREEN}✅ Created .env file with random token${NC}"
    echo -e "${YELLOW}📝 Your auth token: ${RANDOM_TOKEN}${NC}"
    echo -e "${YELLOW}💡 Save this token - you'll need it to connect clients${NC}"
    echo ""
fi

# Load environment variables
export $(cat .env | xargs)

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Start server
echo -e "${GREEN}🚀 Starting sync host server...${NC}"
echo ""
npm start
