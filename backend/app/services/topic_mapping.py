from pathlib import Path


FILENAME_TO_TOPIC: dict[str, str] = {
    "Torts.pdf": "Torts",
    "Real-Property.pdf": "Real Property",
    "Evidence.pdf": "Evidence",
    "Criminal-Law-and-Procedure.pdf": "Criminal Law & Procedure",
    "Contracts-and-Sales.pdf": "Contracts & Sales",
    "Constitutional-Law.pdf": "Constitutional Law",
    "Civil-Procedure.pdf": "Civil Procedure",
}


def topic_from_filename(filename: str) -> str:
    basename = Path(filename).name
    if basename in FILENAME_TO_TOPIC:
        return FILENAME_TO_TOPIC[basename]

    stem = Path(basename).stem.replace("-", " ").strip()
    return stem.title()


def expected_subject_filenames() -> list[str]:
    return list(FILENAME_TO_TOPIC.keys())
