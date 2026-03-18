#!/bin/sh
# Run this ONCE after first `docker compose up garage`
# It configures the Garage node, creates access keys and a bucket.

set -e

CONTAINER="menurest-garage"
BUCKET="menurest-photos"

echo "=== Garage Init ==="

# 1. Get node ID and configure layout
NODE_ID=$(docker exec $CONTAINER garage node id -q 2>/dev/null | head -1)
SHORT_ID=$(echo "$NODE_ID" | cut -c1-16)
echo "Node ID: $SHORT_ID"

docker exec $CONTAINER garage layout assign "$SHORT_ID" -z dc1 -c 1G
docker exec $CONTAINER garage layout apply --version 1
echo "Layout configured."

# 2. Create API key
KEY_OUTPUT=$(docker exec $CONTAINER garage key create menurest-key)
echo "$KEY_OUTPUT"

ACCESS_KEY=$(echo "$KEY_OUTPUT" | grep "Key ID:" | awk '{print $3}')
SECRET_KEY=$(echo "$KEY_OUTPUT" | grep "Secret key:" | awk '{print $3}')
echo ""
echo "Access Key: $ACCESS_KEY"
echo "Secret Key: $SECRET_KEY"

# 3. Create bucket and allow key
docker exec $CONTAINER garage bucket create "$BUCKET"
docker exec $CONTAINER garage bucket allow "$BUCKET" --read --write --owner --key menurest-key
echo "Bucket '$BUCKET' created and linked to key."

# 4. Set public read policy (anonymous GET)
docker exec $CONTAINER garage bucket website "$BUCKET" --allow
echo "Public read enabled."

echo ""
echo "=== Done! Add these to your .env ==="
echo "MINIO_ENDPOINT=garage"
echo "MINIO_PORT=3900"
echo "MINIO_USE_SSL=false"
echo "MINIO_USER=$ACCESS_KEY"
echo "MINIO_PASSWORD=$SECRET_KEY"
echo "MINIO_BUCKET=$BUCKET"
echo "MINIO_PUBLIC_URL=http://localhost:3900"
