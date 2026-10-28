import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "check_coverage_policy.py"


class CoveragePolicyTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.front = self.root / "src/main/front"
        self.front.mkdir(parents=True)
        (self.root / "package.json").write_text('{"type":"module"}', encoding="utf-8")
        self.write_backend()
        self.write_frontend()

    def write_backend(self, line="0.80", branch="0.80"):
        (self.root / "pom.xml").write_text(f"""<project><build><plugins><plugin>
          <groupId>org.jacoco</groupId><artifactId>jacoco-maven-plugin</artifactId>
          <executions><execution><phase>verify</phase><goals><goal>check</goal></goals>
          <configuration><rules><rule><element>BUNDLE</element><limits>
          <limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>{line}</minimum></limit>
          <limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>{branch}</minimum></limit>
          </limits></rule></rules></configuration></execution></executions>
          </plugin></plugins></build></project>""", encoding="utf-8")

    def write_frontend(self, **overrides):
        coverage = {"include": ["pages/**/*.jsx"], "exclude": ["**/*.test.jsx"],
                    "thresholds": {"lines": 80, "branches": 80, "functions": 80, "statements": 80}}
        coverage.update(overrides)
        (self.front / "vitest.config.js").write_text(
            "export default " + json.dumps({"test": {"coverage": coverage}}), encoding="utf-8")

    def run_policy(self, *arguments):
        return subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root), *arguments],
                              capture_output=True, text=True, encoding="utf-8")

    def test_accepts_line_and_branch_gates_at_eighty_percent(self):
        result = self.run_policy()
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_rejects_a_gate_below_eighty_percent(self):
        self.write_backend(branch="0.79")
        result = self.run_policy()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("BRANCH", result.stderr)

    def commit_policy(self):
        for arguments in (["init", "-q"], ["add", "."],
                          ["-c", "user.name=Teste", "-c", "user.email=teste@example.invalid", "commit", "-qm", "baseline"]):
            subprocess.run(["git", *arguments], cwd=self.root, capture_output=True, check=True)

    def test_rejects_a_reduction_from_the_base_branch_even_above_eighty(self):
        self.write_backend(branch="0.90")
        self.commit_policy()
        self.write_backend(branch="0.85")
        result = self.run_policy("--base-ref", "HEAD")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("90", result.stderr)

    def test_rejects_new_coverage_exclusions(self):
        self.commit_policy()
        self.write_frontend(exclude=["**/*.test.jsx", "pages/**"])
        result = self.run_policy("--base-ref", "HEAD")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("exclusions", result.stderr)

    def test_rejects_disabling_jacoco_check(self):
        path = self.root / "pom.xml"
        source = path.read_text(encoding="utf-8").replace("<configuration>", "<configuration><skip>true</skip>")
        path.write_text(source, encoding="utf-8")
        result = self.run_policy()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("skip", result.stderr)

    def test_rejects_each_frontend_metric_below_the_floor(self):
        for metric in ("lines", "branches", "functions", "statements"):
            with self.subTest(metric=metric):
                thresholds = dict.fromkeys(("lines", "branches", "functions", "statements"), 80)
                thresholds[metric] = 79
                self.write_frontend(thresholds=thresholds)
                result = self.run_policy()
                self.assertNotEqual(0, result.returncode)
                self.assertIn(metric, result.stderr)

    def test_rejects_lowering_a_higher_frontend_baseline(self):
        self.write_frontend(thresholds=dict.fromkeys(("lines", "branches", "functions", "statements"), 90))
        self.commit_policy()
        self.write_frontend()
        result = self.run_policy("--base-ref", "HEAD")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("90", result.stderr)

    def test_rejects_narrowing_the_measured_sources(self):
        self.commit_policy()
        self.write_frontend(include=["pages/Login.jsx"])
        result = self.run_policy("--base-ref", "HEAD")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("scope", result.stderr)

    def test_rejects_missing_branch_gate(self):
        path = self.root / "pom.xml"
        path.write_text(path.read_text(encoding="utf-8").replace("<counter>BRANCH</counter>", "<counter>METHOD</counter>"), encoding="utf-8")
        result = self.run_policy()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("BRANCH", result.stderr)


if __name__ == "__main__":
    unittest.main()
