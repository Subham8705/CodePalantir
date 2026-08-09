"""Debug arrow functions."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services.parser.treesitter_manager import manager
from services.parser.js_ts_extractor import _try_parse_arrow_function, _extract_params

code = b"const add = (a, b) => a + b;\n"
parser = manager.get_parser("javascript")
tree = parser.parse(code)

decl = tree.root_node.children[0]
var_decl = decl.children[1]

print("Calling _try_parse_arrow_function...")
result = _try_parse_arrow_function(var_decl, code)
print(f"Result: {result}")
