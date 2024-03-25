#!/bin/bash

# Variables
SOURCE_REPO_URL="https://github.com/flxbl-io/sfp-pro.git"
TARGET_REPO_URL="https://github.com/flxbl-io/sfp.git"
COMMIT_SHA="$1"

# Ensure a commit SHA is provided
if [ -z "$COMMIT_SHA" ]; then
  echo "Please provide a commit SHA."
  exit 1
fi

# Create temporary directories for cloning
SOURCE_REPO_DIR=$(mktemp -d -t source-repo-XXXXXXXXXX)
TARGET_REPO_DIR=$(mktemp -d -t target-repo-XXXXXXXXXX)

# Function to cleanup temporary directories
cleanup() {
  echo "Cleaning up temporary directories..."
  rm -rf "$SOURCE_REPO_DIR"
  rm -rf "$TARGET_REPO_DIR"
}
trap cleanup EXIT

# Clone the source and target repos
gh repo clone "$SOURCE_REPO_URL" "$SOURCE_REPO_DIR"
gh repo clone "$TARGET_REPO_URL" "$TARGET_REPO_DIR"

# Change to the source repository directory and get the commit message
cd "$SOURCE_REPO_DIR" || exit
COMMIT_MESSAGE=$(git log --format=%B -n 1 "$COMMIT_SHA")

# Change to the target repository directory
cd "$TARGET_REPO_DIR" || exit

# Create and switch to a new temporary branch from main
git checkout main
git pull origin main
TEMP_BRANCH="cherry-pick-${COMMIT_SHA:0:7}-$(date +%Y%m%d%H%M%S)"
git checkout -b "$TEMP_BRANCH"

# Cherry-pick the commit from the source repository
git --git-dir="$SOURCE_REPO_DIR/.git" format-patch -k -1 --stdout "$COMMIT_SHA" | git am

# Push the new branch to the target repository
git push origin "$TEMP_BRANCH"

# Create a pull request using GitHub CLI with the commit message as the title
gh pr create -R flxbl-io/sfp --base main --head "$TEMP_BRANCH" --title "$COMMIT_MESSAGE" --body "$COMMIT_MESSAGE Cherry-picked commit $COMMIT_SHA"

echo "Pull request created for branch $TEMP_BRANCH with the title: $COMMIT_MESSAGE"
