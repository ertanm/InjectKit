"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/chrome-extension"
import { EmptyState } from "~components/EmptyState"
import { LoadingSkeleton } from "~components/LoadingSkeleton"
import { Modal } from "~components/Modal"
import { OnboardingTour } from "~components/OnboardingTour"
import { PromptCard } from "~components/PromptCard"
import { SearchBar } from "~components/SearchBar"
import { SpaceSelector } from "~components/SpaceSelector"
import { TabNav } from "~components/TabNav"
import {
  createPrompt,
  createSpace,
  deletePrompt,
  deleteSpace,
  fetchPrompts,
  fetchSpaces,
  setTokenGetter,
  type Prompt,
  type Space,
  updatePrompt,
  updateSpace,
} from "~lib/api"
import "~style.css"

function AuthSync() {
  const { getToken } = useAuth()

  useEffect(() => {
    setTokenGetter(async () => {
      const token = await getToken()
      return token ?? null
    })
  }, [getToken])

  return null
}

function SignedOutScreen() {
  return (
    <div className="flex h-[600px] w-[400px] flex-col items-center justify-center overflow-hidden bg-[var(--pv-bg)] px-8 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--pv-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--pv-accent-soft)_80%,transparent)]">
        <svg
          className="h-7 w-7 text-[var(--pv-accent-strong)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2.5l8 3.5v5c0 5.25-3.4 10.2-8 11.5C7.4 21.2 4 16.25 4 11V6l8-3.5z"
          />
        </svg>
      </div>
      <h1 className="mb-1 text-lg font-semibold tracking-tight text-[var(--pv-text)]">
        PromptVault
      </h1>
      <p className="mb-6 text-sm text-[var(--pv-text-muted)]">Sign in to continue</p>
      <div className="flex flex-col gap-3">
        <SignInButton mode="modal">
          <button type="button" className="pv-button-primary pv-focus w-full">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="pv-button-ghost pv-focus w-full">
            Create account
          </button>
        </SignUpButton>
      </div>
    </div>
  )
}

export function App() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [isSavingSpace, setIsSavingSpace] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promptEditorOpen, setPromptEditorOpen] = useState(false)
  const [spaceEditorOpen, setSpaceEditorOpen] = useState(false)
  const [promptDraft, setPromptDraft] = useState({ id: "", title: "", body: "", tags: "" })
  const [spaceDraft, setSpaceDraft] = useState({ id: "", name: "" })
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "prompt" | "space"
    id: string
    label: string
  } | null>(null)
  const selectedSpaceIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedSpaceIdRef.current = selectedSpaceId
  }, [selectedSpaceId])

  const loadSpaces = useCallback(async (nextSelectedSpaceId?: string | null) => {
    const loadedSpaces = await fetchSpaces()
    setSpaces(loadedSpaces)
    if (loadedSpaces.length === 0) {
      setSelectedSpaceId(null)
      return
    }
    const currentSelection = selectedSpaceIdRef.current
    const preferredId =
      nextSelectedSpaceId ??
      (currentSelection && loadedSpaces.some((space) => space.id === currentSelection)
        ? currentSelection
        : null)
    setSelectedSpaceId(preferredId ?? loadedSpaces[0].id)
  }, [])

  const loadPrompts = useCallback(async (spaceId: string | null) => {
    if (!spaceId) {
      setPrompts([])
      return
    }
    const data = await fetchPrompts(spaceId)
    setPrompts(data)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        await loadSpaces()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spaces")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [loadSpaces])

  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        await loadPrompts(selectedSpaceId)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load prompts")
      }
    })()
  }, [loadPrompts, selectedSpaceId])

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const prompt of prompts) {
      for (const tag of prompt.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return counts
  }, [prompts])

  const allTags = useMemo(() => Array.from(tagCounts.keys()).sort(), [tagCounts])

  const tabs = useMemo(() => {
    const all = { label: "All", count: prompts.length }
    const tagTabs = allTags.map((tag) => ({
      label: tag,
      count: tagCounts.get(tag) ?? 0,
    }))
    return [all, ...tagTabs]
  }, [allTags, prompts.length, tagCounts])

  useEffect(() => {
    if (activeTab !== "All" && !allTags.includes(activeTab)) {
      setActiveTab("All")
    }
  }, [activeTab, allTags])

  const normalizedSearchQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery])

  const filteredPrompts = useMemo(() => {
    let filtered = prompts
    if (activeTab !== "All") {
      filtered = filtered.filter((prompt) => prompt.tags.includes(activeTab))
    }
    if (normalizedSearchQuery) {
      filtered = filtered.filter(
        (prompt) =>
          prompt.title.toLowerCase().includes(normalizedSearchQuery) ||
          prompt.body.toLowerCase().includes(normalizedSearchQuery),
      )
    }
    return filtered
  }, [activeTab, normalizedSearchQuery, prompts])

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spaces],
  )

  const handleCopy = useCallback(async (body: string) => {
    try {
      await navigator.clipboard.writeText(body)
    } catch {
      setError("Copy failed")
    }
  }, [])

  const handleInject = useCallback((body: string) => {
    chrome.runtime?.sendMessage?.({ type: "INJECT_PROMPT", body })
  }, [])

  const handlePromptSave = useCallback(async () => {
    if (!selectedSpaceId) {
      setError("Create or select a space first")
      return
    }
    if (!spaces.some((space) => space.id === selectedSpaceId)) {
      setError("Selected space no longer exists. Please select a space and try again.")
      await loadSpaces()
      return
    }
    const title = promptDraft.title.trim()
    const body = promptDraft.body.trim()
    const tags = promptDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (!title || !body) {
      setError("Title and prompt body are required")
      return
    }

    try {
      setIsSavingPrompt(true)
      setError(null)
      if (promptDraft.id) {
        await updatePrompt(promptDraft.id, { title, body, tags })
      } else {
        await createPrompt({ title, body, tags, spaceId: selectedSpaceId })
      }
      await loadPrompts(selectedSpaceId)
      setActiveTab("All")
      setSearchQuery("")
      setPromptEditorOpen(false)
      setPromptDraft({ id: "", title: "", body: "", tags: "" })
    } catch (err) {
      if (typeof (err as { status?: unknown })?.status === "number" && (err as { status: number }).status === 404) {
        await loadSpaces()
        setError("Selected space was not found. Please select a space and try again.")
        return
      }
      setError(err instanceof Error ? err.message : "Failed to save prompt")
    } finally {
      setIsSavingPrompt(false)
    }
  }, [loadPrompts, loadSpaces, promptDraft, selectedSpaceId, spaces])

  const handleSpaceSave = useCallback(async () => {
    const name = spaceDraft.name.trim()
    if (!name) {
      setError("Space name is required")
      return
    }

    const normalizedName = name.toLowerCase()
    const duplicateExists = spaces.some((space) => {
      const sameName = space.name.trim().toLowerCase() === normalizedName
      if (!sameName) return false
      if (!spaceDraft.id) return true
      return space.id !== spaceDraft.id
    })
    if (duplicateExists) {
      setError("A space with this name already exists")
      return
    }

    try {
      setIsSavingSpace(true)
      setError(null)
      if (spaceDraft.id) {
        const updated = await updateSpace(spaceDraft.id, name)
        await loadSpaces(updated.id)
      } else {
        const created = await createSpace(name)
        await loadSpaces(created.id)
      }
      setSpaceEditorOpen(false)
      setSpaceDraft({ id: "", name: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save space")
    } finally {
      setIsSavingSpace(false)
    }
  }, [loadSpaces, spaceDraft, spaces])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      setError(null)
      if (deleteTarget.type === "prompt") {
        await deletePrompt(deleteTarget.id)
        setSelectedPromptId((current) => (current === deleteTarget.id ? null : current))
        await loadPrompts(selectedSpaceId)
      } else {
        if (spaces.length <= 1) {
          setError("At least one space must exist")
          setDeleteTarget(null)
          return
        }
        await deleteSpace(deleteTarget.id)
        await loadSpaces()
      }
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, loadPrompts, loadSpaces, selectedSpaceId, spaces.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      if (filteredPrompts.length === 0) return
      const currentIndex = filteredPrompts.findIndex((prompt) => prompt.id === selectedPromptId)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const nextIndex = currentIndex < filteredPrompts.length - 1 ? currentIndex + 1 : 0
        setSelectedPromptId(filteredPrompts[nextIndex].id)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredPrompts.length - 1
        setSelectedPromptId(filteredPrompts[prevIndex].id)
      } else if (e.key === "Enter" && selectedPromptId) {
        const prompt = filteredPrompts.find((item) => item.id === selectedPromptId)
        if (prompt) handleInject(prompt.body)
      }
    },
    [filteredPrompts, handleInject, selectedPromptId],
  )

  return (
    <>
      <Show when="signed-out">
        <SignedOutScreen />
      </Show>
      <Show when="signed-in">
        <AuthSync />
        <div
          onKeyDown={handleKeyDown}
          className="flex h-[600px] w-[400px] flex-col overflow-hidden bg-[var(--pv-bg)] text-[var(--pv-text)]">
          <OnboardingTour />

          <div className="shrink-0 border-b border-[var(--pv-border)] px-4 pb-4 pt-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--pv-accent)] shadow-sm shadow-[color-mix(in_srgb,var(--pv-accent)_30%,transparent)]">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path
                      fill="white"
                      d="M12 2.5l8 3.5v5c0 5.25-3.4 10.2-8 11.5C7.4 21.2 4 16.25 4 11V6l8-3.5z"
                    />
                    <path
                      d="M9.5 12.5l2-2.5M11.5 14h2.5"
                      fill="none"
                      stroke="var(--pv-accent)"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h1 className="text-sm font-semibold tracking-tight">PromptVault</h1>
              </div>
              <div className="min-w-0 flex-1">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <div className="shrink-0">
                <UserButton afterSignOutUrl={chrome.runtime.getURL("popup.html")} />
              </div>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
              <SpaceSelector
                spaces={spaces}
                selectedId={selectedSpaceId}
                onChange={(id) => {
                  setSelectedSpaceId(id)
                  setActiveTab("All")
                  setSearchQuery("")
                }}
                className="min-w-0 flex-1"
              />
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label="Create space"
                  title="Create space"
                  className="pv-icon-button pv-focus"
                  onClick={() => {
                    setSpaceDraft({ id: "", name: "" })
                    setSpaceEditorOpen(true)
                  }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Rename space"
                  title="Rename space"
                  className="pv-icon-button pv-focus"
                  onClick={() => {
                    if (!selectedSpace) {
                      setError("Select a space to rename")
                      return
                    }
                    setSpaceDraft({ id: selectedSpace.id, name: selectedSpace.name })
                    setSpaceEditorOpen(true)
                  }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 112.97 2.97L7.5 18.79 3 20l1.21-4.5 12.652-12.013z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Delete space"
                  title="Delete space"
                  className="pv-icon-button pv-focus hover:text-red-400"
                  onClick={() => {
                    if (!selectedSpace) {
                      setError("Select a space to delete")
                      return
                    }
                    setDeleteTarget({ type: "space", id: selectedSpace.id, label: selectedSpace.name })
                  }}
                  disabled={!selectedSpace}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8m-9 0a1 1 0 011-1h6a1 1 0 011 1" />
                  </svg>
                </button>
              </div>
            </div>

            {prompts.length > 0 && (
              <button
                type="button"
                className="pv-button-primary pv-focus mb-3 h-8 w-full text-xs"
                onClick={() => {
                  if (!selectedSpaceId) {
                    setError("Create a space first")
                    return
                  }
                  setPromptDraft({ id: "", title: "", body: "", tags: "" })
                  setPromptEditorOpen(true)
                }}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
                New Prompt
              </button>
            )}
          </div>

          {prompts.length > 0 && (
            <div className="shrink-0 border-b border-[var(--pv-border)] px-4 py-2">
              <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}

          <div className="pv-scroll-hidden flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredPrompts.length === 0 ? (
              <EmptyState
                title={searchQuery ? "No results" : "No prompts yet"}
                message={
                  searchQuery
                    ? `No prompts match "${searchQuery}"`
                    : "Create your first prompt to start using PromptVault."
                }
                onAction={() => {
                  if (!selectedSpaceId) {
                    setError("Create a space first")
                    return
                  }
                  setPromptDraft({ id: "", title: "", body: "", tags: "" })
                  setPromptEditorOpen(true)
                }}
                actionLabel="Create Prompt"
              />
            ) : (
              filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isSelected={prompt.id === selectedPromptId}
                  onSelect={() => setSelectedPromptId(prompt.id)}
                  onCopy={() => handleCopy(prompt.body)}
                  onInject={() => handleInject(prompt.body)}
                  onEdit={() => {
                    setPromptDraft({
                      id: prompt.id,
                      title: prompt.title,
                      body: prompt.body,
                      tags: prompt.tags.join(", "),
                    })
                    setPromptEditorOpen(true)
                  }}
                  onDelete={() => setDeleteTarget({ type: "prompt", id: prompt.id, label: prompt.title })}
                />
              ))
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-[var(--pv-border)] px-4 py-2 text-[10px] text-[var(--pv-text-muted)]">
            <span>
              {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--pv-border)] bg-[var(--pv-surface)] px-1 py-0.5 text-[9px]">
                ↑↓
              </kbd>
              navigate
              <kbd className="ml-1 rounded border border-[var(--pv-border)] bg-[var(--pv-surface)] px-1 py-0.5 text-[9px]">
                ↵
              </kbd>
              inject
            </span>
          </div>

          <Modal
            isOpen={promptEditorOpen}
            title={promptDraft.id ? "Edit Prompt" : "Create Prompt"}
            description="Use comma-separated tags. Prompt body is what gets injected."
            onClose={() => {
              if (isSavingPrompt) return
              setPromptEditorOpen(false)
            }}
            footer={
              <>
                <button
                  type="button"
                  className="pv-button-ghost pv-focus"
                  onClick={() => setPromptEditorOpen(false)}
                  disabled={isSavingPrompt}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pv-button-primary pv-focus"
                  onClick={handlePromptSave}
                  disabled={isSavingPrompt}>
                  {isSavingPrompt ? "Saving..." : promptDraft.id ? "Save Changes" : "Create Prompt"}
                </button>
              </>
            }>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
                Title
                <input
                  type="text"
                  value={promptDraft.title}
                  onChange={(e) => setPromptDraft((current) => ({ ...current, title: e.target.value }))}
                  className="pv-focus mt-1 h-9 w-full rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 text-xs text-[var(--pv-text)]"
                  maxLength={200}
                />
              </label>

              <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
                Prompt body
                <textarea
                  value={promptDraft.body}
                  onChange={(e) => setPromptDraft((current) => ({ ...current, body: e.target.value }))}
                  className="pv-focus mt-1 h-28 w-full resize-none rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 py-2 text-xs text-[var(--pv-text)]"
                />
              </label>

              <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
                Tags
                <input
                  type="text"
                  value={promptDraft.tags}
                  onChange={(e) => setPromptDraft((current) => ({ ...current, tags: e.target.value }))}
                  placeholder="marketing, sales, outreach"
                  className="pv-focus mt-1 h-9 w-full rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 text-xs text-[var(--pv-text)] placeholder:text-[var(--pv-text-muted)]"
                />
              </label>
            </div>
          </Modal>

          <Modal
            isOpen={spaceEditorOpen}
            title={spaceDraft.id ? "Rename Space" : "Create Space"}
            description="Spaces group related prompts and keep your library organized."
            onClose={() => {
              if (isSavingSpace) return
              setSpaceEditorOpen(false)
            }}
            footer={
              <>
                <button
                  type="button"
                  className="pv-button-ghost pv-focus"
                  onClick={() => setSpaceEditorOpen(false)}
                  disabled={isSavingSpace}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pv-button-primary pv-focus"
                  onClick={handleSpaceSave}
                  disabled={isSavingSpace}>
                  {isSavingSpace ? "Saving..." : spaceDraft.id ? "Save Space" : "Create Space"}
                </button>
              </>
            }>
            <label className="block text-xs font-medium text-[var(--pv-text-muted)]">
              Space name
              <input
                type="text"
                value={spaceDraft.name}
                onChange={(e) => setSpaceDraft((current) => ({ ...current, name: e.target.value }))}
                maxLength={60}
                className="pv-focus mt-1 h-9 w-full rounded-lg border border-[var(--pv-border)] bg-[var(--pv-surface)] px-3 text-xs text-[var(--pv-text)]"
              />
            </label>
          </Modal>

          <Modal
            isOpen={Boolean(deleteTarget)}
            title={`Delete ${deleteTarget?.type === "space" ? "Space" : "Prompt"}`}
            description={`This action cannot be undone. "${deleteTarget?.label ?? ""}" will be removed.`}
            onClose={() => {
              if (isDeleting) return
              setDeleteTarget(null)
            }}
            footer={
              <>
                <button
                  type="button"
                  className="pv-button-ghost pv-focus"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pv-button pv-focus rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500"
                  onClick={handleDeleteConfirmed}
                  disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </>
            }>
            <p className="text-xs text-[var(--pv-text-muted)]">
              {deleteTarget?.type === "space"
                ? "Delete only works for empty spaces. Move or remove prompts first."
                : "Prompt will be soft-deleted and hidden from your library."}
            </p>
          </Modal>
        </div>
      </Show>
    </>
  )
}
