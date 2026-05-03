"""Drop and re-apply the DuckDB schema from .env config."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def _load_env() -> dict[str, str]:
    env_file = ROOT / ".env"
    if not env_file.exists():
        print("ERROR: .env not found at project root.", file=sys.stderr)
        sys.exit(1)
    result = {}
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip()
    return result


def main() -> None:
    env = _load_env()
    db_path = ROOT / env["DB_PATH"]
    schema_path = ROOT / env["SCHEMA_PATH"]

    if not schema_path.exists():
        print(f"ERROR: schema not found at {schema_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Resetting database: {db_path}")
    if db_path.exists():
        db_path.unlink()

    import duckdb
    conn = duckdb.connect(str(db_path))
    conn.execute(schema_path.read_text())
    conn.close()
    print(f"Done — {db_path} reset.")


if __name__ == "__main__":
    main()
