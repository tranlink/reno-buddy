import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  loading: boolean;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) { setProjects([]); setLoading(false); return; }
    const { data } = await supabase.from("projects").select("*").order("created_at");
    const list = data || [];
    setProjects(list);

    if (list.length > 0) {
      const stored = localStorage.getItem("activeProjectId");
      const valid = list.find((p) => p.id === stored);
      setActiveProjectId(valid ? valid.id : list[0].id);
    } else {
      // Seed default project
      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          name: "Mountain Cave Retreat",
          description: "Expenses (two new studio)",
          whatsapp_group_name: "Mountain Cave Retreat – Expenses",
          user_id: user.id,
        })
        .select()
        .single();

      if (newProject) {
        await supabase.from("partners").insert([
          { project_id: newProject.id, name: "Ahmed" },
          { project_id: newProject.id, name: "Abd El Rahman" },
          { project_id: newProject.id, name: "Amr" },
        ]);
        setProjects([newProject]);
        setActiveProjectId(newProject.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user]);

  useEffect(() => {
    if (activeProjectId) localStorage.setItem("activeProjectId", activeProjectId);
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProjectId, loading, refetch: fetchProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjects must be used within ProjectProvider");
  return context;
}
