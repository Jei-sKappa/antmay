import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  environment,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useMemo, useState } from "react";

type Skill = {
  name: string;
  title: string;
  group: string;
  groupTitle: string;
  description: string;
  version: string;
  sourcePath: string;
  body: string;
};

type Manifest = {
  generatedAt: string;
  source: string;
  groupOrder: string[];
  skills: Skill[];
};

const loadManifest = (): Manifest => {
  const path = join(environment.assetsPath, "skills.json");
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
};

const wrapPayload = (skill: Skill, prompt: string): string => {
  const wrapped = `<instruction>\n${skill.body.trimEnd()}\n</instruction>`;
  const userPrompt = prompt.trim();
  return userPrompt ? `${wrapped}\n\n${userPrompt}\n` : `${wrapped}\n`;
};

const groupBy = (skills: Skill[], order: string[]): [string, Skill[]][] => {
  const buckets = new Map<string, Skill[]>();
  for (const skill of skills) {
    const bucket = buckets.get(skill.group) ?? [];
    bucket.push(skill);
    buckets.set(skill.group, bucket);
  }
  const ordered: [string, Skill[]][] = [];
  for (const group of order) {
    const items = buckets.get(group);
    if (items && items.length > 0) ordered.push([group, items]);
  }
  for (const [group, items] of buckets) {
    if (!order.includes(group)) ordered.push([group, items]);
  }
  return ordered;
};

const copyToClipboard = async (payload: string, label: string) => {
  await Clipboard.copy(payload);
  await showHUD(`Copied ${label} to clipboard`);
  await closeMainWindow();
};

const pasteToFrontmost = async (payload: string) => {
  await Clipboard.paste(payload);
  await closeMainWindow();
};

const PromptForm = ({ skill }: { skill: Skill }) => {
  const { pop } = useNavigation();

  const onSubmit = async (values: { prompt: string }) => {
    const payload = wrapPayload(skill, values.prompt ?? "");
    try {
      await Clipboard.copy(payload);
      await showHUD(`Copied ${skill.title} + prompt to clipboard`);
      await closeMainWindow();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not copy",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onPaste = async (values: { prompt: string }) => {
    const payload = wrapPayload(skill, values.prompt ?? "");
    try {
      await Clipboard.paste(payload);
      await closeMainWindow();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not paste",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Form
      navigationTitle={skill.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Clipboard}
            title="Copy"
            onSubmit={onSubmit}
          />
          <Action.SubmitForm
            icon={Icon.AppWindow}
            title="Paste"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={onPaste}
          />
          <Action
            icon={Icon.ArrowLeft}
            title="Back to Skills"
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={skill.groupTitle}
        text={`${skill.title}${skill.version ? `  ·  v${skill.version}` : ""}\n${skill.description}`}
      />
      <Form.TextArea
        id="prompt"
        title="Your prompt"
        placeholder="What do you want the agent to do? (Submitting an empty prompt copies just the wrapped instruction.)"
        autoFocus
        enableMarkdown
      />
    </Form>
  );
};

export default function Command() {
  const [showDetail, setShowDetail] = useState(true);
  const manifest = useMemo(() => {
    try {
      return loadManifest();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load skills.json",
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  if (!manifest) {
    return (
      <List>
        <List.EmptyView
          title="Skills manifest missing"
          description="Run `npm run sync` (or `node scripts/sync-skills-to-raycast.mjs` from the repo root) to regenerate assets/skills.json."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const sections = groupBy(manifest.skills, manifest.groupOrder);

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search skills by name, group, or description"
    >
      {sections.map(([group, items]) => (
        <List.Section
          key={group}
          title={items[0]?.groupTitle ?? group}
          subtitle={`${items.length} skill${items.length === 1 ? "" : "s"}`}
        >
          {items.map((skill) => (
            <List.Item
              key={`${skill.group}/${skill.name}`}
              title={skill.title}
              subtitle={showDetail ? undefined : skill.description}
              keywords={[skill.name, skill.group, skill.groupTitle, ...skill.description.split(/\s+/)]}
              accessories={skill.version ? [{ tag: `v${skill.version}` }] : undefined}
              icon={skill.group === "deprecated" ? Icon.Hourglass : Icon.Book}
              detail={
                <List.Item.Detail
                  markdown={skill.body}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Skill" text={skill.name} />
                      <List.Item.Detail.Metadata.Label title="Group" text={skill.groupTitle} />
                      {skill.version ? (
                        <List.Item.Detail.Metadata.Label title="Version" text={skill.version} />
                      ) : null}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={skill.description || "—"}
                      />
                      <List.Item.Detail.Metadata.Label title="Source" text={skill.sourcePath} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Pencil}
                      title="Continue with Prompt…"
                      target={<PromptForm skill={skill} />}
                    />
                    <Action
                      icon={Icon.Clipboard}
                      title="Copy Skill Without Prompt"
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => copyToClipboard(wrapPayload(skill, ""), skill.title)}
                    />
                    <Action
                      icon={Icon.AppWindow}
                      title="Paste Skill in Frontmost App"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => pasteToFrontmost(wrapPayload(skill, ""))}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.AppWindowSidebarRight}
                      title={showDetail ? "Hide Preview" : "Show Preview"}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={() => setShowDetail((s) => !s)}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.Code}
                      title="Copy Raw Skill Body"
                      content={skill.body}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
