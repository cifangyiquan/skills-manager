import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Square,
  SquareCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "../utils";
import { useApp } from "../context/AppContext";
import { useMultiSelect } from "../hooks/useMultiSelect";
import { MultiSelectToolbar } from "../components/MultiSelectToolbar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PresetBar } from "../components/PresetBar";
import { AgentIcon } from "../components/AgentIcon";
import { SkillDetailPanel } from "../components/SkillDetailPanel";
import { DetailSheet } from "../components/DetailSheet";
import { SkillMarkdown } from "../components/SkillMarkdown";
import { DocumentDiffViewer } from "../components/DocumentDiffViewer";
import { getTagColor, getTagActiveColor } from "../lib/skillTags";
import * as api from "../lib/tauri";
import type { ManagedSkill, ProjectSkill, ToolInfo } from "../lib/tauri";
import { getErrorMessage } from "../lib/error";

function compactHomePath(path: string) {
  return path.replace(/^\/Users\/[^/]+/, "~");
}

function getLocalStatusMeta(t: (key: string) => string, status: ProjectSkill["sync_status"]) {
  switch (status) {
    case "in_sync":
      return {
        label: t("globalWorkspace.localSkills.status.inSync"),
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      };
    case "project_newer":
      return {
        label: t("globalWorkspace.localSkills.status.localNewer"),
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    case "center_newer":
      return {
        label: t("globalWorkspace.localSkills.status.centerNewer"),
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
    case "diverged":
      return {
        label: t("globalWorkspace.localSkills.status.diverged"),
        className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
      };
    default:
      return {
        label: t("globalWorkspace.localSkills.status.localOnly"),
        className: "bg-surface-hover text-muted",
      };
  }
}

function AddSkillDialog({
  agent,
  managedSkills,
  installedSkillIds,
  onAdd,
  onClose,
}: {
  agent: ToolInfo;
  managedSkills: ManagedSkill[];
  installedSkillIds: Set<string>;
  onAdd: (skillIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const available = useMemo(
    () =>
      managedSkills.filter(
        (skill) =>
          !installedSkillIds.has(skill.id) &&
          (search === "" ||
            skill.name.toLowerCase().includes(search.toLowerCase()) ||
            (skill.description || "").toLowerCase().includes(search.toLowerCase()))
      ),
    [installedSkillIds, managedSkills, search]
  );

  const toggleSelect = (skillId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      await onAdd(Array.from(selectedIds));
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !adding && onClose()}
      />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-[14px] font-semibold text-primary">
            {t("globalWorkspace.addSkillDialogTitle", { agent: agent.display_name })}
          </h2>
          <button
            onClick={onClose}
            disabled={adding}
            className="rounded-[4px] p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border-subtle px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("globalWorkspace.addSkillSearch")}
              className="app-input w-full pl-8"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          {available.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted">
              {installedSkillIds.size >= managedSkills.length && search === ""
                ? t("globalWorkspace.allInstalled")
                : t("globalWorkspace.noSkillsMatch")}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {available.map((skill) => {
                const selected = selectedIds.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => toggleSelect(skill.id)}
                    disabled={adding}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover",
                      selected && "bg-accent-bg"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selected
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-transparent"
                      )}
                    >
                      {selected && (
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-primary">{skill.name}</div>
                      {skill.description && (
                        <div className="mt-0.5 truncate text-[12px] text-muted">{skill.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border-subtle px-5 py-3">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={adding}
              className="rounded-md border border-border-subtle px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border hover:text-secondary disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || selectedIds.size === 0}
              className="inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("globalWorkspace.addButton", { count: selectedIds.size })}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function GlobalWorkspace() {
  const { agentKey } = useParams<{ agentKey?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tools, managedSkills, scenarios, refreshManagedSkills, refreshTools } = useApp();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [batchRemoveConfirm, setBatchRemoveConfirm] = useState(false);
  const [batchRemoving, setBatchRemoving] = useState(false);
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null);
  const [localSkills, setLocalSkills] = useState<ProjectSkill[]>([]);
  const [localSkillsLoading, setLocalSkillsLoading] = useState(false);
  const [localActionKey, setLocalActionKey] = useState<string | null>(null);
  const [localDetailSkill, setLocalDetailSkill] = useState<ProjectSkill | null>(null);
  const [localDocContent, setLocalDocContent] = useState<string | null>(null);
  const [localCenterDocContent, setLocalCenterDocContent] = useState<string | null>(null);
  const [localDocLoading, setLocalDocLoading] = useState(false);
  const [localCenterDocLoading, setLocalCenterDocLoading] = useState(false);
  const [localContentTab, setLocalContentTab] = useState<"local" | "diff" | "center">("local");
  const [uploadConfirmSkill, setUploadConfirmSkill] = useState<ProjectSkill | null>(null);
  const [pullConfirmSkill, setPullConfirmSkill] = useState<ProjectSkill | null>(null);
  const localDetailRequestRef = useRef(0);

  const detailSkill = useMemo(
    () => (detailSkillId ? managedSkills.find((s) => s.id === detailSkillId) ?? null : null),
    [detailSkillId, managedSkills]
  );

  const installedTools = useMemo(() => tools.filter((t) => t.installed && t.enabled), [tools]);

  const presetBarAgentKeys = useMemo(
    () => agentKey ? [agentKey] : installedTools.map((t) => t.key),
    [agentKey, installedTools]
  );

  const skillCountByAgent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tool of installedTools) {
      map[tool.key] = managedSkills.filter((s) =>
        s.targets.some((target) => target.tool === tool.key)
      ).length;
    }
    return map;
  }, [installedTools, managedSkills]);

  const currentTool = useMemo(
    () => (agentKey ? tools.find((t) => t.key === agentKey) ?? null : null),
    [agentKey, tools]
  );

  const loadLocalSkills = useCallback(async () => {
    if (!currentTool) {
      setLocalSkills([]);
      return;
    }
    setLocalSkillsLoading(true);
    try {
      const skills = await api.getGlobalLocalSkills(currentTool.key);
      setLocalSkills(skills);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("common.error")));
      setLocalSkills([]);
    } finally {
      setLocalSkillsLoading(false);
    }
  }, [currentTool, t]);

  useEffect(() => {
    void loadLocalSkills();
  }, [loadLocalSkills]);

  useEffect(() => {
    localDetailRequestRef.current += 1;
    setLocalDetailSkill(null);
    setUploadConfirmSkill(null);
    setPullConfirmSkill(null);
  }, [currentTool?.key]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const skill of managedSkills) {
      for (const tag of skill.tags) {
        if (tag.trim()) tags.add(tag);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [managedSkills]);

  const agentSkills = useMemo(
    () =>
      agentKey
        ? managedSkills.filter((skill) =>
            skill.targets.some((target) => target.tool === agentKey)
          )
        : [],
    [agentKey, managedSkills]
  );

  const filtered = useMemo(() => {
    let result = agentSkills;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(q) ||
          (skill.description || "").toLowerCase().includes(q)
      );
    }
    if (tagFilters.size > 0) {
      result = result.filter((skill) => skill.tags.some((tag) => tagFilters.has(tag)));
    }
    return result;
  }, [agentSkills, search, tagFilters]);

  const visibleLocalSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localSkills
      .filter((skill) => {
        if (!q) return true;
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.dir_name.toLowerCase().includes(q) ||
          (skill.description || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const priority: Record<ProjectSkill["sync_status"], number> = {
          project_only: 0,
          project_newer: 1,
          diverged: 2,
          center_newer: 3,
          in_sync: 4,
        };
        return (
          priority[a.sync_status] - priority[b.sync_status] ||
          a.name.localeCompare(b.name)
        );
      });
  }, [localSkills, search]);

  const inSyncLocalCount = useMemo(
    () => localSkills.filter((skill) => skill.sync_status === "in_sync").length,
    [localSkills]
  );

  const {
    isMultiSelect, setIsMultiSelect,
    selectedIds,
    toggleSelect,
    isAllSelected,
    anyDisabled,
    handleSelectAll,
    exitMultiSelect,
  } = useMultiSelect({
    items: agentSkills,
    filtered,
    getKey: (s) => s.id,
    isItemActive: () => true,
  });

  const installedIds = useMemo(
    () => new Set(agentSkills.map((s) => s.id)),
    [agentSkills]
  );

  const toggleTagFilter = (tag: string) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleRemove = async (skill: ManagedSkill) => {
    if (!agentKey) return;
    setRemovingId(skill.id);
    try {
      await api.unsyncSkillFromTool(skill.id, agentKey);
      await Promise.all([refreshManagedSkills(), refreshTools()]);
      toast.success(t("globalWorkspace.removedToast", { name: skill.name }));
    } catch (e) {
      toast.error(getErrorMessage(e, t("common.error")));
    } finally {
      setRemovingId(null);
    }
  };

  const handleBatchRemove = async () => {
    if (!agentKey) return;
    setBatchRemoving(true);
    const ids = Array.from(selectedIds);
    let removed = 0;
    let failed = 0;
    for (const skillId of ids) {
      try {
        await api.unsyncSkillFromTool(skillId, agentKey);
        removed++;
      } catch {
        failed++;
      }
    }
    await Promise.all([refreshManagedSkills(), refreshTools()]);
    if (removed > 0) toast.success(t("globalWorkspace.batchRemoved", { count: removed }));
    if (failed > 0) toast.error(t("globalWorkspace.batchRemoveFailed", { count: failed }));
    exitMultiSelect();
    setBatchRemoveConfirm(false);
    setBatchRemoving(false);
  };

  const handleAddSkills = useCallback(
    async (skillIds: string[]) => {
      if (!agentKey) return;
      for (const skillId of skillIds) {
        await api.syncSkillToTool(skillId, agentKey);
      }
      await Promise.all([refreshManagedSkills(), refreshTools()]);
      toast.success(t("globalWorkspace.addedToast", { count: skillIds.length }));
      setAddDialogOpen(false);
    },
    [agentKey, refreshManagedSkills, refreshTools, t]
  );

  const handleUploadLocalSkill = useCallback(
    async (skill: ProjectSkill) => {
      if (!currentTool) return;
      const key = `upload:${skill.relative_path}`;
      setLocalActionKey(key);
      try {
        await api.importGlobalLocalSkillToCenter(currentTool.key, skill.relative_path);
        toast.success(t("globalWorkspace.localSkills.uploadedToast", { name: skill.name, agent: currentTool.display_name }));
        await Promise.all([loadLocalSkills(), refreshManagedSkills()]);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, t("common.error")));
      } finally {
        setLocalActionKey(null);
        setUploadConfirmSkill(null);
      }
    },
    [currentTool, loadLocalSkills, refreshManagedSkills, t]
  );

  const handlePullLocalSkill = useCallback(
    async (skill: ProjectSkill) => {
      if (!currentTool) return;
      const key = `pull:${skill.relative_path}`;
      setLocalActionKey(key);
      try {
        await api.updateGlobalLocalSkillFromCenter(currentTool.key, skill.relative_path);
        toast.success(t("globalWorkspace.localSkills.pulledToast", { name: skill.name, agent: currentTool.display_name }));
        await loadLocalSkills();
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, t("common.error")));
      } finally {
        setLocalActionKey(null);
        setPullConfirmSkill(null);
      }
    },
    [currentTool, loadLocalSkills, t]
  );

  const openLocalDetail = useCallback(
    async (skill: ProjectSkill) => {
      if (!currentTool) return;
      const requestId = localDetailRequestRef.current + 1;
      localDetailRequestRef.current = requestId;
      setLocalDetailSkill(skill);
      setLocalContentTab("local");
      setLocalDocContent(null);
      setLocalCenterDocContent(null);
      setLocalDocLoading(true);
      setLocalCenterDocLoading(!!skill.center_skill_id);

      api
        .getGlobalLocalSkillDocument(currentTool.key, skill.relative_path)
        .then((doc) => {
          if (localDetailRequestRef.current === requestId) setLocalDocContent(doc.content);
        })
        .catch(() => {
          if (localDetailRequestRef.current === requestId) setLocalDocContent(null);
        })
        .finally(() => {
          if (localDetailRequestRef.current === requestId) setLocalDocLoading(false);
        });

      if (skill.center_skill_id) {
        api
          .getSkillDocument(skill.center_skill_id)
          .then((doc) => {
            if (localDetailRequestRef.current === requestId) setLocalCenterDocContent(doc.content);
          })
          .catch(() => {
            if (localDetailRequestRef.current === requestId) setLocalCenterDocContent(null);
          })
          .finally(() => {
            if (localDetailRequestRef.current === requestId) setLocalCenterDocLoading(false);
          });
      }
    },
    [currentTool]
  );

  const existsInGlobal = useCallback(
    (skill: ManagedSkill, agentK: string) =>
      skill.targets.some((target) => target.tool === agentK),
    []
  );

  const handlePresetAdd = useCallback(async (skill: ManagedSkill, agentK: string) => {
    await api.syncSkillToTool(skill.id, agentK);
  }, []);

  const handlePresetRemove = useCallback(async (skill: ManagedSkill, agentK: string) => {
    await api.unsyncSkillFromTool(skill.id, agentK);
  }, []);

  const handlePresetComplete = useCallback(async () => {
    await Promise.all([refreshManagedSkills(), refreshTools()]);
  }, [refreshManagedSkills, refreshTools]);

  if (installedTools.length === 0) {
    return (
      <div className="app-page">
        <div className="app-panel flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover">
            <Globe className="h-5 w-5 text-muted" />
          </div>
          <p className="text-[13px] font-medium text-secondary">{t("globalWorkspace.noAgents")}</p>
          <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-muted">
            {t("globalWorkspace.noAgentsHint")}
          </p>
        </div>
      </div>
    );
  }

  if (!currentTool) {
    return (
      <div className="app-page">
        <div className="app-page-header flex flex-col gap-2.5 pb-3 pr-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="app-page-title flex items-center gap-2.5">
                <Globe className="h-5 w-5 text-accent" />
                {t("globalWorkspace.title")}
                <span className="app-badge">{installedTools.length}</span>
              </h1>
            </div>
          </div>

          {scenarios.length > 0 && (
            <PresetBar
              presets={scenarios}
              managedSkills={managedSkills}
              agentKeys={presetBarAgentKeys}
              existsInWorkspace={existsInGlobal}
              onAddSkill={handlePresetAdd}
              onRemoveSkill={handlePresetRemove}
              onComplete={handlePresetComplete}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {installedTools.map((tool) => {
            const count = skillCountByAgent[tool.key] ?? 0;
            return (
              <button
                key={tool.key}
                onClick={() => navigate(`/global-workspace/${tool.key}`)}
                className="app-panel group flex items-center gap-3 p-3.5 text-left transition-all hover:border-border hover:bg-surface-hover"
              >
                <AgentIcon
                  agentKey={tool.key}
                  displayName={tool.display_name}
                  className="h-9 w-9 rounded-lg transition-colors group-hover:border-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-secondary">{tool.display_name}</p>
                  <p className="text-[12px] text-muted">{t("globalWorkspace.skillCount", { count })}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      {/* Header */}
      <div className="app-page-header flex flex-col gap-2.5 pb-3 pr-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-[1_1_180px]">
            <h1 className="app-page-title flex items-center gap-2.5">
              <AgentIcon
                agentKey={currentTool.key}
                displayName={currentTool.display_name}
                className="h-7 w-7 rounded-lg"
              />
              {currentTool.display_name}
              <span className="app-badge">{agentSkills.length}</span>
            </h1>
          </div>

          <div className="flex min-w-0 flex-[2_1_520px] flex-wrap items-center justify-end gap-2">
            <div className="relative w-full min-w-[220px] max-w-[320px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("globalWorkspace.addSkillSearch")}
                className="app-input h-9 w-full rounded-md pl-8 font-medium"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="app-segmented shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-2 transition-colors outline-none",
                  viewMode === "grid" ? "bg-surface-active text-secondary" : "text-muted hover:text-tertiary"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-2 transition-colors outline-none",
                  viewMode === "list" ? "bg-surface-active text-secondary" : "text-muted hover:text-tertiary"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => (isMultiSelect ? exitMultiSelect() : setIsMultiSelect(true))}
                className={cn(
                  "rounded-md p-2 transition-colors outline-none",
                  isMultiSelect ? "bg-surface-active text-secondary" : "text-muted hover:text-tertiary"
                )}
                title={isMultiSelect ? t("globalWorkspace.cancelSelect") : t("globalWorkspace.selectMode")}
              >
                <SquareCheck className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setAddDialogOpen(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("globalWorkspace.addSkill")}
            </button>
          </div>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-muted">{t("mySkills.tags.filter")}</span>
            <button
              onClick={() => setTagFilters(new Set())}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                tagFilters.size === 0
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-muted hover:text-secondary"
              )}
            >
              {t("mySkills.tags.allTags")}
            </button>
            {allTags.map((tag) => {
              const active = tagFilters.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                    active ? getTagActiveColor(tag, allTags) : getTagColor(tag, allTags)
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Preset bar */}
        {scenarios.length > 0 && (
          <PresetBar
            presets={scenarios}
            managedSkills={managedSkills}
            agentKeys={presetBarAgentKeys}
            existsInWorkspace={existsInGlobal}
            onAddSkill={handlePresetAdd}
            onRemoveSkill={handlePresetRemove}
            onComplete={handlePresetComplete}
          />
        )}
      </div>

      {/* Multi-select toolbar */}
      {isMultiSelect && (
        <MultiSelectToolbar
          selectedCount={selectedIds.size}
          isAllSelected={isAllSelected}
          anyDisabled={anyDisabled}
          showToggle={false}
          labels={{
            hint: t("globalWorkspace.selectHint"),
            selected: t("globalWorkspace.selectedCount", { count: selectedIds.size }),
            delete: t("globalWorkspace.deleteSelected", { count: selectedIds.size }),
            enable: "",
            disable: "",
            selectAll: t("globalWorkspace.selectAll"),
            deselectAll: t("globalWorkspace.deselectAll"),
            cancel: t("common.cancel"),
          }}
          onDelete={() => setBatchRemoveConfirm(true)}
          onToggle={() => {}}
          onSelectAll={handleSelectAll}
          onCancel={exitMultiSelect}
        />
      )}

      {(localSkillsLoading || visibleLocalSkills.length > 0) && currentTool && (
        <section className="mb-5 rounded-lg border border-border-subtle bg-bg-secondary/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-3.5 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <h2 className="text-[13px] font-semibold text-secondary">
                  {t("globalWorkspace.localSkills.title", { count: visibleLocalSkills.length })}
                </h2>
                {inSyncLocalCount > 0 && (
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] text-muted">
                    {t("globalWorkspace.localSkills.inSyncCount", { count: inSyncLocalCount })}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[12px] text-muted" title={currentTool.skills_dir}>
                {compactHomePath(currentTool.skills_dir)}
              </p>
            </div>
            <button
              onClick={() => void loadLocalSkills()}
              disabled={localSkillsLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle px-2.5 text-[12px] font-medium text-muted transition-colors hover:border-border hover:text-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", localSkillsLoading && "animate-spin")} />
              {t("settings.refresh")}
            </button>
          </div>

      {localSkillsLoading ? (
            <div className="flex items-center gap-2 px-3.5 py-4 text-[13px] text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("common.loading")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleLocalSkills.map((skill) => {
                const statusMeta = getLocalStatusMeta(t, skill.sync_status);
                const isInSync = skill.sync_status === "in_sync";
                const uploadKey = `upload:${skill.relative_path}`;
                const pullKey = `pull:${skill.relative_path}`;
                const canPull = skill.sync_status === "center_newer" || skill.sync_status === "diverged";
                return (
                  <div
                    key={`${skill.agent}:${skill.relative_path}`}
                    className={cn(
                      "group flex min-h-[128px] cursor-pointer flex-col rounded-lg border border-border-subtle bg-bg-primary p-3 transition-colors hover:border-border hover:bg-surface-hover",
                      isInSync && "opacity-70"
                    )}
                    onClick={() => void openLocalDetail(skill)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-primary" title={skill.name}>
                        {skill.name}
                      </h3>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", statusMeta.className)}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-[34px] text-[12px] leading-[17px] text-muted">
                      {skill.description || skill.relative_path}
                    </p>
                    <div className="mt-auto flex items-center justify-end gap-1.5 pt-3">
                      {isInSync ? null : canPull && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPullConfirmSkill(skill);
                          }}
                          disabled={localActionKey === pullKey}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-border-subtle px-2 text-[12px] font-medium text-muted transition-colors hover:border-border hover:text-secondary disabled:opacity-50"
                        >
                          {localActionKey === pullKey ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          {t("globalWorkspace.localSkills.pull")}
                        </button>
                      )}
                      {isInSync ? (
                        <span className="inline-flex h-7 items-center px-2 text-[12px] font-medium text-muted">
                          {t("globalWorkspace.localSkills.uploaded")}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (skill.sync_status === "project_only") {
                              void handleUploadLocalSkill(skill);
                            } else {
                              setUploadConfirmSkill(skill);
                            }
                          }}
                          disabled={localActionKey === uploadKey}
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                        >
                          {localActionKey === uploadKey ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          {t("globalWorkspace.localSkills.upload")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Skills */}
      {filtered.length === 0 ? (
        agentSkills.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
            <Globe className="mb-4 h-12 w-12 text-faint" />
            <h3 className="mb-1.5 text-[14px] font-semibold text-tertiary">
              {t("globalWorkspace.noSkillsForAgent")}
            </h3>
            <button
              onClick={() => setAddDialogOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("globalWorkspace.addSkill")}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
            <p className="text-[13px] text-muted">{t("mySkills.noMatch")}</p>
          </div>
        )
      ) : (
        <div
          className={cn(
            "pb-8",
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3 lg:grid-cols-3"
              : "flex flex-col gap-0.5"
          )}
        >
          {filtered.map((skill) => {
            const removing = removingId === skill.id;
            const isSelected = selectedIds.has(skill.id);

            if (viewMode === "grid") {
              return (
                <div
                  key={skill.id}
                  className={cn(
                    "app-panel group relative flex h-full cursor-pointer flex-col transition-all hover:border-border hover:bg-surface-hover",
                    isMultiSelect && isSelected && "ring-1 ring-accent border-accent/40"
                  )}
                  onClick={() =>
                    isMultiSelect ? toggleSelect(skill.id) : setDetailSkillId(skill.id)
                  }
                >
                  <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
                    {isMultiSelect ? (
                      isSelected
                        ? <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                        : <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    <h3
                      className="flex-1 truncate text-[14px] font-semibold text-primary"
                      title={skill.name}
                    >
                      {skill.name}
                    </h3>
                  </div>

                  <div className="px-3.5 pb-3">
                    <p className="truncate text-[13px] leading-[18px] text-muted">
                      {skill.description || "—"}
                    </p>
                    {skill.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {skill.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              getTagColor(tag, allTags)
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-end border-t border-border-subtle px-3.5 py-2">
                    {!isMultiSelect && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(skill);
                        }}
                        disabled={removing}
                        title={t("globalWorkspace.removeSkill")}
                        className="rounded p-1 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                      >
                        {removing
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // List view
            return (
              <div
                key={skill.id}
                className={cn(
                  "app-panel group flex cursor-pointer items-center gap-3.5 rounded-xl border-transparent px-3.5 py-3 transition-all hover:border-border hover:bg-surface-hover",
                  isMultiSelect && isSelected && "ring-1 ring-accent border-accent/40"
                )}
                onClick={() =>
                  isMultiSelect ? toggleSelect(skill.id) : setDetailSkillId(skill.id)
                }
              >
                {isMultiSelect ? (
                  isSelected
                    ? <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                    : <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
                <h3
                  className="w-[180px] shrink-0 truncate text-[14px] font-semibold text-secondary"
                  title={skill.name}
                >
                  {skill.name}
                </h3>
                <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  {skill.description || "—"}
                </p>
                {skill.tags.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                          getTagColor(tag, allTags)
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {!isMultiSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(skill);
                    }}
                    disabled={removing}
                    title={t("globalWorkspace.removeSkill")}
                    className="shrink-0 rounded p-0.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                  >
                    {removing
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SkillDetailPanel
        key={detailSkill?.id ?? "global-workspace-skill-detail-empty"}
        skill={detailSkill}
        onClose={() => setDetailSkillId(null)}
        tools={tools}
      />

      {addDialogOpen && currentTool && (
        <AddSkillDialog
          agent={currentTool}
          managedSkills={managedSkills}
          installedSkillIds={installedIds}
          onAdd={handleAddSkills}
          onClose={() => setAddDialogOpen(false)}
        />
      )}

      <DetailSheet
        open={!!localDetailSkill}
        title={localDetailSkill?.name ?? ""}
        description={localDetailSkill?.description}
        meta={
          localDetailSkill ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium", getLocalStatusMeta(t, localDetailSkill.sync_status).className)}>
                {getLocalStatusMeta(t, localDetailSkill.sync_status).label}
              </span>
              <span className="rounded-full bg-surface-hover px-2.5 py-1 text-[12px] text-muted">
                {localDetailSkill.relative_path}
              </span>
            </div>
          ) : null
        }
        onClose={() => setLocalDetailSkill(null)}
      >
        {localDetailSkill?.center_skill_id && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["local", "diff", "center"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLocalContentTab(tab)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  localContentTab === tab
                    ? "bg-accent text-white"
                    : "bg-surface-hover text-muted hover:text-secondary"
                )}
                disabled={(tab === "diff" || tab === "center") && localCenterDocLoading}
              >
                {tab === "local"
                  ? t("mySkills.docTabs.local")
                  : tab === "diff"
                    ? t("mySkills.docTabs.diff")
                    : t("project.docTabs.center")}
              </button>
            ))}
          </div>
        )}

        {localDocLoading ? (
          <div className="mt-12 text-center text-[13px] text-muted">{t("common.loading")}</div>
        ) : localContentTab === "diff" ? (
          localDocContent && localCenterDocContent ? (
            <DocumentDiffViewer original={localDocContent} updated={localCenterDocContent} />
          ) : localCenterDocLoading ? (
            <div className="mt-12 text-center text-[13px] text-muted">{t("common.loading")}</div>
          ) : (
            <div className="mt-12 text-center text-[13px] text-muted">{t("mySkills.sourceDiffUnavailable")}</div>
          )
        ) : localContentTab === "center" ? (
          localCenterDocLoading ? (
            <div className="mt-12 text-center text-[13px] text-muted">{t("common.loading")}</div>
          ) : localCenterDocContent ? (
            <SkillMarkdown content={localCenterDocContent} />
          ) : (
            <div className="mt-12 text-center text-[13px] text-muted">{t("mySkills.sourceDiffUnavailable")}</div>
          )
        ) : localDocContent ? (
          <SkillMarkdown content={localDocContent} />
        ) : (
          <div className="mt-12 text-center text-[13px] text-muted">{t("common.documentMissing")}</div>
        )}
      </DetailSheet>

      <ConfirmDialog
        open={batchRemoveConfirm}
        title={t("globalWorkspace.removeSkill")}
        message={t("globalWorkspace.batchRemoveConfirm", {
          count: selectedIds.size,
          agent: currentTool.display_name,
        })}
        tone="danger"
        confirmLabel={batchRemoving ? undefined : t("globalWorkspace.deleteSelected", { count: selectedIds.size })}
        onClose={() => setBatchRemoveConfirm(false)}
        onConfirm={handleBatchRemove}
      />
      <ConfirmDialog
        open={!!uploadConfirmSkill}
        title={t("globalWorkspace.localSkills.uploadConfirmTitle")}
        message={t("globalWorkspace.localSkills.uploadConfirmMessage", {
          name: uploadConfirmSkill?.name ?? "",
        })}
        tone="warning"
        confirmLabel={t("globalWorkspace.localSkills.upload")}
        onClose={() => setUploadConfirmSkill(null)}
        onConfirm={() => uploadConfirmSkill ? handleUploadLocalSkill(uploadConfirmSkill) : Promise.resolve()}
      />
      <ConfirmDialog
        open={!!pullConfirmSkill}
        title={t("globalWorkspace.localSkills.pullConfirmTitle")}
        message={t("globalWorkspace.localSkills.pullConfirmMessage", {
          name: pullConfirmSkill?.name ?? "",
          agent: currentTool?.display_name ?? "",
        })}
        tone="danger"
        confirmLabel={t("globalWorkspace.localSkills.pull")}
        onClose={() => setPullConfirmSkill(null)}
        onConfirm={() => pullConfirmSkill ? handlePullLocalSkill(pullConfirmSkill) : Promise.resolve()}
      />
    </div>
  );
}
