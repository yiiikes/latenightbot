#!/bin/bash
cd /vercel/share/v0-project
rm -f pnpm-lock.yaml
pnpm install --no-frozen-lockfile
