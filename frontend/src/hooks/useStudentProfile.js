import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useTranslation } from "react-i18next";

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
export const emptyDetails = {
  name: "",
  githubUrl: "",
  linkedinUrl: "",
  headline: "",
  location: "",
  availability: "",
  bio: "",
  coverUrl: "",
  profilePublic: true,
  privacy: { profile: "public", academics: "public", credentials: "public", activity: "private" },
  skills: [],
  education: []
};

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
  loadErrorMessage,
  documentSuccessMessage,
  markErrorMessage,
  projectErrorMessage,
  identityErrorMessage
} = {}) {
  const { t } = useTranslation();
  const loadErrorMessageText = loadErrorMessage ?? t("profiler.signInToLoad", "Sign in to load your student profile.");
  const documentSuccessMessageText = documentSuccessMessage ?? t("profiler.docAdded", "Document added to your vault.");
  const markErrorMessageText = markErrorMessage ?? t("analysis.invalidSubject", "Enter a valid subject and score.");
  const projectErrorMessageText = projectErrorMessage ?? t("profiler.projectIncomplete", "Complete the project details first.");
  const identityErrorMessageText = identityErrorMessage ?? t("portfolio.invalidLinks", "Use valid GitHub and LinkedIn profile links.");
  const [profile, setProfile] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [mark, setMark] = useState(initialMark);
  const [project, setProject] = useState(initialProject);
  const [identity, setIdentity] = useState(initialIdentity);
  const [details, setDetails] = useState(emptyDetails);

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
    setDetails((current) => {
      const merged = { ...emptyDetails };
      for (const key of Object.keys(emptyDetails)) {
        const value = data.user?.[key];
        if (value !== undefined && value !== null) merged[key] = value;
      }
      // `details` is also written to by the settings form between loads; keep
      // any in-progress edits for skills/education rather than clobbering them.
      return { ...merged, skills: merged.skills || current.skills, education: merged.education || current.education };
    });
    return data;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    loadProfile().catch(() => {
      if (aliveRef.current) setMessage(loadErrorMessageText);
    });
    return () => {
      aliveRef.current = false;
    };
  }, [loadProfile, loadErrorMessageText]);

  const addDocument = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setMessage(t("profiler.fileTooBig", "Documents must be smaller than 10 MB."));
      return;
    }
    try {
      const fields = new FormData();
      fields.append("file", file);
      fields.append("documentType", file.name.toLowerCase().includes("mark") ? "MARKSHEET" : "CERTIFICATE");
      await api.post("/profile/documents", fields);
      if (aliveRef.current) setMessage(typeof documentSuccessMessageText === "function" ? documentSuccessMessageText(file.name) : documentSuccessMessageText);
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, t("profiler.docAddFailed", "Could not add this document.")));
    }
    event.target.value = "";
  }, [documentSuccessMessageText, loadProfile]);

  const addMark = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.post("/profile/marks", { ...mark, score: Number(mark.score) });
      setMark(initialMark);
      if (aliveRef.current) setMessage(t("analysis.subjectAdded", "Subject analysis updated."));
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, markErrorMessageText));
    }
  }, [mark, initialMark, markErrorMessageText, loadProfile]);

  const addProject = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.post("/profile/projects", {
        ...project,
        skills: project.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
      });
      setProject(initialProject);
      if (aliveRef.current) setMessage(t("profiler.projectAdded", "Project added to your live portfolio."));
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, projectErrorMessageText));
    }
  }, [project, initialProject, projectErrorMessageText, loadProfile]);

  const saveIdentity = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.patch("/profile/identity", identity);
      if (aliveRef.current) setMessage(t("portfolio.profileSaved", "Student profile saved."));
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, identityErrorMessageText));
    }
  }, [identity, identityErrorMessageText, loadProfile]);

  const saveDetails = useCallback(async (event) => {
    event.preventDefault();
    try {
      await api.patch("/profile/identity", {
        ...details,
        githubUrl: details.githubUrl || "",
        linkedinUrl: details.linkedinUrl || "",
        coverUrl: details.coverUrl || "",
        availability: details.availability ? details.availability : null
      });
      if (aliveRef.current) setMessage(t("settings.profileSaved", "Profile details saved."));
      await loadProfile();
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, t("settings.profileSaveFailed", "Could not save your profile.")));
    }
  }, [details, loadProfile]);

  const saveUsername = useCallback(async (username) => {
    try {
      const { data } = await api.patch("/profile/username", { username });
      if (aliveRef.current) setMessage(t("settings.usernameSaved", "Username updated."));
      await loadProfile();
      return { ok: true, username: data.user?.username };
    } catch (error) {
      return { ok: false, message: messageFrom(error, t("settings.usernameFailed", "Could not update username.")) };
    }
  }, [loadProfile]);

  const saveProject = useCallback(async (id, patch) => {
    try {
      await api.patch(`/profile/projects/${id}`, patch);
      if (aliveRef.current) setMessage(t("settings.projectSaved", "Project updated."));
      await loadProfile();
      return { ok: true };
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, t("settings.projectFailed", "Could not update project.")));
      return { ok: false, message: messageFrom(error, "") };
    }
  }, [loadProfile]);

  const deleteProject = useCallback(async (id) => {
    try {
      await api.delete(`/profile/projects/${id}`);
      if (aliveRef.current) setMessage(t("settings.projectDeleted", "Project removed."));
      await loadProfile();
      return { ok: true };
    } catch (error) {
      if (aliveRef.current) setMessage(messageFrom(error, t("settings.projectDeleteFailed", "Could not remove project.")));
      return { ok: false, message: messageFrom(error, "") };
    }
  }, [loadProfile]);

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
    details,
    setDetails,
    loadProfile,
    addDocument,
    addMark,
    addProject,
    saveIdentity,
    saveDetails,
    saveUsername,
    saveProject,
    deleteProject
  };
}
