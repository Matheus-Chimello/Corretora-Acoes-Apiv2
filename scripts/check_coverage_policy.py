"""Validate the actual JaCoCo/Vitest gates, including regressions against a Git ref."""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

FRONT_CONFIG = "src/main/front/vitest.config.js"


def backend_policy(source):
    root = ET.fromstring(source)
    for element in root.iter():
        element.tag = element.tag.split("}")[-1]
    plugins = [plugin for plugin in root.findall("./build/plugins/plugin")
               if plugin.findtext("artifactId") == "jacoco-maven-plugin"]
    if len(plugins) != 1:
        raise ValueError("JaCoCo check must be configured exactly once")
    plugin = plugins[0]
    if any(node.text and node.text.strip().lower() != "false" for node in plugin.findall(".//skip")):
        raise ValueError("JaCoCo skip must not disable the coverage check")
    limits = {}
    for execution in plugin.findall("executions/execution"):
        if execution.findtext("phase") != "verify" or "check" not in [goal.text for goal in execution.findall("goals/goal")]:
            continue
        for rule in execution.findall("configuration/rules/rule"):
            if rule.findtext("element") == "BUNDLE":
                for limit in rule.findall("limits/limit"):
                    if limit.findtext("value") == "COVEREDRATIO":
                        limits[limit.findtext("counter")] = float(limit.findtext("minimum")) * 100
    return {"thresholds": limits,
            "exclude": [node.text for node in plugin.findall(".//excludes/exclude")],
            "include": [node.text for node in plugin.findall(".//includes/include")]}


def frontend_policy(path, source=None):
    temporary_path = None
    if source is not None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".mjs", prefix=".coverage-base-",
                                         dir=path.parent, encoding="utf-8", delete=False) as temporary:
            temporary.write(source)
            temporary_path = Path(temporary.name)
        path = temporary_path
    try:
        code = "import {pathToFileURL} from 'node:url';const {default:c}=await import(pathToFileURL(process.argv[1]));process.stdout.write(JSON.stringify(c.test.coverage));"
        result = subprocess.run(["node", "--input-type=module", "-e", code, str(path.resolve())],
                                capture_output=True, text=True, encoding="utf-8", check=True)
        return json.loads(result.stdout)
    finally:
        if temporary_path is not None:
            temporary_path.unlink()


def validate_thresholds(policy, metrics, baseline=None):
    for metric in metrics:
        value = policy.get("thresholds", {}).get(metric)
        required = max(80, (baseline or {}).get("thresholds", {}).get(metric, 80))
        if not isinstance(value, (int, float)) or not math.isfinite(value) or value < required:
            raise ValueError(f"{metric} coverage minimum must be >= {required}% (found {value})")


def baseline_source(root, ref, path):
    return subprocess.run(["git", "show", f"{ref}:{path}"], cwd=root,
                          capture_output=True, text=True, encoding="utf-8", check=True).stdout


def validate_scope(policy, baseline):
    if baseline is None:
        return
    if set(policy.get("exclude", [])) - set(baseline.get("exclude", [])):
        raise ValueError("New coverage exclusions require review of the protected policy")
    previous_include = set(baseline.get("include", []))
    current_include = set(policy.get("include", []))
    if current_include and (not previous_include or previous_include - current_include):
        raise ValueError("Coverage include scope cannot be narrowed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--base-ref")
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        backend = backend_policy((root / "pom.xml").read_text(encoding="utf-8"))
        frontend = frontend_policy(root / FRONT_CONFIG)
        base_backend = base_frontend = None
        if args.base_ref:
            base_backend = backend_policy(baseline_source(root, args.base_ref, "pom.xml"))
            base_frontend = frontend_policy(root / FRONT_CONFIG, baseline_source(root, args.base_ref, FRONT_CONFIG))
        validate_thresholds(backend, ("LINE", "BRANCH"), base_backend)
        validate_thresholds(frontend, ("lines", "branches", "functions", "statements"), base_frontend)
        validate_scope(backend, base_backend)
        validate_scope(frontend, base_frontend)
        print(json.dumps({"backend": backend["thresholds"], "frontend": frontend["thresholds"]}))
        return 0
    except (ValueError, OSError, ET.ParseError, subprocess.CalledProcessError) as error:
        print(f"Coverage policy rejected: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
