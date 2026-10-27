import { Link } from "react-router-dom";
import { paths } from "../paths";
import { ArchitectureDiagram, DiagramLegend } from "./ArchitectureDiagram";
import { STEPS } from "./deployScript";
import { CountUp, Reveal, Words } from "./motion";
import { REPO_URL } from "./SiteLayout";

const blob = (file) => `${REPO_URL}/blob/main/${file}`;

const SECTIONS = [
  ["airgap", "What is an air gap?"],
  ["why", "Why it matters"],
  ["breaks", "What breaks, and the fix"],
  ["how", "How it works"],
  ["runtime", "A request, end to end"],
  ["glossary", "Glossary"],
  ["limits", "Limits"],
];

const IDEA = [
  ["What it is", "A small employee directory built with FastAPI and React. Staff sign in, search, add and correct records. The app is plain on purpose, so the attention goes to how it is deployed."],
  ["What makes it hard", "The target is built to behave like a system inside an air gap: the application host cannot reach the internet, and the database cannot be reached from it. The usual ways of installing software and handling secrets stop working."],
  ["What was built", "Terraform, Vault, Ansible and AWX automation that gets the app onto that host anyway: dependencies prepared ahead of time, secrets issued on demand and certificates from an internal authority."],
];

const WHY = [
  ["Less to attack", "A host that cannot make outbound connections cannot fetch a second-stage payload or send data to an attacker's server, even if something on it is compromised. Inbound access is narrow too: here only the operator's own IP address."],
  ["No surprises at install time", "Every package and provider is chosen, downloaded and checked ahead of time. A deploy installs from a fixed local folder, so a tampered package published tomorrow cannot be pulled in by it."],
  ["Credentials that do not linger", "A long-lived database password in a config file is the thing worth stealing. Here the database login is created for one deployment and expires."],
  ["Repeatable and reviewable", "Nothing is resolved from the internet while deploying, so what ran is what was prepared and reviewed beforehand."],
];

const BREAKS = [
  ["Install Python packages with pip", "The host cannot reach a package index.", "A wheelhouse is built on the control node for the host's exact platform. The host runs pip install --no-index against it.", "infra/scripts/build-app.sh"],
  ["Download Terraform providers", "terraform init fetches them from a public registry.", "Providers are mirrored to a local folder and Terraform is configured to use only that mirror.", "infra/scripts/03-terraform-apply.sh"],
  ["Let a cloud service unseal the secrets vault", "There is no cloud KMS inside the enclave.", "A second Vault holds a Transit key and vault-main asks it to unseal on every start.", "infra/scripts/02-bootstrap-vault.sh"],
  ["Keep the database password in a config file", "A long-lived secret is a standing target.", "Vault creates a Postgres role for each deploy. It expires (1 hour by default, 24 hours at most).", "infra/scripts/03-terraform-apply.sh"],
  ["Get a TLS certificate from a public authority", "Public authorities need the internet.", "Vault's PKI engine is an internal authority and issues the host's certificate.", "infra/ansible/roles/portal/tasks/main.yml"],
  ["Let the server fetch its own secrets", "The host has no route to Vault.", "Ansible reads Vault on the control node (delegate_to: localhost) and copies the results to the host as files.", "infra/ansible/roles/portal/tasks/main.yml"],
  ["Pull images and clone repositories from public services", "Same reason.", "A local registry and a Gitea server stand in for the internal ones.", "infra/docker-compose.yml"],
];

const RUNTIME = [
  "The browser opens https://<host>:8443. The certificate comes from the internal authority, so a browser warns about an unknown issuer. That is expected here.",
  "One FastAPI process, run by systemd, serves both the React app and the API.",
  "Signing in posts the username and password to /api/auth/login. The server checks the password against a bcrypt hash and returns a signed token (HS256, 60 minutes by default).",
  "Every later request carries that token. The employees API answers 401 to anything without a valid one.",
  "The API reads and writes Postgres on RDS over port 5432. The database only accepts connections from the app host's security group and has no route to the internet.",
  "That database login is the short-lived one Vault created when the app was deployed.",
];

const GLOSSARY = [
  ["Air gap", "A deliberate separation between a protected network and everything else, above all the public internet."],
  ["VPC, subnet, security group", "A private network in AWS, a slice of it, and a firewall rule set attached to a server. A private subnet has no route to the internet gateway."],
  ["Terraform", "Describes cloud resources (networks, servers, databases) in files and creates them. A provider is the plug-in that talks to a cloud; a provider mirror is a local copy of those plug-ins."],
  ["Vault", "A service that stores secrets and issues them on request. It is sealed (its data locked) every time it starts."],
  ["Transit auto-unseal", "One Vault keeps the key that another Vault needs to unseal itself, so nobody has to type unseal keys after a restart."],
  ["Dynamic secrets", "Credentials created on demand for one user and deleted automatically after a set lifetime (TTL)."],
  ["PKI", "An internal certificate authority: it issues the TLS certificates that let browsers talk to the host over HTTPS."],
  ["AppRole", "A way for a machine, here Ansible, to log in to Vault with a role ID and a secret ID."],
  ["Ansible and AWX", "Ansible runs a list of tasks on servers over SSH. AWX is the open-source web controller that runs Ansible jobs and records them."],
  ["Wheelhouse", "A folder of prebuilt Python packages, so installing needs no package index."],
  ["JWT and bcrypt", "A signed login token the server hands out after sign-in, and a one-way hash used to check the password without storing it."],
  ["RDS", "AWS's managed Postgres database."],
];

const DIFFERENCES = [
  ["Credentials that expire on their own", "Vault creates a Postgres role per deploy with VALID UNTIL, and it joins a stable group role so table ownership survives rotation.", "infra/scripts/03-terraform-apply.sh"],
  ["A host that structurally cannot phone home", "The EC2 security group allows outbound traffic only to the VPC CIDR. RDS sits in private subnets with publicly_accessible = false.", "infra/terraform/main.tf"],
  ["A demo that runs the real flows", "The UI talks to one module. A build flag swaps real HTTP for a simulator that mirrors the backend's routes, validation and status codes. Every call is visible on the app's Activity page.", "app/frontend/src/api/index.js"],
  ["Bugs found by reading, fixed with tests", "Over-long names returned HTTP 500 on Postgres, % in search acted as a wildcard, the list endpoint was unbounded, and unknown /api paths returned the HTML shell with a 200.", "app/backend/tests"],
];

// Counts as of the last commit; the README's "Tests and CI" section lists how to reproduce them.
const FACTS = [
  [23, "backend tests (pytest)"],
  [32, "frontend unit tests (vitest)"],
  [44, "browser tests (Playwright)"],
  [12, "Terraform resources"],
  [5, "Docker Compose services"],
  [21, "Ansible tasks in one role"],
];

const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

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

      <nav className="contents wrap" aria-label="On this page">
        <span className="eyebrow">On this page</span>
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" className="chip" onClick={() => jump(id)}>
            {label}
          </button>
        ))}
      </nav>

      <section className="wrap section">
        <Reveal>
          <p className="eyebrow">The idea in a minute</p>
          <h2>A simple app, in a hard place to run it</h2>
        </Reveal>
        <ol className="idea-list">
          {IDEA.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i}>
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="band" id="airgap">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Background</p>
            <h2>What is an air-gapped environment?</h2>
            <div className="prose">
              <p>
                An air gap is a deliberate gap between a protected network and everything else, above all the public internet. Nothing inside can call out and nothing
                outside can call in. In its strictest form that is physical: no cable, no wireless. More often it is enforced by network rules that leave no usable route.
              </p>
              <p>
                Systems like this tend to appear where a breach would be costly or tightly regulated, for example utilities, defence, parts of finance and healthcare, and
                industrial control networks. People still need software, updates and data inside. They arrive through a controlled path: a reviewed mirror, a transfer station,
                or media that is scanned before it crosses.
              </p>
            </div>
          </Reveal>
          <Reveal className="versus" delay={1}>
            <div>
              <h3>A true air gap</h3>
              <ul className="plain">
                <li>Cut off from the internet physically or by strict network design.</li>
                <li>Software crosses at a review checkpoint.</li>
                <li>Often a separate facility or network.</li>
              </ul>
            </div>
            <div className="is-this">
              <h3>This project</h3>
              <ul className="plain">
                <li>A normal AWS account that is reachable from the internet.</li>
                <li>The app host's outbound traffic is limited to the VPC by a security group. The database has no internet route at all.</li>
                <li>Inbound SSH and HTTPS are limited to the operator's own IP address.</li>
                <li>The control laptop that prepares and deploys still has internet.</li>
              </ul>
            </div>
          </Reveal>
          <p className="prose-note">So it is air-gapped in behaviour, not in physical isolation. The Limits section and the README say the same.</p>
        </div>
      </section>

      <section className="wrap section" id="why">
        <Reveal>
          <p className="eyebrow">Why it matters</p>
          <h2>Isolation is cheap to describe and hard to live with</h2>
          <p className="section-lede">
            Cutting the internet shrinks what an attacker can reach and what a compromised machine can do. The price is that ordinary work stops working, and that is the
            engineering problem this project solves.
          </p>
        </Reveal>
        <ol className="diff-list">
          {WHY.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i % 2}>
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="band" id="breaks">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">What breaks, and the fix</p>
            <h2>Seven everyday habits that fail without internet</h2>
          </Reveal>
          <Reveal className="compare compare-4" role="table" aria-label="Everyday habits that break without internet and what this project does instead">
            <div role="row" className="compare-row compare-head">
              <span role="columnheader">Everyday habit</span>
              <span role="columnheader">Why it fails</span>
              <span role="columnheader" className="is-this">
                What this project does
              </span>
              <span role="columnheader">Where</span>
            </div>
            {BREAKS.map(([habit, why, fix, file]) => (
              <div role="row" className="compare-row" key={habit}>
                <span role="rowheader">{habit}</span>
                <span role="cell" data-label="Why it fails">{why}</span>
                <span role="cell" data-label="What this project does" className="is-this">{fix}</span>
                <span role="cell" data-label="Where">
                  <a href={blob(file)} target="_blank" rel="noreferrer">
                    {file}
                  </a>
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="wrap section" id="how">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2>Six steps from an empty laptop to a running portal</h2>
          <p className="section-lede">
            Each step is one script or playbook in the repo. <Link to="/deploy">Watch them run</Link> and the diagram above lights up as each one finishes.
          </p>
        </Reveal>
        <ol className="how-list">
          {STEPS.map((s) => (
            <Reveal as="li" key={s.id}>
              <div className="how-head">
                <span className="how-n">{String(s.id).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
              </div>
              <p>{s.detail}</p>
              <p className="how-airgap">
                <strong>The air-gap angle.</strong> {s.airgap}
              </p>
              <a href={blob(s.file)} target="_blank" rel="noreferrer">
                {s.file}
              </a>
            </Reveal>
          ))}
        </ol>
        <div className="arch-legend-wrap">
          <h3 className="legend-title">Reading the numbered lines in the diagram</h3>
          <DiagramLegend />
        </div>
      </section>

      <section className="band" id="runtime">
        <div className="wrap two-col">
          <Reveal>
            <p className="eyebrow">At runtime</p>
            <h2>What happens when someone uses the app</h2>
            <ol className="flow-list">
              {RUNTIME.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={1} className="try-card">
            <p className="eyebrow">Try it</p>
            <h2>The same app, in your browser</h2>
            <p>
              The portal in this demo is the real interface running on a simulator that mirrors the backend's routes, validation and status codes. Add, edit and delete people, sort
              the table, export CSV, then open Activity to see every API call it made.
            </p>
            <Link className="btn btn-primary" to={paths.home}>
              Try the app
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="wrap section" id="glossary">
        <Reveal>
          <p className="eyebrow">Glossary</p>
          <h2>The terms, in plain words</h2>
        </Reveal>
        <dl className="glossary">
          {GLOSSARY.map(([term, def]) => (
            <Reveal key={term}>
              <dt>{term}</dt>
              <dd>{def}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className="wrap section">
        <Reveal>
          <p className="eyebrow">What makes it different</p>
          <h2>Four things you can check in the code</h2>
        </Reveal>
        <ol className="diff-list">
          {DIFFERENCES.map(([title, body, file], i) => (
            <Reveal as="li" key={title} delay={i % 2}>
              <h3>{title}</h3>
              <p>{body}</p>
              <a href={blob(file)} target="_blank" rel="noreferrer">
                {file}
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

      <section className="band" id="limits">
        <div className="wrap two-col">
          <Reveal>
            <p className="eyebrow">Safety and limits</p>
            <h2>What is real, what is simplified</h2>
            <ul className="plain">
              <li>This site is simulated end to end. It makes no network calls, and the demo credentials unlock nothing.</li>
              <li>The database credential is created once per deploy and written into the service's environment file. Nothing in the repo renews it, so after its lifetime Postgres stops accepting it and the app needs a redeploy (or a longer TTL).</li>
              <li>Vault's own listener runs without TLS in this lab. The app's TLS, issued by Vault PKI, is real.</li>
              <li>The PKI root is self-signed, not an offline organisational root.</li>
              <li>Not physically air-gapped: a normal AWS account with one host's outbound traffic restricted by security group.</li>
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
            Built by <strong>Sakar Joshi</strong> ·{" "}
            <a href="https://www.linkedin.com/in/sakar-joshi/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>{" "}
            · <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>, © 2026
          </p>
        </div>
      </footer>
    </>
  );
}
