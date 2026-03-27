import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

export type CoordinationRole = "product" | "architect" | "coder" | "tester" | "security" | "housekeeper";
export type HandoffTarget = "codex" | "claude" | "all";

export interface CoordinationTaskFile {
  currentObjective?: string;
  dispatchAgent?: string;
  activeTask?: {
    id?: string;
    product?: {
      problemStatement?: string;
      user?: string;
      useCases?: string[];
      nfrs?: string[];
      acceptanceCriteria?: string[];
      antiScope?: string[];
    };
    codexTasks?: string[];
    claudeTasks?: string[];
  };
  orchestration?: {
    framework?: string;
    sourceOfTruth?: string;
  };
  roles?: Record<string, string[]>;
  workstreams?: Array<{
    id?: string;
    owner?: string;
    branch?: string;
    status?: string;
    goal?: string;
    chunks?: string[];
    estimatedMinutes?: number;
  }>;
}

interface CoordinationRuntimeState {
  task: CoordinationTaskFile | null;
  reportLines: string[];
  roleOrder: CoordinationRole[];
  currentRole: CoordinationRole;
  target: HandoffTarget;
}

export interface LangGraphRunOptions {
  target?: HandoffTarget;
  writeReport?: boolean;
}

export interface LangGraphRunResult {
  task: CoordinationTaskFile | null;
  reportMarkdown: string;
  reportLines: string[];
}

const ROOT = resolve(process.cwd());
const TASK_PATH = resolve(ROOT, ".agents/task.json");
const REPORT_PATH = resolve(ROOT, ".agents/reports/langgraph-latest.md");
const CODEx_HANDOFF_PATH = resolve(ROOT, ".agents/handoffs/to-codex.md");
const CLAUDE_HANDOFF_PATH = resolve(ROOT, ".agents/handoffs/to-claude.md");

const CoordinationAnnotation = Annotation.Root({
  task: Annotation<CoordinationTaskFile | null>(),
  reportLines: Annotation<string[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  roleOrder: Annotation<CoordinationRole[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
  }),
  currentRole: Annotation<CoordinationRole>(),
  target: Annotation<HandoffTarget>(),
});

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function loadTask(): CoordinationTaskFile | null {
  return readJson<CoordinationTaskFile>(TASK_PATH);
}

function formatBullets(items?: string[]) {
  if (!items?.length) return ["- none"];
  return items.map((item) => `- ${item}`);
}

function section(title: string, lines: string[]) {
  return [`## ${title}`, ...lines, ""];
}

function summarizeWorkstreams(task: CoordinationTaskFile | null) {
  const lines: string[] = [];
  for (const workstream of task?.workstreams ?? []) {
    lines.push(
      `- ${workstream.id ?? "unknown"} | owner=${workstream.owner ?? "-"} | branch=${workstream.branch ?? "-"} | status=${workstream.status ?? "-"} | eta=${workstream.estimatedMinutes ?? "-"}m`
    );
  }
  return lines.length ? lines : ["- no workstreams found"];
}

function buildGraph() {
  const graph = new StateGraph(CoordinationAnnotation)
    .addNode("intake", async () => ({
      task: loadTask(),
      currentRole: "product",
      reportLines: [
        "# LangGraph coordination run",
        `- source of truth: .agents/task.json`,
        `- cadence: poll every 5s, update every 30-60s`,
        "",
      ],
    }))
    .addNode("product", async (state): Promise<Partial<CoordinationRuntimeState>> => {
      const task = state.task;
      const product = task?.activeTask?.product;
      const lines = [
        ...section("Product", [
          `- objective: ${task?.currentObjective ?? "-"}`,
          `- problem: ${product?.problemStatement ?? "-"}`,
          `- user: ${product?.user ?? "-"}`,
          "- use cases:",
          ...formatBullets(product?.useCases),
          "- nfrs:",
          ...formatBullets(product?.nfrs),
          "- acceptance:",
          ...formatBullets(product?.acceptanceCriteria),
          "- anti-scope:",
          ...formatBullets(product?.antiScope),
        ]),
      ];
      return { currentRole: "architect", reportLines: lines };
    })
    .addNode("architect", async (state): Promise<Partial<CoordinationRuntimeState>> => {
      const task = state.task;
      const lines = [
        ...section("Architect", [
          "- split work into disjoint lanes with explicit ownership",
          `- dispatch agent: ${task?.dispatchAgent ?? "-"}`,
          "- workstreams:",
          ...summarizeWorkstreams(task),
        ]),
      ];
      return { currentRole: "coder", reportLines: lines };
    })
    .addNode("coder", async (state): Promise<Partial<CoordinationRuntimeState>> => {
      const task = state.task;
      const lines = [
        ...section("Coder", [
          "- implement only the owner lane for the current workstream",
          "- keep runtime code, APIs, and UI changes inside the ownership map",
          "- suggested Codex tasks:",
          ...formatBullets(task?.activeTask?.codexTasks),
        ]),
      ];
      return { currentRole: "tester", reportLines: lines };
    })
    .addNode("tester", async (state): Promise<Partial<CoordinationRuntimeState>> => {
      const task = state.task;
      const lines = [
        ...section("Tester", [
          "- run the targeted suite after each dev change",
          "- cover happy path, edge cases, and NFRs",
          "- suggested Claude tasks:",
          ...formatBullets(task?.activeTask?.claudeTasks),
        ]),
      ];
      return { currentRole: "security", reportLines: lines };
    })
    .addNode("security", async () => ({
      currentRole: "housekeeper",
      reportLines: section("Security", [
        "- check secrets, public exposure, dangerous env usage, and unsafe workflow changes",
        "- keep API keys out of git, handoffs, and generated reports",
      ]),
    }))
    .addNode("housekeeper", async () => ({
      currentRole: "housekeeper",
      reportLines: section("Housekeeper", [
        "- verify repo cleanliness and launch readiness",
        "- confirm typecheck + tests + security gates are green before merge",
      ]),
    }))
    .addEdge(START, "intake")
    .addEdge("intake", "product")
    .addEdge("product", "architect")
    .addEdge("architect", "coder")
    .addEdge("coder", "tester")
    .addEdge("tester", "security")
    .addEdge("security", "housekeeper")
    .addEdge("housekeeper", END)
    .compile();

  return graph;
}

export async function runLangGraphCoordination(options: LangGraphRunOptions = {}): Promise<LangGraphRunResult> {
  const graph = buildGraph();
  const result = await graph.invoke({
    task: loadTask(),
    reportLines: [],
    roleOrder: ["product", "architect", "coder", "tester", "security", "housekeeper"],
    currentRole: "product",
    target: options.target ?? "all",
  });

  const reportMarkdown = [
    ...result.reportLines,
    `## Next target`,
    `- ${options.target ?? "all"}`,
    "",
  ].join("\n");

  if (options.writeReport) {
    writeFileSync(REPORT_PATH, `${reportMarkdown}\n`);
    const handoffTarget = options.target === "claude" ? CLAUDE_HANDOFF_PATH : CODEx_HANDOFF_PATH;
    writeFileSync(handoffTarget, `${reportMarkdown}\n`);
  }

  return {
    task: result.task,
    reportMarkdown,
    reportLines: result.reportLines,
  };
}
