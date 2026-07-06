from enum import Enum


class SelectedResult(str, Enum):
    correct = "correct"
    incorrect = "incorrect"
    skipped = "skipped"


class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
