"""
TreeSitter Language Manager for CodeCompass.

Manages tree-sitter Language and Parser instances for multiple programming languages.
Supports Python, JavaScript, TypeScript, and TSX out of the box.
"""

from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript


class TreeSitterManager:
    """
    Singleton-style manager that holds pre-initialized Language and Parser
    instances for each supported language. Call `get_parser(lang)` to get
    a ready-to-use parser.
    """

    _languages: dict[str, Language] = {}
    _parsers: dict[str, Parser] = {}

    # Map file extensions → language key
    EXTENSION_MAP: dict[str, str] = {
        ".py":   "python",
        ".js":   "javascript",
        ".jsx":  "javascript",
        ".ts":   "typescript",
        ".tsx":  "tsx",
        ".mjs":  "javascript",
        ".cjs":  "javascript",
    }

    # Languages we can parse
    SUPPORTED_LANGUAGES = {"python", "javascript", "typescript", "tsx"}

    def __init__(self):
        self._init_languages()

    def _init_languages(self):
        """Lazily initialise the Language objects from compiled grammars."""
        if self._languages:
            return  # Already initialised

        self._languages["python"] = Language(tspython.language())
        self._languages["javascript"] = Language(tsjavascript.language())
        self._languages["typescript"] = Language(tstypescript.language_typescript())
        self._languages["tsx"] = Language(tstypescript.language_tsx())

    def get_language(self, lang_key: str) -> Language | None:
        """Return the Language object for the given language key."""
        return self._languages.get(lang_key)

    def get_parser(self, lang_key: str) -> Parser | None:
        """Return a Parser configured for the given language key."""
        if lang_key not in self._languages:
            return None

        if lang_key not in self._parsers:
            self._parsers[lang_key] = Parser(self._languages[lang_key])

        return self._parsers[lang_key]

    def language_for_file(self, filename: str) -> str | None:
        """Determine the language key from a filename's extension."""
        for ext, lang in self.EXTENSION_MAP.items():
            if filename.endswith(ext):
                return lang
        return None

    def can_parse(self, filename: str) -> bool:
        """Check whether we have a grammar for this file type."""
        return self.language_for_file(filename) is not None


# Module-level singleton so all services share one manager
manager = TreeSitterManager()
