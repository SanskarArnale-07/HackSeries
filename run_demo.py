#!/usr/bin/env python3
"""TRAJACTRA Demonstration Launcher.

Launches the FastAPI astrodynamics backend and the Vite React frontend concurrently.
Supports an offline air-gapped demonstration mode via `--offline`.
"""

import sys
import os
import argparse
import subprocess
import signal
import time
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="TRAJACTRA Single-Command Demonstration Launcher")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Run in air-gapped demonstration mode using validated local offline fixtures"
    )
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent
    frontend_dir = root_dir / "frontend"

    env = os.environ.copy()
    if args.offline:
        env["OFFLINE_MODE"] = "true"
        print("[DEMO LAUNCHER] Starting in OFFLINE / AIR-GAPPED mode.")
    else:
        print("[DEMO LAUNCHER] Starting in LIVE mode (fallback enabled).")

    print("[DEMO LAUNCHER] Spawning Backend server on port 8000...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=str(root_dir), env=env)

    print("[DEMO LAUNCHER] Spawning Frontend development server on port 3000...")
    # On Windows npm is npm.cmd
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_cmd, "run", "dev", "--", "--port", "3000"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(frontend_dir), env=env)

    print("\n" + "=" * 60)
    print(" TRAJACTRA Orbital Conjunction Engine is Running")
    print(" Backend:  http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/docs)")
    print(" Frontend: http://localhost:3000")
    print("=" * 60)
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("[DEMO LAUNCHER] Backend exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[DEMO LAUNCHER] Frontend exited unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[DEMO LAUNCHER] Terminating servers...")
    finally:
        for proc in (backend_proc, frontend_proc):
            if proc.poll() is None:
                if sys.platform == "win32":
                    proc.terminate()
                else:
                    os.kill(proc.pid, signal.SIGTERM)
        print("[DEMO LAUNCHER] Demonstration shutdown complete.")

if __name__ == "__main__":
    main()
