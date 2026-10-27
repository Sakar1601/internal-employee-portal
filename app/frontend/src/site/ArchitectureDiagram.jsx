import { useId } from "react";

// `step` is the runbook step that brings a node or a flow to life (see deployScript.js).
const NODES = [
  { id: "registry", x: 40, y: 70, w: 150, h: 58, title: "Registry", sub: "images", step: 1 },
  { id: "minio", x: 205, y: 70, w: 150, h: 58, title: "MinIO", sub: "Terraform state", step: 1 },
  { id: "gitea", x: 370, y: 70, w: 150, h: 58, title: "Gitea", sub: "internal git", step: 1 },
  { id: "unseal", x: 40, y: 190, w: 170, h: 64, title: "vault-unseal", sub: "holds the Transit key", step: 1 },
  { id: "vault", x: 320, y: 190, w: 200, h: 64, title: "vault-main", sub: "PKI · DB engine · AppRole", step: 2, key: true },
  { id: "tf", x: 40, y: 320, w: 150, h: 58, title: "Terraform", sub: "provider mirror", step: 3 },
  { id: "build", x: 205, y: 320, w: 150, h: 58, title: "build-app.sh", sub: "wheelhouse + dist", step: 5 },
  { id: "awx", x: 370, y: 320, w: 150, h: 58, title: "AWX (k3d)", sub: "runs the Ansible job", step: 4 },
  { id: "browser", x: 664, y: 64, w: 296, h: 50, title: "Your browser", step: 6 },
  { id: "ec2", x: 664, y: 160, w: 296, h: 110, title: "EC2 · public subnet", sub: ["egress limited to the VPC", "FastAPI + React under systemd", "TLS cert from Vault PKI"], step: 3, key: true },
  { id: "rds", x: 664, y: 400, w: 296, h: 110, title: "RDS Postgres · private subnets", sub: ["no internet-gateway route", "publicly_accessible = false"], step: 3, key: true },
];

const FLOWS = [
  { id: "transit", d: "M210 222 H318", step: 2, label: { x: 264, y: 212, t: "transit", anchor: "middle" } },
  { id: "f1", d: "M115 378 V528 H638", step: 3, badge: { x: 200, y: 528, n: 1 } },
  { id: "f2", d: "M280 378 V476 H596 V258 H662", step: 6, badge: { x: 400, y: 476, n: 2 } },
  { id: "f3", d: "M520 349 H576 V238 H662", step: 6, badge: { x: 576, y: 320, n: 3 } },
  { id: "f4", d: "M520 214 H556 V180 H662", step: 6, badge: { x: 556, y: 197, n: 4 } },
  { id: "f5", d: "M470 254 V290 H616 V440 H662", step: 3, badge: { x: 530, y: 290, n: 5 } },
  { id: "db", d: "M812 270 V398", step: 6, label: { x: 824, y: 340, t: "5432, VPC only" } },
  { id: "https", d: "M812 114 V158", step: 6, label: { x: 824, y: 140, t: "https :8443" } },
];

const LEGEND = [
  "Terraform provisions the VPC, the EC2 host and the RDS instance.",
  "The build output (wheelhouse and React bundle) is copied to the host over SSH.",
  "AWX runs the Ansible job against the host over SSH.",
  "vault-main issues the TLS certificate and secrets. Ansible fetches them on the control node and copies them over as files.",
  "Vault's database engine mints one-hour Postgres credentials, reaching RDS through an SSH tunnel via the host.",
];

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// stage: "all" lights everything; a number lights what steps 1..stage have built.
// current: the step being run right now, which pulses.
export function ArchitectureDiagram({ stage = "all", current = null, label = "Architecture diagram" }) {
  const uid = useId().replace(/:/g, "");
  const lit = (step) => stage === "all" || step <= stage;
  const motion = !reduced();

  return (
    <svg className="arch" viewBox="0 0 1000 600" role="img" aria-label={label}>
      <title>{label}</title>
      <desc>
        On the laptop: a container registry, MinIO holding Terraform state, Gitea, a vault-unseal cluster that unseals vault-main
        through Transit, Terraform, a build step and AWX. In AWS: an EC2 host in a public subnet whose egress is limited to the
        VPC, and an RDS Postgres database in private subnets with no internet route. Terraform provisions AWS, AWX runs Ansible
        against the host over SSH, Vault supplies a certificate, secrets and one-hour database credentials, and a browser reaches
        the host over HTTPS.
      </desc>
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>

      <rect className="zone" x="16" y="16" width="524" height="568" rx="14" />
      <text className="zone-label" x="36" y="44">YOUR LAPTOP · Docker + k3d</text>
      <rect className="zone zone-aws" x="640" y="16" width="344" height="568" rx="14" />
      <text className="zone-label" x="660" y="44">AWS · free tier</text>

      {NODES.map((n) => {
        const lines = Array.isArray(n.sub) ? n.sub : n.sub ? [n.sub] : [];
        const multi = Array.isArray(n.sub);
        return (
          <g key={n.id} className={`node${n.key ? " node-key" : ""}${lit(n.step) ? "" : " is-off"}${current === n.step ? " is-current" : ""}`} data-node={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="8" />
            <text x={n.x + n.w / 2} y={n.y + (multi ? 32 : lines.length ? 26 : 30)}>{n.title}</text>
            {lines.map((t, i) => (
              <text key={t} className="sub" x={n.x + n.w / 2} y={n.y + (multi ? 54 : 44) + i * 20}>
                {t}
              </text>
            ))}
          </g>
        );
      })}

      {FLOWS.map((f) => {
        const on = lit(f.step);
        const id = `${uid}-${f.id}`;
        return (
          <g key={f.id} className={`flowg${on ? "" : " is-off"}`} data-flow={f.id}>
            <path id={id} className="flow" d={f.d} markerEnd={`url(#${uid}-arrow)`} />
            {f.label && (
              <text className="flow-label" x={f.label.x} y={f.label.y} textAnchor={f.label.anchor ?? "start"}>
                {f.label.t}
              </text>
            )}
            {f.badge && (
              <>
                <circle className="badge" cx={f.badge.x} cy={f.badge.y} r="11" />
                <text className="badge-n" x={f.badge.x} y={f.badge.y + 4}>
                  {f.badge.n}
                </text>
              </>
            )}
            {on && motion && (
              <circle className="packet" r="4.5">
                <animateMotion dur={`${2.6 + (f.d.length % 3) * 0.5}s`} repeatCount="indefinite">
                  <mpath href={`#${id}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DiagramLegend() {
  return (
    <ol className="arch-legend">
      {LEGEND.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ol>
  );
}
