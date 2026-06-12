"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, ChevronRight, ChevronDown, ChevronUp, FolderOpen, BookOpen } from "lucide-react";
import { StrategyPlaybook } from "@/types";

interface PlaybooksEditorProps {
  strategies: StrategyPlaybook[];
  onChange: (list: StrategyPlaybook[]) => void;
}

export function StrategyPlaybooksEditor({ strategies, onChange }: PlaybooksEditorProps) {
  const { toast } = useToast();
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newPlaybookInputs, setNewPlaybookInputs] = useState<Record<string, string>>({});
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ type: 'strategy' | 'playbook'; strategyId: string; playbookId?: string; value: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const normalized = strategies.length > 0 ? strategies : [];

  const updateStrategies = (updater: (prev: StrategyPlaybook[]) => StrategyPlaybook[]) => {
    onChange(updater([...normalized]));
  };

  const addStrategy = () => {
    const name = newStrategyName.trim();
    if (!name) return;
    if (normalized.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Exists", description: "Strategy already exists.", variant: "destructive" });
      return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    updateStrategies(prev => [...prev, { id, name, playbooks: [] }]);
    setNewStrategyName("");
  };

  const removeStrategy = (strategyId: string) => {
    updateStrategies(prev => prev.filter(s => s.id !== strategyId));
  };

  const updateStrategyName = (strategyId: string, name: string) => {
    updateStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, name } : s));
  };

  const addPlaybook = (strategyId: string) => {
    const name = (newPlaybookInputs[strategyId] || "").trim();
    if (!name) return;
    const strategy = normalized.find(s => s.id === strategyId);
    if (strategy && strategy.playbooks.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Exists", description: "Playbook already exists under this strategy.", variant: "destructive" });
      return;
    }
    updateStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, playbooks: [...s.playbooks, { id: Math.random().toString(36).substring(7), name }] } : s));
    setNewPlaybookInputs(prev => ({ ...prev, [strategyId]: "" }));
  };

  const removePlaybook = (strategyId: string, playbookId: string) => {
    updateStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, playbooks: s.playbooks.filter(p => p.id !== playbookId) } : s));
  };

  const updatePlaybookName = (strategyId: string, playbookId: string, name: string) => {
    updateStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, playbooks: s.playbooks.map(p => p.id === playbookId ? { ...p, name } : p) } : s));
  };

  return (
    <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors"
      >
        <div className="text-left">
          <CardTitle className="text-base md:text-lg">Strategy Playbooks</CardTitle>
          <CardDescription className="text-xs md:text-sm">Organize your trading strategies and the playbooks under each one.</CardDescription>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
      <CardContent className="space-y-4 pt-0 pb-6 px-4 md:px-6">
        <div className="flex gap-2">
          <Input placeholder="New strategy name..." value={newStrategyName} onChange={e => setNewStrategyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStrategy()} className="h-9" />
          <Button size="sm" onClick={addStrategy}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {normalized.map(strategy => (
            <div key={strategy.id} className="border border-border rounded-lg bg-background-secondary overflow-hidden">
              <div className="flex items-center gap-2 p-2 bg-background-tertiary/50">
                <button type="button" onClick={() => setExpandedStrategies(prev => ({ ...prev, [strategy.id]: !prev[strategy.id] }))} className="text-text-muted hover:text-foreground">
                  {expandedStrategies[strategy.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <FolderOpen className="h-4 w-4 text-accent" />
                {editing?.type === 'strategy' && editing.strategyId === strategy.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { updateStrategyName(strategy.id, editing.value); setEditing(null); } }} className="h-7 text-sm" autoFocus />
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { updateStrategyName(strategy.id, editing.value); setEditing(null); }}>Save</Button>
                  </div>
                ) : (
                  <span className="text-sm font-semibold flex-1 truncate">{strategy.name}</span>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-primary" onClick={() => setEditing({ type: 'strategy', strategyId: strategy.id, value: strategy.name })}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-loss" onClick={() => removeStrategy(strategy.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>

              {expandedStrategies[strategy.id] && (
                <div className="p-2 space-y-2">
                  {strategy.playbooks.map(playbook => (
                    <div key={playbook.id} className="flex items-center gap-2 pl-6 pr-2 py-1.5 bg-background rounded border border-border/50">
                      <BookOpen className="h-3.5 w-3.5 text-text-muted" />
                      {editing?.type === 'playbook' && editing.strategyId === strategy.id && editing.playbookId === playbook.id ? (
                        <div className="flex-1 flex gap-2">
                          <Input value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { updatePlaybookName(strategy.id, playbook.id, editing.value); setEditing(null); } }} className="h-7 text-sm" autoFocus />
                          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { updatePlaybookName(strategy.id, playbook.id, editing.value); setEditing(null); }}>Save</Button>
                        </div>
                      ) : (
                        <span className="text-sm flex-1 truncate">{playbook.name}</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-primary" onClick={() => setEditing({ type: 'playbook', strategyId: strategy.id, playbookId: playbook.id, value: playbook.name })}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-loss" onClick={() => removePlaybook(strategy.id, playbook.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pl-6 pt-1">
                    <Input placeholder="New playbook..." value={newPlaybookInputs[strategy.id] || ""} onChange={e => setNewPlaybookInputs(prev => ({ ...prev, [strategy.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addPlaybook(strategy.id)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8" onClick={() => addPlaybook(strategy.id)}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {normalized.length === 0 && (
            <div className="text-sm text-text-muted text-center py-4">No strategies yet. Add your first strategy above.</div>
          )}
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
