# Dataset Sources

Place your CSV files here after downloading from Kaggle:

## Required Files

1. **player_profiles.csv** (or **players.csv**)
   - Contains: player_id, player_name, player_slug
   - Size: ~45k players
   - Source: https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets

2. **player_teammates_played_with.csv**
   - Contains: player_id, player_with_url, player_with_name, minutes_played_with, joint_goal_participation
   - Size: ~1.2M relationships
   - Source: https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets

## Download Instructions

See `packages/etl/README.md` for detailed download instructions.

## .gitignore

This folder is in .gitignore to avoid committing large CSV files to git.
