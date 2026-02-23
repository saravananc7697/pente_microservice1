#!/bin/sh
# Use default PORT 8080 if not specified
exec node dist/src/main.js --port ${PORT:-8080}
