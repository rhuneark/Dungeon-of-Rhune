#!/usr/bin/env bash
# Dungeon of Rhune: pull the latest version from GitHub into this folder.
# Run it (./update.sh), then switch to the Godot editor (it reloads changed files).
# Edits you made locally are kept: they are stashed for the update and re-applied.
set -euo pipefail

main() {

	BRANCH="claude/trusting-cray-6gvlg9"
	REPO="https://github.com/rhuneark/Dungeon-of-Rhune.git"
	cd "$(dirname "$0")"

	command -v git >/dev/null || { echo "Git is not installed."; exit 1; }
	if [ ! -d .git ]; then
	  echo "This folder is not a Git clone. Make one with:"
	  echo "  git clone -b $BRANCH $REPO"
	  exit 1
	fi

	echo "Fetching $BRANCH from GitHub..."
	git fetch origin "+$BRANCH:refs/remotes/origin/$BRANCH"

	current="$(git rev-parse --abbrev-ref HEAD)"
	if [ "$current" != "$BRANCH" ]; then
	  echo "Switching this folder from $current to $BRANCH..."
	  if ! git diff --quiet HEAD; then
	    echo "Saving your local changes on $current with git stash (see: git stash list)."
	    git stash push -m "local changes on $current before switching to $BRANCH"
	  fi
	  if git rev-parse --verify --quiet "refs/heads/$BRANCH" >/dev/null; then
	    git checkout "$BRANCH"
	  else
	    git checkout -b "$BRANCH" --track "origin/$BRANCH"
	  fi
	fi

	if ! git merge --ff-only --autostash "origin/$BRANCH"; then
	  echo
	  echo "This folder has commits that are not on GitHub, so it can't simply move forward."
	  echo "Push them first (git push), then run this again."
	  exit 1
	fi

	# Folders left over from the old web version would make Godot import junk.
	for d in node_modules dist release; do [ -d "$d" ] && : > "$d/.gdignore"; done

	echo
	echo "Up to date:"
	git log -1 --format="  %h  %s  (%cr)"
	echo "Open project.godot in Godot 4.7, or switch back to the editor if it is already open."
}

# Wrapped in a function so bash parses it all before the update can rewrite this file.
main "$@"
exit
