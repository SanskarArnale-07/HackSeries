#!/usr/bin/env python3
"""TRAJACTRA Demonstration Launcher.

Launches both the FastAPI Astrodynamics backend and the React/Vite dashboard concurrently.
Supports an offline air-gapped demonstration mode via `--offline`.
"""

import argparse
import os
import signal
import subprocess
import sys
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

    project_root = Path(__file__).resolve().parent
    frontend_dir = project_root / "frontend"

    print("=" * 70)
    print("  TRAJACTRA: Orbital Intelligence & Conjunction Analysis Engine")
    print("=" * 70)

    env = os.environ.copy()
    if args.offline:
        env["OFFLINE_MODE"] = "true"
        print("  [MODE] Air-Gapped / Offline Demonstration Mode Enabled")
        print("  - Upstream network fetches disabled")
        print("  - Serving local verified fixtures from data/fixtures/")
    else:
        print("  [MODE] Online Mode (with automatic fallback to local fixtures)")

    print("-" * 70)
    print("  Starting Services:")
    print("  • Backend API:        http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs)")
    print("  • Frontend Dashboard: http://localhost:3000")
    print("=" * 70)
    print("  Press Ctrl+C to stop all services.\n")

    # Start FastAPI Backend
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--reload"
    ]

    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(project_root),
        env=env
    )

    # Ensure Windows PATH includes Node.js even if launched from a pre-install shell
    if sys.platform == "win32":
        extra_paths = []
        default_node = Path("C:/Program Files/nodejs")
        if default_node.exists():
            extra_paths.append(str(default_node))
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as k:
                extra_paths.append(winreg.QueryValueEx(k, "Path")[0])
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as k:
                extra_paths.append(winreg.QueryValueEx(k, "Path")[0])
        except Exception:
            pass
        if extra_paths:
            env["PATH"] = ";".join(extra_paths) + ";" + env.get("PATH", "")
            os.environ["PATH"] = env["PATH"]

    # Start Vite Frontend
    import shutil
    npm_path = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_path and sys.platform == "win32":
        default_npm = Path("C:/Program Files/nodejs/npm.cmd")
        if default_npm.exists():
            npm_path = str(default_npm)

    npm_cmd = npm_path or ("npm.cmd" if sys.platform == "win32" else "npm")
    frontend_cmd = [npm_cmd, "run", "dev", "--", "--port", "3000"]

    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(frontend_dir),
        env=env,
        shell=(sys.platform == "win32")
    )

    try:
        while True:
            time.sleep(0.5)
            # Check if any process exited prematurely
            if backend_proc.poll() is not None:
                print(f"\n[Backend exited with code {backend_proc.returncode}]")
                break
            if frontend_proc.poll() is not None:
                print(f"\n[Frontend exited with code {frontend_proc.returncode}]")
                break
    except KeyboardInterrupt:
        print("\n[Shutting down services...]")
    finally:
        for proc, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            if proc and proc.poll() is None:
                print(f"Terminating {name}...")
                if sys.platform == "win32":
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
                else:
                    proc.terminate()
                    try:
                        proc.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        proc.kill()
        print("All services stopped.")

if __name__ == "__main__":
    main()
