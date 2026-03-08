#!/bin/sh
echo "Initializing database..."
node init-db.js
echo "Starting server..."
exec node server.js
