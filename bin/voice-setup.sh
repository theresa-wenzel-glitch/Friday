#!/usr/bin/env bash
# Steps 2-3 of the voice layer: install and test STT, then TTS.
# Every stage prints exactly what it will do and waits for a yes.
# Nothing is downloaded or installed without your explicit confirmation.

set -euo pipefail

FRIDAY_HOME="${FRIDAY_HOME:-$HOME/.friday}"
MODELS="$FRIDAY_HOME/models"
VOICES="$FRIDAY_HOME/voices"
bold=$'\033[1m'; dim=$'\033[2m'; off=$'\033[0m'

confirm() {
  printf '\n%s%s%s\n' "$bold" "$1" "$off"
  shift
  for line in "$@"; do printf '  %s\n' "$line"; done
  printf '\n%sproceed? [y/N] %s' "$dim" "$off"
  read -r a </dev/tty
  [[ "$a" =~ ^[Yy]$ ]] || { echo "skipped."; return 1; }
  return 0
}

command -v brew >/dev/null || { echo "Homebrew required: https://brew.sh"; exit 1; }
mkdir -p "$MODELS" "$VOICES"
echo "Model and voice files go in $FRIDAY_HOME (outside the vault — runtime assets, not memory)."

# ── stage 1: recorder ────────────────────────────────────────────────────────
if ! command -v rec >/dev/null 2>&1 && ! command -v ffmpeg >/dev/null 2>&1; then
  if confirm "Stage 1 — recorder" \
      "sox provides 'rec', which captures from the default input device." \
      "  brew install sox" \
      "~2 MB. Needed to record anything at all."; then
    brew install sox
  fi
fi

# ── stage 2: speech to text ──────────────────────────────────────────────────
STT_MODEL="${STT_MODEL:-ggml-large-v3-turbo-q5_0.bin}"
if confirm "Stage 2 — speech to text (whisper.cpp)" \
    "  brew install whisper-cpp        # the engine, runs on Metal" \
    "  curl -> $MODELS/$STT_MODEL" \
    "Model is ~570 MB and downloads from huggingface.co/ggerganov/whisper.cpp." \
    "Audio never leaves the machine once this is in place — the download is the model, not your voice." \
    "Override the model with STT_MODEL=ggml-small.en-q5_1.bin before running."; then
  command -v whisper-cli >/dev/null 2>&1 || brew install whisper-cpp
  if [ ! -f "$MODELS/$STT_MODEL" ]; then
    curl -L --fail --progress-bar \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$STT_MODEL" \
      -o "$MODELS/$STT_MODEL"
  else
    echo "model already present, skipping download"
  fi

  echo
  echo "${bold}Test — say something for 4 seconds after the beep.${off}"
  read -r -p "  press return when ready " _ </dev/tty
  afplay /System/Library/Sounds/Tink.aiff 2>/dev/null || true
  rec -q -r 16000 -c 1 -b 16 "$FRIDAY_HOME/test.wav" trim 0 4 2>/dev/null
  echo "  transcribing…"
  whisper-cli -m "$MODELS/$STT_MODEL" -f "$FRIDAY_HOME/test.wav" -nt -np 2>/dev/null | sed 's/^/  > /'
  echo "${dim}  If that matches what you said, STT works. If it is empty, the terminal lacks"
  echo "  microphone permission: System Settings › Privacy & Security › Microphone.${off}"
fi

# ── stage 3: text to speech ──────────────────────────────────────────────────
VOICE="${VOICE:-en_GB-alba-medium}"
if confirm "Stage 3 — text to speech (Piper)" \
    "  brew install piper-tts          # or: pipx install piper-tts" \
    "  curl -> $VOICES/$VOICE.onnx (+ .onnx.json)" \
    "Voice is ~60 MB from huggingface.co/rhasspy/piper-voices." \
    "Override with VOICE=en_US-amy-medium before running."; then
  command -v piper >/dev/null 2>&1 || brew install piper-tts || pipx install piper-tts
  base="https://huggingface.co/rhasspy/piper-voices/resolve/main/en"
  lang="${VOICE%%-*}"; rest="${VOICE#*-}"; name="${rest%%-*}"; qual="${rest#*-}"
  for ext in onnx onnx.json; do
    [ -f "$VOICES/$VOICE.$ext" ] || curl -L --fail --progress-bar \
      "$base/$lang/$name/$qual/$VOICE.$ext" -o "$VOICES/$VOICE.$ext"
  done

  echo
  echo "${bold}Test — this should come out of the speakers.${off}"
  echo "Friday is online. Speech is local, and nothing left this machine." \
    | piper --model "$VOICES/$VOICE.onnx" --output_file "$FRIDAY_HOME/test-tts.wav"
  afplay "$FRIDAY_HOME/test-tts.wav"
fi

echo
echo "${bold}Done with installs.${off} Next: bin/friday-voice.py wires the loop, bin/friday starts it."
