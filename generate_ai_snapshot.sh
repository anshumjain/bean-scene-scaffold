#!/bin/bash

# Create folder to store output
mkdir -p ai_snapshot

# Output file
OUTPUT_FILE="ai_snapshot/full_repo.txt"
> $OUTPUT_FILE

# Directories to include
DIRS=("src" "api" "scripts")

for DIR in "${DIRS[@]}"; do
  if [ -d "$DIR" ]; then
    find "$DIR" -type f | while read FILE; do
      echo "=== FILE: $FILE ===" >> $OUTPUT_FILE
      cat "$FILE" >> $OUTPUT_FILE
      echo -e "\n\n" >> $OUTPUT_FILE
    done
  fi
done

echo "All files combined into $OUTPUT_FILE"
