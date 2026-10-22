const REPO = "https://github.com/Sakar1601/internal-employee-portal/blob/main/";

const STEPS = [
  {
    title: "Bring up the lab services",
    file: "infra/scripts/01-bring-up-services.sh",
    cmd: "infra/scripts/01-bring-up-services.sh",
    body: "Docker Compose starts a registry, MinIO (the Terraform state backend), Gitea and the vault-unseal cluster, then creates the tfstate bucket.",
    proves: "Stand-ins for the internal services an isolated enclave would already have.",
    nodes: "1",
  },
  {
    title: "Bootstrap both Vault clusters",
    file: "infra/scripts/02-bootstrap-vault.sh",
    cmd: "infra/scripts/02-bootstrap-vault.sh",
    body: "vault-unseal gets a Transit key. vault-main is configured to call it on every start, so it unseals with no manual step. The script also enables PKI and an AppRole that Ansible authenticates as.",
    proves: "Auto-unseal without a cloud KMS.",
    nodes: "2",
  },
  {
    title: "Provision AWS with Terraform",
    file: "infra/scripts/03-terraform-apply.sh",
    cmd: "infra/scripts/03-terraform-apply.sh",
    body: "Terraform applies from a local provider mirror: a VPC, a public EC2 host with VPC-only egress, and an RDS Postgres instance in private subnets. The script then points Vault's database engine at RDS through an SSH tunnel and sets a 1 hour default TTL.",
    proves: "Network-enforced isolation, and database credentials that expire.",
    nodes: "3",
  },
  {
    title: "Stand up AWX",
    file: "infra/scripts/04-awx-up.sh",
    cmd: "infra/scripts/04-awx-up.sh",
    body: "k3d runs AWX, the open-source core of Red Hat's automation controller. The script connects its network to the one Vault lives on.",
    proves: "The same Ansible job, runnable by a controller instead of a person.",
    nodes: "4",
  },
  {
    title: "Build the artifacts",
    file: "infra/scripts/build-app.sh",
    cmd: "infra/scripts/build-app.sh",
    body: "pip downloads the backend's exact wheels for the target's Python and platform, and Vite builds the React bundle. Nothing is fetched on the target later.",
    proves: "A real dependency install with no live package-registry access.",
    nodes: "5",
  },
  {
    title: "Deploy with Ansible",
    file: "infra/ansible/roles/portal/tasks/main.yml",
    cmd: "ansible-playbook infra/ansible/site.yml -e vault_role_id=… -e db_host=…",
    body: "On the control node, Ansible fetches a one-hour database credential and a TLS certificate from Vault. It then copies code, wheelhouse and bundle to the host, installs from the wheelhouse only, and starts the systemd service on port 8443.",
    proves: "Secrets travel as files; the host never talks to Vault.",
    nodes: "6",
  },
];

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- steps ----------
const list = document.querySelector(".step-list");
const panel = document.getElementById("step-panel");
const controls = document.getElementById("arch-controls");
const arch = document.getElementById("arch");
let typer;

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

function highlight(step) {
  arch.dataset.active = step ?? "";
  arch.querySelectorAll("[data-steps]").forEach((n) => {
    const on = step == null || n.dataset.steps.split(" ").includes(String(step));
    n.classList.toggle("is-dim", !on);
  });
}

function select(index, focus = false) {
  const step = STEPS[index];
  list.querySelectorAll("button").forEach((b, i) => {
    b.setAttribute("aria-selected", String(i === index));
    b.tabIndex = i === index ? 0 : -1;
  });
  controls.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
  if (focus) list.querySelectorAll("button")[index].focus();

  panel.replaceChildren();
  panel.append(el("p", { class: "eyebrow" }, `Step ${index + 1} of ${STEPS.length}`), el("h3", {}, step.title), el("p", {}, step.body));
  const term = el("pre", { class: "term", "aria-label": `Command: ${step.cmd}` });
  const out = el("code", { "aria-hidden": "true" });
  term.append(el("span", { class: "prompt", "aria-hidden": "true" }, "$ "), out);
  panel.append(term);
  panel.append(el("p", { class: "proves" }, `Shows: ${step.proves}`));
  const link = el("a", { href: REPO + step.file }, step.file);
  panel.append(link);

  clearInterval(typer);
  if (reduce) out.textContent = step.cmd;
  else {
    let n = 0;
    typer = setInterval(() => {
      out.textContent = step.cmd.slice(0, ++n);
      if (n >= step.cmd.length) clearInterval(typer);
    }, 16);
  }
  highlight(index + 1);
}

STEPS.forEach((s, i) => {
  const li = el("li", { role: "presentation" });
  const b = el("button", { role: "tab", type: "button", "aria-selected": "false" });
  b.append(el("span", { class: "step-n" }, String(i + 1).padStart(2, "0")), el("span", {}, s.title));
  b.addEventListener("click", () => select(i));
  b.addEventListener("keydown", (e) => {
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: STEPS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((next + STEPS.length) % STEPS.length, true);
  });
  li.append(b);
  list.append(li);

  const c = el("button", { type: "button", "aria-pressed": "false" }, `${i + 1}`);
  c.setAttribute("aria-label", `Highlight step ${i + 1}: ${s.title}`);
  c.addEventListener("click", () => select(i));
  controls.append(c);
});
const all = el("button", { type: "button", class: "arch-all" }, "Show all");
all.addEventListener("click", () => {
  clearInterval(typer);
  controls.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  highlight(null);
});
controls.append(all);
select(0);

// ---------- reveal + count-up ----------
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  },
  { threshold: 0.15 },
);
document.querySelectorAll("[data-reveal]").forEach((n, i) => {
  n.style.setProperty("--i", String(i % 5));
  io.observe(n);
});

const countIo = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const node = entry.target;
      countIo.unobserve(node);
      const target = Number(node.dataset.count);
      if (reduce) {
        node.textContent = target;
        continue;
      }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 900);
        node.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  },
  { threshold: 0.6 },
);
document.querySelectorAll("[data-count]").forEach((n) => {
  n.textContent = reduce ? n.dataset.count : "0";
  countIo.observe(n);
});
