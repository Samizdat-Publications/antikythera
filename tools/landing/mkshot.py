"""Write one Playwright shot script from film_tpl.js and a JSON shot definition (see shots.json).
Run the script with the Playwright MCP browser_run_code_unsafe(filename=...) against the dev server."""
import json, sys, os
S = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(S, "film_tpl.js"), encoding="utf-8").read()
P = json.loads(sys.argv[1])
open(os.path.join(r"C:/Users/stewa/Documents/Claude/Blender Tests/antikythera/.playwright-mcp/shots", P["name"] + ".js"), "w", encoding="utf-8").write(tpl.replace("__PARAMS__", json.dumps(P)))
print(os.path.join(r"C:/Users/stewa/Documents/Claude/Blender Tests/antikythera/.playwright-mcp/shots", P["name"] + ".js").replace("\\", "/"))
