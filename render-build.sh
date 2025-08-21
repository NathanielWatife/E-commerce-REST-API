
#!/usr/bin/env bash

# Clean install dependencies
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
npm install --production=false