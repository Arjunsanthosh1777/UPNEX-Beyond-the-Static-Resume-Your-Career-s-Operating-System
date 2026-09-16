import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

export const emptyProfile = {
  user: { name: "", email: "", githubUrl: "", linkedinUrl: "" },
  documents: [],
  marks: [],
  projects: [],
  guidance: { paths: [], strongest: "" },
  readiness: 0
};

export const emptyMark = { subject: "", category: "", score: "" };
export const emptyProject = { title: "", description: "", skills: "", proofUrl: "" };
export const emptyIdentity = { name: "", githubUrl: "", linkedinUrl: "" };

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback;
}

/**
 * Shared profile data + mutation logic used by the Dashboard and the
 * ProfileFeature pages. Callers own their own form state and success copy,
 * which differs between screens, and pass it in via options.
 */
export function useStudentProfile({
  initialProfile = emptyProfile,
  initialMark = emptyMark,
  initialProject = emptyProject,
  initialIdentity = emptyIdentity,
  loadErrorMessage = "Sign in to load your student profile.",
  documentSuccessMessage = "Document added to your vault.",
  markErrorMessage = "Enter a valid subject and score.",
  projectErrorMessage = "Complete the project details first.",
  identityErrorMessage = "Use valid GitHub and LinkedIn profile links."
} = {}) {
  const [profile, setProfile] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [mark, setMark] = useState(initialMark);
  const [project, setProject] = useState(initialProject);
  const [identity, setIdentity] = useState(initialIdentity);

  // Lets the initial load bail out of state updates once the component
  // unmounts, so navigating away mid-request cannot set state on a
  // dead component or clobber a later load.
  const aliveRef = useRef(true);

  const loadProfile = useCallback(async () => {
    const { data } = await api.get("/profile");
    if (!aliveRef.current) return data;
    setProfile(data);
    setIdentity({
      name: data.user?.name || "",
      githubUrl: data.user?.githubUrl || "",
      linkedinUrl: data.user?.linkedinUrl || ""
    });
    return data;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    loadProfile().catch(() => {
      if (aliveRef.current) setMessage(loadErrorMessage);
    });
    return () => {
      aliveRef.current = false;
    };
  }, [loadProfile, loadErrorMessage]);

  const addDocument = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setMessage("Documents must be smaller than 10 MB.");
      return;
    }
    try {
      await api.post("/profile/documents", {
        fileName: file.name,
        fileSize: file.size,
        documentType: file.name.toLowerCase().includes("mark") ? "MARKSHEET" : "CERTIFICATE"
      });
      if (aliveRef.current) setMessage(typeof documentSuccessMessage === "function" ? documentSuccessMessage(file.name) : documentSuccessMessage);
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, "Could not add this document."));
    }
    event.target.value = "";
  }, [documentSuccessMessage, loadProfile]);

  const addMark = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.post("/profile/marks", { ...mark, score: Number(mark.score) });
      setMark(initialMark);
      if (aliveRef.current) setMessage("Subject analysis updated.");
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, markErrorMessage));
    }
  }, [mark, initialMark, markErrorMessage, loadProfile]);

  const addProject = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.post("/profile/projects", {
        ...project,
        skills: project.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
      });
      setProject(initialProject);
      if (aliveRef.current) setMessage("Project added to your live portfolio.");
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, projectErrorMessage));
    }
  }, [project, initialProject, projectErrorMessage, loadProfile]);

  const saveIdentity = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.patch("/profile/identity", identity);
      if (aliveRef.current) setMessage("Student profile saved.");
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, identityErrorMessage));
    }
  }, [identity, identityErrorMessage, loadProfile]);

  return {
    profile,
    setProfile,
    message,
    setMessage,
    mark,
    setMark,
    project,
    setProject,
    identity,
    setIdentity,
    loadProfile,
    addDocument,
    addMark,
    addProject,
    saveIdentity
  };
}
