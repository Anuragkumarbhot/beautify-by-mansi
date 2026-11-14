import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
let currentProfileId = null;
let isPublished = false;
let ownedProfiles = [];
let workspaceEntitlements = null;

function setStatus(id, message, isError = false) {
  const node = $(id);
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#a33d4c" : "#47755a";
}
function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}
function publicUrl(slug) {
  return new URL("profile.html?slug=" + encodeURIComponent(slug), window.location.href).href;
}
function updateAccountUI(user) {
  $("cloudSignOut").hidden = !user;
  $("cloudSignIn").hidden = !!user;
  $("cloudSignUp").hidden = !!user;
  $("cloudEmail").disabled = !!user;
  $("cloudPassword").disabled = !!user;
  setStatus("cloudStatus", user ? "Signed in as " + user.email : "Not signed in.");
}
function setFeatureHint(inputId, hintId, message) {
  const field = $(inputId)?.closest(".field");
  if (!field) return;
  let hint = $(hintId);
  if (!hint) {
    hint = document.createElement("small");
    hint.id = hintId;
    hint.style.cssText = "display:block;margin-top:5px;color:#806a70;font-size:11px";
    field.append(hint);
  }
  hint.textContent = message;
}
function applyFeatureAccess(entitlements) {
  const active = !!entitlements?.active;
  const premiumThemes = active && !!entitlements?.premium_themes;
  const reviewLinks = active && !!entitlements?.review_links;
  const theme = $("theme");
  if (theme) {
    ["ivory", "plum"].forEach(value => {
      const option = [...theme.options].find(item => item.value === value);
      if (option) option.disabled = !premiumThemes;
    });
    if (!premiumThemes && ["ivory", "plum"].includes(theme.value)) theme.value = "wine";
  }
  const review = $("review");
  if (review) review.disabled = !reviewLinks && !review.value;
  setFeatureHint("theme", "themePlanHint",
    premiumThemes ? "Pro feature enabled: all Studio themes are available."
      : "Starter access: Rose Gold is included. Ivory and Plum themes unlock with Pro.");
  setFeatureHint("review", "reviewPlanHint",
    reviewLinks ? "Pro feature enabled: your Google review link will appear on the public card."
      : "Google review links are a Pro feature. Existing saved links are hidden from Starter visitors.");
}
async function refreshFeatureAccess(profileId) {
  if (!profileId) {
    applyFeatureAccess(null);
    return null;
  }
  const { data, error } = await supabase.rpc("get_business_profile_entitlements", {
    p_profile_id: profileId
  });
  if (error) throw error;
  applyFeatureAccess(data);
  return data;
}
function emitProfileChanged(profile) {
  window.dispatchEvent(new CustomEvent("bm:active-profile-changed", { detail: { profile } }));
}
function setEditorProfile(data) {
  currentProfileId = data?.id || null;
  isPublished = !!data?.is_published;
  const map = { slug: "slug", name: "business_name", owner: "owner_name", category: "category",
    bio: "bio", phone: "phone", city: "city", website: "website_url",
    instagram: "instagram_url", review: "google_review_url" };
  Object.entries(map).forEach(([input, column]) => {
    if ($(input)) $(input).value = typeof data?.[column] === "string" ? data[column] : "";
  });
  if ($("theme")) $("theme").value = !data ? "wine" : (data.theme === "rose-gold" ? "wine" : data.theme);
  $("publicProfileLink").hidden = !data?.is_published;
  $("publicProfileLink").href = data?.slug ? publicUrl(data.slug) : "#";
  $("publicProfileLink").textContent = "Open public profile";
  if (data?.is_published) {
    const url = publicUrl(data.slug);
    $("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(url);
    $("qrCaption").textContent = url;
  }
  ["name","category","bio","phone","city","website","instagram","review","theme"].forEach(id =>
    $(id)?.dispatchEvent(new Event("input", { bubbles: true })));
  emitProfileChanged(data || null);
}
async function selectProfile(profileId) {
  const data = ownedProfiles.find(item => item.id === profileId) || null;
  setEditorProfile(data);
  if (data) {
    await refreshFeatureAccess(data.id);
    setStatus("cloudSaveStatus", data.is_published ? "Cloud profile loaded and published." : "Cloud draft loaded.");
  } else {
    applyFeatureAccess(null);
    setStatus("cloudSaveStatus", "New profile draft. Save it to your cloud workspace.");
  }
}
async function refreshWorkspace(user) {
  const { data, error } = await supabase.from("business_profiles")
    .select("id,slug,business_name,owner_name,category,bio,phone,city,website_url,instagram_url,google_review_url,theme,is_published,created_at")
    .eq("owner_id", user.id).order("created_at", { ascending: true });
  if (error) throw error;
  ownedProfiles = data || [];
  const selector = $("profileSelector");
  if (selector) {
    selector.replaceChildren();
    ownedProfiles.forEach(profile => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.business_name + (profile.is_published ? " · Published" : " · Draft");
      selector.append(option);
    });
  }
  const { data: limits, error: limitError } = await supabase.rpc("get_business_workspace_entitlements");
  if (limitError) throw limitError;
  workspaceEntitlements = limits;
  const count = limits?.profile_count ?? ownedProfiles.length;
  const limit = limits?.profile_limit ?? 1;
  setStatus("profileWorkspaceStatus",
    count + " of " + limit + " profiles used · " + (limits?.plan_tier === "pro" ? "Pro workspace" : "Starter workspace"));
  const createButton = $("newBusinessProfile");
  if (createButton) {
    createButton.disabled = !limits?.can_create_profile;
    createButton.title = limits?.can_create_profile ? "Create a separate business identity" : "Upgrade to Pro to add more profiles";
  }
  const selected = ownedProfiles.find(item => item.id === currentProfileId) || ownedProfiles[0] || null;
  if (selected) {
    if (selector) selector.value = selected.id;
    await selectProfile(selected.id);
  } else {
    if (selector) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No saved profiles yet";
      selector.append(option);
    }
    setEditorProfile(null);
    applyFeatureAccess(null);
  }
}
async function loadOwnProfile(user) {
  await refreshWorkspace(user);
}
async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before saving a cloud profile.");
  return data.user;
}
async function saveCloud(publish) {
  const user = await getUser();
  if (publish) {
    if (!currentProfileId) throw new Error("Save your cloud profile first, then purchase a Studio plan before publishing.");
    const entitlements = await refreshFeatureAccess(currentProfileId);
    if (!entitlements?.active) throw new Error("An active paid Studio plan is required before publishing. Choose a plan in the billing section.");
  }
  const businessName = $("name").value.trim();
  const slug = slugify($("slug").value.trim() || businessName);
  if (!businessName || slug.length < 3) throw new Error("Enter a business name and a profile slug of at least 3 characters.");
  $("slug").value = slug;
  const payload = {
    owner_id: user.id, slug, business_name: businessName,
    owner_name: $("owner").value.trim(), category: $("category").value.trim(),
    bio: $("bio").value.trim(), phone: $("phone").value.trim(), city: $("city").value.trim(),
    website_url: $("website").value.trim(), instagram_url: $("instagram").value.trim(),
    google_review_url: $("review").value.trim(), theme: $("theme").value === "wine" ? "rose-gold" : $("theme").value,
    is_published: publish ? true : isPublished
  };
  let query = supabase.from("business_profiles");
  if (currentProfileId) query = query.update(payload).eq("id", currentProfileId);
  else query = query.insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  currentProfileId = data.id;
  isPublished = data.is_published;
  await refreshWorkspace(user);
  await refreshFeatureAccess(data.id);
  if (data.is_published) {
    const url = publicUrl(data.slug);
    $("publicProfileLink").href = url;
    $("publicProfileLink").hidden = false;
    $("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(url);
    $("qrCaption").textContent = url;
    setStatus("cloudSaveStatus", "Published. Public profile: " + url);
  } else {
    setStatus("cloudSaveStatus", "Cloud draft saved privately. Publish when ready.");
  }
}
$("profileSelector")?.addEventListener("change", async (event) => {
  const nextId = event.target.value;
  if (currentProfileId && nextId !== currentProfileId &&
      !window.confirm("Switch profiles? Save any unsaved edits first.")) {
    event.target.value = currentProfileId;
    return;
  }
  try { await selectProfile(nextId); }
  catch (e) { setStatus("profileWorkspaceStatus", e.message, true); }
});
$("newBusinessProfile")?.addEventListener("click", () => {
  if (workspaceEntitlements && !workspaceEntitlements.can_create_profile) {
    setStatus("profileWorkspaceStatus", "Your profile limit is reached. Upgrade to Pro for up to five business profiles.", true);
    return;
  }
  if (currentProfileId && !window.confirm("Create a new profile? Save any unsaved edits first.")) return;
  const selector = $("profileSelector");
  if (selector) selector.value = "";
  setEditorProfile(null);
  applyFeatureAccess(null);
  $("name").value = "";
  $("owner").value = "";
  $("category").value = "";
  $("bio").value = "";
  $("phone").value = "";
  $("city").value = "";
  $("website").value = "";
  $("instagram").value = "";
  $("review").value = "";
  $("slug").value = "";
  $("theme").value = "wine";
  setStatus("cloudSaveStatus", "New profile draft. Add its details and save to cloud.");
});
$("cloudSignIn").addEventListener("click", async () => {
  setStatus("cloudStatus", "Signing in…");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
  });
  if (error) setStatus("cloudStatus", error.message, true);
});
$("cloudSignUp").addEventListener("click", async () => {
  setStatus("cloudStatus", "Creating account…");
  const { data, error } = await supabase.auth.signUp({
    email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
  });
  if (error) return setStatus("cloudStatus", error.message, true);
  if (!data.session) setStatus("cloudStatus", "Account created. Check your email to confirm, then sign in.");
});
$("cloudSignOut").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) setStatus("cloudStatus", error.message, true);
  else { currentProfileId = null; isPublished = false; ownedProfiles = []; workspaceEntitlements = null; if ($("profileSelector")) $("profileSelector").replaceChildren(); applyFeatureAccess(null); emitProfileChanged(null); setStatus("cloudSaveStatus", "Signed out."); }
});
$("cloudSave").addEventListener("click", async () => {
  setStatus("cloudSaveStatus", "Saving cloud profile…");
  try { await saveCloud(false); } catch (e) { setStatus("cloudSaveStatus", e.message, true); }
});
$("cloudPublish").addEventListener("click", async () => {
  if (!window.confirm("Publish this business profile so anyone with its public link can view it?")) return;
  setStatus("cloudSaveStatus", "Publishing…");
  try { await saveCloud(true); } catch (e) { setStatus("cloudSaveStatus", e.message, true); }
});
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user || null;
  updateAccountUI(user);
  if (user) loadOwnProfile(user).catch(e => setStatus("cloudSaveStatus", e.message, true));
});
supabase.auth.getSession().then(({ data, error }) => {
  if (error) return setStatus("cloudStatus", error.message, true);
  const user = data.session?.user || null;
  updateAccountUI(user);
  if (user) loadOwnProfile(user).catch(e => setStatus("cloudSaveStatus", e.message, true));
});
