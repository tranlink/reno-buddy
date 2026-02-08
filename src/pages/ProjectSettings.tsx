import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { Plus, UserMinus } from "lucide-react";

type Partner = Tables<"partners">;

export default function ProjectSettings() {
  const { activeProject, projects, setActiveProjectId, refetch } = useProjects();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  // Project form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copyFrom, setCopyFrom] = useState("__none__");
  const [creating, setCreating] = useState(isNew);
  const [saving, setSaving] = useState(false);

  // Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState("");

  useEffect(() => {
    if (!activeProject || creating) return;
    setName(activeProject.name);
    setDescription(activeProject.description || "");
    setWhatsapp(activeProject.whatsapp_group_name || "");
    supabase.from("partners").select("*").eq("project_id", activeProject.id).order("created_at")
      .then(({ data }) => setPartners(data || []));
  }, [activeProject, creating]);

  const handleSaveProject = async () => {
    if (!activeProject || !name) return;
    setSaving(true);
    await supabase.from("projects").update({ name, description: description || null, whatsapp_group_name: whatsapp || null }).eq("id", activeProject.id);
    setSaving(false);
    toast({ title: "Project updated!" });
    refetch();
  };

  const handleCreateProject = async () => {
    if (!name || !user) return;
    setSaving(true);
    const { data: newProj } = await supabase.from("projects")
      .insert({ name, description: description || null, whatsapp_group_name: whatsapp || null, user_id: user.id })
      .select().single();

    if (newProj && copyFrom !== "__none__") {
      const { data: sourcePartners } = await supabase.from("partners").select("*").eq("project_id", copyFrom).eq("active", true);
      if (sourcePartners && sourcePartners.length > 0) {
        await supabase.from("partners").insert(sourcePartners.map((p) => ({ project_id: newProj.id, name: p.name })));
      }
    }

    setSaving(false);
    if (newProj) {
      toast({ title: "Project created!" });
      await refetch();
      setActiveProjectId(newProj.id);
      setCreating(false);
    }
  };

  const addPartner = async () => {
    if (!newPartnerName || !activeProject) return;
    await supabase.from("partners").insert({ project_id: activeProject.id, name: newPartnerName });
    setNewPartnerName("");
    const { data } = await supabase.from("partners").select("*").eq("project_id", activeProject.id).order("created_at");
    setPartners(data || []);
    toast({ title: "Partner added!" });
  };

  const deactivatePartner = async (id: string) => {
    await supabase.from("partners").update({ active: false }).eq("id", id);
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, active: false } : p));
    toast({ title: "Partner deactivated" });
  };

  if (creating) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader><CardTitle>Create New Project</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Project Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Airbnb Project" /></div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>WhatsApp Group Name</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          {projects.length > 0 && (
            <div><Label>Copy Partners From</Label>
              <Select value={copyFrom} onValueChange={setCopyFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Don't copy</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleCreateProject} disabled={saving || !name} className="flex-1">{saving ? "Creating..." : "Create Project"}</Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeProject) return <p className="text-muted-foreground">Select a project.</p>;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Card>
        <CardHeader><CardTitle>Project Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>WhatsApp Group Name</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          <Button onClick={handleSaveProject} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Partners</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${p.active ? "bg-secondary" : "bg-muted opacity-50"}`}>
              <span className="text-sm">{p.name} {!p.active && <span className="text-xs text-muted-foreground">(inactive)</span>}</span>
              {p.active && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deactivatePartner(p.id)}>
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="New partner name" value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={addPartner} disabled={!newPartnerName}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
        <Plus className="mr-1 h-4 w-4" /> Create Another Project
      </Button>
    </div>
  );
}
