"""Client for the Blender Lab MCP add-on socket (lab_blender_org.mcp) on 127.0.0.1:9876.

Wire protocol (from mcp_to_blender_server.py):
    request : {"type": "execute", "code": <str>, "strict_json": <bool>} + b"\\0"
    response: {"status": "ok"|"error", "result": {...}, "stdout": ..., "stderr": ...} + b"\\0"

The executed code runs with a pre-seeded `result = {}` global; set it to a dict to
return data. Defining a callable `check_is_finished` defers the response until it
returns a dict (used for non-blocking renders).

Usage:
    python bl.py <script.py> [timeout_seconds]
    python bl.py <script.py> --set NAME=value [--set ...]
    python bl.py --probe

`--set` prepends a literal assignment to the script, which is how the same build
script gets pointed at a different character - the socket takes code, not
arguments.
"""
import json
import socket
import sys
import time

HOST, PORT = "127.0.0.1", 9876


def run_code(code, timeout=1800.0):
    payload = json.dumps({"type": "execute", "code": code, "strict_json": False}).encode("utf-8") + b"\0"
    s = socket.create_connection((HOST, PORT), timeout=20.0)
    s.settimeout(timeout)
    try:
        s.sendall(payload)
        buf = bytearray()
        while b"\0" not in buf:
            try:
                chunk = s.recv(65536)
            except socket.timeout:
                raise RuntimeError(f"no response from Blender within {timeout}s")
            if not chunk:
                raise RuntimeError("Blender closed the connection before responding")
            buf.extend(chunk)
        return json.loads(bytes(buf[:buf.index(b"\0")]).decode("utf-8"))
    finally:
        s.close()


def report(resp):
    for stream in ("stdout", "stderr"):
        text = resp.get(stream)
        if text:
            print(f"--- {stream} ---\n{text.rstrip()}")
    status = resp.get("status")
    if status == "ok":
        res = resp.get("result") or {}
        if res:
            print("--- result ---")
            print(json.dumps(res, indent=2, default=str)[:60000])
        return 0
    print(f"--- ERROR ---\n{resp.get('message', resp)}")
    return 1


if __name__ == "__main__":
    args = sys.argv[1:]
    t0 = time.time()
    if args and args[0] == "--probe":
        code = (
            "import bpy, sys\n"
            "result = {'blender': bpy.app.version_string, 'python': sys.version.split()[0],\n"
            "          'file': bpy.data.filepath or '<unsaved>',\n"
            "          'objects': len(bpy.data.objects), 'engine': bpy.context.scene.render.engine}\n"
        )
        rc = report(run_code(code, 60.0))
    else:
        sets, rest = [], []
        i = 1
        while i < len(args):
            if args[i] == "--set" and i + 1 < len(args):
                k, _, v = args[i + 1].partition("=")
                sets.append("%s = %r" % (k, v) + chr(10))
                i += 2
            else:
                rest.append(args[i])
                i += 1
        timeout = float(rest[0]) if rest else 1800.0
        with open(args[0], "r", encoding="utf-8") as fh:
            rc = report(run_code("".join(sets) + fh.read(), timeout))
    print(f"[elapsed {time.time() - t0:.1f}s]", file=sys.stderr)
    sys.exit(rc)
