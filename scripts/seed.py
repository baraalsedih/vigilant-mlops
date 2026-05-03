"""Seed the database by calling the reporter evaluation endpoints in order."""

import argparse
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

BACKEND_URL = "http://localhost:8000/api/v1"
ML_SERVE_PORT = 8001
NOTEBOOKS = Path(__file__).parent.parent / "notebooks"
ML_SERVE_DIR = Path(__file__).parent.parent / "apps" / "ml-serve"

STEPS = 5
STAGE_EVALUATE_DATA = "evaluate-data"
STAGE_EVALUATE_MODEL = "evaluate-model"
STAGE_EVALUATE_DRIFT = "evaluate-drift"
VALID_STAGES = {STAGE_EVALUATE_DATA, STAGE_EVALUATE_MODEL, STAGE_EVALUATE_DRIFT}

_SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


def _get(url: str) -> bool:
    import urllib.request
    try:
        urllib.request.urlopen(url, timeout=3)
        return True
    except Exception:
        return False


def _spin(label: str, stop: threading.Event, start: float) -> None:
    i = 0
    while not stop.is_set():
        elapsed = int(time.time() - start)
        frame = _SPINNER[i % len(_SPINNER)]
        print(f"\r  {frame} {label} — {elapsed}s", end="", flush=True)
        i += 1
        time.sleep(0.1)


def _skip(step: int, label: str) -> None:
    print(f"\n=== [{step}/{STEPS}] {label} ===")
    print("  — skipped")


def _post(step: int, label: str, url: str, body: dict | None = None, timeout: int = 60) -> None:
    import urllib.request
    import urllib.error

    header = f"[{step}/{STEPS}] {label}"
    print(f"\n=== {header} ===")

    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    start = time.time()
    stop = threading.Event()
    spinner = threading.Thread(target=_spin, args=("Waiting...", stop, start), daemon=True)
    spinner.start()

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = int(time.time() - start)
            body = json.loads(resp.read())
            stop.set()
            spinner.join()
            print(f"\r  ✓ Done in {elapsed}s — HTTP {resp.status}          ")
            print(json.dumps(body, indent=2))
    except urllib.error.HTTPError as exc:
        elapsed = int(time.time() - start)
        body = exc.read().decode()
        stop.set()
        spinner.join()
        print(f"\r  ✗ Failed in {elapsed}s — HTTP {exc.code}          ")
        print(body)
        sys.exit(1)
    except Exception as exc:
        elapsed = int(time.time() - start)
        stop.set()
        spinner.join()
        print(f"\r  ✗ Error after {elapsed}s: {exc}          ")
        sys.exit(1)
    print()


def _start_ml_serve() -> None:
    if _get(f"http://localhost:{ML_SERVE_PORT}/health"):
        print(f"ml-serve already running on port {ML_SERVE_PORT}.")
        return

    print(f"Starting ml-serve on port {ML_SERVE_PORT}...")
    subprocess.Popen(
        [".venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(ML_SERVE_PORT)],
        cwd=ML_SERVE_DIR,
    )
    for _ in range(30):
        if _get(f"http://localhost:{ML_SERVE_PORT}/health"):
            print("ml-serve is up.")
            return
        time.sleep(1)
    print("ERROR: ml-serve did not start in time.", file=sys.stderr)
    sys.exit(1)


def _parse_args() -> set[str]:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skip",
        metavar="STAGE",
        action="append",
        default=[],
        help=(
            f"Skip a stage. Can be repeated. Valid stages: "
            f"{', '.join(sorted(VALID_STAGES))}"
        ),
    )
    args = parser.parse_args()
    unknown = set(args.skip) - VALID_STAGES
    if unknown:
        parser.error(
            f"Unknown stage(s): {', '.join(sorted(unknown))}. "
            f"Valid stages: {', '.join(sorted(VALID_STAGES))}"
        )
    return set(args.skip)


def main() -> None:
    skip = _parse_args()

    print("Checking backend on port 8000...")
    if not _get("http://localhost:8000/openapi.json"):
        print("ERROR: backend not running — start it with: make dev-backend", file=sys.stderr)
        sys.exit(1)

    _start_ml_serve()

    if STAGE_EVALUATE_DATA in skip:
        _skip(1, "evaluate-data")
    else:
        _post(
            1,
            "evaluate-data (raw CSV stages may take several minutes)",
            f"{BACKEND_URL}/reporter/evaluate-data",
            timeout=1800,
        )

    if STAGE_EVALUATE_MODEL in skip:
        _skip(2, "evaluate-model")
    else:
        _post(2, "evaluate-model", f"{BACKEND_URL}/reporter/evaluate-model", timeout=360)

    for i, example in enumerate(["example1.json", "example2.json", "example3.json"], start=3):
        if STAGE_EVALUATE_DRIFT in skip:
            _skip(i, f"evaluate-drift — {example}")
        else:
            body = json.loads((NOTEBOOKS / example).read_text())
            _post(i, f"evaluate-drift — {example}", f"{BACKEND_URL}/reporter/evaluate-drift", body=body)

    print("=== Seed complete ===")


if __name__ == "__main__":
    main()
