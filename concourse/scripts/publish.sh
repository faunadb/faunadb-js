#!/bin/sh

set -eou

cd ./fauna-js-repository

mkdir dist
npm install
npm run browserify
npm run browserify-min

PACKAGE_VERSION=$(node -p -e "require('./package.json').version")
NPM_LATEST_VERSION=$(npm view faunadb version)
echo "Current package version: $PACKAGE_VERSION"
echo "Latest version in npm: $NPM_LATEST_VERSION"

if [ "$PACKAGE_VERSION" \> "$NPM_LATEST_VERSION" ]
then
  echo "Publishing a new version..."
  echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
  # npm publish --dry-run
  rm .npmrc
else
  echo "NPM package already published on npm with version ${NPM_LATEST_VERSION}" 1>&2
  exit 1
fi
