#!/usr/bin/env bash
# ============================================================
#  tawfir factory UI - one-command merge into tawfir-front
#  Usage (from the extracted package folder):
#      bash merge.sh /path/to/tawfir-front
# ============================================================
set -euo pipefail
T="${1:-}"
if [ -z "$T" ] || [ ! -f "$T/package.json" ]; then
  echo "Usage: bash merge.sh /path/to/tawfir-front  (folder containing package.json)"
  exit 1
fi
# work from the package folder itself (independent of caller's cwd)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "=== Merging tawfir factory UI into $T (from $SCRIPT_DIR) ==="

mkdir -p "$T/src/lib" "$T/src/store" "$T/src/components/ui" "$T/src/app" "$T/scripts" "$T/public"
cp -r src/lib/factory          "$T/src/lib/"
cp    src/store/session.ts     "$T/src/store/session.ts"
cp -r src/components/factory   "$T/src/components/"
cp    src/components/ui/sonner.tsx "$T/src/components/ui/sonner.tsx"
cp -r "src/app/(factory)"         "$T/src/app/"
cp -r "src/app/(factory-console)" "$T/src/app/"
cp    scripts/apply-factory-manifest.mjs "$T/scripts/"
cp -r public/factory           "$T/public/"
[ -d factory-evidence ] && cp -r factory-evidence "$T/" || true

echo ""
echo "[OK] Merge complete - nothing in the existing files was touched."
echo "Next steps:"
echo "  1) cd $T"
echo "  2) git checkout -b factory-ui      (recommended safety branch)"
echo "  3) bun install"
echo "  4) bun run dev"
echo "  5) open http://localhost:3000/factory   (factory hub)"
echo "     open http://localhost:3000/console   (isolated console)"
