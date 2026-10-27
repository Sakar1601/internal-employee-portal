import { Link } from "react-router-dom";
import { paths } from "../paths";
import { ArchitectureDiagram, DiagramLegend } from "./ArchitectureDiagram";
import { CountUp, Reveal, Words } from "./motion";
import { REPO_URL } from "./SiteLayout";

const blob = (file) => `${REPO_URL}/blob/main/${file}`;

const DIFFERENCES = [
  {
    title: "Credentials that expire on their own",
    body: "The app never holds a long-lived database password. Vault creates a Postgres role per deploy with VALID UNTIL, and it joins a stable group role so table ownership survives rotation.",
    file: "infra/scripts/03-terraform-apply.sh",
  },
  {
    title: "A host that structurally cannot phone home",
    body: "The EC2 security group allows egress only to the VPC CIDR. RDS sits in private subnets with publicly_accessible = false.",
    file: "infra/terraform/main.tf",
  },
  {
    title: "Dependencies resolved ahead of time",
    body: "pip download targets the instance's platform. The host then runs a real pip install --no-index against that directory.",
    file: "infra/scripts/build-app.sh",
  },
  {
    title: "A demo that runs the real flows",
    body: "The UI talks to one module. A build flag swaps real HTTP for a simulator that mirrors the backend's routes, validation and status codes. Every call is visible on the app's Activity page.",
    file: "app/frontend/src/api/index.js",
  },
  {
    title: "Bugs found by reading, fixed with tests",
    body: "Over-long names returned HTTP 500 on Postgres, % in search acted as a wildcard, the list endpoint was unbounded, and unknown /api paths returned the HTML shell with a 200.",
    file: "app/backend/tests",
  },
];

const COMPARE = [
  ["Database password", "One long-lived secret in an env file", "Set once by hand, rarely rotated", "Vault mints a new role per deploy, 1 h default TTL"],
  ["App host and the internet", "Open egress, installs from the public registry", "Open by default", "Egress limited to the VPC; dependencies arrive as a wheelhouse"],
  ["Secrets store restarts", "Not applicable", "Cloud KMS auto-unseal", "A second Vault cluster auto-unseals the first, no cloud KMS"],
  ["Repeatability", "A README of commands", "Screenshots of clicks", "Terraform for AWS, one Ansible role, a script per phase"],
];

// Counts as of the last commit; the README's "Tests and CI" section lists how to reproduce them.
const FACTS = [
  [23, "backend tests (pytest)"],
  [32, "frontend unit tests (vitest)"],
  [35, "browser tests (Playwright)"],
  [12, "Terraform resources"],
  [5, "Docker Compose services"],
  [21, "Ansible tasks in one role"],
];

export function OverviewPage() {
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">Portfolio project · FastAPI, React, Terraform, Vault, Ansible, AWX</p>
          <h1>
            <Words text="An employee directory," />
            <Words text="deployed the way a regulated company would." offset={3} italic />
          </h1>
          <p className="hero-lede">
            The app is ordinary: log in, search, add and edit people. The interesting part is what runs underneath it: a host that is
            blocked from the internet, database passwords that live for an hour, and a Vault that unseals itself.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/deploy">
              Watch it deploy
            </Link>
            <Link className="btn" to={paths.home}>
              Try the app
            </Link>
          </div>
          <p className="hero-note">Both are simulated in your browser. Nothing is installed and no server is contacted.</p>
        </div>
        <div className="arch-frame hero-arch">
          <ArchitectureDiagram label="Architecture of the whole project, everything running" />
        </div>
      </section>

      <section className="band band-dark" aria-labelledby="arch-h">
        <div className="wrap">
          <p className="eyebrow">Reading the diagram</p>
          <h2 id="arch-h">Everything on a laptop, and what it provisions in AWS</h2>
          <p className="section-lede">The numbered lines are the flows between the pieces. Run the deployment to see them come up one step at a time.</p>
          <DiagramLegend />
        </div>
      </section>

      <section className="wrap section">
        <Reveal>
          <p className="eyebrow">What makes it different</p>
          <h2>Compared with the usual ways small apps get deployed</h2>
          <p className="section-lede">
            This compares approaches, not products. "Tutorial-style" is a quick deploy on a public VM with a long-lived password. "Console-driven" is
            clicking infrastructure into existence in a cloud console.
          </p>
        </Reveal>
        <Reveal className="compare" role="table" aria-label="Comparison of deployment approaches">
          <div role="row" className="compare-row compare-head">
            <span role="columnheader">Concern</span>
            <span role="columnheader">Tutorial-style</span>
            <span role="columnheader">Console-driven</span>
            <span role="columnheader" className="is-this">
              This project
            </span>
          </div>
          {COMPARE.map(([concern, a, b, c]) => (
            <div role="row" className="compare-row" key={concern}>
              <span role="rowheader">{concern}</span>
              <span role="cell" data-label="Tutorial-style">{a}</span>
              <span role="cell" data-label="Console-driven">{b}</span>
              <span role="cell" data-label="This project" className="is-this">{c}</span>
            </div>
          ))}
        </Reveal>
        <ol className="diff-list">
          {DIFFERENCES.map((d, i) => (
            <Reveal as="li" key={d.title} delay={i % 2}>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
              <a href={blob(d.file)} target="_blank" rel="noreferrer">
                {d.file}
              </a>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="wrap section">
        <Reveal>
          <p className="eyebrow">What is in the repo</p>
          <h2>Numbers taken from the code</h2>
        </Reveal>
        <dl className="facts">
          {FACTS.map(([n, label]) => (
            <div key={label}>
              <dt>
                <CountUp value={n} />
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="band">
        <div className="wrap two-col">
          <Reveal>
            <p className="eyebrow">Safety and limits</p>
            <h2>What is real, what is simplified</h2>
            <ul className="plain">
              <li>This site is simulated end to end. It makes no network calls, and the demo credentials unlock nothing.</li>
              <li>Vault's own listener runs without TLS in this lab. The app's TLS, issued by Vault PKI, is real.</li>
              <li>The PKI root is self-signed, not an offline organisational root.</li>
              <li>Not physically air-gapped: a normal AWS account with one host's egress removed by security group.</li>
              <li>One admin user, no roles. The login token is kept in the browser's localStorage.</li>
              <li>The AWS platform is documented in the repo but is not running behind this site.</li>
            </ul>
          </Reveal>
          <Reveal delay={1}>
            <p className="eyebrow">Honest fit</p>
            <h2>Where it is not the right tool</h2>
            <ul className="plain">
              <li>A production HR system: no roles, no persisted audit trail, no SSO.</li>
              <li>A large directory: the API caps a page at 1,000 rows and the UI does not paginate.</li>
              <li>A template for a managed-cloud stack: it swaps cloud KMS, a registry and Git hosting for lab equivalents on purpose.</li>
              <li>A Vault hardening guide: it shows the wiring, not a production configuration.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="wrap cta">
        <Reveal>
          <h2>See it come up, then read the code.</h2>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/deploy">
              Watch it deploy
            </Link>
            <a className="btn" href={REPO_URL} target="_blank" rel="noreferrer">
              Source on GitHub
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p>
            Built by <span className="placeholder">[Your name]</span> · <span className="placeholder">[LinkedIn URL]</span> ·{" "}
            <span className="placeholder">[Email or contact link]</span>
          </p>
        </div>
      </footer>
    </>
  );
}
