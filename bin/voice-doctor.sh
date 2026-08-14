#!/usr/bin/env bash
# Step 1 of the voice layer: find out what this machine already has.
# READ-ONLY. Installs nothing, downloads nothing, changes nothing.
# Run it, read it, then decide what to install.

set -uo pipefail

bold=$'\033[1m'; dim=$'\033[2m'; grn=$'\033[32m'; ylw=$'\033[33m'; red=$'\033[31m'; off=$'\033[0m'
ok()   { printf '  %sok%s    %s\n'   "$grn" "$off" "$*"; }
warn() { printf '  %s··%s    %s\n'   "$ylw" "$off" "$*"; }
miss() { printf '  %sno%s    %s\n'   "$red" "$off" "$*"; }
head_() { printf '\n%s%s%s\n' "$bold" "$*" "$off"; }

printf '%sFriday voice layer — machine report%s\n' "$bold" "$off"
printf '%s%s%s\n' "$dim" "$(date '+%Y-%m-%d %H:%M')" "$off"

head_ "Machine"
os=$(uname -s)
if [ "$os" = "Darwin" ]; then
  ok "macOS $(sw_vers -productVersion) on $(uname -m)"
  chip=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo unknown)
  ram=$(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1073741824 ))
  ok "$chip · ${ram} GB RAM"
  [ "$(uname -m)" = "arm64" ] && ok "Apple silicon — whisper.cpp will use Metal" \
                              || warn "Intel — expect 3-5x slower transcription, prefer a small model"
  free=$(df -h / | awk 'NR==2{print $4}')
  ok "free disk ${free} (models need ~1-3 GB)"
else
  warn "not macOS ($os) — this script targets macOS; commands below will differ"
  ram=$(( $(getconf _PHYS_PAGES 2>/dev/null || echo 0) * $(getconf PAGE_SIZE 2>/dev/null || echo 0) / 1073741824 ))
  ok "${ram} GB RAM"
fi

head_ "Toolchain"
for t in brew python3 git cmake ffmpeg sox claude; do
  if command -v "$t" >/dev/null 2>&1; then
    case "$t" in
      python3) ok "python3 $(python3 -V 2>&1 | awk '{print $2}')" ;;
      claude)  ok "claude CLI $(claude --version 2>/dev/null | head -1)" ;;
      *)       ok "$t $(command -v $t)" ;;
    esac
  else
    case "$t" in
      brew)   miss "brew — needed to install everything else: https://brew.sh" ;;
      claude) miss "claude CLI — the voice loop has nothing to talk to without it" ;;
      sox)    warn "sox — preferred recorder (brew install sox); ffmpeg can stand in" ;;
      ffmpeg) warn "ffmpeg — fallback recorder (brew install ffmpeg)" ;;
      cmake)  warn "cmake — only needed if building whisper.cpp from source" ;;
      *)      miss "$t" ;;
    esac
  fi
done

head_ "Speech to text"
found_stt=0
for b in whisper-cli whisper-cpp main; do
  command -v "$b" >/dev/null 2>&1 && { ok "whisper.cpp binary: $(command -v $b)"; found_stt=1; }
done
python3 -c 'import faster_whisper' 2>/dev/null && { ok "faster-whisper python package"; found_stt=1; }
[ "$found_stt" = 0 ] && miss "no local STT installed"
for d in "$HOME/.friday/models" "$HOME/Library/Application Support/whisper" /opt/homebrew/share/whisper-cpp; do
  [ -d "$d" ] && find "$d" -name 'ggml-*.bin' 2>/dev/null | while read -r m; do
    ok "model $(basename "$m") ($(du -h "$m" | cut -f1))"
  done
done

head_ "Text to speech"
found_tts=0
for b in piper kokoro; do
  command -v "$b" >/dev/null 2>&1 && { ok "$b: $(command -v $b)"; found_tts=1; }
done
python3 -c 'import piper' 2>/dev/null && { ok "piper python package"; found_tts=1; }
[ "$found_tts" = 0 ] && miss "no local TTS installed"
ls "$HOME/.friday/voices"/*.onnx >/dev/null 2>&1 && ok "piper voices in ~/.friday/voices" \
  || warn "no piper voice files yet"
command -v say >/dev/null 2>&1 && ok "macOS 'say' available as a stopgap (not the local voice you asked for, but it works today)"

head_ "Audio devices"
if [ "$os" = "Darwin" ]; then
  system_profiler SPAudioDataType 2>/dev/null | grep -E '^\s{8}\S.*:$' | sed 's/://; s/^ */  ·     /' | head -8
  warn "microphone access must be granted to your terminal in System Settings › Privacy & Security › Microphone"
fi

head_ "Hotkey"
python3 -c 'import pynput' 2>/dev/null \
  && ok "pynput installed — true hold-to-talk available (needs Accessibility permission)" \
  || warn "pynput missing — falls back to press-Enter-to-toggle, which needs no permissions"

head_ "Recommendation"
if [ "${ram:-0}" -ge 16 ] && [ "$(uname -m)" = "arm64" ]; then
  echo "  STT   ggml-large-v3-turbo-q5_0  (~570 MB, near-realtime on Apple silicon)"
elif [ "${ram:-0}" -ge 8 ]; then
  echo "  STT   ggml-small.en-q5_1  (~180 MB, good accuracy, comfortable headroom)"
else
  echo "  STT   ggml-base.en-q5_1  (~60 MB, fastest, weakest on names and jargon)"
fi
echo "  TTS   piper + en_GB-alba-medium  (~60 MB, calm, low latency)"
echo
printf '%sNothing was installed. When this looks right, run bin/voice-setup.sh — it confirms before each step.%s\n' "$dim" "$off"
