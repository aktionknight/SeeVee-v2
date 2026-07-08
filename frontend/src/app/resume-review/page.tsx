"use client";

import { useState, useEffect, useCallback } from "react";
import { ProfileOverview } from "./components/ProfileOverview";
import { ProjectsList } from "./components/ProjectsList";
import { ExperienceList } from "./components/ExperienceList";
import { SkillsManager } from "./components/SkillsManager";
import { EducationList } from "./components/EducationList";
import { AchievementsList } from "./components/AchievementsList";
import { ResumeGenerator } from "./components/ResumeGenerator";
import { GeneratedResumesList } from "./components/GeneratedResumesList";
import { TabNavigation } from "./components/TabNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ResumeReviewPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        profRes,
        projRes,
        expRes,
        skillRes,
        eduRes,
        achRes
      ] = await Promise.all([
        api.getCareerProfile(),
        api.listProjects(),
        api.listExperiences(),
        api.listSkills(),
        api.listEducation(),
        api.listAchievements()
      ]);

      setProfile(profRes);
      setProjects(projRes);
      setExperiences(expRes);
      setSkills(skillRes);
      setEducation(eduRes);
      setAchievements(achRes);
    } catch (error) {
      console.error("Failed to load profile data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchData();
    }
  }, [user, router, fetchData]);

  const stats = {
    skills: skills.length,
    projects: projects.length,
    experiences: experiences.length,
    education: education.length,
    achievements: achievements.length,
  };

  return (
    <div className="flex min-h-screen flex-col p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Career Profile & Resume</h1>
        <p className="text-muted-foreground">Manage your professional experience and generate tailored resumes instantly.</p>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="animate-in fade-in duration-300">
            {activeTab === "overview" && (
              <ProfileOverview
                profile={profile}
                stats={stats}
                onProfileUpdate={setProfile}
                onUploadComplete={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "projects" && (
              <ProjectsList
                projects={projects}
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "experience" && (
              <ExperienceList
                experiences={experiences}
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "skills" && (
              <SkillsManager
                skills={skills}
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "education" && (
              <EducationList
                education={education}
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "achievements" && (
              <AchievementsList
                achievements={achievements}
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            )}
            {activeTab === "generator" && <ResumeGenerator />}
            {activeTab === "history" && <GeneratedResumesList />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
