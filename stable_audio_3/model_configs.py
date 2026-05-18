import os
from dataclasses import dataclass
from pathlib import Path

from huggingface_hub import hf_hub_download, try_to_load_from_cache


def _local_search_dirs() -> list[Path]:
    """Directories to search for locally-cloned model repos, in priority order.

    Sources: SA3_LOCAL_MODELS_DIR env var, then `local_models.txt` (one path per
    line) in the project root, then a built-in fallback list.
    """
    dirs: list[Path] = []
    env = os.environ.get("SA3_LOCAL_MODELS_DIR")
    if env:
        dirs.extend(Path(p) for p in env.split(os.pathsep) if p)

    project_root = Path(__file__).resolve().parents[1]
    cfg_file = project_root / "local_models.txt"
    if cfg_file.is_file():
        for line in cfg_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                dirs.append(Path(line))

    return dirs


def _local_override(repo_id: str, filename: str) -> str | None:
    """Look for `<base>/<repo_name>/<filename>` in each configured local dir.

    e.g. `<base>/stable-audio-3-medium/stable-audio-3-medium-ARC.safetensors`.
    Returns the absolute path if found, else None.
    """
    repo_name = repo_id.split("/", 1)[-1]
    for base in _local_search_dirs():
        candidate = base / repo_name / filename
        if candidate.is_file():
            print(f"[stable_audio_3] using local model file: {candidate}")
            return str(candidate)
    return None


@dataclass(frozen=True)
class ModelConfig:
    repo_id: str
    config_path: str
    ckpt_path: str

    def resolve(self):
        """Return local paths for config + checkpoint. Prefer SA3_LOCAL_MODELS_DIR if set, else HF Hub."""
        local_config = _local_override(self.repo_id, self.config_path) or hf_hub_download(
            repo_id=self.repo_id, filename=self.config_path
        )
        local_ckpt = _local_override(self.repo_id, self.ckpt_path) or hf_hub_download(
            repo_id=self.repo_id, filename=self.ckpt_path
        )
        return local_config, local_ckpt


@dataclass(frozen=True)
class AutoencoderModelConfig:
    """Config for a standalone autoencoder HF repo (e.g. stabilityai/SAME-S).

    resolve() first checks whether any full Stable Audio 3 checkpoint that contains the same
    autoencoder is already cached locally.  If one is found it is used as-is
    (load_autoencoder strips the pretransform.* prefix automatically), avoiding a
    redundant download.  Otherwise the lightweight AE-only repo is fetched instead.
    """

    ae_repo_id: str
    ae_config_path: str
    ae_ckpt_path: str
    stable_audio_3: tuple[ModelConfig, ...]

    def resolve(self):
        """Return (config_path, ckpt_path), preferring an already-cached Stable Audio 3 checkpoint."""
        for fallback in self.stable_audio_3:
            cached_config = try_to_load_from_cache(
                fallback.repo_id, fallback.config_path
            )
            cached_ckpt = try_to_load_from_cache(fallback.repo_id, fallback.ckpt_path)
            if isinstance(cached_config, str) and isinstance(cached_ckpt, str):
                return cached_config, cached_ckpt

        # No Stable Audio 3 checkpoint found in local cache — download the AE-only repo.
        local_config = hf_hub_download(
            repo_id=self.ae_repo_id, filename=self.ae_config_path
        )
        local_ckpt = hf_hub_download(
            repo_id=self.ae_repo_id, filename=self.ae_ckpt_path
        )
        return local_config, local_ckpt


rf_models: dict[str, ModelConfig] = {
    "small-rf": ModelConfig(
        "stabilityai/stable-audio-3-small",
        "stable-audio-3-small-RF.json",
        "stable-audio-3-small-RF.safetensors",
    ),
    "medium-rf": ModelConfig(
        "stabilityai/stable-audio-3-medium",
        "stable-audio-3-medium-RF.json",
        "stable-audio-3-medium-RF.safetensors",
    ),
}

arc_models: dict[str, ModelConfig] = {
    "small": ModelConfig(
        "stabilityai/stable-audio-3-small",
        "stable-audio-3-small-ARC.json",
        "stable-audio-3-small-ARC.safetensors",
    ),
    "medium": ModelConfig(
        "stabilityai/stable-audio-3-medium",
        "stable-audio-3-medium-ARC.json",
        "stable-audio-3-medium-ARC.safetensors",
    ),
}

# Stable Audio 3 full-model configs to probe (in order) before downloading the AE-only repo.
# Both ARC and RF variants share the same autoencoder, so either can supply the weights.
_small_stable_audio_3: tuple[ModelConfig, ...] = (
    arc_models["small"],
    rf_models["small-rf"],
)
_medium_stable_audio_3: tuple[ModelConfig, ...] = (
    arc_models["medium"],
    rf_models["medium-rf"],
)

ae_models: dict[str, AutoencoderModelConfig] = {
    "same-s": AutoencoderModelConfig(
        ae_repo_id="stabilityai/SAME-S",
        ae_config_path="SAME-S.json",
        ae_ckpt_path="SAME-S.safetensors",
        stable_audio_3=_small_stable_audio_3,
    ),
    "same-l": AutoencoderModelConfig(
        ae_repo_id="stabilityai/SAME-L",
        ae_config_path="SAME-L.json",
        ae_ckpt_path="SAME-L.safetensors",
        stable_audio_3=_medium_stable_audio_3,
    ),
}

all_models: dict[str, ModelConfig | AutoencoderModelConfig] = {
    **rf_models,
    **arc_models,
    **ae_models,
}
