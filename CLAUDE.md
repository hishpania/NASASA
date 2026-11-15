# CLAUDE.md

Monorepo: `Backend/` (.NET 10, C#), `Frontend/` (React, TypeScript), `Model/` (Python). See [README.md](README.md).

## Principles

### Laconic
- Write the least code that does the job.
- Comment only the non-obvious "why", in one line. No comments that restate code.

### Simple
- Prefer the simplest design that works. No speculative abstractions, layers, config, or options.
- Reuse existing code and project conventions before adding anything new.
- Use well-maintained dependencies freely when they simplify the code. Don't hand-roll what a good library already does.

### Defensive
- Treat all external input (HTTP, files, env, model output) as untrusted; validate at the boundary.
- Fail loudly and early. No silent catches, no swallowed errors.
- Never use unsafe deserialization or execution: no `pickle`, `marshal`, `shelve`, `yaml.load` (use `safe_load`), `eval`/`exec`, `BinaryFormatter`, or `shell=True` with user data.
- Use parameterized queries, never string-built SQL. Keep secrets out of code and logs.
- Prefer safe formats (JSON, Parquet, ONNX, safetensors) for data and models.

### Style
Follow Google's style guides per language, unless the repo's formatter/linter config (e.g. `.editorconfig`) says otherwise:
- Python: [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- TypeScript: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- C#: [Google C# Style Guide](https://google.github.io/styleguide/csharp-style.html)
- Also: [HTML/CSS](https://google.github.io/styleguide/htmlcssguide.html), [Shell](https://google.github.io/styleguide/shellguide.html)
